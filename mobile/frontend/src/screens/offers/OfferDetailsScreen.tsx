import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { getOfferDetails, listSavedOffers, recordOfferEvent, submitReport, toggleSavedOffer } from '../../services/api';
import type { Offer, Business } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { colors, IconName, money, OfferArtwork, openContact, RemotePhoto, RoundAction, whatsappUrl } from './OfferUI';

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
    try { const result = await Share.share({ message: [offer.title + ' — ' + money(offer.offerPrice), offer.description, offer.address, offer.phone || ''].join('\n') }); if (result.action === Share.sharedAction) recordOfferEvent(offer._id, 'share').catch(() => undefined); }
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
  const contact = (event: 'call' | 'whatsapp' | 'directions', url: string) => { if (offer) recordOfferEvent(offer._id, event).catch(() => undefined); openContact(url); };
  const whatsapp = offer?.whatsapp || business?.whatsapp;
  const directions = () => { if (offer) contact('directions', 'https://www.google.com/maps/dir/?api=1&destination=' + offer.location.coordinates[1] + ',' + offer.location.coordinates[0]); };
  return <ScreenContainer backgroundColor={colors.bg}>
    <View style={s.top}><Pressable accessibilityLabel="Go back" onPress={navigation.goBack} style={s.icon}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} /></Pressable><Text style={s.topTitle}>Offer details</Text><Pressable accessibilityLabel="Share offer" onPress={share} style={s.icon}><MaterialCommunityIcons name="share-variant-outline" size={23} color={colors.ink} /></Pressable></View>
    {loading ? <View style={s.center}><ActivityIndicator color={colors.teal} /></View> : error || !offer || !business ? <View style={s.center}><Text style={s.body}>{error || 'Offer unavailable.'}</Text><Pressable onPress={() => setRetry(n => n + 1)}><Text style={s.retry}>Retry</Text></Pressable></View> : <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: 160 + insets.bottom }]}>
        <OfferArtwork offer={offer} />
        <View style={s.badge}><Text style={s.badgeText}>{Math.round(offer.discountPercentage)}% OFF</Text></View>
        <Text style={s.title}>{offer.title}</Text>
        <Pressable style={s.business} onPress={() => { recordOfferEvent(offer._id, 'business_profile_visit').catch(() => undefined); navigation.navigate('BusinessDetails', { businessId: business._id }); }}>
          <RemotePhoto uri={business.logoUrl} style={s.logo} /><View style={s.flex}><View style={s.nameRow}><Text style={s.businessName}>{business.name}</Text>{business.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={18} color="#209AF4" />}</View><Text style={s.body}>{business.category || offer.category}</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color={colors.ink} />
        </Pressable>
        <View style={s.priceRow}><Text style={s.original}>{money(offer.originalPrice)}</Text><Text style={s.price}>{money(offer.offerPrice)}</Text><Text style={s.saving}>Save {money(Math.max(0, offer.originalPrice - offer.offerPrice))}</Text></View>
        <Info title="About this offer" body={offer.description} icon="text-box-outline" />
        <Info title="Validity" body={new Date(offer.startsAt).toLocaleDateString('en-IN') + ' – ' + new Date(offer.expiresAt).toLocaleDateString('en-IN')} icon="calendar-clock-outline" />
        <Info title="Terms & Conditions" body={offer.terms || 'Please confirm availability and terms with the business before purchase.'} icon="file-document-outline" />
        <Info title="Location" body={offer.address + (offer.distanceKm != null ? ' · ' + offer.distanceKm + ' KM away' : '')} icon="map-marker" onPress={directions} />
        <Pressable style={s.report} onPress={() => { if (!accessToken) { Alert.alert('Sign in required', 'Please sign in to report an offer.'); return; } Alert.alert('Report this offer?', 'Report incorrect information to the moderation team.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', onPress: () => { submitReport(accessToken, { targetType: 'offer', targetId: offer._id, reason: 'Incorrect information' }).then(() => Alert.alert('Report received')).catch(e => Alert.alert('Could not report', e.message)); } }]); }}><Text style={s.body}>Report offer</Text></Pressable>
      </ScrollView>
      <View style={[s.dock, { bottom: 76 + insets.bottom }]}>
        {whatsapp ? <RoundAction icon="whatsapp" label="WhatsApp" onPress={() => contact('whatsapp', whatsappUrl(whatsapp))} /> : null}
        <RoundAction icon="directions" label="Directions" onPress={directions} /><RoundAction icon={saved ? 'bookmark' : 'bookmark-outline'} label={saving ? 'Saving' : saved ? 'Saved' : 'Save'} disabled={saving} onPress={save} /><RoundAction icon="share-variant" label="Share" onPress={share} />
      </View>
    </>}
  </ScreenContainer>;
};
function Info({ title, body, icon, onPress }: { title: string; body: string; icon: IconName; onPress?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress || (() => setExpanded(!expanded))} style={s.info}><MaterialCommunityIcons name={icon} size={24} color={colors.teal} /><View style={s.flex}><Text style={s.infoTitle}>{title}</Text><Text numberOfLines={expanded ? undefined : 2} style={s.body}>{body}</Text></View><MaterialCommunityIcons name={expanded ? 'chevron-down' : 'chevron-right'} size={21} color={colors.muted} /></Pressable>;
}
const s = StyleSheet.create({
  top: { height: 49, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }, icon: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }, topTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }, retry: { color: colors.teal, padding: 16, fontWeight: '700' },
  content: { paddingHorizontal: 10 }, badge: { alignSelf: 'flex-start', backgroundColor: colors.teal, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 }, badgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' }, title: { color: colors.ink, fontSize: 27, fontWeight: '900', marginTop: 5 },
  business: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: '#DCE6EC', backgroundColor: '#FFFFFFC0', marginVertical: 10 }, logo: { width: 46, height: 46, borderRadius: 12 }, flex: { flex: 1, minWidth: 0 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, businessName: { fontSize: 16, fontWeight: '800', color: colors.ink, flexShrink: 1 }, body: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 14, borderRadius: 15, backgroundColor: '#DFF3F2' }, original: { fontSize: 17, textDecorationLine: 'line-through', color: '#929C9F' }, price: { fontSize: 30, fontWeight: '900', color: '#111' }, saving: { fontSize: 13, color: '#08A34B', fontWeight: '800' }, info: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#E9F0F4' }, infoTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  dock: { position: 'absolute', left: 6, right: 6, flexDirection: 'row', gap: 5, backgroundColor: '#FFFFFFF5', padding: 7, borderRadius: 18, borderWidth: 1, borderColor: '#EBF2F6', shadowColor: '#8CAFB8', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, report: { alignItems: 'center', padding: 15 },
});
