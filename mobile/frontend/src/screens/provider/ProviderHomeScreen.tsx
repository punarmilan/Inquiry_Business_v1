import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import { listProviderBookings, openProviderBookingChat, respondToProviderBooking, updateProviderAvailability, updateProviderBookingStatus, type ProviderBooking } from '../../services/api';
import { callPhoneNumber } from '../../utils/call';
import type { ProviderTabParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = BottomTabScreenProps<ProviderTabParamList, 'ProviderHome'>;
type ActivityEvent = { id: string; status: string; title: string; booking: ProviderBooking; at: string };

const statusColor: Record<string, string> = {
  requested: theme.colors.warning,
  confirmed: theme.colors.secondary,
  invited: theme.colors.warning,
  accepted: theme.colors.secondary,
  assigned: theme.colors.primary,
  in_progress: theme.colors.primary,
  completed: theme.colors.success,
  rejected: theme.colors.textMuted,
  already_accepted: theme.colors.textMuted,
  expired: theme.colors.textMuted,
  cancelled: theme.colors.danger,
};

const statusLabel: Record<string, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  invited: 'New request',
  accepted: 'Accepted',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  rejected: 'Rejected',
  already_accepted: 'Taken by another provider',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const activityTitle: Record<string, string> = {
  requested: 'New service request',
  confirmed: 'Booking confirmed',
  assigned: 'Job accepted',
  in_progress: 'Service started',
  completed: 'Service completed',
  cancelled: 'Booking cancelled',
};

const isToday = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';
const formatTime = (value?: string) => value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
const money = (value?: number | null) => `\u20B9${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const bookingAmount = (booking: ProviderBooking) => Number(booking.finalPrice ?? booking.priceEstimate ?? 0);

export const ProviderHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken, currentUser, logout, unreadNotificationCount, fetchNotifications } = useApp();
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const firstPage = await listProviderBookings(accessToken, 1);
      const pageCount = firstPage.pagination?.pages || 1;
      const remainingPages = pageCount > 1
        ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => listProviderBookings(accessToken, index + 2)))
        : [];
      setBookings([firstPage.data, ...remainingPages.map((page) => page.data)].flat());
      setProvider(firstPage.provider);
      await fetchNotifications();
    } catch (error: any) {
      Alert.alert('Provider portal', error.message || 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, fetchNotifications]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setAvailability = async () => {
    if (!accessToken || !provider || availabilityBusy) return;
    const next = provider.availability === 'available' ? 'offline' : 'available';
    setAvailabilityBusy(true);
    try {
      const response = await updateProviderAvailability(accessToken, next);
      setProvider((current: any) => ({ ...current, availability: response.provider.availability }));
    } catch (error: any) {
      Alert.alert('Availability', error.message);
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const respond = async (booking: ProviderBooking, response: 'accepted' | 'rejected') => {
    if (!accessToken) return;
    setBusyId(booking._id);
    try {
      await respondToProviderBooking(accessToken, booking._id, response);
      await load();
      if (response === 'accepted') Alert.alert('Job accepted', 'You can now chat with the customer and start the service.');
    } catch (error: any) {
      Alert.alert('Request update', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const advance = async (booking: ProviderBooking, status: 'in_progress' | 'completed') => {
    if (!accessToken) return;
    setBusyId(booking._id);
    try {
      await updateProviderBookingStatus(accessToken, booking._id, status);
      await load();
    } catch (error: any) {
      Alert.alert('Job update', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (booking: ProviderBooking) => {
    if (!accessToken) return;
    try {
      const response = await openProviderBookingChat(accessToken, booking._id);
      const customer = response.customer || booking.customer;
      (navigation.getParent() as any)?.navigate('ChatThread', { chatId: response.chat._id, bookingId: booking._id, jobTitle: `Booking #${booking.bookingNumber}`, otherUserId: customer?._id || '', otherUserName: customer?.name || 'Customer', otherUserAvatar: customer?.photoUrl });
    } catch (error: any) {
      Alert.alert('Chat unavailable', error.message);
    }
  };

  const openCall = (booking: ProviderBooking) => {
    if (!booking.customer?.phone) return Alert.alert('Call unavailable', 'This customer has not added a phone number yet.');
    callPhoneNumber(booking.customer.phone);
  };

  const openLocation = (booking: ProviderBooking) => {
    (navigation.getParent() as any)?.navigate('LiveLocation', { bookingId: booking._id, contextType: 'booking', otherUserName: booking.customer?.name || 'Customer' });
  };

  const requests = useMemo(() => bookings.filter((booking) => booking.dispatchedProviders?.some((item) => item.status === 'invited' && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now()))), [bookings]);
  const active = useMemo(() => bookings.filter((booking) => booking.status === 'assigned' || booking.status === 'in_progress'), [bookings]);
  const history = useMemo(() => bookings.filter((booking) => ['completed', 'cancelled'].includes(booking.status)).sort((a, b) => new Date(b.updatedAt || b.scheduledFor).getTime() - new Date(a.updatedAt || a.scheduledFor).getTime()), [bookings]);
  const todayBookings = useMemo(() => bookings.filter((booking) => isToday(booking.scheduledFor) && booking.status !== 'cancelled'), [bookings]);
  const todayCompleted = useMemo(() => bookings.filter((booking) => booking.status === 'completed' && (isToday(booking.updatedAt) || isToday(booking.scheduledFor))), [bookings]);
  const todayEarnings = todayCompleted.reduce((sum, booking) => sum + bookingAmount(booking), 0);
  const completedCount = provider?.completedBookings ?? bookings.filter((booking) => booking.status === 'completed').length;

  const activity = useMemo<ActivityEvent[]>(() => {
    const events = bookings.flatMap((booking) => (booking.statusHistory || []).filter((item) => isToday(item.at)).map((item, index) => ({
      id: `${booking._id}-${item.status}-${item.at || index}`,
      status: item.status,
      title: activityTitle[item.status] || statusLabel[item.status] || item.status,
      booking,
      at: item.at || booking.updatedAt || booking.scheduledFor,
    })));
    if (events.length) return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);
    return todayBookings.slice().sort((a, b) => new Date(b.updatedAt || b.scheduledFor).getTime() - new Date(a.updatedAt || a.scheduledFor).getTime()).slice(0, 6).map((booking) => ({
      id: booking._id,
      status: booking.status,
      title: activityTitle[booking.status] || statusLabel[booking.status] || 'Booking update',
      booking,
      at: booking.updatedAt || booking.scheduledFor,
    }));
  }, [bookings, todayBookings]);

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.colors.primary]} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[theme.colors.primaryDark, theme.colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIdentity}>
              <Text style={styles.heroEyebrow}>INQUIRYEXPERTS PROVIDER</Text>
              <Text style={styles.heroGreeting}>Good to see you,</Text>
              <Text style={styles.heroName}>{currentUser?.name || provider?.name || 'Provider'}</Text>
              <Text style={styles.heroSub}>{provider?.city?.name || 'Assigned city'}  •  {provider?.categories?.map((category: any) => category.name).join(', ') || 'Services'}</Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable onPress={() => (navigation.getParent()?.getParent() as any)?.navigate('ProviderNotifications')} style={styles.heroAction}>
                <MaterialCommunityIcons name="bell-outline" size={21} color={theme.colors.textInverse} />
                {unreadNotificationCount > 0 ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</Text></View> : null}
              </Pressable>
              <Pressable onPress={() => Alert.alert('Logout', 'Log out from provider account?', [{ text: 'Cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }])} style={styles.heroAction}>
                <MaterialCommunityIcons name="logout" size={21} color={theme.colors.textInverse} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <View style={styles.ratingLine}><MaterialCommunityIcons name="star" size={16} color="#FFD166" /><Text style={styles.ratingText}>{provider?.ratingAverage || 'New'} rating</Text></View>
            <Pressable disabled={availabilityBusy} onPress={setAvailability} style={[styles.availabilityButton, provider?.availability === 'available' ? styles.availabilityButtonOnline : styles.availabilityButtonOffline, availabilityBusy && styles.disabledButton]}>
              {availabilityBusy ? <ActivityIndicator size="small" color={theme.colors.textInverse} /> : <View style={[styles.availabilityDot, provider?.availability === 'available' && styles.availabilityDotOnline]} />}
              <Text style={styles.availabilityText}>{provider?.availability === 'available' ? 'Go offline' : 'Go online'}</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.kpiRow}>
          <Kpi icon="bell-ring-outline" value={String(requests.length)} label="Requests" color={theme.colors.warning} />
          <Kpi icon="briefcase-check-outline" value={String(active.length)} label="Active jobs" color={theme.colors.primary} />
          <Kpi icon="check-decagram-outline" value={String(completedCount)} label="Completed" color={theme.colors.success} />
        </View>

        <SectionTitle title="Today at a glance" subtitle="Your activity for today" icon="calendar-today" />
        <View style={styles.todayCard}>
          <View style={styles.todayTop}><View><Text style={styles.todayLabel}>TODAY'S ACTIVITY</Text><Text style={styles.todayTitle}>{todayBookings.length ? `${todayBookings.length} service${todayBookings.length === 1 ? '' : 's'} scheduled` : 'No services scheduled'}</Text></View><View style={styles.todayIcon}><MaterialCommunityIcons name="chart-timeline-variant" size={23} color={theme.colors.primary} /></View></View>
          <View style={styles.todayMetrics}>
            <MiniMetric icon="calendar-check-outline" value={String(todayBookings.length)} label="Scheduled" />
            <MiniMetric icon="check-circle-outline" value={String(todayCompleted.length)} label="Completed" />
            <MiniMetric icon="cash-multiple" value={money(todayEarnings)} label="Earned" />
          </View>
        </View>

        <SectionTitle title="Daily activity" subtitle="Latest updates from your work" icon="timeline-clock-outline" />
        <View style={styles.activityCard}>
          {activity.length ? activity.map((event, index) => <ActivityRow key={event.id} event={event} last={index === activity.length - 1} />) : <EmptyInline icon="timeline-outline" title="No activity yet today" text="Your requests and job updates will appear here." />}
        </View>

        <SectionTitle title="Direct requests" count={requests.length} subtitle="Respond quickly to new customers" icon="bell-ring-outline" />
        {loading && !bookings.length ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
        {requests.map((booking) => <ProviderBookingCard key={booking._id} booking={booking} busy={busyId === booking._id} onAccept={() => respond(booking, 'accepted')} onReject={() => respond(booking, 'rejected')} />)}
        {!requests.length && <EmptyInline icon="inbox-outline" title="You are all caught up" text="New service requests will appear here." />}

        <SectionTitle title="Active jobs" count={active.length} subtitle="Keep customers updated" icon="briefcase-check-outline" />
        {active.map((booking) => <ProviderBookingCard key={booking._id} booking={booking} busy={busyId === booking._id} onChat={() => openChat(booking)} onCall={() => openCall(booking)} onLocation={() => openLocation(booking)} onStart={booking.status === 'assigned' ? () => advance(booking, 'in_progress') : undefined} onComplete={booking.status === 'in_progress' ? () => advance(booking, 'completed') : undefined} />)}
        {!active.length && <EmptyInline icon="briefcase-outline" title="No active jobs" text="Accept a request to see it here." />}

        <SectionTitle title="Working history" count={history.length} subtitle="Completed and cancelled services" icon="history" actionLabel={history.length > 4 ? (showAllHistory ? 'Show less' : 'View all') : undefined} onAction={() => setShowAllHistory((value) => !value)} />
        <View style={styles.historyCard}>
          {history.length ? history.slice(0, showAllHistory ? history.length : 4).map((booking, index) => <HistoryRow key={booking._id} booking={booking} last={index === Math.min(history.length, showAllHistory ? history.length : 4) - 1} />) : <EmptyInline icon="history" title="No working history yet" text="Completed services will appear here." compact />}
        </View>

        <View style={styles.coverageCard}><View style={styles.coverageIcon}><MaterialCommunityIcons name="map-marker-radius-outline" size={22} color={theme.colors.secondary} /></View><View style={styles.coverageCopy}><Text style={styles.coverageTitle}>Your service coverage</Text><Text style={styles.coverageText}>{provider?.serviceAreas?.join('  •  ') || 'Areas assigned by admin will appear here'}</Text></View></View>
      </ScrollView>
    </ScreenContainer>
  );
};

const SectionTitle: React.FC<{ title: string; subtitle?: string; count?: number; icon: keyof typeof MaterialCommunityIcons.glyphMap; actionLabel?: string; onAction?: () => void }> = ({ title, subtitle, count, icon, actionLabel, onAction }) => <View style={styles.sectionTitleRow}><View style={styles.sectionTitleLeft}><View style={styles.sectionIcon}><MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} /></View><View><View style={styles.titleWithCount}><Text style={styles.sectionTitle}>{title}</Text>{typeof count === 'number' ? <View style={styles.count}><Text style={styles.countText}>{count}</Text></View> : null}</View>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}</View></View>{actionLabel && onAction ? <Pressable onPress={onAction}><Text style={styles.actionLabel}>{actionLabel}</Text></Pressable> : null}</View>;

