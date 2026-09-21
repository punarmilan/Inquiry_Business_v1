import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { HyperlocalHeader } from '../../components/HyperlocalHeader';
import { CityPickerModal } from '../../components/CityPickerModal';
import { OfferCard } from '../../components/OfferCard';
import { isPosterUploadOffer } from '../../config/offerCardDesigner';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import { getHomeShowcase, listNearbyOffers, toggleSavedOffer } from '../../services/api';
import type { HomeShowcaseBanner } from '../../services/api';
import type { Business, Offer } from '../../types/hyperlocal';
import type { MainTabParamList, OffersStackParamList } from '../../navigation/types';
import { tabBarScrollProps } from '../../navigation/hideTabBarOnScroll';
import { useApp } from '../../context/AppContext';
import { SkylineMasthead, SectionHeading, SegmentedTabs } from '../../components/NeonUI';
import { offerCategories } from './OfferUI';
import { buildHeroRotationPages } from './heroRotation';
import { theme, createThemedStyles } from '../../theme';
import type { TranslationKey } from '../../i18n/translations';

type Props = NativeStackScreenProps<OffersStackParamList, 'OffersHome'>;
type CategoryIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type RadiusKm = number;
// Keep these quick entries aligned with the four actions on the Post screen.
const quickTiles: Array<{ id: string; titleKey: TranslationKey; icon: CategoryIcon; tint: string; image: ImageSourcePropType; enabled: boolean }> = [
  { id: 'offer', titleKey: 'quickTileLocalOffer', icon: 'cube-outline', tint: '#00E2B0', image: require('../../../assets/screen-3/03-post-offer-character.png'), enabled: true },
  { id: 'update', titleKey: 'quickTileUpdate', icon: 'pencil-outline', tint: '#00CFFF', image: require('../../../assets/provider-avatars/developer.jpg'), enabled: false },
  { id: 'event', titleKey: 'quickTileEvent', icon: 'calendar-month-outline', tint: '#A86BFF', image: require('../../../assets/provider-avatars/designer.jpg'), enabled: false },
  { id: 'service', titleKey: 'quickTilePostService', icon: 'tools', tint: '#FF7A3D', image: require('../../../assets/provider-avatars/plumber.jpg'), enabled: false },
];
// Quick filters above the feed. These narrow which offers are shown; the sort
// tabs further down only reorder whatever survives the filter.
type FeedFilter = 'all' | 'popular' | 'offers' | 'nearby';
const feedFilters: Array<{ key: FeedFilter; labelKey: TranslationKey; icon: CategoryIcon }> = [
  { key: 'all', labelKey: 'filterAll', icon: 'view-grid' },
  { key: 'popular', labelKey: 'filterPopular', icon: 'fire' },
  { key: 'offers', labelKey: 'chipOffers', icon: 'tag-outline' },
  { key: 'nearby', labelKey: 'filterNearby', icon: 'map-marker-outline' },
];
const NEARBY_KM = 5;
const BIG_DISCOUNT = 30;

// Promo banner artwork is 2172x724, so the card is sized from the screen width
// to keep those proportions exactly — the text in the image distorts otherwise.
const SUPPORT_LOCAL_BANNER = require('../../../assets/support-local-banner.png');
const BANNER_RATIO = 2172 / 724;
const BANNER_MARGIN = 13;

// Feed ordering. 'Top Offers' ranks by discount, 'This Week' by newest, and
// 'Near You' by distance when the API returned one.
const sortTabs = ['topOffers', 'thisWeek', 'sortNearYou'] as const;
type SortTab = typeof sortTabs[number];

const filterCategories = offerCategories;

