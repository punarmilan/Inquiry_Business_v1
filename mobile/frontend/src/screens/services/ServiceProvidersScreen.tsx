import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Share, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listServiceProviders } from '../../services/api';
import type { ServiceProvider } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { ServiceHeader, ServiceImage, ServiceSearch, serviceColors as colors, ui } from './ServiceUI';
import type { ServiceIconName } from './ServiceUI';
import { theme, createThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServiceProviders'>;
const normalize = (value: string) => value.trim().toLocaleLowerCase('en-IN');
const digits = (value?: string) => String(value || '').replace(/\D/g, '');
const whatsappDigits = (value?: string) => { const clean = digits(value); return clean.length === 10 ? '91' + clean : clean; };

export const ServiceProvidersScreen: React.FC<Props> = ({ route, navigation }) => {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const { cityId, categoryId, categoryName, locality } = route.params;
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await listServiceProviders(cityId, categoryId, locality); setProviders(response.data || []); setError(''); }
    catch { setError('Could not load providers. Tap Retry or pull down to refresh.'); }
    finally { setLoading(false); }
  }, [cityId, categoryId, locality]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const visible = useMemo(() => providers.filter((provider) => normalize(provider.name + ' ' + (provider.serviceAreas?.join(' ') || '')).includes(normalize(search))), [providers, search]);
  const call = async (provider: ServiceProvider) => {
    const number = digits(provider.phone);
    if (!number) return Alert.alert('Call unavailable', 'This provider has not added a phone number.');
    try { await Linking.openURL('tel:' + (provider.phone?.startsWith('+') ? '+' : '') + number); }
    catch { Alert.alert('Call unavailable', 'Could not open the phone dialer.'); }
  };
  const whatsapp = async (provider: ServiceProvider) => {
    const number = whatsappDigits(provider.whatsapp);
    if (!number) return Alert.alert('WhatsApp unavailable', 'This provider has not added a WhatsApp number.');
    try { await Linking.openURL('https://wa.me/' + number + '?text=' + encodeURIComponent('Hi, I am looking for ' + categoryName + ' in ' + locality + '.')); }
    catch { Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp.'); }
  };
  const share = async (provider: ServiceProvider) => {
    try { await Share.share({ message: [provider.name + ' - ' + categoryName, provider.phone ? 'Call: ' + provider.phone : '', provider.whatsapp ? 'WhatsApp: ' + provider.whatsapp : '', 'Area: ' + locality + ', ' + route.params.cityName].filter(Boolean).join('\n') }); }
    catch { Alert.alert('Share unavailable', 'Could not open the share sheet. Please try again.'); }
  };
  const cooling = /\bac\b|air condition/i.test(categoryName);

  return <ScreenContainer>
    <ServiceHeader title={categoryName} subtitle={locality} onBack={navigation.goBack} compact plain />
    <ServiceSearch value={search} onChangeText={setSearch} placeholder="Search providers" plain />
    <FlatList data={visible} keyExtractor={(item) => item._id} contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={load}
      ListHeaderComponent={<>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}><MaterialCommunityIcons name="shield-check-outline" size={26} color={theme.colors.text} /></View>
          <View style={styles.bannerCopy}><Text style={styles.bannerTitle}>{cooling ? 'Stay Cool, Stay Comfortable' : 'Find help, close to home'}</Text><Text style={styles.bannerText}>{cooling ? 'Local AC service professionals' : categoryName + ' providers'} in your area</Text></View>
        </View>
        {error ? <View style={ui.empty}><Text style={ui.emptyText}>{error}</Text><Pressable onPress={load} style={ui.pill}><Text style={ui.pillText}>Retry</Text></Pressable></View> : null}
      </>}
      renderItem={({ item }) => <ProviderCard provider={item} categoryName={categoryName} locality={locality} onCall={() => void call(item)} onWhatsapp={() => void whatsapp(item)} onShare={() => void share(item)} />}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.teal} style={{ marginTop: 30 }} /> : !error ? <View style={ui.empty}><MaterialCommunityIcons name="account-search-outline" size={46} color={colors.teal} /><Text style={styles.emptyTitle}>No provider found</Text><Text style={ui.emptyText}>{search ? 'Try another name or area.' : 'Providers for this service will appear here when added.'}</Text></View> : null}
    />
  </ScreenContainer>;
};

