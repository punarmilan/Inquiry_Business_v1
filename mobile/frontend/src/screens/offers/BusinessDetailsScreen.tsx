import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { OfferCard } from '../../components/OfferCard';
import { getBusinessDetails, listSavedOffers, toggleSavedOffer } from '../../services/api';
import { useApp } from '../../context/AppContext';
import type { Business, Offer } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';
import { colors, openContact, RemotePhoto } from './OfferUI';

type Props = NativeStackScreenProps<OffersStackParamList, 'BusinessDetails'>;
export const BusinessDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<{ business: Business; offers: Offer[] } | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [all, setAll] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const favoriteKey = 'favorite-business:' + route.params.businessId;
  const load = useCallback(async () => {
    setRefreshing(true); setError('');
    try { const result = await getBusinessDetails(route.params.businessId); setData(result); }
    catch (e: any) { setError(e.message || 'Could not load business.'); } finally { setRefreshing(false); }
  }, [route.params.businessId]);
  useFocusEffect(useCallback(() => {
    load();
    AsyncStorage.getItem(favoriteKey).then(value => setFavorite(value === 'true')).catch(() => undefined);
    if (accessToken) listSavedOffers(accessToken).then(r => setSavedIds(r.data.map(o => o._id))).catch(() => undefined);
  }, [load, favoriteKey, accessToken]));
  const toggleFavorite = async () => {
    if (saving) return; setSaving(true);
    try { await AsyncStorage.setItem(favoriteKey, String(!favorite)); setFavorite(!favorite); }
    catch { Alert.alert('Could not save business', 'Please try again.'); } finally { setSaving(false); }
  };
  const saveOffer = async (id: string) => {
    if (!accessToken) { Alert.alert('Sign in required', 'Please sign in to save offers.'); return; }
    if (saving) return; setSaving(true);
    try { const result = await toggleSavedOffer(accessToken, id); setSavedIds(ids => result.saved ? [...ids.filter(i => i !== id), id] : ids.filter(i => i !== id)); }
    catch (e: any) { Alert.alert('Could not save offer', e.message); } finally { setSaving(false); }
  };
  if (!data) return <ScreenContainer backgroundColor={colors.bg}><Pressable style={s.backInline} onPress={navigation.goBack}><MaterialCommunityIcons name="arrow-left" size={24} /></Pressable><View style={s.center}>{error ? <><Text style={s.body}>{error}</Text><Pressable onPress={load}><Text style={s.link}>Retry</Text></Pressable></> : <ActivityIndicator color={colors.teal} />}</View></ScreenContainer>;
  const business = data.business;
  const directions = () => openContact('https://www.google.com/maps/dir/?api=1&destination=' + business.location.coordinates[1] + ',' + business.location.coordinates[0]);
  const share = () => Share.share({ message: [business.name, business.description, business.address, business.phone].filter(Boolean).join('\n') }).catch(() => Alert.alert('Unable to share', 'Please try again.'));
  return <ScreenContainer backgroundColor={colors.bg}>
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.teal} />} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
      <View style={s.coverFrame}><RemotePhoto uri={business.coverImageUrl || business.logoUrl} style={s.cover} />
        <Pressable onPress={navigation.goBack} accessibilityLabel="Go back" style={s.back}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.ink} /></Pressable>
        <Pressable onPress={toggleFavorite} disabled={saving} accessibilityLabel={favorite ? 'Remove business from device favorites' : 'Save business on this device'} style={s.heart}><MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={25} color={favorite ? '#E74064' : colors.ink} /></Pressable>
      </View>
      <View style={s.identity}><View style={s.logoRing}><RemotePhoto uri={business.logoUrl} style={s.logo} /></View><View style={s.identityText}><View style={s.nameRow}><Text style={s.title}>{business.name}</Text>{business.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={19} color="#209AF4" />}</View><Text style={s.category}>{business.category}</Text></View><Pressable style={s.share} onPress={share}><MaterialCommunityIcons name="share-variant" size={17} color={colors.teal} /><Text style={s.shareText}>Share</Text></Pressable></View>
      <View style={s.welcome}><MaterialCommunityIcons name="creation" size={27} color={colors.teal} /><Text style={[s.body, s.flex]}>{business.description || 'Welcome! Discover current offers and connect with this local business.'}</Text></View>
      <Pressable onPress={directions} style={s.address}><View style={s.pin}><MaterialCommunityIcons name="map-marker" size={25} color={colors.teal} /></View><Text style={[s.body, s.flex, { color: colors.ink }]}>{business.address}</Text><MaterialCommunityIcons name="chevron-right" size={25} color={colors.muted} /></Pressable>
      <View style={s.actions}><Pressable disabled={!business.phone} onPress={() => openContact('tel:' + business.phone?.replace(/[^+\d]/g, ''))} style={[s.call, !business.phone && { opacity: 0.4 }]}><MaterialCommunityIcons name="phone" size={24} color="#FFF" /><Text style={s.callText}>Call</Text></Pressable><Pressable onPress={directions} style={s.direction}><MaterialCommunityIcons name="navigation" size={23} color={colors.teal} /><Text style={s.directionText}>Directions</Text></Pressable></View>
      <View style={s.section}><Text style={s.sectionTitle}>Current offers</Text>{data.offers.length > 1 && <Pressable onPress={() => setAll(!all)} style={s.seeAll}><Text style={s.shareText}>{all ? 'Show less' : 'See all'}</Text><MaterialCommunityIcons name={all ? 'chevron-up' : 'chevron-right'} size={19} color={colors.teal} /></Pressable>}</View>
      {error ? <Text style={[s.body, { marginHorizontal: 16 }]}>{error}</Text> : null}
      {!data.offers.length ? <Text style={[s.body, { padding: 18 }]}>No current offers. Check back soon.</Text> : <ScrollView horizontal={!all} scrollEnabled={!all} showsHorizontalScrollIndicator={false} contentContainerStyle={[s.cards, all && s.allCards]}>
        {data.offers.map(offer => <View key={offer._id} style={{ width: all ? width - 28 : Math.min(width * 0.64, 280) }}><OfferCard offer={{ ...offer, business }} variant="hero" onPress={() => navigation.navigate('OfferDetails', { offerId: offer._id })} /><Pressable accessibilityLabel={savedIds.includes(offer._id) ? 'Unsave offer' : 'Save offer'} disabled={saving} style={s.offerHeart} onPress={() => saveOffer(offer._id)}><MaterialCommunityIcons name={savedIds.includes(offer._id) ? 'heart' : 'heart-outline'} size={22} color={savedIds.includes(offer._id) ? '#E74064' : colors.ink} /></Pressable></View>)}
      </ScrollView>}
    </ScrollView>
  </ScreenContainer>;
};
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, backInline: { padding: 16 }, link: { color: colors.teal, padding: 16 }, flex: { flex: 1, minWidth: 0 }, body: { fontSize: 12, lineHeight: 17, color: colors.muted },
  coverFrame: { marginHorizontal: 10, borderRadius: 18, height: 184, overflow: 'hidden' }, cover: { width: '100%', height: '100%' }, back: { position: 'absolute', top: 12, left: 10, width: 37, height: 37, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFFF0' }, heart: { position: 'absolute', right: 12, top: 12, width: 37, height: 37, borderRadius: 13, backgroundColor: '#FFFFFFDD', alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: -33 }, logoRing: { width: 94, height: 94, borderRadius: 48, borderWidth: 4, borderColor: '#FFF', backgroundColor: '#FFF', elevation: 3, shadowColor: '#8CAFB8', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, logo: { width: '100%', height: '100%', borderRadius: 45 }, identityText: { flex: 1, minWidth: 0, paddingTop: 33 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, title: { fontSize: 21, color: colors.ink, fontWeight: '900', flexShrink: 1 }, category: { fontSize: 13, color: colors.teal, fontWeight: '700', marginTop: 2 }, share: { flexDirection: 'row', gap: 5, alignItems: 'center', padding: 9, borderRadius: 20, backgroundColor: '#FFF', marginTop: 33, borderWidth: 1, borderColor: colors.line }, shareText: { color: colors.teal, fontSize: 12, fontWeight: '600' },
  welcome: { margin: 14, padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#E9F7F8' }, address: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12, paddingVertical: 7 }, pin: { width: 35, height: 35, borderRadius: 20, backgroundColor: '#E6F5F6', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, margin: 15 }, call: { flex: 1, minHeight: 43, borderRadius: 24, backgroundColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, callText: { fontSize: 16, fontWeight: '800', color: '#FFF' }, direction: { flex: 1, minHeight: 43, borderRadius: 24, borderWidth: 1.5, borderColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, directionText: { fontSize: 16, fontWeight: '800', color: colors.teal },
  section: { marginHorizontal: 16, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 21, color: colors.ink, fontWeight: '900' }, seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 }, cards: { padding: 14, gap: 10 }, allCards: { flexDirection: 'column' }, offerHeart: { position: 'absolute', right: 8, top: 8, padding: 5, borderRadius: 16, backgroundColor: '#FFFFFFDD' },
});