const Kpi: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string; color: string }> = ({ icon, value, label, color }) => <View style={styles.kpi}><View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}><MaterialCommunityIcons name={icon} size={20} color={color} /></View><Text style={styles.kpiValue}>{value}</Text><Text style={styles.kpiLabel}>{label}</Text></View>;
const MiniMetric: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string }> = ({ icon, value, label }) => <View style={styles.miniMetric}><MaterialCommunityIcons name={icon} size={17} color={theme.colors.primary} /><Text style={styles.miniValue} numberOfLines={1}>{value}</Text><Text style={styles.miniLabel}>{label}</Text></View>;

const ActivityRow: React.FC<{ event: ActivityEvent; last: boolean }> = ({ event, last }) => <View style={styles.activityRow}><View style={styles.activityRail}>{!last ? <View style={styles.activityLine} /> : null}<View style={[styles.activityDot, { backgroundColor: statusColor[event.status] || theme.colors.primary }]}><MaterialCommunityIcons name={event.status === 'completed' ? 'check' : event.status === 'cancelled' ? 'close' : 'arrow-right'} size={11} color={theme.colors.textInverse} /></View></View><View style={styles.activityCopy}><Text style={styles.activityTitle}>{event.title}</Text><Text style={styles.activityBooking}>{event.booking.category?.name || 'Service'}  •  {event.booking.customer?.name || 'Customer'}  •  #{event.booking.bookingNumber}</Text></View><Text style={styles.activityTime}>{formatTime(event.at)}</Text></View>;

