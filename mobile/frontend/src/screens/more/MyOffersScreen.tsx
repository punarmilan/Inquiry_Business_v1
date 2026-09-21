import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { deleteOffer, listMyOffers } from '../../services/api';
import { isPosterUploadOffer } from '../../config/offerCardDesigner';
import type { Offer, Business } from '../../types/hyperlocal';
import type { MoreStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme, createThemedStyles } from '../../theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'MyOffers'>;

const statusLabel = (status: Offer['status']) => status.replace('_', ' ');

export const MyOffersScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    listMyOffers(accessToken)
      .then((response) => setOffers(response.data))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const editOffer = (offer: Offer) => {
    const businessId = typeof offer.business === 'string' ? offer.business : (offer.business as Business)._id;
    if (!businessId) return Alert.alert('Offer unavailable', 'The business for this offer could not be found.');
    navigation.navigate('CreateOffer', { businessId, offer });
  };

  const confirmDelete = (offer: Offer) => {
    if (!accessToken || deletingId) return;
    Alert.alert(
      'Delete this offer?',
      'It will be removed from the Offers feed. This cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(offer._id);
            try {
              await deleteOffer(accessToken, offer._id);
              setOffers((current) => current.filter((item) => item._id !== offer._id));
            } catch (error: any) {
              Alert.alert('Could not delete offer', error.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <Pressable onPress={navigation.goBack} style={styles.back} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} />
        </Pressable>
        <View>
          <Text style={styles.title}>My Offers</Text>
          <Text style={styles.subtitle}>Edit or remove your own posts</Text>
        </View>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.content}>
        {loading && !offers.length ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {offers.map((offer) => {
          const business = offer.business as Business;
          const isAdminRemoved = offer.status === 'suspended';
          const isDeleting = deletingId === offer._id;
          const badgeStyle = offer.status === 'pending_review'
            ? styles.badge_pending_review
            : offer.status === 'approved'
              ? styles.badge_approved
              : offer.status === 'rejected'
                ? styles.badge_rejected
                : styles.badge_suspended;
          const badgeTextStyle = offer.status === 'pending_review'
            ? styles.badgeText_pending_review
            : offer.status === 'approved'
              ? styles.badgeText_approved
              : offer.status === 'rejected'
                ? styles.badgeText_rejected
                : styles.badgeText_suspended;
          return (
            <View key={offer._id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.icon}><MaterialCommunityIcons name="tag-outline" size={24} color={theme.colors.primary} /></View>
                <View style={styles.flex}>
                  <Text style={styles.offerTitle} numberOfLines={2}>{offer.title}</Text>
                  <Text style={styles.business}>{business?.name || 'Your business'}</Text>
                </View>
                <View style={[styles.badge, badgeStyle]}><Text style={[styles.badgeText, badgeTextStyle]}>{statusLabel(offer.status)}</Text></View>
              </View>
              <View style={styles.meta}>
                <Text style={styles.price}>{isPosterUploadOffer(offer) ? 'Poster offer' : `\u20B9${offer.offerPrice.toLocaleString('en-IN')}`}</Text>
                <Text style={styles.expiry}>Expires {new Date(offer.expiresAt).toLocaleDateString('en-IN')}</Text>
              </View>
              {offer.moderationReason ? <Text style={styles.reason}>Admin note: {offer.moderationReason}</Text> : null}
              <View style={styles.actions}>
                {!isAdminRemoved && (
                  <Pressable onPress={() => editOffer(offer)} style={[styles.action, styles.editAction]} disabled={isDeleting}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => confirmDelete(offer)} style={[styles.action, styles.deleteAction]} disabled={isDeleting}>
                  <MaterialCommunityIcons name={isDeleting ? 'loading' : 'trash-can-outline'} size={18} color={theme.colors.danger} />
                  <Text style={styles.deleteText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {!loading && !offers.length ? <Text style={styles.empty}>You have not submitted any offers yet.</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = createThemedStyles((c) => ({
  top: { minHeight: 66, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center' },
  back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.typography.h3, color: c.text },
  subtitle: { ...theme.typography.tiny, color: c.textMuted, marginTop: 1 },
  content: { padding: 18, paddingBottom: 100, gap: 12 },
  card: { padding: 15, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 44, height: 44, borderRadius: 13, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  offerTitle: { ...theme.typography.bodyBold, color: c.text },
  business: { ...theme.typography.caption, color: c.textSecondary, marginTop: 2 },
  badge: { backgroundColor: c.secondaryLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99 },
  badge_pending_review: { backgroundColor: c.accentLight },
  badge_approved: { backgroundColor: c.secondaryLight },
  badge_rejected: { backgroundColor: c.dangerLight },
  badge_suspended: { backgroundColor: c.dangerLight },
  badgeText: { fontSize: 9, fontWeight: '900', color: c.success, textTransform: 'uppercase' },
  badgeText_pending_review: { color: c.accentDark },
  badgeText_approved: { color: c.success },
  badgeText_rejected: { color: c.danger },
  badgeText_suspended: { color: c.danger },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.divider },
  price: { ...theme.typography.bodyBold, color: c.text },
  expiry: { ...theme.typography.tiny, color: c.textMuted },
  reason: { ...theme.typography.caption, color: c.danger, marginTop: 9 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 13 },
  action: { flex: 1, minHeight: 40, borderRadius: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1 },
  editAction: { borderColor: c.primary, backgroundColor: c.primaryLight },
  deleteAction: { borderColor: '#F4B7B2', backgroundColor: c.dangerLight },
  editText: { ...theme.typography.caption, color: c.primary, fontWeight: '900' },
  deleteText: { ...theme.typography.caption, color: c.danger, fontWeight: '900' },
  empty: { ...theme.typography.body, color: c.textSecondary, textAlign: 'center', marginTop: 40 },
}));