export const OffersHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken, currentUser, unreadNotificationCount, t, themeMode } = useApp();
  const locationState = useHyperlocalLocation();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth;
  const bannerWidth = windowWidth - BANNER_MARGIN * 2;
  const bannerHeight = Math.round(bannerWidth / BANNER_RATIO);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(10);
  const [draftCategory, setDraftCategory] = useState('All');
  const [draftRadiusKm, setDraftRadiusKm] = useState<RadiusKm>(10);
  const [draftRadiusInput, setDraftRadiusInput] = useState('10');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortTab, setSortTab] = useState<SortTab>('topOffers');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [heroPage, setHeroPage] = useState(0);
  const [homeShowcase, setHomeShowcase] = useState<{ configured: boolean; banner: HomeShowcaseBanner | null; trendingOffers: Offer[] } | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);
  const showcaseRequestId = useRef(0);
  const showcaseLocationKey = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const heroCarouselRef = useRef<ScrollView>(null);
  const heroPageRef = useRef(0);

  const loadHomeShowcase = useCallback(async () => {
    if (!locationState.location) {
      showcaseRequestId.current += 1;
      showcaseLocationKey.current = '';
      setHomeShowcase(null);
      return;
    }
    const locationKey = `${locationState.location.latitude},${locationState.location.longitude},${locationState.location.city?._id || ''}`;
    if (showcaseLocationKey.current !== locationKey) {
      showcaseLocationKey.current = locationKey;
      setHomeShowcase(null);
    }
    const currentRequest = ++showcaseRequestId.current;
    try {
      const result = await getHomeShowcase({
        latitude: locationState.location.latitude,
        longitude: locationState.location.longitude,
        cityId: locationState.location.city?._id,
        radiusKm,
      });
      if (currentRequest === showcaseRequestId.current) setHomeShowcase({ configured: result.configured, banner: result.banner, trendingOffers: result.trendingOffers });
    } catch {
      // Keep the last successful showcase during a transient network failure.
    }
  }, [locationState.location, radiusKm]);

  useFocusEffect(useCallback(() => {
    loadHomeShowcase();
    const refresh = setInterval(loadHomeShowcase, 60_000);
    return () => { clearInterval(refresh); showcaseRequestId.current += 1; };
  }, [loadHomeShowcase]));

  const load = useCallback(async () => {
    if (!locationState.location) { setRefreshing(false); return; }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await listNearbyOffers({
        latitude: locationState.location.latitude,
        longitude: locationState.location.longitude,
        cityId: locationState.location.city?._id,
        radiusKm,
        category: category === 'All' ? undefined : category,
        search: search || undefined,
        page: 1,
        limit: 40,
      });
      if (currentRequest !== requestId.current) return;
      setOffers(response.data);
      setComingSoon(response.comingSoon);
      setPage(1);
      setHasMore(response.pagination.page < response.pagination.pages);
    } catch (e: any) {
      if (currentRequest === requestId.current) { setOffers([]); setError(e.message || 'Could not load offers. Please try again.'); setHasMore(false); }
    } finally {
      if (currentRequest === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [category, locationState.location, radiusKm, search]);

  useFocusEffect(useCallback(() => { const timer = setTimeout(load, 300); return () => { clearTimeout(timer); requestId.current += 1; }; }, [load]));

  // The feed keeps paging in more offers for the current location as the user
  // reaches the end of the horizontal list, instead of stopping at the first
  // page's 40 results.
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !locationState.location) return;
    const currentRequest = requestId.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const response = await listNearbyOffers({
        latitude: locationState.location.latitude,
        longitude: locationState.location.longitude,
        cityId: locationState.location.city?._id,
        radiusKm,
        category: category === 'All' ? undefined : category,
        search: search || undefined,
        page: nextPage,
        limit: 40,
      });
      if (currentRequest !== requestId.current) return;
      setOffers((prev) => {
        const seen = new Set(prev.map((offer) => offer._id));
        return [...prev, ...response.data.filter((offer) => !seen.has(offer._id))];
      });
      setPage(nextPage);
      setHasMore(response.pagination.page < response.pagination.pages);
    } catch {
      // Leave hasMore as-is — scrolling to the end again will just retry.
    } finally {
      if (currentRequest === requestId.current) setLoadingMore(false);
    }
  }, [category, hasMore, loading, loadingMore, locationState.location, page, radiusKm, search]);

  const onFeedScroll = (event: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number }; contentSize: { width: number } } }) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 300) loadMore();
  };

  const save = async (offerId: string) => {
    if (!accessToken) return;
    // Flip the heart immediately, then reconcile with whatever the server says.
    setSavedIds((ids) => ids.includes(offerId) ? ids.filter((id) => id !== offerId) : [...ids, offerId]);
    const result = await toggleSavedOffer(accessToken, offerId).catch(() => null);
    if (result) setSavedIds((ids) => result.saved ? [...ids.filter((id) => id !== offerId), offerId] : ids.filter((id) => id !== offerId));
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
  // Filtering and sorting are both presentational, so they stay client-side and
  // never trigger a refetch.
  const sortedOffers = useMemo(() => {
    const list = offers.filter((offer) => {
      if (feedFilter === 'popular') return offer.isFeatured;
      if (feedFilter === 'offers') return offer.discountPercentage >= BIG_DISCOUNT;
      if (feedFilter === 'nearby') return offer.distanceKm != null && offer.distanceKm <= NEARBY_KM;
      return true;
    });
    if (sortTab === 'topOffers') return list.sort((a, b) => b.discountPercentage - a.discountPercentage);
    if (sortTab === 'thisWeek') return list.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    return list.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
  }, [offers, sortTab, feedFilter]);
  const heroOffers = useMemo(() => homeShowcase?.configured ? homeShowcase.trendingOffers : sortedOffers.slice(0, 9), [homeShowcase, sortedOffers]);
  const heroPages = useMemo(() => buildHeroRotationPages(heroOffers), [heroOffers]);
  useFocusEffect(useCallback(() => {
    if (heroPages.length < 2) return;
    const rotation = setInterval(() => {
      const next = (heroPageRef.current + 1) % heroPages.length;
      heroPageRef.current = next;
      setHeroPage(next);
      heroCarouselRef.current?.scrollTo({ x: next * pageWidth, animated: next !== 0 });
    }, 5_000);
    return () => clearInterval(rotation);
  }, [heroPages.length, pageWidth]));
  useFocusEffect(useCallback(() => {
    setHeroPage(0);
    heroPageRef.current = 0;
    heroCarouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [homeShowcase?.configured, homeShowcase?.trendingOffers.map((offer) => offer._id).join(',')]));
  const [trendingOffsetY, setTrendingOffsetY] = useState(0);
  const openPostOption = (tile: typeof quickTiles[number]) => {
    // "Local Offers" is about browsing what's already on this screen, not
    // posting — so it scrolls down to the feed instead of leaving the page.
    if (tile.id === 'offer') {
      scrollRef.current?.scrollTo({ y: Math.max(trendingOffsetY - 12, 0), animated: true });
      return;
    }
    if (!tile.enabled) {
      Alert.alert(t('postStatusUpcoming'), `${t(tile.titleKey)} ${t('postOptionComingSoon')}`);
      return;
    }
    navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('PostTab', { screen: 'PostEntry' });
  };
  const openOffer = (offerId: string) => navigation.navigate('OfferDetails', { offerId, latitude: locationState.location?.latitude, longitude: locationState.location?.longitude });
  const openAllOffers = () => {
    if (!locationState.location) { locationState.setPickerVisible(true); return; }
    navigation.navigate('AllOffers', {
      latitude: locationState.location.latitude,
      longitude: locationState.location.longitude,
      cityId: locationState.location.city?._id,
      locality: locationState.location.locality,
    });
  };
  const openWishlist = () => navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('MoreTab', { screen: 'SavedOffers' });
  const openProfile = () => navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('ProfileTab', { screen: 'ProfileMain' });

  return (
    <ScreenContainer edges={['top', 'left', 'right']} backgroundColor={theme.colors.background}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <SkylineMasthead height={290} />
      <HyperlocalHeader
        offersStyle
        cityLabel={locationState.location ? `${locationState.location.locality}${locationState.location.city ? `, ${locationState.location.city.name}` : ''}` : t('chooseLocation')}
        onLocationPress={() => locationState.setPickerVisible(true)}
        onNotifications={() => navigation.navigate('Notifications')}
        unreadCount={unreadNotificationCount}
        onWishlist={openWishlist}
        wishlistHasItems={savedIds.length > 0}
        onAvatarPress={openProfile}
        avatarUri={currentUser?.avatar}
        avatarName={currentUser?.name}
      />
      <ScrollView
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); loadHomeShowcase(); }} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <View style={styles.tileRow}>
          {quickTiles.map((tile) => {
            return <Pressable key={tile.id} accessibilityRole="button" onPress={() => openPostOption(tile)} style={({ pressed }) => [
              styles.tile,
              { borderColor: tile.tint, shadowColor: tile.tint },
              pressed && styles.tilePressed,
            ]}>
              <View style={styles.tileMedia}>
                <Image source={tile.image} style={styles.tileImage} resizeMode="cover" />
                <View
                  accessible
                  accessibilityLabel={t(tile.enabled ? 'postStatusActive' : 'postStatusUpcoming')}
                  style={[styles.tileStatus, tile.enabled ? styles.tileStatusActive : styles.tileStatusUpcoming]}
                >
                  <MaterialCommunityIcons
                    name={tile.enabled ? 'check-bold' : 'clock-outline'}
                    size={11}
                    color={tile.enabled ? '#7FFFE0' : '#D6E1E4'}
                  />
                </View>
              </View>
              <View style={[styles.tileIcon, { backgroundColor: tile.tint }]}><MaterialCommunityIcons name={tile.icon} size={18} color="#FFFFFF" /></View>
              <View style={styles.tileCopy}>
                <View style={styles.tileTitleRow}>
                  <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.tileTitle}>{t(tile.titleKey)}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={14} color={tile.tint} />
                </View>
              </View>
            </Pressable>;
          })}
        </View>
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBox}>
            <View pointerEvents="none" style={styles.searchSheen} />
            <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.textMuted} />
            <TextInput value={search} onChangeText={setSearch} placeholder={t('searchOffers')} placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} multiline={false} returnKeyType="search" />
            {search ? <Pressable onPress={() => setSearch('')}><MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.textMuted} /></Pressable> : null}
          <Pressable onPress={openFilter} accessibilityLabel={t('openFilters')} style={({ pressed }) => [styles.filterButton, pressed && styles.filterPressed]}>
            <MaterialCommunityIcons name="tune-variant" size={22} color={theme.colors.primary} />
            {filterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{filterCount}</Text></View>}
          </Pressable>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {feedFilters.map((item) => {
            const isSelected = feedFilter === item.key;
            return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => setFeedFilter(item.key)} style={[styles.category, isSelected && styles.categoryActive]}>
              <MaterialCommunityIcons name={item.icon} size={17} color={isSelected ? (themeMode === 'dark' ? '#001014' : theme.colors.textInverse) : theme.colors.primary} />
              <Text style={[styles.categoryText, isSelected && styles.categoryTextActive, isSelected && themeMode === 'dark' && styles.categoryTextActiveDark]}>{t(item.labelKey)}</Text>
            </Pressable>;
          })}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel={homeShowcase?.banner?.buttonText || 'Explore offers'} onPress={openAllOffers} style={styles.bannerWrap}>
          {homeShowcase?.banner && Object.values(homeShowcase.banner).some(Boolean) ? (homeShowcase.banner.imageUrl ? <ImageBackground source={{ uri: homeShowcase.banner.imageUrl }} style={{ width: bannerWidth, height: bannerHeight }} resizeMode="cover">
            <View style={styles.bannerOverlay}>
              <Text numberOfLines={2} style={styles.bannerTitle}>{homeShowcase.banner.title}</Text>
              {homeShowcase.banner.subtitle ? <Text numberOfLines={2} style={styles.bannerSubtitle}>{homeShowcase.banner.subtitle}</Text> : null}
              {homeShowcase.banner.buttonText ? <View style={styles.bannerButton}><Text style={styles.bannerButtonText}>{homeShowcase.banner.buttonText}  →</Text></View> : null}
            </View>
          </ImageBackground> : <View style={{ width: bannerWidth, height: bannerHeight, backgroundColor: '#075E5D' }}><View style={styles.bannerOverlay}>
            <Text numberOfLines={2} style={styles.bannerTitle}>{homeShowcase.banner.title}</Text>
            {homeShowcase.banner.subtitle ? <Text numberOfLines={2} style={styles.bannerSubtitle}>{homeShowcase.banner.subtitle}</Text> : null}
            {homeShowcase.banner.buttonText ? <View style={styles.bannerButton}><Text style={styles.bannerButtonText}>{homeShowcase.banner.buttonText}  →</Text></View> : null}
          </View></View>) : <Image source={SUPPORT_LOCAL_BANNER} style={{ width: bannerWidth, height: bannerHeight }} resizeMode="cover" />}
        </Pressable>
        <View style={styles.discoverBlock} onLayout={(event) => setTrendingOffsetY(event.nativeEvent.layout.y)}>
          <SectionHeading icon="fire" title={t('discoverLocal')} action={{ label: t('viewAll'), onPress: openAllOffers }} />
        </View>
        {/* Featured carousel: one large poster beside two stacked ones per page. */}
        {heroPages.length ? <>
          <ScrollView
            ref={heroCarouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const current = Math.max(0, Math.min(heroPages.length - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth)));
              heroPageRef.current = current;
              setHeroPage(current);
            }}
            scrollEventThrottle={16}
          >
            {heroPages.map((page, index) => (
              <View key={index} style={[styles.heroPage, { width: pageWidth }]}>
                <View style={styles.heroMain}>
                  <OfferCard offer={page[0]} variant="hero" onPress={() => openOffer(page[0]._id)} onSave={() => save(page[0]._id)} saved={savedIds.includes(page[0]._id)} />
                </View>
                {page.length > 1 ? <View style={styles.heroSide}>
                  {page.slice(1).map((offer) => (
                    <OfferCard key={offer._id} offer={offer} variant="hero" compact onPress={() => openOffer(offer._id)} onSave={() => save(offer._id)} saved={savedIds.includes(offer._id)} />
                  ))}
                </View> : null}
              </View>
            ))}
          </ScrollView>
          {heroPages.length > 1 ? <View style={styles.dots}>
            {heroPages.map((_, index) => <View key={index} style={[styles.dot, index === heroPage && styles.dotActive]} />)}
          </View> : null}
        </> : null}
        {sortedOffers.length ? <View style={styles.sortRow}><SegmentedTabs options={sortTabs.map((tab) => t(tab))} value={t(sortTab)} onChange={(label) => setSortTab(sortTabs.find((tab) => t(tab) === label) || 'topOffers')} /></View> : null}
        {loading && !offers.length ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
        {error ? <Pressable onPress={load} style={styles.emptyCard}><Text style={styles.emptyText}>{error}</Text><Text style={styles.chooseText}>Tap to retry</Text></Pressable> : null}
        {!error && (comingSoon || (!loading && !offers.length)) && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="map-marker-alert-outline" size={42} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>{comingSoon ? t('offerComingSoon') : t('noNearbyOffers')}</Text>
            <Text style={styles.emptyText}>{t('tryAnotherEnabledCity')}</Text>
            <Pressable onPress={() => locationState.setPickerVisible(true)} style={styles.chooseButton}><Text style={styles.chooseText}>{t('seeAvailableCities')}</Text></Pressable>
          </View>
        )}
        {sortedOffers.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offerFeed} onScroll={onFeedScroll} scrollEventThrottle={150}>
            {sortedOffers.map((offer) => (
              <OfferTile
                key={offer._id}
                offer={offer}
                saved={savedIds.includes(offer._id)}
                onPress={() => openOffer(offer._id)}
                onSave={() => save(offer._id)}
              />
            ))}
            {loadingMore ? <ActivityIndicator color={theme.colors.primary} style={styles.feedLoader} /> : null}
          </ScrollView>
        ) : null}
      </ScrollView>
      <CityPickerModal
        visible={locationState.pickerVisible}
        cities={locationState.cities}
        onSelect={locationState.chooseManual}
        onUseCurrentLocation={locationState.detect}
        currentLocationLoading={locationState.loadingLocation}
        currentLocationError={locationState.locationError}
        onClose={() => locationState.setPickerVisible(false)}
      />
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterVisible(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>{t('filterOffers')}</Text>
              <Pressable onPress={() => setFilterVisible(false)} style={styles.closeButton} accessibilityLabel="Close filters"><MaterialCommunityIcons name="close" size={23} color={theme.colors.text} /></Pressable>
            </View>
            <Text style={styles.filterSectionTitle}>{t('searchRadius')}</Text>
            <View style={styles.filterRadiusRow}>
              {([2, 5, 10, 25] as const).map((radius) => <Pressable key={radius} onPress={() => updateDraftRadius(radius)} style={[styles.filterRadiusOption, draftRadiusKm === radius && styles.filterRadiusOptionActive]}><MaterialCommunityIcons name="map-marker-radius" size={18} color={draftRadiusKm === radius ? '#FFFFFF' : theme.colors.primary} /><Text style={[styles.filterRadiusText, draftRadiusKm === radius && styles.filterRadiusTextActive]}>{radius} KM</Text></Pressable>)}
            </View>
            <View style={styles.customRadiusRow}>
              <Text style={styles.customRadiusLabel}>{t('customRadius')}</Text>
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
            <Text style={styles.filterSectionTitle}>{t('category')}</Text>
            <View style={styles.filterCategoryWrap}>
              {filterCategories.map((item) => <Pressable key={item.label} onPress={() => setDraftCategory(item.label)} style={[styles.filterCategoryOption, draftCategory === item.label && styles.filterCategoryOptionActive]}><MaterialCommunityIcons name={item.icon || 'tag-outline'} size={17} color={draftCategory === item.label ? '#FFFFFF' : item.color} /><Text style={[styles.filterCategoryText, draftCategory === item.label && styles.filterCategoryTextActive]}>{t(item.translationKey)}</Text></Pressable>)}
            </View>
            <View style={styles.filterActions}>
              <Pressable onPress={resetFilters} style={styles.resetButton}><Text style={styles.resetButtonText}>{t('resetFilters')}</Text></Pressable>
              <Pressable onPress={applyFilters} style={styles.applyButton}><Text style={styles.applyButtonText}>{t('applyFilters')}</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" /></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

// Compact feed card: poster thumbnail with the discount badge and save heart,
// then the business name and the three metadata lines from the design.
const OfferTile: React.FC<{ offer: Offer; saved: boolean; onPress: () => void; onSave: () => void }> = ({ offer, saved, onPress, onSave }) => {
  const business = (offer.businessDocument || offer.business) as Business | undefined;
  const photo = offer.imageUrls?.[0] || offer.cardDesign?.previewUrl;
  const area = offer.locality || offer.addressDetails?.area || offer.addressDetails?.city;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={offer.title} onPress={onPress} style={({ pressed }) => [styles.tileCard, pressed && styles.tilePressed]}>
      <View style={styles.tilePhotoWrap}>
        {photo
          ? <Image source={{ uri: photo }} style={styles.tilePhoto} resizeMode="cover" />
          : <View style={[styles.tilePhoto, styles.tilePhotoFallback]}><MaterialCommunityIcons name="sale" size={34} color={theme.colors.primary} /></View>}
        {isPosterUploadOffer(offer) ? null : <View style={styles.tileBadge}><Text style={styles.tileBadgeText}>{Math.round(offer.discountPercentage)}% OFF</Text></View>}
        <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave offer' : 'Save offer'} hitSlop={8} onPress={onSave} style={styles.tileHeart}>
          <MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={17} color={saved ? theme.colors.danger : theme.colors.text} />
        </Pressable>
      </View>
      <View style={styles.tileBody}>
        <Text numberOfLines={1} style={styles.tileName}>{business?.name || offer.title}</Text>
        <TileMeta icon="tag-outline" text={offer.category} />
        {area ? <TileMeta icon="map-marker-outline" text={area} /> : null}
        <TileMeta icon="clock-outline" text={`Valid till ${new Date(offer.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`} />
      </View>
    </Pressable>
  );
};

