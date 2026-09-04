import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../context/AppContext';
import { listProviderBookings, type ProviderBooking } from '../../services/api';
import { theme } from '../../theme';

export const ProviderDashboardScreen: React.FC = () => {
  const { accessToken } = useApp();
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listProviderBookings(accessToken);
      setBookings(response.data);
      setProvider(response.provider);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completed = bookings.filter((booking) => booking.status === 'completed').length;
  const active = bookings.filter((booking) => ['assigned', 'in_progress'].includes(booking.status)).length;
  const accepted = bookings.filter((booking) => booking.dispatchedProviders?.some((item) => item.status === 'accepted')).length;
  const totalValue = bookings.filter((booking) => booking.status === 'completed').reduce((sum, booking) => sum + Number(booking.finalPrice ?? booking.priceEstimate ?? 0), 0);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.colors.primary]} />}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>PERFORMANCE</Text><Text style={styles.title}>Your dashboard</Text><Text style={styles.subtitle}>A quick view of your service work.</Text></View><View style={styles.headerIcon}><MaterialCommunityIcons name="chart-line" size={25} color={theme.colors.primary} /></View></View>
        {loading && !provider ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}

        <View style={styles.kpiGrid}>
          <Kpi icon="check-decagram-outline" value={String(provider?.completedBookings ?? completed)} label="Completed" color={theme.colors.success} />
          <Kpi icon="briefcase-check-outline" value={String(active)} label="Active jobs" color={theme.colors.primary} />
          <Kpi icon="thumb-up-outline" value={String(accepted)} label="Accepted" color={theme.colors.secondary} />
          <Kpi icon="cash-multiple" value={`₹${totalValue}`} label="Completed value" color={theme.colors.warning} />
        </View>

        <Text style={styles.sectionLabel}>WORK SNAPSHOT</Text>
        <View style={styles.card}><Row icon="map-marker-radius-outline" title="Service area" value={provider?.serviceAreas?.join(' · ') || 'Assigned areas will appear here'} /><View style={styles.rule} /><Row icon="star-outline" title="Your rating" value={provider?.ratingAverage ? `${provider.ratingAverage} / 5 (${provider.ratingCount || 0} reviews)` : 'New provider'} /><View style={styles.rule} /><Row icon="clock-outline" title="Availability" value={provider?.availability === 'available' ? 'Online and accepting requests' : 'Offline'} /></View>

        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <View style={styles.tipCard}><View style={styles.tipIcon}><MaterialCommunityIcons name="lightbulb-on-outline" size={23} color={theme.colors.primary} /></View><View style={styles.tipCopy}><Text style={styles.tipTitle}>Stay Online for new requests</Text><Text style={styles.tipText}>Customers choose you from the provider list and send direct service requests. Review the address, accept the job, then chat with the customer.</Text></View></View>
      </ScrollView>
    </ScreenContainer>
  );
};

const Kpi: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string; color: string }> = ({ icon, value, label, color }) => <View style={styles.kpi}><View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}><MaterialCommunityIcons name={icon} size={21} color={color} /></View><Text style={styles.kpiValue}>{value}</Text><Text style={styles.kpiLabel}>{label}</Text></View>;
const Row: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; value: string }> = ({ icon, title, value }) => <View style={styles.row}><View style={styles.rowIcon}><MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowValue}>{value}</Text></View></View>;

const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 115 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, eyebrow: { ...theme.typography.tiny, color: theme.colors.primary, fontWeight: '900', letterSpacing: 1.3 }, title: { ...theme.typography.h1, color: theme.colors.text, marginTop: 5 }, subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4 }, headerIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, loader: { marginVertical: 20 }, kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, kpi: { width: '48%', minHeight: 126, backgroundColor: theme.colors.surface, borderRadius: 19, padding: 14, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, kpiIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, kpiValue: { ...theme.typography.h2, color: theme.colors.text, marginTop: 10 }, kpiLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 }, sectionLabel: { ...theme.typography.tiny, color: theme.colors.textMuted, fontWeight: '900', letterSpacing: 1.2, marginTop: 26, marginBottom: 9 }, card: { backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.border }, row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }, rowIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, rowCopy: { flex: 1 }, rowTitle: { ...theme.typography.caption, color: theme.colors.textMuted }, rowValue: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 2 }, rule: { height: 1, backgroundColor: theme.colors.divider }, tipCard: { flexDirection: 'row', backgroundColor: theme.colors.primaryLight, borderRadius: 20, padding: 15, gap: 11 }, tipIcon: { width: 41, height: 41, borderRadius: 14, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }, tipCopy: { flex: 1 }, tipTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, tipText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 } });
