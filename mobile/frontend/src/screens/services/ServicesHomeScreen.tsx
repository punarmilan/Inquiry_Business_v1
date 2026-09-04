import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { HyperlocalHeader } from '../../components/HyperlocalHeader';
import { CityPickerModal } from '../../components/CityPickerModal';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import { listServiceCategories, listServiceProviders } from '../../services/api';
import type { ServiceCategory, ServiceProvider } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { getProviderAvatar } from '../../config/providerAvatars';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServicesHome'>;
type FilterKey = 'location' | 'experience' | 'service' | 'more';

const normalize = (value: string) => value.trim().toLocaleLowerCase('en-IN');

export const ServicesHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { unreadNotificationCount } = useApp();
  const locationState = useHyperlocalLocation();
  const scrollRef = useRef<ScrollView>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [selectedLocality, setSelectedLocality] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [experience, setExperience] = useState(0);
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [showAllCityProviders, setShowAllCityProviders] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [comingSoon, setComingSoon] = useState(false);
  const [loading, setLoading] = useState(false);

  const city = locationState.location?.city;
  const cityId = city?._id;

  const load = useCallback(async () => {
    if (!cityId) {
      setComingSoon(Boolean(locationState.location));
      setCategories([]);
      setProviders([]);
      return;
    }
    setLoading(true);
    try {
      const [categoryResponse, providerResponse] = await Promise.all([
        listServiceCategories(cityId),
        listServiceProviders(cityId),
      ]);
      setCategories(categoryResponse.data);
      setAvailableAreas(categoryResponse.availableAreas || categoryResponse.city?.localities || []);
      setProviders(providerResponse.data);
      setComingSoon(categoryResponse.comingSoon);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [cityId, locationState.location]);

  useEffect(() => { setSelectedLocality(locationState.location?.locality || ''); }, [locationState.location?.locality, cityId]);
  useEffect(() => { load(); }, [load]);

  const locationNames = useMemo(() => {
    const names = [...availableAreas];
    providers.forEach((provider) => provider.serviceAreas?.forEach((area) => {
      if (!names.some((name) => normalize(name) === normalize(area))) names.push(area);
    }));
    return names;
  }, [availableAreas, providers]);

  const visibleProviders = useMemo(() => {
    const query = normalize(search);
    return providers.filter((provider) => {
      const categoryNames = provider.categories?.map((item) => item.name).join(' ') || '';
      const searchable = `${provider.name} ${categoryNames} ${provider.serviceAreas?.join(' ') || ''}`;
      return (!query || normalize(searchable).includes(query)) &&
        (!selectedLocality || provider.serviceAreas?.some((area) => normalize(area) === normalize(selectedLocality))) &&
        (!selectedCategory || provider.categories?.some((item) => item._id === selectedCategory)) &&
        (!experience || Number(provider.experienceYears || 0) >= experience) &&
        provider.availability === 'available';
    }).sort((a, b) => Number(b.ratingAverage || 0) - Number(a.ratingAverage || 0) || Number(b.completedBookings || 0) - Number(a.completedBookings || 0));
  }, [experience, onlineOnly, providers, search, selectedCategory, selectedLocality]);

  const allCityProviders = useMemo(() => {
    const query = normalize(search);
    return providers.filter((provider) => {
      const categoryNames = provider.categories?.map((item) => item.name).join(' ') || '';
      const searchable = `${provider.name} ${categoryNames} ${provider.serviceAreas?.join(' ') || ''}`;
      return (!query || normalize(searchable).includes(query)) &&
        (!selectedCategory || provider.categories?.some((item) => item._id === selectedCategory)) &&
        (!experience || Number(provider.experienceYears || 0) >= experience) &&
        provider.availability === 'available';
    }).sort((a, b) => Number(b.ratingAverage || 0) - Number(a.ratingAverage || 0) || Number(b.completedBookings || 0) - Number(a.completedBookings || 0));
  }, [experience, providers, search, selectedCategory]);

  const locationStats = useMemo(() => locationNames.map((name) => ({
    name,
    count: providers.filter((provider) => provider.serviceAreas?.some((area) => normalize(area) === normalize(name))).length,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en-IN')), [locationNames, providers]);

  const openBooking = (provider?: ServiceProvider) => {
    const providerCategory = provider?.categories?.find((item) => categories.some((category) => category._id === item._id));
    const category = providerCategory ? categories.find((item) => item._id === providerCategory._id) : categories.find((item) => item._id === selectedCategory) || categories[0];
    if (!category || !cityId) return;
    navigation.navigate('BookService', { categoryId: category._id, categoryName: category.name, basePrice: category.basePrice, cityId, availableAreas, providerId: provider?._id });
  };

  const chooseFilter = (value: string) => {
    if (activeFilter === 'location') setSelectedLocality(value === 'All locations' ? '' : value);
    if (activeFilter === 'experience') setExperience(Number(value));
    if (activeFilter === 'service') setSelectedCategory(value === 'All services' ? '' : value);
    if (activeFilter === 'more') {
      if (value === 'Online now') setOnlineOnly(true);
      if (value === 'Reset filters') {
        setSelectedLocality(locationState.location?.locality || ''); setSelectedCategory(''); setExperience(0); setOnlineOnly(true); setSearch('');
      }
    }
    setActiveFilter(null);
  };

  const filterOptions = activeFilter === 'location'
    ? ['All locations', ...locationNames]
    : activeFilter === 'experience'
      ? ['0', '3', '5', '8']
      : activeFilter === 'service'
        ? ['All services', ...categories.map((category) => category._id)]
        : ['Online now', 'Reset filters'];
  const providerItems = showAllProviders ? visibleProviders : visibleProviders.slice(0, 6);
  const additionalProviderItems = allCityProviders.filter((provider) => !visibleProviders.some((visible) => visible._id === provider._id));
  const cityProviderItems = showAllCityProviders ? additionalProviderItems : additionalProviderItems.slice(0, 6);
  const locationItems = showAllLocations ? locationStats : locationStats.slice(0, 5);
  const currentLocationLabel = selectedLocality && city ? `${selectedLocality}, ${city.name}` : city?.name || 'Choose location';

  return <ScreenContainer>
    <HyperlocalHeader locationLabel="YOUR LOCATION" cityLabel={currentLocationLabel} onLocationPress={() => locationState.setPickerVisible(true)} onNotifications={() => navigation.navigate('Notifications')} onInbox={() => navigation.navigate('ChatList')} unreadCount={unreadNotificationCount} />
    <ScrollView ref={scrollRef} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.colors.primary]} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.searchPanel}>
        <View style={styles.searchRow}><MaterialCommunityIcons name="magnify" size={27} color={theme.colors.textSecondary} /><TextInput value={search} onChangeText={setSearch} placeholder="Search for electricians, plumbers, cleaners..." placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} returnKeyType="search" /><Pressable onPress={() => setActiveFilter('more')} style={styles.filterButton}><MaterialCommunityIcons name="filter-outline" size={21} color={theme.colors.textInverse} /><Text style={styles.filterButtonText}>Filter</Text></Pressable></View>
        <View style={[styles.filterRow, filterStyles.filterRow]}>
          <FilterButton icon="map-marker-outline" label={selectedLocality || 'Location'} active={Boolean(selectedLocality)} onPress={() => setActiveFilter('location')} />
          <FilterButton wide icon="briefcase-outline" label={experience ? `${experience}+ yrs` : 'Experience'} active={Boolean(experience)} onPress={() => setActiveFilter('experience')} />
          <FilterButton icon="view-grid-outline" label={selectedCategory ? categories.find((category) => category._id === selectedCategory)?.name || 'Service' : 'Service'} active={Boolean(selectedCategory)} onPress={() => setActiveFilter('service')} />
          <FilterButton icon="sort-variant" label={onlineOnly ? 'Online now' : 'More'} active={onlineOnly} onPress={() => setActiveFilter('more')} />
        </View>
      </View>

      {comingSoon ? <View style={styles.empty}><MaterialCommunityIcons name="map-marker-alert-outline" size={43} color={theme.colors.primary} /><Text style={styles.emptyTitle}>We're coming to your city soon.</Text><Text style={styles.emptyText}>Services are currently available only in selected cities.</Text><Pressable onPress={() => locationState.setPickerVisible(true)} style={styles.choose}><Text style={styles.chooseText}>View available cities</Text></Pressable></View> : null}

      <SectionHeading title="Service Providers" onPress={() => setShowAllProviders((value) => !value)} expanded={showAllProviders} />
      {loading && !providers.length ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
      {!loading && !visibleProviders.length ? <View style={[styles.noResults, compactStyles.noResults]}><MaterialCommunityIcons name="account-search-outline" size={28} color={theme.colors.textMuted} /><Text style={styles.noResultsTitle}>No providers match these filters</Text><Text style={styles.noResultsText}>Try another locality, service or availability filter.</Text></View> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRow}>{providerItems.map((provider) => <ProviderCard key={provider._id} provider={provider} favorite={favorites.includes(provider._id)} onFavorite={() => setFavorites((current) => current.includes(provider._id) ? current.filter((id) => id !== provider._id) : [...current, provider._id])} onBook={() => openBooking(provider)} />)}</ScrollView>

      {additionalProviderItems.length ? <><SectionHeading title="All Service Providers" onPress={() => setShowAllCityProviders((value) => !value)} expanded={showAllCityProviders} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRow}>{cityProviderItems.map((provider) => <ProviderCard key={provider._id} provider={provider} favorite={favorites.includes(provider._id)} onFavorite={() => setFavorites((current) => current.includes(provider._id) ? current.filter((id) => id !== provider._id) : [...current, provider._id])} onBook={() => openBooking(provider)} />)}</ScrollView></> : null}

      <SectionHeading title="Top Locations" onPress={() => setShowAllLocations((value) => !value)} expanded={showAllLocations} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationRow}>{locationItems.map((item, index) => <Pressable key={item.name} onPress={() => { setSelectedLocality(item.name); scrollRef.current?.scrollTo({ y: 0, animated: true }); }} style={[styles.locationCard, rectangleStyles.locationCard]}><View style={styles.locationIcon}><MaterialCommunityIcons name={index < 2 ? 'map-marker-outline' : 'home-city-outline'} size={27} color={theme.colors.textSecondary} /></View><View><Text style={styles.locationName}>{item.name}</Text><Text style={styles.locationCount}>{item.count} {item.count === 1 ? 'Provider' : 'Providers'}</Text></View></Pressable>)}</ScrollView>
      <View style={styles.trust}><View style={styles.trustIcon}><MaterialCommunityIcons name="shield-check" size={27} color={theme.colors.textInverse} /></View><View style={styles.flex}><Text style={styles.trustTitle}>Verified & Trusted</Text><Text style={styles.trustText}>All providers are admin verified for your safety and peace of mind.</Text></View></View>
    </ScrollView>
    <CityPickerModal visible={locationState.pickerVisible} cities={locationState.cities.filter((item) => item.servicesEnabled || item.offersEnabled)} onSelect={locationState.chooseManual} onClose={() => locationState.setPickerVisible(false)} />
    <Modal visible={Boolean(activeFilter)} transparent animationType="slide" onRequestClose={() => setActiveFilter(null)}><Pressable style={styles.modalBackdrop} onPress={() => setActiveFilter(null)}><Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>{activeFilter === 'location' ? 'Choose location' : activeFilter === 'experience' ? 'Experience' : activeFilter === 'service' ? 'Choose service' : 'More filters'}</Text>{filterOptions.map((value) => { const label = activeFilter === 'service' ? categories.find((category) => category._id === value)?.name || value : activeFilter === 'experience' ? (value === '0' ? 'Any experience' : `${value}+ years`) : value; return <Pressable key={value} onPress={() => chooseFilter(value)} style={styles.modalOption}><Text style={styles.modalOptionText}>{label}</Text><MaterialCommunityIcons name="chevron-right" size={21} color={theme.colors.textMuted} /></Pressable>; })}</Pressable></Pressable></Modal>
  </ScreenContainer>;
};

const SectionHeading: React.FC<{ title: string; onPress: () => void; expanded: boolean }> = ({ title, onPress, expanded }) => <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text><Pressable onPress={onPress}><Text style={styles.viewAll}>{expanded ? 'Show less' : 'View all'}</Text></Pressable></View>;
const FilterButton: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; active: boolean; wide?: boolean; onPress: () => void }> = ({ icon, label, active, wide, onPress }) => <Pressable onPress={onPress} style={[styles.filterChip, filterStyles.filterChip, wide && filterStyles.filterChipWide, active && styles.filterChipActive]}><MaterialCommunityIcons name={icon} size={17} color={active ? theme.colors.primary : theme.colors.text} /><Text style={[styles.filterChipText, active && styles.filterChipTextActive]} numberOfLines={1}>{label}</Text><MaterialCommunityIcons name="chevron-down" size={16} color={active ? theme.colors.primary : theme.colors.text} /></Pressable>;

