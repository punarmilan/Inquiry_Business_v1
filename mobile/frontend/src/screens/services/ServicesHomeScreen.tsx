import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CityPickerModal } from '../../components/CityPickerModal';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import { listSupportedCities } from '../../services/api';
import type { City } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { ServiceBackdrop, ServiceHeader, ServiceImage, ServiceSearch, serviceColors as colors, ui } from './ServiceUI';
import { tabBarScrollProps } from '../../navigation/hideTabBarOnScroll';
import { theme, createThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServicesHome'>;
const normalize = (value: string) => value.trim().toLocaleLowerCase('en-IN');

export const ServicesHomeScreen: React.FC<Props> = ({ navigation }) => {
  const locationState = useHyperlocalLocation({ autoDetect: true });
  const [search, setSearch] = useState('');
  const [descending, setDescending] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [liveCities, setLiveCities] = useState<City[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState('');
  const insets = useSafeAreaInsets();
  const { refreshStoredLocation } = locationState;
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await listSupportedCities();
      setLiveCities(response.data);
      await refreshStoredLocation();
      setError('');
    } catch { setError('Could not refresh areas. Pull down to try again.'); }
    finally { setRefreshing(false); }
  }, [refreshStoredLocation]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const cities = liveCities || locationState.cities;
  const storedCity = locationState.location?.city;
  const city = cities.find((item) => item._id === storedCity?._id) || (liveCities ? null : storedCity);
  const allAreas = useMemo(() => {
    const areas = city?.localities?.length ? [...city.localities] : city ? [city.name] : [];
    const current = locationState.location?.locality;
    if (current && city && !areas.some((area) => normalize(area) === normalize(current))) areas.push(current);
    return areas;
  }, [city, locationState.location?.locality]);
  const matchesSearch = (area: string) => normalize(area + ' ' + (city?.name || '')).includes(normalize(search));
  const visibleAreas = allAreas.filter(matchesSearch).sort((a, b) => (descending ? -1 : 1) * a.localeCompare(b, 'en-IN'));
  const recentAreas = [...new Set([
    locationState.location?.locality || '',
    ...locationState.savedLocations.filter((item) => item.city?._id === city?._id).map((item) => item.locality),
  ].filter((area) => area && allAreas.includes(area)))].filter(matchesSearch);

  const openArea = async (area: string) => {
    if (!city || opening) return;
    setOpening(area);
    try {
      await locationState.chooseManual(city, area);
      navigation.navigate('ServiceCategories', { cityId: city._id, cityName: city.name, locality: area });
    } catch { Alert.alert('Could not select area', 'Please try again.'); }
    finally { setOpening(''); }
  };
  const card = (area: string, recent = false) => <AreaCard key={(recent ? 'recent-' : 'all-') + city?._id + area} area={area} city={city!} recent={recent} loading={opening === area} onPress={() => void openArea(area)} />;

  return <ScreenContainer backgroundColor={colors.background}>
    <ServiceBackdrop />
    <ServiceHeader title="Select Area" icon="crosshairs-gps" onAction={() => locationState.setPickerVisible(true)} />
    <ServiceSearch value={search} onChangeText={setSearch} placeholder="Search by area, locality or city" />
    {locationState.loadingLocation && !city ? <ActivityIndicator color={colors.teal} style={{ marginTop: 35 }} /> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} colors={[colors.teal]} />} {...tabBarScrollProps}>
      {error ? <Text style={ui.emptyText}>{error}</Text> : null}
      {city && recentAreas.length > 0 ? <>
        <View style={styles.sectionRow}><Text style={ui.sectionTitle}>Recent</Text><Pressable accessibilityRole="button" onPress={() => setShowAllRecent(!showAllRecent)} style={ui.pill}><Text style={ui.pillText}>{showAllRecent ? 'Show less' : 'See all'}</Text><MaterialCommunityIcons name={showAllRecent ? 'chevron-up' : 'chevron-right'} size={20} color={colors.darkTeal} /></Pressable></View>
        {(showAllRecent ? recentAreas : recentAreas.slice(0, 1)).map((area) => card(area, true))}
      </> : null}
      <View style={[styles.sectionRow, recentAreas.length > 0 && { marginTop: 10 }]}><Text style={ui.sectionTitle}>All</Text><Pressable accessibilityRole="button" accessibilityLabel={descending ? 'Sort areas A to Z' : 'Sort areas Z to A'} style={ui.pill} onPress={() => setDescending(!descending)}><MaterialCommunityIcons name="sort-alphabetical-ascending" size={19} color={colors.darkTeal} /><Text style={ui.pillText}>{descending ? 'Sort Z–A' : 'Sort A–Z'}</Text></Pressable></View>
      {city ? visibleAreas.map((area) => card(area)) : null}
      {!visibleAreas.length ? <View style={ui.empty}><MaterialCommunityIcons name="map-marker-off-outline" size={42} color={colors.teal} /><Text style={ui.emptyText}>{city ? 'No areas match your search.' : 'Choose a city to view service areas.'}</Text>{!city ? <Pressable style={ui.pill} onPress={() => locationState.setPickerVisible(true)}><Text style={ui.pillText}>Choose city</Text></Pressable> : null}</View> : null}
    </ScrollView>}
    <CityPickerModal visible={locationState.pickerVisible} cities={cities.filter((item) => item.servicesEnabled)} onSelect={async (nextCity, locality) => { await locationState.chooseManual(nextCity, locality); setSearch(''); setShowAllRecent(false); }} onUseCurrentLocation={() => locationState.detect({ force: true })} currentLocationLoading={locationState.loadingLocation} currentLocationError={locationState.locationError} onClose={() => locationState.setPickerVisible(false)} />
  </ScreenContainer>;
};

