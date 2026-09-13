import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listServiceCategories } from '../../services/api';
import type { ServiceCategory } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { ServiceBackdrop, ServiceHeader, ServiceImage, ServiceSearch, categoryPalette, isEmergencyCategory, safeIcon, serviceColors as colors, ui } from './ServiceUI';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServiceCategories'>;
const normalize = (value: string) => value.trim().toLocaleLowerCase('en-IN');

export const ServiceCategoriesScreen: React.FC<Props> = ({ route, navigation }) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const insets = useSafeAreaInsets();
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await listServiceCategories(route.params.cityId); setCategories(response.data || []); setError(response.comingSoon ? response.message || 'Services are not available in this city yet.' : ''); }
    catch { setError('Could not load services. Tap Retry or pull down to refresh.'); }
    finally { setLoading(false); }
  }, [route.params.cityId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const visibleCategories = useMemo(() => categories.filter((category) => (!emergencyOnly || isEmergencyCategory(category.name)) && normalize(category.name + ' ' + (category.description || '')).includes(normalize(search))), [categories, search, emergencyOnly]);

  return <ScreenContainer backgroundColor={colors.background}>
    <ServiceBackdrop />
    <ServiceHeader title={route.params.locality} subtitle={route.params.cityName} onBack={navigation.goBack} icon="map-marker-radius" onAction={() => navigation.navigate('ServicesHome')} />
    <ServiceSearch value={search} onChangeText={setSearch} placeholder="Search services you are looking for" />
    <FlatList data={visibleCategories} numColumns={2} keyExtractor={(item) => item._id} columnWrapperStyle={styles.row} contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={load}
      ListHeaderComponent={<>
        <Pressable accessibilityRole="button" accessibilityLabel={emergencyOnly ? 'Show all services' : 'Show local emergency contacts'} onPress={() => { setEmergencyOnly(!emergencyOnly); setSearch(''); }} style={({ pressed }) => [styles.emergency, ui.shadow, pressed && ui.pressed]}>
          <LinearGradient colors={['#FFFCFD', '#FFF2F5']} style={StyleSheet.absoluteFill} />
          <View style={styles.emergencyArt} pointerEvents="none"><MaterialCommunityIcons name="city-variant" size={102} color="#FFDFE7" /><MaterialCommunityIcons name="ambulance" size={66} color="#E94766" style={styles.ambulance} /></View>
          <View style={styles.emergencyIcon}><MaterialCommunityIcons name="alarm-light" size={45} color="#E5173D" /></View>
          <View style={styles.emergencyCopy}><Text style={styles.emergencyTitle}>Local Emergency Contacts</Text><Text style={styles.emergencyText}>Ambulance, Fire Brigade, Police...</Text></View>
          <View style={styles.safetyBadge}><Text style={styles.safetyText}>Be Safe, Be Prepared</Text></View>
          <View style={styles.emergencyArrow}><MaterialCommunityIcons name={emergencyOnly ? 'close' : 'chevron-right'} size={24} color="#E5173D" /></View>
        </Pressable>
        <View style={styles.sectionRow}><Text style={ui.sectionTitle}>{emergencyOnly ? 'Emergency Contacts' : 'Services'}</Text>{emergencyOnly ? <Pressable onPress={() => setEmergencyOnly(false)} style={ui.pill}><Text style={ui.pillText}>Show all</Text></Pressable> : null}</View>
        {error ? <View style={ui.empty}><Text style={ui.emptyText}>{error}</Text><Pressable onPress={load} style={ui.pill}><Text style={ui.pillText}>Retry</Text></Pressable></View> : null}
      </>}
      renderItem={({ item: category }) => {
        const palette = categoryPalette(category.name);
        return <Pressable accessibilityRole="button" accessibilityLabel={'View ' + category.name + ' providers'} onPress={() => navigation.navigate('ServiceProviders', { cityId: route.params.cityId, cityName: route.params.cityName, locality: route.params.locality, categoryId: category._id, categoryName: category.name })} style={({ pressed }) => [styles.categoryCard, ui.shadow, pressed && ui.pressed]}>
          <View style={styles.clip}>
            <View style={[styles.corner, { backgroundColor: palette.light }]} />
            <View style={[styles.categoryIcon, { backgroundColor: palette.light }]}><ServiceImage uri={category.imageUrl} style={styles.categoryImage} fallback={<MaterialCommunityIcons name={safeIcon(category.icon)} size={43} color={palette.ink} />} /></View>
            <View style={styles.categoryLabel}><Text style={styles.categoryName}>{category.name}</Text><MaterialCommunityIcons name="chevron-right" size={23} color="#647283" /></View>
          </View>
        </Pressable>;
      }}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.teal} style={{ marginVertical: 30 }} /> : !error ? <View style={ui.empty}><Text style={ui.emptyText}>{emergencyOnly ? 'No emergency contacts have been added for this city yet.' : 'No services match your search.'}</Text></View> : null}
    />
  </ScreenContainer>;
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 }, row: { gap: 12, alignItems: 'stretch' },
  emergency: { minHeight: 138, borderRadius: 19, borderWidth: 1, borderColor: '#FFE1E8', flexDirection: 'row', alignItems: 'center', padding: 12, gap: 13, overflow: 'hidden' },
  emergencyArt: { position: 'absolute', right: 18, bottom: -20, opacity: 0.65 }, ambulance: { position: 'absolute', bottom: 12, right: 18 },
  emergencyIcon: { width: 73, height: 73, borderRadius: 34, backgroundColor: '#FFE4EB', alignItems: 'center', justifyContent: 'center' },
  emergencyCopy: { flex: 1, paddingVertical: 15, paddingRight: 25 },
  emergencyTitle: { fontSize: 19, fontWeight: '800', color: '#DC1135', lineHeight: 24 },
  emergencyText: { fontSize: 13, color: '#4E5A6A', lineHeight: 18, marginTop: 5 },
  safetyBadge: { position: 'absolute', right: 8, top: 8, borderRadius: 20, backgroundColor: '#FFE5EA', paddingHorizontal: 10, paddingVertical: 5 }, safetyText: { fontSize: 9, color: '#D71536' },
  emergencyArrow: { position: 'absolute', right: 10, top: 53, width: 32, height: 32, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  sectionRow: { marginTop: 24, marginBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryCard: { width: '48.3%', flexShrink: 1, borderRadius: 18, backgroundColor: '#FFFFFF', marginBottom: 12 },
  clip: { flex: 1, minHeight: 146, padding: 15, borderRadius: 18, overflow: 'hidden' },
  corner: { position: 'absolute', width: 115, height: 90, borderTopLeftRadius: 100, right: -57, bottom: -50, transform: [{ rotate: '-23deg' }] },
  categoryIcon: { width: 69, height: 64, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, categoryImage: { width: 56, height: 52, borderRadius: 12, resizeMode: 'contain' },
  categoryLabel: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 3, flex: 1 },
  categoryName: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.text },
});
