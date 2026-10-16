import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronRight, Siren, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listServiceCategories } from '../../services/api';
import type { ServiceCategory } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { ServiceHeader, ServiceSearch, isEmergencyCategory, safeIcon, serviceColors as colors, ui } from './ServiceUI';
import { theme, createThemedStyles } from '../../theme';

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

  return <ScreenContainer>
    <ServiceHeader title={route.params.locality} subtitle={route.params.cityName} onBack={navigation.goBack} icon="map-marker-radius" onAction={() => navigation.navigate('ServicesHome')} plain />
    <ServiceSearch value={search} onChangeText={setSearch} placeholder="Search services you are looking for" plain />
    <FlatList data={visibleCategories} keyExtractor={(item) => item._id} contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={load}
      ListHeaderComponent={<>
        <Pressable accessibilityRole="button" accessibilityLabel={emergencyOnly ? 'Show all services' : 'Show local emergency contacts'} onPress={() => { setEmergencyOnly(!emergencyOnly); setSearch(''); }} style={({ pressed }) => [styles.emergency, pressed && styles.pressed]}>
          <View style={styles.icon}><Siren size={26} color={theme.colors.text} strokeWidth={1.75} /></View>
          <View style={styles.emergencyCopy}><Text style={styles.emergencyTitle}>Local Emergency Contacts</Text><Text style={styles.emergencyText}>Ambulance, Fire Brigade, Police...</Text></View>
          {emergencyOnly ? <X size={21} color={theme.colors.textMuted} strokeWidth={1.75} /> : <ChevronRight size={21} color={theme.colors.textMuted} strokeWidth={1.75} />}
        </Pressable>
        <View style={styles.sectionRow}><Text style={ui.sectionTitle}>{emergencyOnly ? 'Emergency Contacts' : 'Services'}</Text>{emergencyOnly ? <Pressable onPress={() => setEmergencyOnly(false)} style={ui.pill}><Text style={ui.pillText}>Show all</Text></Pressable> : null}</View>
        {error ? <View style={ui.empty}><Text style={ui.emptyText}>{error}</Text><Pressable onPress={load} style={ui.pill}><Text style={ui.pillText}>Retry</Text></Pressable></View> : null}
      </>}
      renderItem={({ item: category, index }) => {
        return <Pressable accessibilityRole="button" accessibilityLabel={'View ' + category.name + ' providers'} onPress={() => navigation.navigate('ServiceProviders', { cityId: route.params.cityId, cityName: route.params.cityName, locality: route.params.locality, categoryId: category._id, categoryName: category.name })} style={({ pressed }) => [styles.categoryRow, index % 4 === 0 && styles.firstCategory, index > 0 && index % 4 === 0 && styles.groupSpacing, (index % 4 === 3 || index === visibleCategories.length - 1) && styles.lastCategory, pressed && styles.pressed]}>
          <View style={styles.icon}><MaterialCommunityIcons name={safeIcon(category.icon)} size={26} color={theme.colors.text} /></View>
          <Text style={styles.categoryName}>{category.name}</Text>
          <ChevronRight size={21} color={theme.colors.textMuted} strokeWidth={1.75} />
        </Pressable>;
      }}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.teal} style={{ marginVertical: 30 }} /> : !error ? <View style={ui.empty}><Text style={ui.emptyText}>{emergencyOnly ? 'No emergency contacts have been added for this city yet.' : 'No services match your search.'}</Text></View> : null}
    />
  </ScreenContainer>;
};

const styles = createThemedStyles((c) => ({
  content: { paddingHorizontal: 16 },
  emergency: { minHeight: 72, borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 17, paddingVertical: 12 },
  emergencyCopy: { flex: 1, minWidth: 0 },
  emergencyTitle: { fontSize: 15.5, lineHeight: 21, fontWeight: '500', color: c.textSecondary },
  emergencyText: { fontSize: 12.5, lineHeight: 17, color: c.textMuted, marginTop: 2 },
  sectionRow: { marginTop: 24, marginBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: c.surface, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: c.border, borderBottomColor: c.divider },
  firstCategory: { borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  groupSpacing: { marginTop: 14 },
  lastCategory: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomColor: c.border },
  icon: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  categoryName: { flex: 1, fontSize: 15.5, lineHeight: 21, fontWeight: '500', color: c.textSecondary },
  pressed: { backgroundColor: c.surfaceAlt },
}));
