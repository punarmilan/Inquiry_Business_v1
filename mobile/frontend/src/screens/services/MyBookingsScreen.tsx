import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listMyBookings } from '../../services/api';
import type { ServiceBooking } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'MyBookings'>;
const statusColor: Record<string, string> = { requested: theme.colors.warning, confirmed: theme.colors.secondary, assigned: theme.colors.verified, in_progress: theme.colors.primary, completed: theme.colors.success, cancelled: theme.colors.danger };

export const MyBookingsScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    listMyBookings(accessToken).then((response) => setBookings(response.data)).finally(() => setLoading(false));
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return <ScreenContainer><View style={styles.top}><Pressable onPress={navigation.goBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} /></Pressable><Text style={styles.title}>My Bookings</Text></View><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.content}>
    {loading && !bookings.length ? <ActivityIndicator color={theme.colors.primary} /> : null}
    {!loading && !bookings.length ? <View style={styles.empty}><MaterialCommunityIcons name="clipboard-text-outline" size={48} color={theme.colors.textMuted} /><Text style={styles.emptyTitle}>No bookings yet</Text><Text style={styles.emptyText}>Choose a trusted service to get started.</Text></View> : null}
    {bookings.map((booking) => { const color = statusColor[booking.status] || theme.colors.primary; const needsRating = booking.status === 'completed' && !booking.rating?.ratedAt; return <Pressable key={booking._id} onPress={() => navigation.navigate('BookingDetails', { bookingId: booking._id })} style={styles.card}>
      <View style={styles.row}><View style={styles.icon}><MaterialCommunityIcons name="tools" size={25} color={theme.colors.primary} /></View><View style={styles.flex}><Text style={styles.name}>{booking.category.name}</Text><Text style={styles.number}>#{booking.bookingNumber}</Text></View><View style={[styles.badge, { backgroundColor: `${color}18` }]}><Text style={[styles.badgeText, { color }]}>{booking.status.replace('_', ' ')}</Text></View></View>
      <View style={styles.meta}><Text style={styles.metaText}>{new Date(booking.scheduledFor).toLocaleString('en-IN')}</Text><Text style={styles.metaText}>{`\u20B9${booking.finalPrice ?? booking.priceEstimate}`}</Text></View>
      {booking.worker ? <Text style={styles.worker}>Assigned: {booking.worker.name}  ★ {booking.worker.ratingAverage || 'New'}</Text> : <Text style={styles.waiting}>Worker assignment pending</Text>}
      {needsRating ? <View style={styles.ratingRequired}><MaterialCommunityIcons name="star-outline" size={18} color={theme.colors.accentDark} /><Text style={styles.ratingRequiredText}>Rating required — tap to review service</Text><MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.accentDark} /></View> : null}
    </Pressable>; })}
  </ScrollView></ScreenContainer>;
};

const styles = StyleSheet.create({
  top: { height: 58, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center' },
  back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.typography.h3, color: theme.colors.text },
  content: { padding: 18, paddingBottom: 110, gap: 12 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: theme.colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  flex: { flex: 1 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  name: { ...theme.typography.bodyBold, color: theme.colors.text },
  number: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 11 },
  metaText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  worker: { ...theme.typography.caption, color: theme.colors.secondary, fontWeight: '700', marginTop: 9 },
  waiting: { ...theme.typography.caption, color: theme.colors.warning, fontWeight: '700', marginTop: 9 },
  ratingRequired: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.accentLight, borderRadius: 12, padding: 10, marginTop: 12 },
  ratingRequiredText: { flex: 1, ...theme.typography.tiny, color: theme.colors.accentDark, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 50 },
  emptyTitle: { ...theme.typography.h3, color: theme.colors.text, marginTop: 10 },
  emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: 5, textAlign: 'center' },
});