const ProviderCard = ({ provider, categoryName, locality, onCall, onWhatsapp, onShare }: { provider: ServiceProvider; categoryName: string; locality: string; onCall: () => void; onWhatsapp: () => void; onShare: () => void }) => {
  const initials = provider.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const rated = Number.isFinite(provider.ratingAverage) && provider.ratingCount > 0;
  const available = provider.availability === 'available';
  return <View style={styles.card}>
    <View style={styles.identity}>
      <View>
        <ServiceImage uri={provider.photoUrl} style={styles.photo} fallback={<View style={[styles.photo, styles.initialsCircle]}><Text style={styles.initials}>{initials}</Text></View>} />
        {available ? <View accessibilityLabel="Available" style={styles.availableDot} /> : null}
      </View>
      <View style={styles.identityCopy}>
        <View style={styles.nameRow}><Text style={styles.name}>{provider.name}</Text>{rated ? <View style={styles.rating}><MaterialCommunityIcons name="star-outline" size={17} color={theme.colors.text} /><Text style={styles.ratingValue}>{provider.ratingAverage.toFixed(1)}<Text style={styles.ratingCount}> ({provider.ratingCount})</Text></Text></View> : null}</View>
        <Text style={styles.category}>{categoryName}</Text>
        <View style={styles.areaLine}><MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.textMuted} /><Text style={styles.areaText}>Home Visit Available in {locality}</Text></View>
        {provider.verificationStatus === 'verified' ? <View accessibilityLabel="Verified provider" style={styles.verifiedBadge}><MaterialCommunityIcons name="shield-check-outline" size={16} color={theme.colors.text} /><Text style={styles.verifiedText}>Verified provider</Text></View> : null}
      </View>
    </View>
    <Text style={styles.description}>Local {categoryName.toLowerCase()} professional available for service in your area.</Text>
    <View style={styles.actions}>
      <ContactButton icon="phone-outline" label="Call" onPress={onCall} disabled={!digits(provider.phone)} />
      <ContactButton icon="whatsapp" label="WhatsApp" onPress={onWhatsapp} disabled={!whatsappDigits(provider.whatsapp)} />
      <ContactButton icon="share-variant-outline" label="Share" onPress={onShare} />
    </View>
  </View>;
};
const ContactButton = ({ icon, label, onPress, disabled }: { icon: ServiceIconName; label: string; onPress: () => void; disabled?: boolean }) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.action, disabled && { opacity: 0.35 }, pressed && ui.pressed]}>
  <MaterialCommunityIcons name={icon} size={19} color={theme.colors.text} /><Text style={styles.actionLabel}>{label}</Text>
</Pressable>;

const styles = createThemedStyles((c) => ({
  content: { paddingHorizontal: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 17, paddingVertical: 14, borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 14, minHeight: 72 },
  bannerIcon: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1, minWidth: 0 }, bannerTitle: { fontSize: 15.5, lineHeight: 21, fontWeight: '500', color: c.textSecondary }, bannerText: { fontSize: 12.5, lineHeight: 17, color: c.textMuted, marginTop: 2 },
  card: { backgroundColor: c.surface, borderRadius: 24, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: c.border },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  photo: { width: 68, height: 68, borderRadius: 34 }, initialsCircle: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt }, initials: { fontSize: 27, fontWeight: '800', color: c.text },
  availableDot: { position: 'absolute', width: 17, height: 17, borderRadius: 10, backgroundColor: '#65CE3C', right: 1, bottom: 3, borderWidth: 2.5, borderColor: c.surface },
  identityCopy: { flex: 1 }, nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 5 },
  name: { flexGrow: 1, flexShrink: 1, flexBasis: 135, fontSize: 17, lineHeight: 22, fontWeight: '700', color: c.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3 },
  ratingValue: { fontSize: 12, fontWeight: '700', color: c.text }, ratingCount: { fontSize: 10, color: c.textMuted, fontWeight: '400' },
  category: { fontSize: 13, color: c.textSecondary, lineHeight: 18, marginTop: 3 },
  areaLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 4 }, areaText: { flex: 1, fontSize: 12, lineHeight: 17, color: c.textMuted },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 6 }, verifiedText: { color: c.textSecondary, fontSize: 11, fontWeight: '500' },
  description: { fontSize: 13, color: c.textSecondary, lineHeight: 18, marginTop: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: c.border, marginTop: 12, paddingTop: 10 },
  action: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4, borderRadius: 21, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  actionLabel: { fontSize: 11, fontWeight: '500', color: c.textSecondary, flexShrink: 1 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
}));
