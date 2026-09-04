import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { OfferCard } from '../../components/OfferCard';
import { getOfferDetails, recordOfferEvent, submitReport, toggleSavedOffer } from '../../services/api';
import type { Offer, Business } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<OffersStackParamList, 'OfferDetails'>;

export const OfferDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken } = useApp();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getOfferDetails(route.params.offerId, route.params.latitude == null ? undefined : { latitude: route.params.latitude, longitude: route.params.longitude! })
      .then((response) => setOffer(response.offer))
      .catch((error) => Alert.alert('Offer unavailable', error.message))
      .finally(() => setLoading(false));
  }, [route.params]);

  if (loading) return <ScreenContainer style={styles.center}><ActivityIndicator color={theme.colors.primary} /></ScreenContainer>;
  if (!offer) return <ScreenContainer style={styles.center}><Text>Offer not found.</Text></ScreenContainer>;
  const business = offer.business as Business;
  const [longitude, latitude] = offer.location.coordinates;
  const trackAndOpen = (event: 'call' | 'whatsapp' | 'directions', url: string) => {
    recordOfferEvent(offer._id, event).catch(() => undefined);
    Linking.openURL(url).catch(() => Alert.alert('Unable to open', 'Please try again.'));
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.topbar}>
        <Pressable onPress={navigation.goBack} style={styles.icon}><MaterialCommunityIcons name="arrow-left" size={24} /></Pressable>
        <Text style={styles.topTitle}>Offer details</Text>
        <Pressable onPress={() => Share.share({ message: `${offer.title} — ₹${offer.offerPrice}` }).then(() => recordOfferEvent(offer._id, 'share'))} style={styles.icon}><MaterialCommunityIcons name="share-variant-outline" size={23} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <OfferCard offer={offer} variant="hero" onPress={() => undefined} />
        <View style={styles.discount}><Text style={styles.discountText}>{Math.round(offer.discountPercentage)}% OFF</Text></View>
        <Text style={styles.title}>{offer.title}</Text>
        <Pressable onPress={() => navigation.navigate('BusinessDetails', { businessId: business._id })} style={styles.businessRow}>
          <View style={styles.businessLogo}><MaterialCommunityIcons name="storefront-outline" size={25} color={theme.colors.primary} /></View>
          <View style={styles.flex}><View style={styles.nameRow}><Text style={styles.businessName}>{business.name}</Text>{business.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={18} color={theme.colors.verified} />}</View><Text style={styles.category}>{business.category || offer.category}</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
        </Pressable>
        <View style={styles.priceCard}><Text style={styles.original}>₹{offer.originalPrice.toLocaleString('en-IN')}</Text><Text style={styles.price}>₹{offer.offerPrice.toLocaleString('en-IN')}</Text><Text style={styles.saving}>Save ₹{(offer.originalPrice - offer.offerPrice).toLocaleString('en-IN')}</Text></View>
        <Info title="About this offer" body={offer.description} icon="text-box-outline" />
        <Info title="Validity" body={`${new Date(offer.startsAt).toLocaleDateString()} – ${new Date(offer.expiresAt).toLocaleDateString()}`} icon="calendar-clock" />
        <Info title="Terms & Conditions" body={offer.terms || 'Please confirm availability and terms with the business before purchase.'} icon="file-document-outline" />
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.address}>{offer.address}</Text>
        {offer.distanceKm != null && <Text style={styles.distance}>{offer.distanceKm} KM away</Text>}
        <MapView pointerEvents="none" style={styles.map} initialRegion={{ latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }}><Marker coordinate={{ latitude, longitude }} title={business.name} /></MapView>
        <View style={styles.actionGrid}>
          <Action icon="directions" label="Directions" onPress={() => trackAndOpen('directions', `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`)} />
          <Action icon="phone-outline" label="Call" onPress={() => trackAndOpen('call', `tel:${offer.phone || business.phone}`)} />
          {(offer.whatsapp || business.whatsapp) ? <Action icon="whatsapp" label="WhatsApp" onPress={() => trackAndOpen('whatsapp', `https://wa.me/${(offer.whatsapp || business.whatsapp || '').replace(/\D/g, '')}`)} /> : null}
          <Action icon="bookmark-outline" label="Save" onPress={() => accessToken && toggleSavedOffer(accessToken, offer._id).then((result) => Alert.alert(result.saved ? 'Saved' : 'Removed', result.saved ? 'Offer added to Saved Offers.' : 'Offer removed from Saved Offers.'))} />
        </View>
        <Pressable onPress={() => {
          if (!accessToken) return;
          submitReport(accessToken, { targetType: 'offer', targetId: offer._id, reason: 'Incorrect information' })
            .then(() => Alert.alert('Report received', 'Our moderation team will review this offer.'))
            .catch((error) => Alert.alert('Could not report', error.message));
        }} style={styles.report}><MaterialCommunityIcons name="flag-outline" size={18} color={theme.colors.danger} /><Text style={styles.reportText}>Report Offer</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
};

const Info = ({ title, body, icon }: { title: string; body: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) => <View style={styles.info}><MaterialCommunityIcons name={icon} size={22} color={theme.colors.secondary} /><View style={styles.flex}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoBody}>{body}</Text></View></View>;
const Action = ({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) => <Pressable onPress={onPress} style={styles.action}><MaterialCommunityIcons name={icon} size={23} color={theme.colors.primary} /><Text style={styles.actionLabel}>{label}</Text></Pressable>;

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' }, topbar: { height: 58, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, topTitle: { flex: 1, ...theme.typography.h3, color: theme.colors.text },
  content: { paddingBottom: 90 },
  discount: { alignSelf: 'flex-start', margin: 18, marginBottom: 8, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }, discountText: { color: theme.colors.textInverse, fontWeight: '900' },
  title: { ...theme.typography.h1, color: theme.colors.text, marginHorizontal: 18 }, businessRow: { margin: 18, padding: 14, borderRadius: 18, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.colors.border },
  businessLogo: { width: 48, height: 48, borderRadius: 15, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, businessName: { ...theme.typography.bodyBold, color: theme.colors.text }, category: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  priceCard: { marginHorizontal: 18, padding: 18, backgroundColor: theme.colors.secondaryLight, borderRadius: 18, flexDirection: 'row', alignItems: 'baseline', gap: 10 }, original: { ...theme.typography.body, textDecorationLine: 'line-through', color: theme.colors.textMuted }, price: { fontSize: 26, fontWeight: '900', color: theme.colors.text }, saving: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '800' },
  info: { marginHorizontal: 18, marginTop: 18, flexDirection: 'row', gap: 12 }, infoTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, infoBody: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: 5, lineHeight: 21 },
  sectionTitle: { ...theme.typography.h3, color: theme.colors.text, marginHorizontal: 18, marginTop: 24 }, address: { ...theme.typography.body, color: theme.colors.textSecondary, marginHorizontal: 18, marginTop: 5 }, distance: { ...theme.typography.caption, color: theme.colors.secondary, fontWeight: '800', marginHorizontal: 18, marginTop: 4 },
  map: { height: 180, margin: 18, borderRadius: 18 }, actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 18 }, action: { width: '47%', minHeight: 55, borderRadius: 15, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionLabel: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '800' },
  report: { margin: 18, minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, reportText: { ...theme.typography.caption, color: theme.colors.danger, fontWeight: '700' },
});