const ProviderCard: React.FC<{ provider: ServiceProvider; favorite: boolean; onFavorite: () => void; onBook: () => void }> = ({ provider, favorite, onFavorite, onBook }) => {
  const category = provider.categories?.[0];
  const localAvatar = getProviderAvatar(provider.name);
  const availabilityLabel = provider.availability === 'available' ? 'Online' : provider.availability === 'busy' ? 'Busy' : 'Offline';
  return <View style={[styles.providerCard, rectangleStyles.providerCard]}><View style={[styles.providerImage, rectangleStyles.providerImage]}>{localAvatar ? <Image source={localAvatar} style={styles.providerPhoto} /> : provider.photoUrl ? <Image source={{ uri: provider.photoUrl }} style={styles.providerPhoto} /> : <View style={styles.providerFallback}><Avatar name={provider.name} size={68} /></View>}<View style={styles.rating}><MaterialCommunityIcons name="star" size={13} color={theme.colors.textInverse} /><Text style={styles.ratingText}>{provider.ratingAverage || 'New'}</Text></View><Pressable onPress={onFavorite} style={styles.favorite}><MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={23} color={favorite ? theme.colors.danger : theme.colors.textSecondary} /></Pressable></View><View style={styles.providerDetails}><Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text><Text style={styles.providerService} numberOfLines={1}>{category?.name || 'Service provider'}</Text><Text style={styles.providerLocation} numberOfLines={1}><MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.textMuted} /> {provider.serviceAreas?.[0] || 'Local'} · {availabilityLabel}</Text><Text style={styles.providerMeta}>{provider.experienceYears || 0}+ Years Exp. · {provider.completedBookings || 0}+ Jobs</Text><Pressable disabled={provider.availability === 'busy'} onPress={onBook} style={[styles.bookButton, rectangleStyles.bookButton, provider.availability === 'busy' && styles.bookButtonDisabled]}><Text style={[styles.bookButtonText, provider.availability === 'busy' && styles.bookButtonTextDisabled]}>{provider.availability === 'available' ? 'Book Now' : provider.availability === 'busy' ? 'Busy' : 'Book'}</Text></Pressable></View></View>;
};

