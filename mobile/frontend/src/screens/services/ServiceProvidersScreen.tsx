import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listServiceProviders } from '../../services/api';
import type { ServiceProvider } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { CoolingArtwork, ServiceBackdrop, ServiceHeader, ServiceImage, ServiceSearch, categoryPalette, safeIcon, serviceColors as colors, ui } from './ServiceUI';
import type { ServiceIconName } from './ServiceUI';
import { createThemedStyles, getThemeMode } from '../../theme';

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
  const palette = categoryPalette(categoryName);
  const bannerIcon = safeIcon(providers[0]?.categories?.find((category) => category._id === categoryId)?.icon);

  return <ScreenContainer backgroundColor={colors.background}>
    <ServiceBackdrop />
    <View style={styles.headerRow}><View style={styles.headerCopy}><ServiceHeader title={categoryName} subtitle={locality} onBack={navigation.goBack} compact /></View>{cooling ? <View pointerEvents="none" style={styles.headerArt}><CoolingArtwork width={72} /></View> : null}</View>
    <ServiceSearch value={search} onChangeText={setSearch} placeholder="Search providers" />
    <FlatList data={visible} keyExtractor={(item) => item._id} contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={load}
      ListHeaderComponent={<>
        <View style={[styles.banner, ui.shadow]}>
          <LinearGradient colors={getThemeMode() === 'dark' ? ['#083744', '#052A33'] : ['#EEFCFF', '#E5F9FB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.bannerBadge}><MaterialCommunityIcons name="shield-check" size={31} color={colors.teal} /></View>
          <View style={styles.bannerCopy}><Text style={styles.bannerTitle}>{cooling ? 'Stay Cool, Stay Comfortable' : 'Find help, close to home'}</Text><Text style={styles.bannerText}>{cooling ? 'Local AC service professionals' : categoryName + ' providers'} in your area</Text></View>
          {cooling ? <CoolingArtwork /> : <View style={[styles.bannerSymbol, { backgroundColor: palette.light }]}><MaterialCommunityIcons name={bannerIcon} size={43} color={palette.ink} /></View>}
        </View>
        {error ? <View style={ui.empty}><Text style={ui.emptyText}>{error}</Text><Pressable onPress={load} style={ui.pill}><Text style={ui.pillText}>Retry</Text></Pressable></View> : null}
      </>}
      renderItem={({ item, index }) => <ProviderCard provider={item} categoryName={categoryName} locality={locality} index={index} onCall={() => void call(item)} onWhatsapp={() => void whatsapp(item)} onShare={() => void share(item)} />}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.teal} style={{ marginTop: 30 }} /> : !error ? <View style={ui.empty}><MaterialCommunityIcons name="account-search-outline" size={46} color={colors.teal} /><Text style={styles.emptyTitle}>No provider found</Text><Text style={ui.emptyText}>{search ? 'Try another name or area.' : 'Providers for this service will appear here when added.'}</Text></View> : null}
    />
  </ScreenContainer>;
};

