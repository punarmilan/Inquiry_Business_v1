import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface PaymentOrderSummaryCardProps {
  serviceName: string;
  providerName?: string;
  scheduledFor: string;
  bookingNumber: string;
  totalAmount: number;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const Row = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <View style={styles.row}>
    <MaterialCommunityIcons name={icon} size={18} color={theme.colors.textSecondary} />
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

// Only the fields this app's booking actually carries are shown — no invented
// platform-fee/discount split, since the amount charged is exactly `totalAmount`
// (finalPrice, falling back to the estimate) and nothing is added on top of it.
export const PaymentOrderSummaryCard: React.FC<PaymentOrderSummaryCardProps> = ({ serviceName, providerName, scheduledFor, bookingNumber, totalAmount }) => (
  <View style={styles.card}>
    <Row icon="toolbox-outline" label="Service" value={serviceName} />
    {providerName ? <Row icon="account-hard-hat-outline" label="Provider" value={providerName} /> : null}
    <Row icon="calendar-clock-outline" label="Service date" value={formatDateTime(scheduledFor)} />
    <Row icon="identifier" label="Booking" value={`#${bookingNumber}`} />
    <View style={styles.divider} />
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Amount to pay</Text>
      <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
    </View>
  </View>
);

const styles = createThemedStyles((c) => ({
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    gap: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingVertical: 4 },
  rowLabel: { ...theme.typography.caption, color: c.textMuted, width: 84 },
  rowValue: { ...theme.typography.bodyBold, color: c.text, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: c.border, marginVertical: theme.spacing.xs },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { ...theme.typography.body, color: c.textSecondary },
  totalValue: { ...theme.typography.h2, color: c.text },
}));