const HistoryRow: React.FC<{ booking: ProviderBooking; last: boolean }> = ({ booking, last }) => { const color = statusColor[booking.status] || theme.colors.primary; return <View style={[styles.historyRow, !last && styles.rowBorder]}><View style={[styles.historyIcon, { backgroundColor: `${color}18` }]}><MaterialCommunityIcons name={booking.status === 'completed' ? 'check-decagram-outline' : 'close-circle-outline'} size={20} color={color} /></View><View style={styles.historyCopy}><Text style={styles.historyTitle} numberOfLines={1}>{booking.category?.name || 'Service booking'}</Text><Text style={styles.historyMeta} numberOfLines={1}>{booking.customer?.name || 'Customer'}  •  {formatDate(booking.updatedAt || booking.scheduledFor)}</Text></View><View style={styles.historyRight}><Text style={[styles.historyStatus, { color }]}>{statusLabel[booking.status] || booking.status}</Text><Text style={styles.historyAmount}>{money(bookingAmount(booking))}</Text></View></View>; };

const EmptyInline: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text: string; compact?: boolean }> = ({ icon, title, text, compact }) => <View style={[styles.emptyCard, compact && styles.emptyCardCompact]}><View style={styles.emptyIcon}><MaterialCommunityIcons name={icon} size={21} color={theme.colors.textMuted} /></View><View style={styles.emptyCopy}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View></View>;

