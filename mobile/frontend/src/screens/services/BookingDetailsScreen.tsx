import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { cancelServiceBooking, createServicePaymentOrder, getServiceBooking, openBookingChat, rateServiceBooking } from '../../services/api';
import type { ServiceBooking } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';
import { callPhoneNumber } from '../../utils/call';

type Props = NativeStackScreenProps<ServicesStackParamList, 'BookingDetails'>;
const steps = ['requested', 'confirmed', 'assigned', 'in_progress', 'completed'];

export const BookingDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken } = useApp();
  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    getServiceBooking(accessToken, route.params.bookingId)
      .then((response) => setBooking(response.booking))
      .finally(() => setLoading(false));
  }, [accessToken, route.params.bookingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !booking) return <ScreenContainer style={styles.center}><ActivityIndicator color={theme.colors.primary} /></ScreenContainer>;

  const currentStep = steps.indexOf(booking.status);
  const ratingRequired = booking.status === 'completed' && !booking.rating?.ratedAt;

  const openChat = async () => {
    if (!accessToken || !booking.worker) return;
    try {
      const response = await openBookingChat(accessToken, booking._id);
      const chat: any = response.chat;
      navigation.navigate('ChatThread', { chatId: chat._id, bookingId: booking._id, jobTitle: `Booking #${booking.bookingNumber}`, otherUserId: String(chat.applicant), otherUserName: booking.worker.name, otherUserAvatar: booking.worker.photoUrl });
    } catch (error: any) {
      Alert.alert('Chat unavailable', error.message);
    }
  };

  const openCall = () => {
    if (!booking.worker?.phone) return Alert.alert('Call unavailable', 'This provider has not added a phone number yet.');
    callPhoneNumber(booking.worker.phone);
  };

  const openLocation = () => navigation.navigate('LiveLocation', { bookingId: booking._id, contextType: 'booking', otherUserName: booking.worker?.name || 'Provider' });

  const submitRating = async () => {
    if (!accessToken || !ratingStars || ratingSubmitting) return;
    setRatingSubmitting(true);
    try {
      await rateServiceBooking(accessToken, booking._id, ratingStars, ratingComment.trim());
      Alert.alert('Thank you', 'Your rating has been submitted.');
      setRatingStars(0);
      setRatingComment('');
      load();
    } catch (error: any) {
      Alert.alert('Rating failed', error.message || 'Could not submit your rating.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  return <ScreenContainer>
    <View style={styles.top}><Pressable onPress={navigation.goBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} /></Pressable><View><Text style={styles.topTitle}>{booking.category.name}</Text><Text style={styles.number}>#{booking.bookingNumber}</Text></View></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statusCard}><View style={styles.statusHeader}><View><Text style={styles.status}>{booking.status.replace('_', ' ')}</Text><Text style={styles.schedule}>{new Date(booking.scheduledFor).toLocaleString('en-IN')}</Text></View><View style={styles.statusIcon}><MaterialCommunityIcons name={booking.status === 'completed' ? 'check' : 'briefcase-outline'} size={24} color={theme.colors.textInverse} /></View></View><View style={styles.timeline}>{steps.map((step, index) => <View key={step} style={styles.stepWrap}><View style={[styles.step, index <= currentStep && styles.stepDone]}>{index <= currentStep && <MaterialCommunityIcons name="check" size={13} color={theme.colors.textInverse} />}</View>{index < steps.length - 1 && <View style={[styles.line, index < currentStep && styles.lineDone]} />}</View>)}</View></View>
      <Info label="Service address" value={booking.address} icon="map-marker-outline" />
      <Info label="Price estimate" value={`\u20B9${booking.priceEstimate}${booking.finalPrice != null ? `  •  Final \u20B9${booking.finalPrice}` : ''}`} icon="currency-inr" />
      <Info label="Payment" value={booking.paymentStatus} icon="credit-card-outline" />

      {booking.worker ? <View style={styles.workerCard}><View style={styles.workerAvatar}><MaterialCommunityIcons name="account-hard-hat" size={29} color={theme.colors.secondary} /></View><View style={styles.flex}><Text style={styles.workerLabel}>Assigned professional</Text><Text style={styles.workerName}>{booking.worker.name}</Text><Text style={styles.workerRating}>★ {booking.worker.ratingAverage || 'New'}</Text></View><Button label="Chat" variant="outline" onPress={openChat} /></View> : <View style={styles.waiting}><MaterialCommunityIcons name="account-clock-outline" size={28} color={theme.colors.warning} /><View style={styles.flex}><Text style={styles.waitTitle}>Assignment in progress</Text><Text style={styles.waitText}>Our team will assign a verified professional.</Text></View></View>}
      {booking.worker && ['assigned', 'in_progress'].includes(booking.status) ? <View style={styles.connectionActions}><Text style={styles.connectionTitle}>Stay connected</Text><Text style={styles.connectionText}>Your provider has accepted the request. You can coordinate safely from here.</Text><View style={styles.connectionButtons}><Button label="Call" variant="outline" onPress={openCall} style={styles.connectionButton} icon={<MaterialCommunityIcons name="phone-outline" size={17} color={theme.colors.primary} />} /><Button label="Location" variant="outline" onPress={openLocation} style={styles.connectionButton} icon={<MaterialCommunityIcons name="map-marker-radius-outline" size={17} color={theme.colors.primary} />} /></View></View> : null}

      {ratingRequired ? <View style={styles.ratingCard}><View style={styles.ratingHeader}><View style={styles.ratingIcon}><MaterialCommunityIcons name="star-check-outline" size={22} color={theme.colors.accentDark} /></View><View style={styles.flex}><Text style={styles.ratingTitle}>Rate this service</Text><Text style={styles.ratingHint}>Rating is required. Comment is optional.</Text></View></View><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} accessibilityRole="button" accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`} onPress={() => setRatingStars(star)} style={styles.starButton}><MaterialCommunityIcons name={star <= ratingStars ? 'star' : 'star-outline'} size={38} color={star <= ratingStars ? theme.colors.accent : theme.colors.textMuted} /></Pressable>)}</View><TextInput value={ratingComment} onChangeText={setRatingComment} placeholder="Write a comment (optional)" placeholderTextColor={theme.colors.textMuted} multiline maxLength={1000} style={styles.commentInput} /><Button label={ratingStars ? 'Submit rating' : 'Select stars to continue'} onPress={submitRating} disabled={!ratingStars || ratingSubmitting} loading={ratingSubmitting} fullWidth /></View> : null}
      {booking.status === 'completed' && booking.rating?.ratedAt ? <View style={styles.ratedCard}><MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.success} /><View style={styles.flex}><Text style={styles.ratedTitle}>Rating submitted</Text><Text style={styles.ratedText}>{booking.rating.stars}/5 stars{booking.rating.review ? `  •  ${booking.rating.review}` : ''}</Text></View></View> : null}
      {booking.status === 'completed' && booking.paymentStatus !== 'paid' && !ratingRequired ? <Button label={booking.paymentStatus === 'pending' ? 'Payment Verification Pending' : 'Create Secure Payment Order'} disabled={booking.paymentStatus === 'pending'} onPress={() => accessToken && createServicePaymentOrder(accessToken, booking._id).then((result) => { Alert.alert('Payment order created', `Order ${result.payment.orderId} for \u20B9${result.payment.amount} requires secure server verification.`); load(); })} /> : null}
      {ratingRequired ? <View style={styles.paymentLocked}><MaterialCommunityIcons name="lock-outline" size={19} color={theme.colors.warning} /><Text style={styles.paymentLockedText}>Submit your rating to continue with payment.</Text></View> : null}
      {['requested', 'confirmed', 'assigned'].includes(booking.status) ? <Button label="Cancel Booking" variant="ghost" onPress={() => Alert.alert('Cancel booking?', 'This action cannot be undone.', [{ text: 'Keep booking' }, { text: 'Cancel booking', style: 'destructive', onPress: () => accessToken && cancelServiceBooking(accessToken, booking._id, 'Cancelled by customer').then(load) }])} /> : null}
    </ScrollView>
  </ScreenContainer>;
};

const Info = ({ label, value, icon }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) => <View style={styles.info}><MaterialCommunityIcons name={icon} size={23} color={theme.colors.primary} /><View style={styles.flex}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { height: 64, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center' },
  back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  topTitle: { ...theme.typography.h3, color: theme.colors.text },
  number: { ...theme.typography.tiny, color: theme.colors.textMuted },
  content: { padding: 18, paddingBottom: 100, gap: 12 },
  statusCard: { padding: 20, borderRadius: 20, backgroundColor: theme.colors.secondary },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  status: { ...theme.typography.h2, color: theme.colors.textInverse, textTransform: 'capitalize' },
  schedule: { ...theme.typography.caption, color: '#DFF3F1', marginTop: 5 },
  timeline: { flexDirection: 'row', marginTop: 20 },
  stepWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  step: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#8BC8C2', alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  line: { flex: 1, height: 2, backgroundColor: '#8BC8C2' },
  lineDone: { backgroundColor: theme.colors.primary },
  info: { flexDirection: 'row', gap: 12, padding: 15, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  flex: { flex: 1 },
  infoLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
  infoValue: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 3, textTransform: 'capitalize' },
  workerCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15, backgroundColor: theme.colors.secondaryLight, borderRadius: 18 },
  workerAvatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  workerLabel: { ...theme.typography.tiny, color: theme.colors.textMuted },
  workerName: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 2 },
  workerRating: { ...theme.typography.caption, color: theme.colors.accentDark, marginTop: 2 },
  connectionActions: { backgroundColor: theme.colors.primaryLight, borderRadius: 18, padding: 15 },
  connectionTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  connectionText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  connectionButtons: { flexDirection: 'row', gap: 9, marginTop: 12 },
  connectionButton: { flex: 1, paddingHorizontal: 8 },
  waiting: { flexDirection: 'row', gap: 12, padding: 17, backgroundColor: theme.colors.accentLight, borderRadius: 18 },
  waitTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  waitText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  ratingCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: theme.colors.accent, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  ratingIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: theme.colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  ratingTitle: { ...theme.typography.h3, color: theme.colors.text },
  ratingHint: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 },
  starButton: { padding: 2 },
  commentInput: { minHeight: 82, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 12, color: theme.colors.text, marginTop: 14, marginBottom: 13, ...theme.typography.caption },
  ratedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, backgroundColor: theme.colors.successLight, borderRadius: 17 },
  ratedTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  ratedText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  paymentLocked: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, backgroundColor: theme.colors.accentLight, borderRadius: 14 },
  paymentLockedText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary },
});
