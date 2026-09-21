import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SkylineMasthead } from '../../components/NeonUI';
import { PosterLayers } from '../../components/OfferCard';
import { CityPickerModal } from '../../components/CityPickerModal';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import { listNearbyOffers, toggleSavedOffer } from '../../services/api';
import type { Offer } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme, createThemedStyles } from '../../theme';
import { offerCategories } from './OfferUI';

type Props = NativeStackScreenProps<OffersStackParamList, 'AllOffers'>;

const PAGE_SIZE = 30;
const DEFAULT_RADIUS_KM = 10;
// Offer templates are authored on a 1080x1350 portrait canvas; offers saved
// without one fall back to that shape so the grid stays evenly sized.
const POSTER_FALLBACK_RATIO = 1080 / 1350;
const GRID_PADDING = 13;
const GRID_GAP = 11;

export const AllOffersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accessToken, t, themeMode } = useApp();
  // The route params seed the first request so results show immediately; the
  // persisted location takes over once the hook reads it, and whenever the user
  // picks a different area or re-detects from the filter sheet.
  const locationState = useHyperlocalLocation({ promptOnEmpty: false });
  const latitude = locationState.location?.latitude ?? route.params.latitude;
  const longitude = locationState.location?.longitude ?? route.params.longitude;
  const cityId = locationState.location?.city?._id ?? route.params.cityId;
  const locality = locationState.location?.locality ?? route.params.locality;
  const cityName = locationState.location?.city?.name;
  const { width: windowWidth } = useWindowDimensions();
  const posterWidth = Math.floor((windowWidth - GRID_PADDING * 2 - GRID_GAP) / 2);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  // Only the debounced value drives requests, so typing doesn't fire a call per keystroke.
  const [appliedSearch, setAppliedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [draftCategory, setDraftCategory] = useState('All');
  const [draftRadiusKm, setDraftRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [filterVisible, setFilterVisible] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useCallback((requestedPage: number) => listNearbyOffers({
    latitude,
    longitude,
    cityId,
    radiusKm,
    category: category === 'All' ? undefined : category,
    search: appliedSearch || undefined,
    page: requestedPage,
    limit: PAGE_SIZE,
  }), [appliedSearch, category, cityId, latitude, longitude, radiusKm]);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await query(1);
      if (currentRequest !== requestId.current) return;
      setOffers(response.data);
      setTotal(response.pagination.total);
      setPage(1);
      setHasMore(response.pagination.page < response.pagination.pages);
    } catch (e: any) {
      if (currentRequest !== requestId.current) return;
      setOffers([]);
      setTotal(0);
      setHasMore(false);
      setError(e?.message || 'Could not load offers. Please try again.');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [query]);

  // Re-runs whenever the search text, category or radius changes.
  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    const currentRequest = requestId.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const response = await query(nextPage);
      if (currentRequest !== requestId.current) return;
      setOffers((prev) => {
        const seen = new Set(prev.map((offer) => offer._id));
        return [...prev, ...response.data.filter((offer) => !seen.has(offer._id))];
      });
      setPage(nextPage);
      setHasMore(response.pagination.page < response.pagination.pages);
    } catch {
      // Keep what's already loaded — scrolling to the end again retries.
    } finally {
      if (currentRequest === requestId.current) setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, page, query]);

  const onScroll = (event: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number }; contentSize: { height: number } } }) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 400) loadMore();
  };

  const save = async (offerId: string) => {
    if (!accessToken) return;
    setSavedIds((ids) => ids.includes(offerId) ? ids.filter((id) => id !== offerId) : [...ids, offerId]);
    const result = await toggleSavedOffer(accessToken, offerId).catch(() => null);
    if (result) setSavedIds((ids) => result.saved ? [...ids.filter((id) => id !== offerId), offerId] : ids.filter((id) => id !== offerId));
  };

  const selectedCategory = offerCategories.find((item) => item.label === draftCategory) ?? offerCategories[0];

  const openFilter = () => {
    setDraftCategory(category);
    setDraftRadiusKm(radiusKm);
    setCategoryOpen(false);
    setFilterVisible(true);
  };

  const applyFilters = () => {
    setCategory(draftCategory);
    setRadiusKm(draftRadiusKm);
    setFilterVisible(false);
  };

  const clearAll = () => {
    setSearch('');
    setCategory('All');
    setRadiusKm(DEFAULT_RADIUS_KM);
    setFilterVisible(false);
  };

  const filterCount = (category !== 'All' ? 1 : 0) + (radiusKm !== DEFAULT_RADIUS_KM ? 1 : 0);
  const hasQuery = filterCount > 0 || appliedSearch.length > 0;

  return (
    <ScreenContainer edges={['top', 'left', 'right']} backgroundColor={theme.colors.background}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <SkylineMasthead height={200} />
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={styles.back} accessibilityLabel="Go back" accessibilityRole="button">
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('allOffersTitle')}</Text>
          {locality ? <Text numberOfLines={1} style={styles.subtitle}>{locality} · {radiusKm} KM</Text> : null}
        </View>
        {hasQuery ? (
          <Pressable onPress={clearAll} style={styles.clear} accessibilityRole="button">
            <Text style={styles.clearText}>{t('clearFilters')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={21} color={theme.colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchOffers')}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <MaterialCommunityIcons name="close-circle" size={19} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={openFilter} accessibilityLabel={t('openFilters')} style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="tune-variant" size={21} color={theme.colors.primary} />
          {filterCount > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{filterCount}</Text></View> : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={150}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {!loading && offers.length ? (
          <Text style={styles.count}>{total} {t('allOffersCount')}</Text>
        ) : null}

        {loading ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}

        {error ? (
          <Pressable onPress={load} style={styles.stateCard}>
            <MaterialCommunityIcons name="wifi-off" size={36} color={theme.colors.textMuted} />
            <Text style={styles.stateText}>{error}</Text>
            <Text style={styles.stateAction}>Tap to retry</Text>
          </Pressable>
        ) : null}

        {!loading && !error && !offers.length ? (
          <View style={styles.stateCard}>
            <MaterialCommunityIcons name="tag-off-outline" size={40} color={theme.colors.primary} />
            <Text style={styles.stateTitle}>{t('noOffersMatch')}</Text>
            <Text style={styles.stateText}>{t('noOffersMatchHint')}</Text>
          </View>
        ) : null}

        <View style={styles.gridRow}>
          {offers.map((offer) => (
            <OfferPosterCard
              key={offer._id}
              offer={offer}
              width={posterWidth}
              saved={savedIds.includes(offer._id)}
              onPress={() => navigation.navigate('OfferDetails', { offerId: offer._id, latitude, longitude })}
              onSave={() => save(offer._id)}
            />
          ))}
        </View>

        {loadingMore ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
      </ScrollView>

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{t('filterOffers')}</Text>
                <Text style={styles.sheetSubtitle}>{t('chooseCategoryAndDistance')}</Text>
              </View>
              <Pressable onPress={() => setFilterVisible(false)} style={styles.close} accessibilityLabel="Close filters">
                <MaterialCommunityIcons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetSection}>{t('location')}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
              <Text numberOfLines={1} style={styles.locationText}>
                {locality ? `${locality}${cityName ? `, ${cityName}` : ''}` : t('chooseLocation')}
              </Text>
            </View>
            <View style={styles.locationActions}>
              <Pressable
                disabled={locationState.loadingLocation}
                onPress={() => { setFilterVisible(false); locationState.detect({ force: true }); }}
                style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
              >
                {locationState.loadingLocation
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primary} />}
                <Text numberOfLines={1} style={styles.locationButtonText}>{t('useCurrentLocation')}</Text>
              </Pressable>
              <Pressable
                onPress={() => { setFilterVisible(false); locationState.setPickerVisible(true); }}
                style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons name="map-search-outline" size={18} color={theme.colors.primary} />
                <Text numberOfLines={1} style={styles.locationButtonText}>{t('changeCityArea')}</Text>
              </Pressable>
            </View>

            <Text style={styles.sheetSection}>{t('searchRadius')} — {draftRadiusKm} KM</Text>
            <Slider
              minimumValue={1}
              maximumValue={25}
              step={1}
              value={draftRadiusKm}
              onValueChange={setDraftRadiusKm}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
              style={styles.slider}
            />

            <Text style={styles.sheetSection}>{t('category')}</Text>
            <Pressable
              onPress={() => setCategoryOpen((open) => !open)}
              style={({ pressed }) => [styles.dropdown, categoryOpen && styles.dropdownOpen, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ expanded: categoryOpen }}
            >
              <MaterialCommunityIcons name={selectedCategory.icon} size={19} color={selectedCategory.color} />
              <Text numberOfLines={1} style={styles.dropdownText}>{t(selectedCategory.translationKey)}</Text>
              <MaterialCommunityIcons name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.textSecondary} />
            </Pressable>
            {categoryOpen ? (
              <View style={styles.dropdownList}>
                {offerCategories.map((item) => {
                  const selected = draftCategory === item.label;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => { setDraftCategory(item.label); setCategoryOpen(false); }}
                      style={({ pressed }) => [styles.dropdownItem, selected && styles.dropdownItemActive, pressed && styles.pressed]}
                    >
                      <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
                      <Text numberOfLines={1} style={[styles.dropdownItemText, selected && styles.dropdownItemTextActive]}>{t(item.translationKey)}</Text>
                      {selected ? <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable onPress={clearAll} style={styles.resetButton}><Text style={styles.resetText}>{t('resetFilters')}</Text></Pressable>
              <Pressable onPress={applyFilters} style={styles.applyButton}>
                <Text style={styles.applyText}>{t('applyFilters')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={19} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CityPickerModal
        visible={locationState.pickerVisible}
        cities={locationState.cities}
        onSelect={locationState.chooseManual}
        onUseCurrentLocation={() => locationState.detect({ force: true })}
        currentLocationLoading={locationState.loadingLocation}
        currentLocationError={locationState.locationError}
        onClose={() => locationState.setPickerVisible(false)}
      />
    </ScreenContainer>
  );
};

// One poster at the template's own aspect ratio, with the save heart overlaid.
const OfferPosterCard: React.FC<{ offer: Offer; width: number; saved: boolean; onPress: () => void; onSave: () => void }> = ({ offer, width, saved, onPress, onSave }) => {
  const canvas = offer.cardDesign?.canvas;
  const drawable = canvas && Array.isArray(canvas.elements) && canvas.width > 0 && canvas.height > 0 ? canvas : null;
  const photo = offer.cardDesign?.previewUrl || offer.imageUrls?.[0];
  const height = Math.round(width / (drawable ? drawable.width / drawable.height : POSTER_FALLBACK_RATIO));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={offer.title} onPress={onPress} style={({ pressed }) => [styles.poster, { width, height }, pressed && styles.pressed]}>
      {drawable
        ? <PosterLayers offer={offer} canvas={drawable} previewUrl={offer.cardDesign?.previewUrl} />
        : photo
          ? <Image source={{ uri: photo }} style={styles.posterPhoto} resizeMode="cover" />
          : <View style={styles.posterPlaceholder}><MaterialCommunityIcons name="image-off-outline" size={30} color={theme.colors.textMuted} /></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave offer' : 'Save offer'} hitSlop={8} onPress={onSave} style={styles.heart}>
        <MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={16} color={saved ? theme.colors.danger : theme.colors.text} />
      </Pressable>
    </Pressable>
  );
};

const styles = createThemedStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, paddingVertical: 6 },
  back: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '900', color: c.text },
  subtitle: { fontSize: 12, lineHeight: 16, color: c.textSecondary, marginTop: 1 },
  clear: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: c.surfaceAlt },
  clearText: { fontSize: 12, fontWeight: '800', color: c.primary },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: GRID_PADDING, paddingBottom: 10 },
  searchBox: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 23, backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder },
  searchInput: { flex: 1, fontSize: 15, color: c.text, paddingVertical: 0 },
  filterButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1.25, borderColor: c.cardBorder },
  filterBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, borderWidth: 2, borderColor: c.background },
  filterBadgeText: { fontSize: 10, lineHeight: 13, fontWeight: '900', color: c.textInverse },
  pressed: { opacity: 0.75 },

  grid: { paddingHorizontal: GRID_PADDING, paddingBottom: 120 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  count: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary, marginBottom: 10 },
  poster: { borderRadius: 16, overflow: 'hidden', backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.cardBorder },
  posterPhoto: { width: '100%', height: '100%' },
  posterPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 7, right: 7, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, opacity: 0.94 },

  loader: { marginVertical: 26 },
  stateCard: { marginTop: 40, padding: 26, borderRadius: 20, alignItems: 'center', gap: 7, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  stateTitle: { ...theme.typography.h3, color: c.text, textAlign: 'center' },
  stateText: { ...theme.typography.body, color: c.textSecondary, textAlign: 'center' },
  stateAction: { ...theme.typography.caption, color: c.primary, fontWeight: '800', marginTop: 4 },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: c.overlay },
  sheet: { maxHeight: '80%', paddingHorizontal: 20, paddingTop: 17, paddingBottom: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.surface },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { ...theme.typography.h2, color: c.text },
  sheetSubtitle: { ...theme.typography.caption, color: c.textSecondary, marginTop: 2 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: c.surfaceAlt },
  sheetSection: { ...theme.typography.bodyBold, color: c.text, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  locationText: { flex: 1, minWidth: 0, ...theme.typography.caption, color: c.text, fontWeight: '800' },
  locationActions: { flexDirection: 'row', gap: 9, marginTop: 9, marginBottom: 18 },
  locationButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, borderRadius: 14, backgroundColor: c.primaryLight, borderWidth: 1, borderColor: c.primary },
  locationButtonText: { flexShrink: 1, ...theme.typography.tiny, color: c.primary, fontWeight: '800' },
  slider: { width: '100%', height: 34, marginBottom: 16 },
  sheetBody: { flexShrink: 1 },
  dropdown: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, marginBottom: 18 },
  dropdownOpen: { borderColor: c.primary, marginBottom: 6 },
  dropdownText: { flex: 1, minWidth: 0, ...theme.typography.caption, color: c.text, fontWeight: '800' },
  dropdownList: { marginBottom: 18, borderRadius: 14, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  dropdownItem: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: c.divider },
  dropdownItemActive: { backgroundColor: c.primaryLight },
  dropdownItemText: { flex: 1, minWidth: 0, ...theme.typography.caption, color: c.text, fontWeight: '700' },
  dropdownItemTextActive: { color: c.primary, fontWeight: '900' },
  sheetActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 15 },
  resetButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  resetText: { ...theme.typography.button, color: c.textSecondary },
  applyButton: { flex: 1.6, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 24, backgroundColor: c.primary },
  applyText: { ...theme.typography.button, color: '#FFFFFF' },
}));
