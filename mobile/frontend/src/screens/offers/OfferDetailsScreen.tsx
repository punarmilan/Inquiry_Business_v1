import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { getOfferDetails, listSavedOffers, recordOfferEvent, submitReport, toggleSavedOffer } from '../../services/api';
import { isPosterUploadOffer } from '../../config/offerCardDesigner';
import type { Offer, Business } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { colors, IconName, money, OfferArtwork, openContact, RemotePhoto, RoundAction, whatsappUrl } from './OfferUI';
import { theme, createThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<OffersStackParamList, 'OfferDetails'>;
export const OfferDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken } = useApp();
  const insets = useSafeAreaInsets();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([
      getOfferDetails(route.params.offerId, route.params.latitude == null ? undefined : { latitude: route.params.latitude, longitude: route.params.longitude! }),
      accessToken ? listSavedOffers(accessToken).catch(() => ({ data: [] as Offer[] })) : Promise.resolve({ data: [] as Offer[] }),
    ]).then(([response, savedResponse]) => { if (active) { setOffer(response.offer); setSaved(savedResponse.data.some(item => item._id === route.params.offerId)); } })
      .catch(e => { if (active) setError(e.message || 'Could not load this offer.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, route.params.offerId, route.params.latitude, route.params.longitude, retry]));

  const share = async () => {
    if (!offer) return;
    const lines = isPosterUploadOffer(offer) ? [offer.title, offer.address, offer.phone || ''] : [offer.title + ' — ' + money(offer.offerPrice), offer.description, offer.address, offer.phone || ''];
    try { const result = await Share.share({ message: lines.join('\n') }); if (result.action === Share.sharedAction) recordOfferEvent(offer._id, 'share').catch(() => undefined); }
    catch { Alert.alert('Unable to share', 'Please try again.'); }
  };
  const save = async () => {
    if (!accessToken) { Alert.alert('Sign in required', 'Please sign in to save offers.'); return; }
    if (!offer || saving) return;
    setSaving(true);
    try { const result = await toggleSavedOffer(accessToken, offer._id); setSaved(result.saved); }
    catch (e: any) { Alert.alert('Could not save', e.message); } finally { setSaving(false); }
  };
  const business = offer?.business as Business | undefined;
  // Uploaded posters have no real prices or copy; the poster itself is the offer.
  const isPoster = Boolean(offer && isPosterUploadOffer(offer));
  const contact = (event: 'call' | 'whatsapp' | 'directions', url: string) => { if (offer) recordOfferEvent(offer._id, event).catch(() => undefined); openContact(url); };
  const whatsapp = offer?.whatsapp || business?.whatsapp;
  const directions = () => { if (offer) contact('directions', 'https://www.google.com/maps/dir/?api=1&destination=' + offer.location.coordinates[1] + ',' + offer.location.coordinates[0]); };
  // Primary CTA: reach the business the fastest way it has published — a phone
  // call when there is a number, otherwise WhatsApp.
  const phone = offer?.phone || business?.phone;
  const grab = () => {
    if (phone) return contact('call', 'tel:' + phone);
    if (whatsapp) return contact('whatsapp', whatsappUrl(whatsapp));
    Alert.alert('No contact available', 'This business has not published a phone number yet.');
  };
  return <ScreenContainer backgroundColor={colors.bg}>
    <View style={s.top}><Pressable accessibilityLabel="Go back" onPress={navigation.goBack} style={s.icon}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} /></Pressable><Text style={s.topTitle}>Offer Details</Text><Pressable accessibilityLabel="Share offer" onPress={share} style={s.icon}><MaterialCommunityIcons name="share-variant-outline" size={23} color={colors.ink} /></Pressable></View>
    {loading ? <View style={s.center}><ActivityIndicator color={colors.teal} /></View> : error || !offer || !business ? <View style={s.center}><Text style={s.body}>{error || 'Offer unavailable.'}</Text><Pressable onPress={() => setRetry(n => n + 1)}><Text style={s.retry}>Retry</Text></Pressable></View> : <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: 160 + insets.bottom }]}>
        <OfferArtwork offer={offer} />
        <Pressable style={s.business} onPress={() => { recordOfferEvent(offer._id, 'business_profile_visit').catch(() => undefined); navigation.navigate('BusinessDetails', { businessId: business._id }); }}>
          <RemotePhoto uri={business.logoUrl} style={s.logo} /><View style={s.flex}><View style={s.nameRow}><Text style={s.businessName}>{business.name}</Text>{business.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={18} color="#209AF4" />}</View><Text style={s.body}>{business.category || offer.category}</Text></View><View style={s.storePill}><Text style={s.storePillText}>View Store</Text><MaterialCommunityIcons name="chevron-right" size={17} color={theme.colors.primary} /></View>
        </Pressable>
        <View style={[s.priceRow, isPoster && s.priceRowPoster]}>{isPoster ? null : <><Text style={s.original}>{money(offer.originalPrice)}</Text><Text style={s.price}>{money(offer.offerPrice)}</Text><Text style={s.saving}>Save {money(Math.max(0, offer.originalPrice - offer.offerPrice))}</Text></>}<Pressable accessibilityRole="button" accessibilityLabel="Grab this offer" onPress={grab} style={({ pressed }) => [s.grab, pressed && { opacity: 0.8 }]}><Text style={s.grabText}>Grab Offer</Text><MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors.textInverse} /></Pressable></View>
        {isPoster ? null : <Info title="About this offer" body={offer.description} icon="text-box-outline" />}
        <Info title="Validity" body={new Date(offer.startsAt).toLocaleDateString('en-IN') + ' – ' + new Date(offer.expiresAt).toLocaleDateString('en-IN')} icon="calendar-clock-outline" />
        <Info title="Terms & Conditions" body={offer.terms || 'Please confirm availability and terms with the business before purchase.'} icon="file-document-outline" />
        <Info title="Location" body={offer.address + (offer.distanceKm != null ? ' · ' + offer.distanceKm + ' KM away' : '')} icon="map-marker" onPress={directions} action="View on Map" />
        <Pressable style={s.report} onPress={() => { if (!accessToken) { Alert.alert('Sign in required', 'Please sign in to report an offer.'); return; } Alert.alert('Report this offer?', 'Report incorrect information to the moderation team.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', onPress: () => { submitReport(accessToken, { targetType: 'offer', targetId: offer._id, reason: 'Incorrect information' }).then(() => Alert.alert('Report received')).catch(e => Alert.alert('Could not report', e.message)); } }]); }}><Text style={s.body}>Report offer</Text></Pressable>
      <View style={[s.dock, { position: 'relative', bottom: undefined, marginTop: 12 }]}>
        {whatsapp ? <RoundAction icon="whatsapp" label="WhatsApp" onPress={() => contact('whatsapp', whatsappUrl(whatsapp))} /> : null}
        <RoundAction icon="directions" label="Directions" onPress={directions} /><RoundAction icon={saved ? 'bookmark' : 'bookmark-outline'} label={saving ? 'Saving' : saved ? 'Saved' : 'Save'} disabled={saving} onPress={save} /><RoundAction icon="share-variant" label="Share" onPress={share} />
      </View>
      </ScrollView>
    </>}
  </ScreenContainer>;
};
function Info({ title, body, icon, onPress, action }: { title: string; body: string; icon: IconName; onPress?: () => void; action?: string }) {
  const [expanded, setExpanded] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress || (() => setExpanded(!expanded))} style={({ pressed }) => [s.info, pressed && { opacity: 0.8 }]}>
    <View style={s.infoIcon}><MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} /></View>
    <View style={s.flex}><Text style={s.infoTitle}>{title}</Text><Text numberOfLines={expanded ? undefined : 2} style={s.body}>{body}</Text></View>
    {action
      ? <View style={s.storePill}><MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} /><Text style={s.storePillText}>{action}</Text></View>
      : <MaterialCommunityIcons name={expanded ? 'chevron-down' : 'chevron-right'} size={21} color={colors.muted} />}
  </Pressable>;
}
const s = createThemedStyles((c) => ({
  top: { height: 49, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }, icon: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }, topTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }, retry: { color: colors.teal, padding: 16, fontWeight: '700' },
  content: { paddingHorizontal: 12 },
  infoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  storePill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1.5, borderColor: c.primary },
  storePillText: { fontSize: 13, fontWeight: '800', color: c.primary },
  grab: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: c.primary, shadowColor: c.primaryGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  grabText: { fontSize: 15, fontWeight: '900', color: c.textInverse }, badge: { alignSelf: 'flex-start', backgroundColor: colors.teal, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 }, badgeText: { color: c.textInverse, fontSize: 12, fontWeight: '800' }, title: { color: colors.ink, fontSize: 27, fontWeight: '900', marginTop: 5 },
  business: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.surface, marginVertical: 12, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, logo: { width: 46, height: 46, borderRadius: 12 }, flex: { flex: 1, minWidth: 0 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, businessName: { fontSize: 16, fontWeight: '800', color: colors.ink, flexShrink: 1 }, body: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.surface, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, priceRowPoster: { justifyContent: 'center' }, original: { fontSize: 17, textDecorationLine: 'line-through', color: c.textMuted }, price: { fontSize: 30, fontWeight: '900', color: c.text }, saving: { fontSize: 13, color: c.success, fontWeight: '800' }, info: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.surface, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, infoTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: colors.ink },
  dock: { position: 'absolute', left: 6, right: 6, flexDirection: 'row', gap: 5, backgroundColor: c.surface, padding: 7, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, report: { alignItems: 'center', padding: 15 },
}));