const TileMeta = ({ icon, text }: { icon: CategoryIcon; text: string }) => (
  <View style={styles.tileMeta}>
    <MaterialCommunityIcons name={icon} size={13} color={theme.colors.textMuted} />
    <Text numberOfLines={1} style={styles.tileMetaText}>{text}</Text>
  </View>
);

const styles = createThemedStyles((c) => ({
  content: { paddingBottom: 120 },
  tileRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 11, marginTop: 2, marginBottom: 5 },
  tile: { flex: 1, minWidth: 0, height: 132, borderRadius: 16, borderWidth: 1.25, backgroundColor: c.surface, overflow: 'hidden', shadowColor: c.cardGlow, shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  tilePressed: { opacity: 0.75 },
  tileMedia: { height: 72, backgroundColor: c.surfaceAlt },
  tileImage: { width: '100%', height: '100%' },
  tileStatus: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileStatusUpcoming: { backgroundColor: 'rgba(7, 12, 14, 0.82)', borderColor: 'rgba(180, 194, 197, 0.42)' },
  tileStatusActive: { backgroundColor: 'rgba(0, 45, 37, 0.88)', borderColor: '#00E2B0' },
  // Sits astride the photo/body seam like the badges in the design.
  tileIcon: { position: 'absolute', left: 8, top: 54, zIndex: 2, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: c.surface, shadowColor: '#000000', shadowOpacity: 0.26, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  tileCopy: { flex: 1, paddingTop: 22, paddingHorizontal: 6, paddingBottom: 6 },
  tileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  tileTitle: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 14, fontWeight: '900', color: c.text },
  bannerWrap: { alignSelf: 'center', marginTop: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: c.surface, shadowColor: c.cardGlow, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  bannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 23, paddingVertical: 8, backgroundColor: 'rgba(0, 37, 36, 0.42)' },
  bannerTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 20, fontWeight: '900', maxWidth: '70%' },
  bannerSubtitle: { color: '#FFFFFF', fontSize: 9, lineHeight: 11, marginTop: 2, maxWidth: '70%' },
  bannerButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3, marginTop: 4 },
  bannerButtonText: { color: '#075C5C', fontSize: 9, fontWeight: '800' },
  discoverBlock: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10 },
  sortRow: { paddingHorizontal: 13, paddingTop: 3, paddingBottom: 12 },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginHorizontal: 13, marginTop: 10, marginBottom: 2 },
  searchBox: { flex: 1, height: 52, backgroundColor: c.surface, borderRadius: 27, borderWidth: 1, borderColor: c.cardBorder, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 5, gap: 10, shadowColor: c.cardGlow, shadowOpacity: 0.48, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  searchSheen: { position: 'absolute', top: 0, left: 28, right: 28, height: 14, borderRadius: 99, backgroundColor: c.cardFillStart, opacity: 0.6 },
  searchInput: { flex: 1, fontSize: 16, lineHeight: 22, color: c.text, paddingVertical: 0, textAlignVertical: 'center' },
  filterButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1.25, borderColor: c.cardBorder, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', shadowColor: c.cardGlow, shadowOpacity: 0.42, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  filterPressed: { transform: [{ scale: 0.9 }], opacity: 0.7 },
  filterBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, borderWidth: 2, borderColor: c.surface },
  filterBadgeText: { fontSize: 11, lineHeight: 14, fontWeight: '900', color: c.textInverse },
  categoryRow: { paddingHorizontal: 13, paddingVertical: 11, gap: 7 },
  category: { minWidth: 82, minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1.25, borderColor: c.cardBorder, shadowColor: c.shadow, shadowOpacity: 0.72, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  categoryActive: { backgroundColor: c.primary, borderColor: c.primary, shadowColor: c.primary, shadowOpacity: 0.38, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  categoryText: { fontSize: 13, lineHeight: 17, color: c.text, fontWeight: '700' },
  categoryTextActive: { color: c.textInverse, fontWeight: '800' },
  categoryTextActiveDark: { color: '#001014' },
  loader: { marginTop: 50 },
  offerFeed: { gap: 10, paddingHorizontal: 13, paddingTop: 2, paddingBottom: 10 },
  feedLoader: { width: 60, alignSelf: 'center' },
  heroPage: { height: 218, flexDirection: 'row', gap: 8, paddingHorizontal: 13 },
  heroMain: { flex: 1.58, minWidth: 0 },
  heroSide: { flex: 1, minWidth: 0, height: 218, justifyContent: 'space-between', gap: 8, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: 11, paddingBottom: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.border },
  dotActive: { width: 18, backgroundColor: c.primary },
  tileCard: { width: 158, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: '#FFFFFF', overflow: 'hidden', shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  tilePhotoWrap: { width: '100%', height: 112 },
  tilePhoto: { width: '100%', height: '100%' },
  tilePhotoFallback: { backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tileBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 8, backgroundColor: '#FFD54A', paddingHorizontal: 8, paddingVertical: 4 },
  tileBadgeText: { fontSize: 11, fontWeight: '900', color: '#1A1A1A' },
  tileHeart: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  tileBody: { padding: 10, gap: 3 },
  tileName: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: '#102333' },
  tileMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileMetaText: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 15, color: '#53677C' },
  emptyCard: { margin: 18, padding: 28, backgroundColor: c.surface, borderRadius: 22, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  emptyTitle: { ...theme.typography.h3, color: c.primaryDark, marginTop: 12, textAlign: 'center' }, emptyText: { ...theme.typography.body, color: c.textSecondary, textAlign: 'center', marginTop: 6 },
  chooseButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 99, backgroundColor: c.primaryLight }, chooseText: { ...theme.typography.caption, color: c.primaryDark, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: c.overlay },
  filterSheet: { maxHeight: '78%', paddingHorizontal: 20, paddingTop: 17, paddingBottom: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: c.surface, shadowColor: c.shadowStrong, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: -7 }, elevation: 12 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  filterTitle: { ...theme.typography.h2, color: c.text },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: c.surfaceAlt },
  filterSectionTitle: { ...theme.typography.bodyBold, color: c.text, marginBottom: 9 },
  filterRadiusRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  filterRadiusOption: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 16, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  filterRadiusOptionActive: { backgroundColor: c.primary, borderColor: c.primary, shadowColor: c.primary, shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  filterRadiusText: { ...theme.typography.caption, color: c.text, fontWeight: '800' },
  filterRadiusTextActive: { color: c.textInverse },
  customRadiusRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 1 },
  customRadiusLabel: { flex: 1, ...theme.typography.caption, color: c.textSecondary, fontWeight: '800' },
  customRadiusInputWrap: { minWidth: 78, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  customRadiusInput: { width: 70, paddingVertical: 0, textAlign: 'center', ...theme.typography.bodyBold, color: c.text },
  customRadiusUnit: { width: 27, ...theme.typography.caption, color: c.textSecondary, fontWeight: '900' },
  radiusSlider: { width: '100%', height: 34, marginTop: 1, marginBottom: 17 },
  filterCategoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 21 },
  filterCategoryOption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 20, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  filterCategoryOptionActive: { backgroundColor: c.primary, borderColor: c.primary },
  filterCategoryText: { ...theme.typography.tiny, color: c.text, fontWeight: '800' },
  filterCategoryTextActive: { color: c.textInverse },
  filterActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 15 },
  resetButton: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  resetButtonText: { ...theme.typography.button, color: c.textSecondary },
  applyButton: { flex: 1.6, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 25, backgroundColor: c.primary, shadowColor: c.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  applyButtonText: { ...theme.typography.button, color: c.textInverse },
}));
