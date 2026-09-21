import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { theme, createThemedStyles } from '../../theme';

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
      <View style={s.topBar}>
        <Pressable onPress={navigation.goBack} accessibilityLabel="Go back" style={s.circle}><MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.primary} /></Pressable>
        <View style={s.flex} />
        <Pressable onPress={toggleFavorite} disabled={saving} accessibilityLabel={favorite ? 'Remove business from device favorites' : 'Save business on this device'} style={s.circle}><MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? theme.colors.danger : theme.colors.primary} /></Pressable>
        <Pressable onPress={share} accessibilityLabel="Share business" style={s.circle}><MaterialCommunityIcons name="share-variant" size={20} color={theme.colors.primary} /></Pressable>
      </View>
      {/* Hero: cover photo with the identity laid over its darkened lower half. */}
      <View style={s.hero}>
        <RemotePhoto uri={business.coverImageUrl || business.logoUrl} style={s.cover} />
        <LinearGradient colors={['transparent', 'rgba(0,10,13,0.45)', 'rgba(0,10,13,0.92)']} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
        <View style={s.heroCopy}>
          <View style={s.nameRow}><Text style={s.title} numberOfLines={2}>{business.name}</Text>{business.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={19} color={theme.colors.verified} />}</View>
          <Text style={s.category}>{business.category}</Text>
          <Text numberOfLines={3} style={s.heroBlurb}>{business.description || 'Welcome! Discover current offers and connect with this local business.'}</Text>
          {business.locality ? <View style={s.heroMeta}><MaterialCommunityIcons name="map-marker" size={15} color={theme.colors.primary} /><Text style={s.heroMetaText}>{business.locality}</Text></View> : null}
        </View>
      </View>
      <Pressable onPress={directions} accessibilityRole="button" accessibilityLabel="Open address on the map" style={s.address}>
        <View style={s.pin}><MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.primary} /></View>
        <Text style={[s.body, s.flex, { color: colors.ink }]}>{business.address}</Text>
        <View style={s.mapPill}><MaterialCommunityIcons name="map-search-outline" size={18} color={theme.colors.primary} /><Text style={s.mapPillText}>View Map</Text></View>
      </Pressable>
      <View style={s.actions}><Pressable disabled={!business.phone} onPress={() => openContact('tel:' + business.phone?.replace(/[^+\d]/g, ''))} style={[s.call, !business.phone && { opacity: 0.4 }]}><MaterialCommunityIcons name="phone" size={24} color="#FFF" /><Text style={s.callText}>Call</Text></Pressable><Pressable onPress={directions} style={s.direction}><MaterialCommunityIcons name="navigation" size={23} color={colors.teal} /><Text style={s.directionText}>Directions</Text></Pressable></View>
      <View style={s.section}><View style={s.flex}><Text style={s.sectionTitle}>Current offers</Text><Text style={s.body}>Exclusive deals at this business</Text></View>{data.offers.length > 1 && <Pressable onPress={() => setAll(!all)} style={s.seeAll}><Text style={s.shareText}>{all ? 'Show less' : 'View All'}</Text><MaterialCommunityIcons name={all ? 'chevron-up' : 'chevron-right'} size={19} color={colors.teal} /></Pressable>}</View>
      {error ? <Text style={[s.body, { marginHorizontal: 16 }]}>{error}</Text> : null}
      {!data.offers.length ? <Text style={[s.body, { padding: 18 }]}>No current offers. Check back soon.</Text> : <ScrollView horizontal={!all} scrollEnabled={!all} showsHorizontalScrollIndicator={false} contentContainerStyle={[s.cards, all && s.allCards]}>
        {data.offers.map(offer => <View key={offer._id} style={{ width: all ? width - 28 : Math.min(width * 0.52, 280) }}><OfferCard offer={{ ...offer, business }} variant="hero" onPress={() => navigation.navigate('OfferDetails', { offerId: offer._id })} /><Pressable accessibilityLabel={savedIds.includes(offer._id) ? 'Unsave offer' : 'Save offer'} disabled={saving} style={s.offerHeart} onPress={() => saveOffer(offer._id)}><MaterialCommunityIcons name={savedIds.includes(offer._id) ? 'heart' : 'heart-outline'} size={22} color={savedIds.includes(offer._id) ? theme.colors.danger : colors.ink} /></Pressable></View>)}
      </ScrollView>}
    </ScrollView>
  </ScreenContainer>;
};
const s = createThemedStyles((c) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, backInline: { padding: 16 }, link: { color: colors.teal, padding: 16 }, flex: { flex: 1, minWidth: 0 }, body: { fontSize: 12, lineHeight: 17, color: colors.muted },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.cardBorder, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  hero: { marginHorizontal: 14, borderRadius: 22, minHeight: 230, overflow: 'hidden', borderWidth: 1.5, borderColor: c.cardBorder, backgroundColor: c.surface, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  cover: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  heroCopy: { marginTop: 'auto', padding: 16, gap: 3 },
  heroBlurb: { fontSize: 13, lineHeight: 19, color: '#E6F6F8', marginTop: 5 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  heroMetaText: { fontSize: 13, fontWeight: '700', color: '#E6F6F8' },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1.5, borderColor: c.primary },
  mapPillText: { fontSize: 12, fontWeight: '800', color: c.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, title: { fontSize: 30, lineHeight: 37, color: '#FFFFFF', fontWeight: '900', flexShrink: 1 }, category: { fontSize: 15, color: c.primary, fontWeight: '800', marginTop: 1 }, shareText: { color: colors.teal, fontSize: 13, fontWeight: '800' },
  address: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 14, padding: 13, gap: 12, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.surface, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, pin: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, margin: 15 }, call: { flex: 1, minHeight: 43, borderRadius: 24, backgroundColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, callText: { fontSize: 16, fontWeight: '800', color: c.textInverse }, direction: { flex: 1, minHeight: 43, borderRadius: 24, borderWidth: 1.5, borderColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, directionText: { fontSize: 16, fontWeight: '800', color: colors.teal },
  section: { marginHorizontal: 16, marginTop: 8, paddingTop: 16, borderTopWidth: 0, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, sectionTitle: { fontSize: 25, lineHeight: 32, color: colors.ink, fontWeight: '900' }, seeAll: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 38, paddingHorizontal: 13, borderRadius: 19, borderWidth: 1.5, borderColor: c.primary }, cards: { padding: 14, gap: 10 }, allCards: { flexDirection: 'column' }, offerHeart: { position: 'absolute', right: 8, top: 8, padding: 6, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder },
}));
