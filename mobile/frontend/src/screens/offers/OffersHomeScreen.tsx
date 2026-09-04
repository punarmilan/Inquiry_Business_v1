import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HyperlocalHeader } from '../../components/HyperlocalHeader';
import { CityPickerModal } from '../../components/CityPickerModal';
import { OfferCard } from '../../components/OfferCard';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import { listNearbyOffers, toggleSavedOffer } from '../../services/api';
import type { Offer } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<OffersStackParamList, 'OffersHome'>;
type CategoryIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type RadiusKm = number;
const categories: Array<{ label: string; icon?: CategoryIcon; color: string }> = [
  { label: 'All', color: '#118F91' },
  { label: 'Food', icon: 'silverware-fork-knife', color: '#12AA78' },
  { label: 'Hotels', icon: 'office-building-outline', color: '#286BE2' },
  { label: 'Shopping', icon: 'shopping-outline', color: '#7A56D5' },
  { label: 'Salon', icon: 'content-cut', color: '#EB4B8B' },
  { label: 'Fashion', icon: 'hanger', color: '#D866A5' },
  { label: 'Gym', icon: 'dumbbell', color: '#E18A24' },
  { label: 'Electronics', icon: 'cellphone', color: '#4E77C8' },
  { label: 'Entertainment', icon: 'movie-open-outline', color: '#B44B95' },
  { label: 'More', icon: 'dots-horizontal', color: '#858C91' },
];
const primaryCategories = categories.slice(0, 4);
const filterCategories = categories.filter((item) => item.label !== 'More');
const moreCategory = categories[categories.length - 1];

