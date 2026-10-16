import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { theme, createThemedStyles } from '../../theme';
import type { OffersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OffersStackParamList, 'PaymentSuccess'>;

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

// Reached only via navigation.replace from PaymentScreen right after the
// backend's own server-side settlement confirmed the payment (see
// settleRazorpayPayment) — this screen never decides success on its own.
export const PaymentSuccessScreen: React.FC<Props> = ({ route, navigation }) => {
  const { paymentId, bookingId, amount, orderId, serviceName, providerName } = route.params;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="check-circle" size={58} color={theme.colors.success} />
      </View>
      <Text style={styles.title}>Payment Successful</Text>
      <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>

      <View style={styles.card}>
        <Row label="Payment ID" value={paymentId} />
        <Row label="Order ID" value={orderId} />
        <Row label="Service" value={serviceName} />
        {providerName ? <Row label="Provider" value={providerName} /> : null}
        <View style={styles.statusRow}>
          <MaterialCommunityIcons name="check-decagram" size={16} color={theme.colors.success} />
          <Text style={styles.statusText}>Payment Confirmed</Text>
        </View>
      </View>

      <Button label="View Booking" onPress={() => navigation.replace('BookingDetails', { bookingId })} fullWidth style={styles.button} />
      <Button label="Go to Home" variant="outline" onPress={() => navigation.popToTop()} fullWidth style={styles.secondButton} />
    </ScreenContainer>
  );
};

const styles = createThemedStyles((c) => ({
  container: { justifyContent: 'center', alignItems: 'center', padding: 28 },
  icon: { width: 108, height: 108, borderRadius: 36, backgroundColor: c.successLight, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.typography.h1, color: c.text, marginTop: 22 },
  amount: { ...theme.typography.h1, color: c.text, marginTop: 4 },
  card: {
    width: '100%',
    marginTop: 24,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm },
  rowLabel: { ...theme.typography.caption, color: c.textMuted },
  rowValue: { ...theme.typography.bodyBold, color: c.text, flexShrink: 1, textAlign: 'right' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start' },
  statusText: { ...theme.typography.caption, color: c.success, fontWeight: '700' },
  button: { marginTop: 28, width: '100%' },
  secondButton: { marginTop: 10, width: '100%' },
}));
