import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { useApp } from '../../context/AppContext';
import { listMyPayments, type BackendPayment } from '../../services/api';
import type { MoreStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'Payments'>;

const typeLabel: Record<BackendPayment['type'], string> = {
  subscription: 'Subscription',
  service: 'Service payment',
  promotion: 'Promotion',
  refund: 'Refund',
};

const statusLabel: Record<BackendPayment['status'], string> = {
  created: 'Created',
  pending_verification: 'Pending verification',
  verified: 'Verified',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const PaymentsScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [payments, setPayments] = useState<BackendPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const response = await listMyPayments(accessToken);
      setPayments(Array.isArray(response.data) ? response.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load payments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return <ScreenContainer>
    <View style={styles.header}><IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} /><Text style={styles.title}>Payments</Text></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View> : (
      <FlatList
        data={payments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.colors.primary]} />}
        ListEmptyComponent={error ? <View style={styles.center}><MaterialCommunityIcons name="alert-circle-outline" size={46} color={theme.colors.danger} /><Text style={styles.emptyTitle}>Could not load payments.</Text><Text style={styles.errorText}>{error}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : <View style={styles.center}><MaterialCommunityIcons name="credit-card-outline" size={46} color={theme.colors.textMuted} /><Text style={styles.emptyTitle}>No payments yet.</Text></View>}
        renderItem={({ item }) => <View style={styles.row}><View style={styles.icon}><MaterialCommunityIcons name={item.type === 'refund' ? 'cash-refund' : 'credit-card-outline'} size={22} color={theme.colors.primary} /></View><View style={styles.copy}><Text style={styles.type}>{typeLabel[item.type]}</Text><Text style={styles.order}>{item.orderId}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString('en-IN')}</Text></View><View style={styles.amountWrap}><Text style={styles.amount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text><Text style={styles.status}>{statusLabel[item.status]}</Text></View></View>}
      />
    )}
  </ScreenContainer>;
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  title: { ...theme.typography.h2, color: theme.colors.text },
  list: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, padding: theme.spacing.sm, marginBottom: theme.spacing.sm, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  icon: { width: 42, height: 42, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  copy: { flex: 1 },
  type: { ...theme.typography.bodyBold, color: theme.colors.text },
  order: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  date: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 3 },
  amountWrap: { alignItems: 'flex-end' },
  amount: { ...theme.typography.bodyBold, color: theme.colors.text },
  status: { ...theme.typography.tiny, color: theme.colors.primaryDark, marginTop: 4, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  emptyTitle: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: theme.spacing.sm },
  errorText: { ...theme.typography.caption, color: theme.colors.danger, textAlign: 'center', marginTop: theme.spacing.xs },
  retry: { marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  retryText: { ...theme.typography.bodyBold, color: theme.colors.textInverse },
});