const rectangleStyles = StyleSheet.create({ providerCard: { borderRadius: 10, width: 248 }, providerImage: { height: 158 }, bookButton: { borderRadius: 7 }, locationCard: { borderRadius: 10, minWidth: 178 } });
const filterStyles = StyleSheet.create({ filterRow: { flexDirection: 'row', gap: 7 }, filterChip: { flex: 1, minWidth: 0, paddingHorizontal: 6, gap: 3 }, filterChipWide: { flex: 1.25 } });
const compactStyles = StyleSheet.create({ noResults: { paddingVertical: 14, paddingHorizontal: 12 } });

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 125 }, flex: { flex: 1 }, searchPanel: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 11, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, searchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 15, paddingLeft: 12, minHeight: 56 }, searchInput: { flex: 1, height: 54, paddingHorizontal: 10, color: theme.colors.text, fontSize: 15 }, filterButton: { minHeight: 54, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.primary }, filterButtonText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '900' }, filterRow: { gap: 10, paddingTop: 11 }, filterChip: { minWidth: 116, height: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.surface }, filterChipActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary }, filterChipText: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: '700' }, filterChipTextActive: { color: theme.colors.primaryDark }, hero: { minHeight: 192, borderRadius: 22, padding: 18, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, heroPeople: { width: 82, alignItems: 'center', justifyContent: 'center' }, shield: { width: 66, height: 66, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center' }, avatarStack: { width: 82, height: 38, marginTop: 8, marginLeft: -16 }, stackAvatar: { position: 'absolute', borderWidth: 2, borderColor: theme.colors.textInverse, borderRadius: 22 }, heroCopy: { flex: 1 }, heroTitle: { color: theme.colors.textInverse, fontSize: 21, lineHeight: 26, fontWeight: '900' }, heroText: { color: '#DDF8F5', fontSize: 14, lineHeight: 20, marginTop: 7 }, heroButton: { position: 'absolute', right: 15, bottom: 16, backgroundColor: 'rgba(0,0,0,.18)', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }, heroButtonText: { color: theme.colors.textInverse, fontSize: 13, fontWeight: '900' }, bookingShortcut: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.colors.surface, borderRadius: 19, padding: 14, marginTop: 16, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, bookingIcon: { width: 47, height: 47, borderRadius: 15, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, shortcutTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '900' }, shortcutText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 3 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 }, sectionTitle: { color: theme.colors.text, fontSize: 21, fontWeight: '900' }, viewAll: { color: theme.colors.primary, fontSize: 15, fontWeight: '900' }, loader: { marginVertical: 30 }, providerRow: { gap: 12, paddingBottom: 3 }, providerCard: { width: 236, backgroundColor: theme.colors.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, providerImage: { height: 146, backgroundColor: theme.colors.surfaceAlt, position: 'relative' }, providerPhoto: { width: '100%', height: '100%', resizeMode: 'cover' }, providerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight }, rating: { position: 'absolute', left: 10, top: 10, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 3 }, ratingText: { color: theme.colors.textInverse, fontSize: 12, fontWeight: '900' }, favorite: { position: 'absolute', right: 9, top: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.9)', alignItems: 'center', justifyContent: 'center' }, providerDetails: { padding: 12 }, providerName: { color: theme.colors.text, fontSize: 17, fontWeight: '900' }, providerService: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 3 }, providerLocation: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 7 }, providerMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }, providerPrice: { color: theme.colors.text, fontSize: 14, fontWeight: '900', marginTop: 8 }, bookButton: { height: 38, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 11 }, bookButtonDisabled: { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }, bookButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: '900' }, bookButtonTextDisabled: { color: theme.colors.textMuted }, locationRow: { gap: 11, paddingBottom: 3 }, locationCard: { minWidth: 165, backgroundColor: theme.colors.surface, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, locationIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, locationName: { color: theme.colors.text, fontSize: 15, fontWeight: '900' }, locationCount: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3 }, trust: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.secondaryLight, borderRadius: 19, padding: 15, marginTop: 23 }, trustIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }, trustTitle: { color: theme.colors.primaryDark, fontSize: 17, fontWeight: '900' }, trustText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3 }, empty: { backgroundColor: theme.colors.surface, padding: 26, borderRadius: 20, alignItems: 'center', marginTop: 16 }, emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 10 }, emptyText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 }, choose: { backgroundColor: theme.colors.primaryLight, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10, marginTop: 14 }, chooseText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '900' }, noResults: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border }, noResultsTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900', marginTop: 8 }, noResultsText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.35)' }, modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 32 }, modalHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: 17 }, modalTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '900', marginBottom: 8 }, modalOption: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.divider }, modalOptionText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
});
