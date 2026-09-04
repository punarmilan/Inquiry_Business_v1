import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { OfferCard } from '../../components/OfferCard';
import { getBusinessDetails, recordOfferEvent } from '../../services/api';
import type { Business, Offer } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<OffersStackParamList, 'BusinessDetails'>;
export const BusinessDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const [data, setData] = useState<{ business: Business; offers: Offer[] } | null>(null);
  useEffect(() => { getBusinessDetails(route.params.businessId).then(setData).catch(() => setData(null)); }, [route.params.businessId]);
  if (!data) return <ScreenContainer style={styles.center}><ActivityIndicator color={theme.colors.primary} /></ScreenContainer>;
  const business = data.business;
  const [longitude, latitude] = business.location.coordinates;
  const businessImage = business.coverImageUrl || business.logoUrl;
  return <ScreenContainer><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.coverFrame}>
      {businessImage ? <Image source={{ uri: businessImage }} style={styles.cover} resizeMode="cover" /> : <View style={[styles.cover, styles.fallback]}><MaterialCommunityIcons name="storefront-outline" size={60} color={theme.colors.primary} /></View>}
      <Pressable onPress={navigation.goBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
        <MaterialCommunityIcons name="arrow-left" size={23} color={theme.colors.text} />
      </Pressable>
    </View>
    <View style={styles.header}><Text style={styles.title}>{business.name}</Text>{business.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={22} color={theme.colors.verified} />}</View>
    <Text style={styles.category}>{business.category}</Text><Text style={styles.description}>{business.description || 'Local business on InquiryExperts.'}</Text>
    <Text style={styles.address}>{business.address}</Text>
    <View style={styles.actions}><Button label="Call" onPress={() => Linking.openURL(`tel:${business.phone}`)} /><Button label="Directions" variant="outline" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`)} /></View>
    <Text style={styles.sectionTitle}>Current offers</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>{data.offers.map((offer) => <OfferCard key={offer._id} offer={{ ...offer, business }} variant="hero" compact onPress={() => navigation.navigate('OfferDetails', { offerId: offer._id })} />)}</ScrollView>
  </ScrollView></ScreenContainer>;
};
const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' }, content: { paddingBottom: 100 }, coverFrame: { width: '100%', height: 210, position: 'relative' }, cover: { width: '100%', height: '100%' }, fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight }, backButton: { position: 'absolute', top: 12, left: 12, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', shadowColor: theme.colors.shadowStrong, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, header: { flexDirection: 'row', alignItems: 'center', gap: 7, margin: 18, marginBottom: 4 }, title: { ...theme.typography.h1, color: theme.colors.text }, category: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '800', marginHorizontal: 18 }, description: { ...theme.typography.body, color: theme.colors.textSecondary, margin: 18, lineHeight: 22 }, address: { ...theme.typography.body, color: theme.colors.text, marginHorizontal: 18 }, actions: { flexDirection: 'row', gap: 10, margin: 18 }, sectionTitle: { ...theme.typography.h2, color: theme.colors.text, marginHorizontal: 18, marginTop: 10 }, cards: { padding: 18, gap: 12 } });