const AreaCard = ({ area, city, recent, loading, onPress }: { area: string; city: City; recent: boolean; loading: boolean; onPress: () => void }) => {
  const uri = city.localityImages?.find((item) => normalize(item.name) === normalize(area))?.imageUrl;
  return <Pressable accessibilityRole="button" accessibilityLabel={'View services in ' + area + ', ' + city.name} onPress={onPress} disabled={loading} style={({ pressed }) => [styles.card, ui.shadow, pressed && ui.pressed]}>
    <View style={[styles.cardClip, recent && { aspectRatio: 2.4 }]}>
      <ServiceImage uri={uri} style={StyleSheet.absoluteFill} fallback={<LinearGradient colors={['#C3EDF1', '#73BFC8', '#347681']} style={[StyleSheet.absoluteFill, styles.placeholder]}><MaterialCommunityIcons name="city-variant-outline" size={112} color="#E3F6F4" /></LinearGradient>} />
      <LinearGradient colors={['transparent', 'rgba(5,40,48,0.12)', 'rgba(4,39,45,0.9)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.cardFooter}><MaterialCommunityIcons name="map-marker" size={30} color="#FFFFFF" /><View style={{ flex: 1 }}><Text style={styles.areaName} numberOfLines={2}>{area}{area !== city.name ? ', ' + city.name : ''}</Text><Text style={styles.areaDetail}>{city.name}, {city.state}</Text></View><View style={styles.arrow}>{loading ? <ActivityIndicator color={theme.colors.background} /> : <MaterialCommunityIcons name="chevron-right" size={27} color={theme.colors.background} />}</View></View>
    </View>
  </Pressable>;
};

const styles = createThemedStyles((c) => ({
  content: { paddingHorizontal: 20 }, sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 },
  card: { width: '100%', borderRadius: 20, marginBottom: 18, backgroundColor: c.primaryLight, borderWidth: 1.5, borderColor: c.cardBorder, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, cardClip: { width: '100%', overflow: 'hidden', borderRadius: 20, aspectRatio: 2.65 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  cardFooter: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  areaName: { fontSize: 20, fontWeight: '800', color: c.textInverse, lineHeight: 26 }, areaDetail: { fontSize: 12, color: c.textInverse, opacity: 0.85, marginTop: 2 },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary, shadowColor: c.primaryGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 3, alignItems: 'center', justifyContent: 'center' },
}));
