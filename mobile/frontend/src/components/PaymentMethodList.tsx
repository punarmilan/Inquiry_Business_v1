import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';
import type { PaymentMethod } from '../services/api';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type PaymentMethodOption = { id: PaymentMethod; title: string; subtitle: string; icon: IconName; recommended?: boolean };

// UPI first and recommended, matching how PlanPaymentSheet already offers these
// three methods (Razorpay's own checkout then shows the real GPay/PhonePe/Paytm
// app picker once opened — this list only picks the method category).
export const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'upi', title: 'UPI', subtitle: 'Google Pay, PhonePe, Paytm, BHIM & more', icon: 'cellphone-check', recommended: true },
  { id: 'card', title: 'Credit / Debit Card', subtitle: 'Visa, Mastercard, RuPay', icon: 'credit-card-outline' },
  { id: 'netbanking', title: 'Netbanking', subtitle: 'All major Indian banks', icon: 'bank-outline' },
];

interface PaymentMethodListProps {
  methods?: PaymentMethodOption[];
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export const PaymentMethodList: React.FC<PaymentMethodListProps> = ({ methods = DEFAULT_PAYMENT_METHODS, value, onChange, disabled }) => (
  <View>
    {methods.map((option) => {
      const selected = option.id === value;
      return (
        <Pressable
          key={option.id}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          accessibilityLabel={`${option.title}. ${option.subtitle}`}
          onPress={() => onChange(option.id)}
          disabled={disabled}
          style={[styles.row, selected && styles.rowActive]}
        >
          <View style={styles.icon}>
            <MaterialCommunityIcons name={option.icon} size={22} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{option.title}</Text>
              {option.recommended ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Recommended</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.subtitle}>{option.subtitle}</Text>
          </View>
          <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? theme.colors.primary : theme.colors.textMuted} />
        </Pressable>
      );
    })}
  </View>
);

const styles = createThemedStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    marginBottom: theme.spacing.xs,
  },
  rowActive: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...theme.typography.bodyBold, color: c.text },
  subtitle: { ...theme.typography.caption, color: c.textSecondary, marginTop: 1 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: c.successLight,
  },
  badgeText: {
    ...theme.typography.tiny,
    color: c.success,
    fontWeight: '700',
  },
}));