const ProviderCard = ({ provider, categoryName, locality, index, onCall, onWhatsapp, onShare }: { provider: ServiceProvider; categoryName: string; locality: string; index: number; onCall: () => void; onWhatsapp: () => void; onShare: () => void }) => {
  const initials = provider.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const rated = Number.isFinite(provider.ratingAverage) && provider.ratingCount > 0;
  const highRating = provider.ratingAverage >= 4.7;
  const available = provider.availability === 'available';
  return <View style={[styles.card, ui.shadow]}>
    <View style={styles.identity}>
      <View>
        <ServiceImage uri={provider.photoUrl} style={styles.photo} fallback={<View style={[styles.photo, styles.initialsCircle, { backgroundColor: index % 2 ? '#F0ECFF' : '#E2F8FA' }]}><Text style={styles.initials}>{initials}</Text></View>} />
        {available ? <View accessibilityLabel="Available" style={styles.availableDot} /> : null}
      </View>
      <View style={styles.identityCopy}>
        <View style={styles.nameRow}><Text style={styles.name}>{provider.name}</Text>{rated ? <View style={[styles.rating, { backgroundColor: highRating ? '#EAFBEF' : '#FFF8E2' }]}><MaterialCommunityIcons name="star" size={17} color={highRating ? '#41B62B' : '#DDA800'} /><Text style={styles.ratingValue}>{provider.ratingAverage.toFixed(1)}<Text style={styles.ratingCount}> ({provider.ratingCount})</Text></Text></View> : null}</View>
        <Text style={styles.category}>{categoryName}</Text>
        <View style={styles.areaLine}><MaterialCommunityIcons name="map-marker" size={16} color={colors.muted} /><Text style={styles.areaText}>Home Visit Available in {locality}</Text></View>
        {provider.verificationStatus === 'verified' ? <View accessibilityLabel="Verified provider" style={styles.verifiedBadge}><MaterialCommunityIcons name="shield-check" size={15} color="#168447" /><Text style={styles.verifiedText}>Verified provider</Text></View> : null}
      </View>
    </View>
    <Text style={styles.description}>Local {categoryName.toLowerCase()} professional available for service in your area.</Text>
    <View style={styles.actions}>
      <ContactButton icon="phone" label="Call" color="#008698" background="#E8FAFC" onPress={onCall} disabled={!digits(provider.phone)} />
      <ContactButton icon="whatsapp" label="WhatsApp" color="#009A49" background="#E9FCF1" onPress={onWhatsapp} disabled={!whatsappDigits(provider.whatsapp)} />
      <ContactButton icon="share-variant" label="Share" color="#CE0537" background="#FFEBF1" onPress={onShare} />
    </View>
  </View>;
};
const ContactButton = ({ icon, label, color, background, onPress, disabled }: { icon: ServiceIconName; label: string; color: string; background: string; onPress: () => void; disabled?: boolean }) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.action, { backgroundColor: background }, disabled && { opacity: 0.35 }, pressed && ui.pressed]}>
  <LinearGradient colors={[color, color + 'BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionIcon}><MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" /></LinearGradient><Text style={[styles.actionLabel, { color }]}>{label}</Text>
</Pressable>;

const styles = createThemedStyles((c) => ({
  headerRow: { flexDirection: 'row', alignItems: 'center' }, headerCopy: { flex: 1 }, headerArt: { width: 64, overflow: 'hidden', marginRight: 10 },
  content: { paddingHorizontal: 16 },
  banner: { overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingRight: 0, borderRadius: 18, borderWidth: 1, borderColor: c.border, marginBottom: 12, minHeight: 86 },
  bannerBadge: { width: 42, height: 46, borderRadius: 16, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 }, bannerTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.darkTeal }, bannerText: { fontSize: 12, lineHeight: 17, color: '#738091', marginTop: 4 },
  bannerSymbol: { width: 62, height: 62, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  card: { backgroundColor: c.surface, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  photo: { width: 68, height: 68, borderRadius: 34 }, initialsCircle: { alignItems: 'center', justifyContent: 'center' }, initials: { fontSize: 27, fontWeight: '800', color: c.primaryDark },
  availableDot: { position: 'absolute', width: 17, height: 17, borderRadius: 10, backgroundColor: '#65CE3C', right: 1, bottom: 3, borderWidth: 2.5, borderColor: c.surface },
  identityCopy: { flex: 1 }, nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 5 },
  name: { flexGrow: 1, flexShrink: 1, flexBasis: 135, fontSize: 17, lineHeight: 22, fontWeight: '800', color: colors.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 7 },
  ratingValue: { fontSize: 12, fontWeight: '700', color: c.primaryDark }, ratingCount: { fontSize: 10, color: c.text, fontWeight: '400' },
  category: { fontSize: 13, color: c.primaryDark, lineHeight: 18, marginTop: 3 },
  areaLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 4 }, areaText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#4D586B' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: c.successLight }, verifiedText: { color: c.success, fontSize: 11, fontWeight: '700' },
  description: { fontSize: 13, color: '#596579', lineHeight: 18, marginTop: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: c.border, marginTop: 12, paddingTop: 10 },
  action: { flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4, borderRadius: 25 },
  actionIcon: { width: 29, height: 29, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, actionLabel: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
}));