export const OffersHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken, unreadNotificationCount } = useApp();
  const locationState = useHyperlocalLocation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(10);
  const [draftCategory, setDraftCategory] = useState('All');
  const [draftRadiusKm, setDraftRadiusKm] = useState<RadiusKm>(10);
  const [draftRadiusInput, setDraftRadiusInput] = useState('10');
  const [filterVisible, setFilterVisible] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);

  const load = useCallback(async () => {
    if (!locationState.location) return;
    setLoading(true);
    try {
      const response = await listNearbyOffers({
        latitude: locationState.location.latitude,
        longitude: locationState.location.longitude,
        cityId: locationState.location.city?._id,
        radiusKm,
        category: category === 'All' ? undefined : category,
        search: search || undefined,
        limit: 40,
      });
      setOffers(response.data);
      setComingSoon(response.comingSoon);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, locationState.location, radiusKm, search]);

  useEffect(() => { const timer = setTimeout(load, 300); return () => clearTimeout(timer); }, [load]);

  const save = async (offerId: string) => {
    if (!accessToken) return;
    await toggleSavedOffer(accessToken, offerId).catch(() => undefined);
  };

  const openFilter = () => {
    setDraftCategory(category);
    setDraftRadiusKm(radiusKm);
    setDraftRadiusInput(String(radiusKm));
    setFilterVisible(true);
  };

  const applyFilters = () => {
    const enteredRadius = Number(draftRadiusInput);
    const nextRadius = Number.isFinite(enteredRadius) ? Math.min(25, Math.max(0.1, Number(enteredRadius.toFixed(1)))) : draftRadiusKm;
    setCategory(draftCategory);
    setRadiusKm(nextRadius);
    setFilterVisible(false);
  };

  const resetFilters = () => {
    setDraftCategory('All');
    setDraftRadiusKm(10);
    setDraftRadiusInput('10');
  };

  const updateDraftRadius = (value: number) => {
    const nextRadius = Math.min(25, Math.max(0.1, Number(value.toFixed(1))));
    setDraftRadiusKm(nextRadius);
    setDraftRadiusInput(String(nextRadius));
  };

  const updateDraftRadiusInput = (value: string) => {
    setDraftRadiusInput(value);
    const enteredRadius = Number(value);
    if (Number.isFinite(enteredRadius) && value.trim() !== '') {
      setDraftRadiusKm(Math.min(25, Math.max(0.1, Number(enteredRadius.toFixed(1)))));
    }
  };

  const filterCount = (category !== 'All' ? 1 : 0) + (radiusKm !== 10 ? 1 : 0);
  const shownCategories = [...primaryCategories, moreCategory];

  return (
    <ScreenContainer edges={['top', 'left', 'right']} backgroundColor="#F8FAFB">
      <StatusBar style="dark" />
      <HyperlocalHeader
        cityLabel={locationState.location ? `${locationState.location.locality}${locationState.location.city ? `, ${locationState.location.city.name}` : ''}` : 'Choose location'}
        onLocationPress={() => locationState.setPickerVisible(true)}
        onNotifications={() => navigation.navigate('Notifications')}
        onInbox={() => navigation.navigate('ChatList')}
        unreadCount={unreadNotificationCount}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBox}>
            <View pointerEvents="none" style={styles.searchSheen} />
            <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.textMuted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search offers..." placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} multiline={false} returnKeyType="search" />
            {search ? <Pressable onPress={() => setSearch('')}><MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.textMuted} /></Pressable> : null}
          </View>
          <Pressable onPress={openFilter} accessibilityLabel="Open filters" style={({ pressed }) => [styles.filterButton, pressed && styles.filterPressed]}>
            <MaterialCommunityIcons name="tune-variant" size={22} color={theme.colors.primary} />
            {filterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{filterCount}</Text></View>}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {shownCategories.map((item) => {
            const isMore = item.label === 'More';
            const isSelected = isMore && category !== 'All' && !primaryCategories.some((primary) => primary.label === category);
            return <Pressable key={item.label} onPress={() => isMore ? setCategoryExpanded(true) : setCategory(item.label)} style={[styles.category, isSelected && styles.categoryActive]}>
              <View pointerEvents="none" style={styles.categorySheen} />
              {item.icon ? <MaterialCommunityIcons name={item.icon} size={17} color={isSelected ? '#FFFFFF' : item.color} /> : null}
              <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>{item.label}</Text>
            </Pressable>;
          })}
        </ScrollView>
        {loading && !offers.length ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
        {(comingSoon || (!loading && !offers.length)) && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="map-marker-alert-outline" size={42} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>{comingSoon ? "We're coming to your city soon." : 'No nearby offers right now'}</Text>
            <Text style={styles.emptyText}>Try another enabled city or check again soon.</Text>
            <Pressable onPress={() => locationState.setPickerVisible(true)} style={styles.chooseButton}><Text style={styles.chooseText}>See available cities</Text></Pressable>
          </View>
        )}
        {offers.length ? (
          <View style={styles.offerFeed}>
            {offers.map((offer) => (
              <OfferCard
                key={offer._id}
                offer={offer}
                variant="hero"
                onPress={() => navigation.navigate('OfferDetails', { offerId: offer._id, latitude: locationState.location?.latitude, longitude: locationState.location?.longitude })}
                onSave={() => save(offer._id)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <CityPickerModal
        visible={locationState.pickerVisible}
        cities={locationState.cities}
        onSelect={locationState.chooseManual}
        onUseCurrentLocation={locationState.detect}
        onClose={() => locationState.setPickerVisible(false)}
      />
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterVisible(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <View><Text style={styles.filterTitle}>Filter offers</Text><Text style={styles.filterSubtitle}>Choose category and distance</Text></View>
              <Pressable onPress={() => setFilterVisible(false)} style={styles.closeButton} accessibilityLabel="Close filters"><MaterialCommunityIcons name="close" size={23} color={theme.colors.text} /></Pressable>
            </View>
            <Text style={styles.filterSectionTitle}>Search radius</Text>
            <View style={styles.filterRadiusRow}>
              {([2, 5, 10, 25] as const).map((radius) => <Pressable key={radius} onPress={() => updateDraftRadius(radius)} style={[styles.filterRadiusOption, draftRadiusKm === radius && styles.filterRadiusOptionActive]}><MaterialCommunityIcons name="map-marker-radius" size={18} color={draftRadiusKm === radius ? '#FFFFFF' : theme.colors.primary} /><Text style={[styles.filterRadiusText, draftRadiusKm === radius && styles.filterRadiusTextActive]}>{radius} KM</Text></Pressable>)}
            </View>
            <View style={styles.customRadiusRow}>
              <Text style={styles.customRadiusLabel}>Custom radius</Text>
              <View style={styles.customRadiusInputWrap}><TextInput value={draftRadiusInput} onChangeText={updateDraftRadiusInput} onBlur={() => setDraftRadiusInput(String(draftRadiusKm))} keyboardType="decimal-pad" style={styles.customRadiusInput} maxLength={4} /></View>
              <Text style={styles.customRadiusUnit}>KM</Text>
            </View>
            <Slider
              minimumValue={0.1}
              maximumValue={25}
              step={0.1}
              value={draftRadiusKm}
              onValueChange={updateDraftRadius}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
              style={styles.radiusSlider}
            />
            <Text style={styles.radiusHint}>Choose between 0.1 KM and 25 KM</Text>
            <Text style={styles.filterSectionTitle}>Category</Text>
            <View style={styles.filterCategoryWrap}>
              {filterCategories.map((item) => <Pressable key={item.label} onPress={() => setDraftCategory(item.label)} style={[styles.filterCategoryOption, draftCategory === item.label && styles.filterCategoryOptionActive]}><MaterialCommunityIcons name={item.icon || 'tag-outline'} size={17} color={draftCategory === item.label ? '#FFFFFF' : item.color} /><Text style={[styles.filterCategoryText, draftCategory === item.label && styles.filterCategoryTextActive]}>{item.label}</Text></Pressable>)}
            </View>
            <View style={styles.filterActions}>
              <Pressable onPress={resetFilters} style={styles.resetButton}><Text style={styles.resetButtonText}>Reset</Text></Pressable>
              <Pressable onPress={applyFilters} style={styles.applyButton}><Text style={styles.applyButtonText}>Apply filters</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" /></Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={categoryExpanded} transparent animationType="fade" onRequestClose={() => setCategoryExpanded(false)}>
        <View style={styles.categoryModalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCategoryExpanded(false)} />
          <View style={styles.categoryPopup}>
            <View style={styles.filterHeader}>
              <View><Text style={styles.filterTitle}>All categories</Text><Text style={styles.filterSubtitle}>Choose an offer type</Text></View>
              <Pressable onPress={() => setCategoryExpanded(false)} style={styles.closeButton} accessibilityLabel="Close categories"><MaterialCommunityIcons name="close" size={23} color={theme.colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.categoryPopupWrap}>
              {filterCategories.map((item) => <Pressable key={item.label} onPress={() => { setCategory(item.label); setCategoryExpanded(false); }} style={[styles.filterCategoryOption, category === item.label && styles.filterCategoryOptionActive]}><MaterialCommunityIcons name={item.icon || 'tag-outline'} size={18} color={category === item.label ? '#FFFFFF' : item.color} /><Text style={[styles.filterCategoryText, category === item.label && styles.filterCategoryTextActive]}>{item.label}</Text></Pressable>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 8, marginBottom: 3 },
  searchBox: { flex: 1, height: 58, backgroundColor: '#FFFFFF', borderRadius: 17, borderWidth: 1, borderColor: '#E2E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 11, shadowColor: theme.colors.shadowStrong, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3, overflow: 'hidden' },
  searchSheen: { position: 'absolute', top: 0, left: 28, right: 28, height: 14, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.72)' },
  searchInput: { flex: 1, fontSize: 18, lineHeight: 22, color: '#1C2225', paddingVertical: 0, textAlignVertical: 'center' },
  filterButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterPressed: { transform: [{ scale: 0.9 }], opacity: 0.7 },
  filterBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accent, borderWidth: 2, borderColor: theme.colors.surface },
  filterBadgeText: { fontSize: 11, lineHeight: 14, fontWeight: '900', color: '#FFFFFF' },
  categoryRow: { paddingHorizontal: 18, paddingVertical: 9, gap: 6 },
  category: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE3E7', shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2, overflow: 'hidden' },
  categoryActive: { backgroundColor: '#118F91', borderColor: '#118F91', shadowColor: theme.colors.primary, shadowOpacity: 0.38, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  categorySheen: { position: 'absolute', top: 0, left: '13%', right: '13%', height: 13, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.25)' },
  categoryText: { fontSize: 12, lineHeight: 16, color: '#252B2E', fontWeight: '700' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '800' },
  loader: { marginTop: 50 },
  offerFeed: { gap: 18, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  emptyCard: { margin: 18, padding: 28, backgroundColor: '#FFFFFF', borderRadius: 22, alignItems: 'center', borderWidth: 1, borderColor: '#DDE3E7' },
  emptyTitle: { ...theme.typography.h3, color: '#11181A', marginTop: 12, textAlign: 'center' }, emptyText: { ...theme.typography.body, color: '#5E686D', textAlign: 'center', marginTop: 6 },
  chooseButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 99, backgroundColor: '#E2F6F5' }, chooseText: { ...theme.typography.caption, color: '#0A6F71', fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  categoryModalRoot: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,24,26,0.28)' },
  categoryPopup: { width: '100%', maxHeight: '72%', paddingHorizontal: 20, paddingTop: 19, paddingBottom: 20, borderRadius: 28, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadowStrong, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  categoryPopupWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 2 },
  filterSheet: { maxHeight: '78%', paddingHorizontal: 20, paddingTop: 17, paddingBottom: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadowStrong, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: -7 }, elevation: 12 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  filterTitle: { ...theme.typography.h2, color: theme.colors.text },
  filterSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: theme.colors.surfaceAlt },
  filterSectionTitle: { ...theme.typography.bodyBold, color: theme.colors.text, marginBottom: 9 },
  filterRadiusRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  filterRadiusOption: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  filterRadiusOptionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  filterRadiusText: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '800' },
  filterRadiusTextActive: { color: '#FFFFFF' },
  customRadiusRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 1 },
  customRadiusLabel: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '800' },
  customRadiusInputWrap: { minWidth: 78, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  customRadiusInput: { width: 70, paddingVertical: 0, textAlign: 'center', ...theme.typography.bodyBold, color: theme.colors.text },
  customRadiusUnit: { width: 27, ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '900' },
  radiusSlider: { width: '100%', height: 34, marginTop: 1 },
  radiusHint: { ...theme.typography.tiny, color: theme.colors.textMuted, marginBottom: 17 },
  filterCategoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 21 },
  filterCategoryOption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 20, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  filterCategoryOptionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterCategoryText: { ...theme.typography.tiny, color: theme.colors.text, fontWeight: '800' },
  filterCategoryTextActive: { color: '#FFFFFF' },
  filterActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 15 },
  resetButton: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  resetButtonText: { ...theme.typography.button, color: theme.colors.textSecondary },
  applyButton: { flex: 1.6, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 25, backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  applyButtonText: { ...theme.typography.button, color: '#FFFFFF' },
});
