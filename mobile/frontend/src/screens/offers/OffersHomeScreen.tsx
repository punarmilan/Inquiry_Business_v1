import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
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
import { DynamicRenderer } from '../../components/DynamicRenderer';
import { UIHomeBanner } from '../../components/UIHomeBanner';
import { homeCards, homeCopy } from '../../utils/uiHome';
import type { UIHomeCard } from '../../types/dynamicUI';
import { useUIConfig } from '../../hooks/useUIConfig';
import type { UIActions, UIBusinessData } from '../../components/ComponentRegistry';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import { getHomeShowcase, listNearbyOffers, listSavedOffers, toggleSavedOffer } from '../../services/api';
import type { HomeShowcaseBanner } from '../../services/api';
import type { Offer } from '../../types/hyperlocal';
import type { MainTabParamList, OffersStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { SectionHeading } from '../../components/NeonUI';
import { offerCategories } from './OfferUI';
import { HomePromoCarousel } from './HomePromoCarousel';
import { HomeShortcuts } from './HomeShortcuts';
import { openHomeLink } from '../../services/homeLinks';
import { showTabBar } from '../../navigation/hideTabBarOnScroll';
import { theme, createThemedStyles } from '../../theme';
import type { TranslationKey } from '../../i18n/translations';

type Props = NativeStackScreenProps<OffersStackParamList, 'OffersHome'>;
type CategoryIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type RadiusKm = number;
// Quick filters above the feed. These narrow which offers are shown; the sort
// tabs further down only reorder whatever survives the filter.
type FeedFilter = 'all' | 'popular' | 'offers' | 'nearby';
const feedFilters: Array<{ key: FeedFilter | 'saved'; labelKey: TranslationKey; icon: CategoryIcon }> = [
  { key: 'all', labelKey: 'filterAll', icon: 'view-grid' },
  { key: 'popular', labelKey: 'filterPopular', icon: 'fire' },
  { key: 'offers', labelKey: 'chipOffers', icon: 'tag-outline' },
  { key: 'nearby', labelKey: 'filterNearby', icon: 'map-marker-outline' },
  { key: 'saved', labelKey: 'homeShortcutSaved', icon: 'heart-outline' },
];
const NEARBY_KM = 5;
const BIG_DISCOUNT = 30;

// Match the reference banner frame; cover trims the artwork edges uniformly.
const SUPPORT_LOCAL_BANNER = require('../../../assets/reference-home/support-local.png');
const BANNER_RATIO = 3.8;
const BANNER_MARGIN = 13;

// Feed ordering. 'Top Offers' ranks by discount, 'This Week' by newest, and
// 'Near You' by distance when the API returned one.
const sortTabs = ['topOffers', 'thisWeek', 'sortNearYou'] as const;
type SortTab = typeof sortTabs[number];

const filterCategories = offerCategories;

export const OffersHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken, currentUser, unreadNotificationCount, t, themeMode, hasApprovedBusiness } = useApp();
  const { refresh: refreshUI, state: uiState, locale: uiLocale = 'en' } = useUIConfig();
  const managedHome = useMemo(() => uiState?.config.enabled && !uiState.config.useNativeFallback ? homeCards(uiState.config.base.pages.offersHome) : [], [uiState?.config]);
  const homeControlled = managedHome.length > 0;
  const topBanner = managedHome.find(card => card.props.placement === 'aboveTrending');
  const bottomBanner = managedHome.find(card => card.props.placement === 'belowTrending');
  const trendingSettings = managedHome.find(card => card.props.placement === 'trending');
  const showTrending = !homeControlled || Boolean(trendingSettings && !trendingSettings.hidden);
  const locationState = useHyperlocalLocation();
  const { width: windowWidth } = useWindowDimensions();
  const trendingCardWidth = (windowWidth - 28 - 18) / 4;
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
  const [sortTab] = useState<SortTab>('topOffers');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [homeShowcase, setHomeShowcase] = useState<{ configured: boolean; banner: HomeShowcaseBanner | null; trendingOffers: Offer[] } | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const savedRequestId = useRef(0);
  const savingIds = useRef(new Set<string>());
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
  const searchRef = useRef<TextInput>(null);

  useFocusEffect(useCallback(() => {
    const current = ++savedRequestId.current;
    let active = true;
    if (!accessToken) setSavedIds([]);
    else void listSavedOffers(accessToken).then(result => {
      if (active && current === savedRequestId.current) setSavedIds(result.data.map(offer => offer._id));
    }).catch(() => {});
    return () => { active = false; };
  }, [accessToken]));

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
    if (!accessToken || savingIds.current.has(offerId)) return;
    savingIds.current.add(offerId);
    savedRequestId.current += 1;
    const wasSaved = savedIds.includes(offerId);
    // Flip the heart immediately, then reconcile with whatever the server says.
    setSavedIds((ids) => ids.includes(offerId) ? ids.filter((id) => id !== offerId) : [...ids, offerId]);
    const result = await toggleSavedOffer(accessToken, offerId).catch(() => null);
    const saved = result ? result.saved : wasSaved;
    setSavedIds((ids) => saved ? [...ids.filter((id) => id !== offerId), offerId] : ids.filter((id) => id !== offerId));
    savingIds.current.delete(offerId);
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
  const hasFeedFilters = Boolean(search.trim() || category !== 'All' || feedFilter !== 'all');
  const heroOffers = useMemo(() => homeShowcase?.configured && !hasFeedFilters ? homeShowcase.trendingOffers : sortedOffers, [hasFeedFilters, homeShowcase, sortedOffers]);
  const visibleHeroOffers = heroOffers.filter(offer => !managedHome.some(card => card.props.placement === 'offer' && card.props.offerId === offer._id && card.hidden)).slice(0, trendingSettings?.props.limit || 40);
  useFocusEffect(useCallback(() => { showTabBar(); }, []));

  const showUpcoming = (title: TranslationKey) => {
    Alert.alert(t('postStatusUpcoming'), `${t(title)} ${t('postOptionComingSoon')}`);
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
  // Presentation only: the same APIs, location/search filters, saved state and
  // route gates used by the native homepage remain authoritative.
  const uiActions: UIActions = {
    'offers.openAll': openAllOffers,
    'business.openCenter': () => navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('MoreTab', { screen: 'BusinessCenter' }),
    'profile.openSettings': () => navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('ProfileTab', { screen: 'Settings' }),
  };
  const uiData: UIBusinessData = {
    offers: { nearby: sortedOffers, showcase: homeShowcase?.trendingOffers || [] },
    savedOfferIds: savedIds, onOfferPress: openOffer, onOfferSave: (id) => { void save(id); },
  };

  const cityLabel = locationState.location ? `${locationState.location.locality}${locationState.location.city ? `, ${locationState.location.city.name}` : ''}` : t('chooseLocation');
  const openServices = () => navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('ServicesTab', { screen: 'ServicesHome' });
  const openPost = () => {
    const tabs = navigation.getParent<NavigationProp<MainTabParamList>>();
    if (hasApprovedBusiness) tabs?.navigate('PostTab', { screen: 'PostMenu' });
    else tabs?.navigate('MoreTab', { screen: 'BusinessCenter' });
  };

  const homeAction = (card: UIHomeCard) => {
    if (card.props.homeAction === 'link') { void openHomeLink(card.props.linkUrl, uiLocale); }
    else if (card.props.homeAction === 'post') openPost();
    else if (card.props.homeAction === 'services') openServices();
    else if (card.props.homeAction === 'events') showUpcoming('quickTileEvent');
    else openAllOffers();
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']} backgroundColor={theme.colors.background}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <Image source={require('../../../assets/reference-home/skyline.png')}
        style={[styles.scenicBackdrop, { height: windowWidth * 0.85, opacity: themeMode === 'dark' ? 0.18 : 0.55 }]} resizeMode="cover" />
      <HyperlocalHeader
        offersStyle
        locationLabel={t('homeDiscoverTitle')}
        cityLabel={cityLabel}
        onLocationPress={() => locationState.setPickerVisible(true)}
        onNotifications={() => navigation.navigate('Notifications')}
        unreadCount={unreadNotificationCount}
        onWishlist={openWishlist}
        wishlistHasItems={savedIds.length > 0}
        onAvatarPress={openProfile}
        avatarUri={currentUser?.avatar}
        avatarName={currentUser?.name}
      />
      <Text style={styles.communityTagline}>{t('homeCommunityTagline')}</Text>
      <ScrollView
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); loadHomeShowcase(); void refreshUI(); }} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DynamicRenderer pageKey="offersHome" slot="beforeContent" actions={uiActions} data={uiData}
          isVisible={(block) => block.type !== 'offerRail' || Boolean(locationState.location && !loading && !error && !comingSoon)} />
        <HomePromoCarousel cards={homeControlled ? managedHome.filter(card => card.props.placement === 'promo') : undefined}
          settings={uiState?.config.enabled && !uiState.config.useNativeFallback ? uiState.config.base.pages.offersHome.homeHeader : undefined}
          onCardPress={homeAction}
          onOffers={openAllOffers}
          onServices={openServices}
          onPost={openPost}
          onEvents={() => showUpcoming('quickTileEvent')}
        />
        <HomeShortcuts onSelect={shortcut => {
          if (shortcut === 'services') openServices();
          else if (shortcut === 'post') openPost();
          else if (shortcut === 'events') showUpcoming('quickTileEvent');
          else openAllOffers();
        }} />
          <View style={styles.searchFilterRow}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.textMuted} />
              <TextInput ref={searchRef} value={search} onChangeText={setSearch} accessibilityLabel={t('searchOffers')} placeholder={t('homeSearchPlaceholder')} placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} multiline={false} returnKeyType="search" />
              {search ? <Pressable accessibilityRole="button" accessibilityLabel={t('clearSearch')} hitSlop={8} onPress={() => { setSearch(''); searchRef.current?.focus(); }}><MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.textMuted} /></Pressable> : null}
            <Pressable onPress={openFilter} accessibilityLabel={t('openFilters')} style={({ pressed }) => [styles.filterButton, pressed && styles.filterPressed]}>
              <MaterialCommunityIcons name="tune-variant" size={22} color={theme.colors.primary} />
              {filterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{filterCount}</Text></View>}
            </Pressable>
            </View>
          </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {feedFilters.map((item) => {
            const isSelected = feedFilter === item.key;
            return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => item.key === 'saved' ? openWishlist() : setFeedFilter(item.key)} style={[styles.category, isSelected && styles.categoryActive]}>
              <MaterialCommunityIcons name={item.icon} size={19} color={isSelected ? '#FFFFFF' : item.key === 'popular' || item.key === 'saved' ? theme.colors.accent : theme.colors.primary} />
              <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>{t(item.labelKey)}</Text>
            </Pressable>;
          })}
        </ScrollView>
        {homeControlled ? (topBanner ? <UIHomeBanner card={topBanner} locale={uiLocale} width={bannerWidth} onPress={() => homeAction(topBanner)} /> : null) : (<Pressable accessibilityRole="button" accessibilityLabel={homeShowcase?.banner?.buttonText || t('navExplore')} onPress={openAllOffers} style={styles.bannerWrap}>
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
        </Pressable>)}
        {showTrending ? <View style={styles.discoverBlock}>
          <SectionHeading variant="home" icon="fire" iconColor="#FF5A0A" title={trendingSettings ? homeCopy(trendingSettings.props.title, uiLocale) : t('discoverLocal')} action={{ label: t('viewAll'), onPress: openAllOffers }} />
        </View> : null}
        {showTrending && visibleHeroOffers.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingRail} onScroll={homeShowcase?.configured && !hasFeedFilters ? undefined : onFeedScroll} scrollEventThrottle={150}>
          {visibleHeroOffers.map(offer => <View key={offer._id} style={{ width: trendingCardWidth }}>
            <OfferCard offer={offer} variant="neighbourhood" height={116} homeMedia={managedHome.find(card => card.props.placement === 'offer' && card.props.offerId === offer._id) || (trendingSettings?.props.media !== 'none' ? trendingSettings : undefined)}
              onPress={() => openOffer(offer._id)} onSave={() => save(offer._id)} saved={savedIds.includes(offer._id)} />
          </View>)}
          {loadingMore ? <ActivityIndicator color={theme.colors.primary} style={styles.feedLoader} /> : null}
        </ScrollView> : null}
        {homeControlled ? (bottomBanner ? <UIHomeBanner card={bottomBanner} locale={uiLocale} width={bannerWidth} onPress={() => homeAction(bottomBanner)} /> : null) : (<Pressable accessibilityRole="button"
          accessibilityLabel={`${t('homeMoreDealsTitle')} ${t('navExplore')}`}
          onPress={openAllOffers} style={({ pressed }) => [styles.bannerWrap, styles.moreDealsBanner, pressed && { opacity: 0.85 }]}>
          <ImageBackground source={require('../../../assets/reference-home/more-local-deals.png')}
            style={{ width: bannerWidth, minHeight: Math.max(100, bannerHeight) }} resizeMode="cover">
            <View style={styles.moreDealsCopy}>
              <Text style={styles.moreDealsTitle}>{t('homeMoreDealsTitle')}</Text>
              <Text style={styles.moreDealsCaption}>{t('homeMoreDealsCaption')}</Text>
              <View style={[styles.bannerButton, styles.moreDealsButton]}>
                <Text style={styles.moreDealsButtonText}>{t('navExplore')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
              </View>
            </View>
          </ImageBackground>
        </Pressable>)}
        {loading && !offers.length ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
        {error ? <Pressable onPress={load} style={styles.emptyCard}><Text style={styles.emptyText}>{error}</Text><Text style={styles.chooseText}>Tap to retry</Text></Pressable> : null}
        {!error && (comingSoon || (!loading && !sortedOffers.length)) && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="map-marker-alert-outline" size={42} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>{comingSoon ? t('offerComingSoon') : hasFeedFilters ? t('noOffersMatch') : t('noNearbyOffers')}</Text>
            <Text style={styles.emptyText}>{t(hasFeedFilters && !comingSoon ? 'noOffersMatchHint' : 'tryAnotherEnabledCity')}</Text>
            <Pressable accessibilityRole="button" onPress={() => {
              if (hasFeedFilters && !comingSoon) { setSearch(''); setCategory('All'); setFeedFilter('all'); setRadiusKm(10); }
              else locationState.setPickerVisible(true);
            }} style={styles.chooseButton}><Text style={styles.chooseText}>{t(hasFeedFilters && !comingSoon ? 'resetFilters' : 'seeAvailableCities')}</Text></Pressable>
          </View>
        )}
        <DynamicRenderer pageKey="offersHome" slot="afterContent" actions={uiActions} data={uiData}
          isVisible={(block) => block.type !== 'offerRail' || Boolean(locationState.location && !loading && !error && !comingSoon)} />
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

const styles = createThemedStyles((c) => ({
  content: { paddingBottom: 104 },
  scenicBackdrop: { position: 'absolute', top: 0, width: '100%' },
  communityTagline: { marginLeft: 64, marginRight: 14, marginTop: -4, marginBottom: 5, color: c.textSecondary, fontSize: 9, lineHeight: 14 },
  trendingRail: { paddingHorizontal: 14, gap: 6, paddingBottom: 10 },
  moreDealsBanner: { marginTop: 2, backgroundColor: '#FFE7D5' },
  moreDealsCopy: { width: '65%', paddingHorizontal: 14, paddingVertical: 12, alignItems: 'flex-start', justifyContent: 'center' },
  moreDealsTitle: { color: '#173142', fontSize: 15, lineHeight: 19, fontWeight: '800', letterSpacing: -0.3 },
  moreDealsCaption: { color: '#475560', fontSize: 9, lineHeight: 13, marginTop: 3 },
  moreDealsButton: { backgroundColor: '#086C6F', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, marginTop: 7 },
  moreDealsButtonText: { color: '#FFFFFF', fontSize: 9, lineHeight: 13, fontWeight: '700' },
  bannerWrap: { alignSelf: 'center', marginTop: 7, borderRadius: 17, overflow: 'hidden', backgroundColor: c.surface, shadowColor: c.cardGlow, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  bannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 23, paddingVertical: 8, backgroundColor: 'rgba(0, 37, 36, 0.42)' },
  bannerTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 20, fontWeight: '900', maxWidth: '70%' },
  bannerSubtitle: { color: '#FFFFFF', fontSize: 9, lineHeight: 11, marginTop: 2, maxWidth: '70%' },
  bannerButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3, marginTop: 4 },
  bannerButtonText: { color: '#075C5C', fontSize: 9, fontWeight: '800' },
  discoverBlock: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginHorizontal: 13, marginTop: 4, marginBottom: 3 },
  searchBox: { flex: 1, height: 42, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.cardBorder, flexDirection: 'row', alignItems: 'center', paddingLeft: 15, paddingRight: 4, gap: 10, shadowColor: c.cardGlow, shadowOpacity: 0, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  searchInput: { flex: 1, fontSize: 12, lineHeight: 18, color: c.text, paddingVertical: 0, textAlignVertical: 'center' },
  filterButton: { width: 39, height: 32, borderRadius: 17, borderWidth: 1.25, borderColor: c.cardBorder, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', shadowColor: c.cardGlow, shadowOpacity: 0.42, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  filterPressed: { transform: [{ scale: 0.9 }], opacity: 0.7 },
  filterBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, borderWidth: 2, borderColor: c.surface },
  filterBadgeText: { fontSize: 11, lineHeight: 14, fontWeight: '900', color: c.marketActionInk },
  categoryRow: { paddingHorizontal: 13, paddingTop: 7, paddingBottom: 7, gap: 5, minWidth: '100%' },
  category: { flex: 1, minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder },
  categoryActive: { backgroundColor: c.primaryDark, borderColor: c.primaryDark },
  categoryText: { fontSize: 10, lineHeight: 15, color: c.text, fontWeight: '700' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '800' },
  loader: { marginTop: 50 },
  feedLoader: { width: 60, alignSelf: 'center' },
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