const ProviderBookingCard: React.FC<{ booking: ProviderBooking; busy?: boolean; onAccept?: () => void; onReject?: () => void; onChat?: () => void; onCall?: () => void; onLocation?: () => void; onStart?: () => void; onComplete?: () => void }> = ({ booking, busy, onAccept, onReject, onChat, onCall, onLocation, onStart, onComplete }) => <View style={styles.bookingCard}>
  <View style={styles.bookingTop}><Avatar uri={booking.customer?.photoUrl} name={booking.customer?.name || 'Customer'} size={43} /><View style={styles.bookingIdentity}><Text style={styles.serviceName}>{booking.category?.name || 'Service request'}</Text><Text style={styles.customerName}>{booking.customer?.name || 'Customer'}  •  #{booking.bookingNumber}</Text></View><View style={[styles.statusPill, { backgroundColor: `${statusColor[booking.status] || theme.colors.primary}18` }]}><Text style={[styles.statusText, { color: statusColor[booking.status] || theme.colors.primary }]}>{statusLabel[booking.status] || booking.status}</Text></View></View>
  <View style={styles.bookingDetails}><Detail icon="map-marker-outline" text={`${booking.locality || 'Assigned area'}  •  ${booking.address}`} /><Detail icon="calendar-clock-outline" text={new Date(booking.scheduledFor).toLocaleString('en-IN')} /><Detail icon="cash-multiple" text={`Estimated from ${money(booking.priceEstimate)}`} /></View>
  {booking.problemDescription ? <Text style={styles.problem} numberOfLines={2}>{booking.problemDescription}</Text> : null}
  {onAccept || onReject ? <View style={styles.actions}><Button label="Decline" variant="outline" onPress={() => onReject?.()} disabled={busy} style={styles.actionButton} /><Button label="Accept request" onPress={() => onAccept?.()} loading={busy} style={styles.actionButton} /></View> : null}
  {onChat || onCall || onLocation || onStart || onComplete ? <><View style={styles.actions}>{onChat ? <Button label="Chat" variant="outline" onPress={() => onChat?.()} style={styles.actionButton} icon={<MaterialCommunityIcons name="message-text-outline" size={17} color={theme.colors.primary} />} /> : null}{onCall ? <Button label="Call" variant="outline" onPress={() => onCall?.()} style={styles.actionButton} icon={<MaterialCommunityIcons name="phone-outline" size={17} color={theme.colors.primary} />} /> : null}{onLocation ? <Button label="Location" variant="outline" onPress={() => onLocation?.()} style={styles.actionButton} icon={<MaterialCommunityIcons name="map-marker-radius-outline" size={17} color={theme.colors.primary} />} /> : null}</View>{onStart || onComplete ? <View style={styles.actions}>{onStart ? <Button label="Start service" onPress={() => onStart?.()} loading={busy} style={styles.actionButton} /> : null}{onComplete ? <Button label="Complete job" onPress={() => onComplete?.()} loading={busy} style={styles.actionButton} /> : null}</View> : null}</> : null}
</View>;

const Detail: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }> = ({ icon, text }) => <View style={styles.detail}><MaterialCommunityIcons name={icon} size={16} color={theme.colors.textMuted} /><Text style={styles.detailText} numberOfLines={2}>{text}</Text></View>;

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 120 },
  hero: { borderRadius: 25, padding: 20, shadowColor: theme.colors.primaryDark, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroIdentity: { flex: 1, paddingRight: 12 },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  notificationBadge: { position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, backgroundColor: theme.colors.danger, borderWidth: 1.5, borderColor: theme.colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  notificationBadgeText: { fontSize: 9, fontWeight: '900', color: theme.colors.textInverse },
  heroEyebrow: { ...theme.typography.tiny, color: '#BFF4EF', fontWeight: '900', letterSpacing: 1.2 },
  heroGreeting: { ...theme.typography.body, color: '#DDF8F5', marginTop: 14 },
  heroName: { fontSize: 26, lineHeight: 31, fontWeight: '900', color: theme.colors.textInverse, marginTop: 2 },
  heroSub: { ...theme.typography.caption, color: '#BFF4EF', marginTop: 8 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 23 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { ...theme.typography.caption, color: theme.colors.textInverse, fontWeight: '800' },
  availabilityButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 99, paddingHorizontal: 13, borderWidth: 1 },
  availabilityButtonOnline: { backgroundColor: theme.colors.success, borderColor: theme.colors.textInverse },
  availabilityButtonOffline: { backgroundColor: 'rgba(0,0,0,.2)', borderColor: 'rgba(255,255,255,.3)' },
  availabilityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C5D0D1' },
  availabilityDotOnline: { backgroundColor: theme.colors.textInverse },
  availabilityText: { ...theme.typography.caption, color: theme.colors.textInverse, fontWeight: '900' },
  disabledButton: { opacity: 0.7 },
  kpiRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  kpi: { flex: 1, minHeight: 112, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  kpiIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { ...theme.typography.h2, color: theme.colors.text, marginTop: 9 },
  kpiLabel: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  titleWithCount: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { ...theme.typography.h3, color: theme.colors.text },
  sectionSubtitle: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 2 },
  count: { minWidth: 23, height: 23, paddingHorizontal: 7, borderRadius: 99, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  countText: { ...theme.typography.tiny, color: theme.colors.primaryDark, fontWeight: '900' },
  actionLabel: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '900' },
  todayCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  todayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayLabel: { ...theme.typography.tiny, color: theme.colors.primary, fontWeight: '900', letterSpacing: 1.1 },
  todayTitle: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 4 },
  todayIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  todayMetrics: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.divider, marginTop: 15, paddingTop: 14 },
  miniMetric: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: theme.colors.divider },
  miniValue: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 4, maxWidth: '95%' },
  miniLabel: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 2 },
  activityCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: theme.colors.border },
  activityRow: { minHeight: 57, flexDirection: 'row', alignItems: 'flex-start' },
  activityRail: { width: 27, alignItems: 'center', position: 'relative', height: 57 },
  activityLine: { position: 'absolute', top: 25, bottom: -2, width: 2, backgroundColor: theme.colors.divider },
  activityDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  activityCopy: { flex: 1, paddingLeft: 8, paddingRight: 6 },
  activityTitle: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '800' },
  activityBooking: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 3 },
  activityTime: { ...theme.typography.tiny, color: theme.colors.textMuted, paddingTop: 2 },
  loader: { marginVertical: 18 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceAlt, borderRadius: 16, padding: 14 },
  emptyCardCompact: { margin: -1 },
  emptyIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  emptyCopy: { flex: 1 },
  emptyTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  emptyText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  bookingCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  bookingTop: { flexDirection: 'row', alignItems: 'center' },
  bookingIdentity: { flex: 1, marginLeft: 10 },
  serviceName: { ...theme.typography.bodyBold, color: theme.colors.text },
  customerName: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 3 },
  statusPill: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 6, marginLeft: 6 },
  statusText: { ...theme.typography.tiny, fontWeight: '900' },
  bookingDetails: { backgroundColor: theme.colors.surfaceAlt, borderRadius: 13, padding: 10, marginTop: 13, gap: 7 },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  detailText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
  problem: { ...theme.typography.caption, color: theme.colors.text, marginTop: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionButton: { flex: 1 },
  historyCard: { backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.border },
  historyRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  historyIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  historyCopy: { flex: 1, paddingRight: 5 },
  historyTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  historyMeta: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 3 },
  historyRight: { alignItems: 'flex-end', maxWidth: 105 },
  historyStatus: { ...theme.typography.tiny, fontWeight: '900', textAlign: 'right' },
  historyAmount: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '800', marginTop: 4 },
  coverageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14, marginTop: 22, borderWidth: 1, borderColor: theme.colors.border },
  coverageIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.secondaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  coverageCopy: { flex: 1 },
  coverageTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  coverageText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
});
