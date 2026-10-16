import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, createThemedStyles } from '../theme';
import { Button } from './Button';
import { useApp } from '../context/AppContext';
import { createSubscriptionOrder, syncPayment, verifyRazorpayPayment, type PaymentMethod } from '../services/api';
import type { Plan } from '../types/hyperlocal';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const METHODS: { id: PaymentMethod; title: string; subtitle: string; icon: IconName }[] = [
  { id: 'upi', title: 'UPI', subtitle: 'Google Pay, PhonePe, Paytm, BHIM', icon: 'cellphone-check' },
  { id: 'card', title: 'Credit / Debit Card', subtitle: 'Visa, Mastercard, RuPay', icon: 'credit-card-outline' },
  { id: 'netbanking', title: 'Netbanking', subtitle: 'All major Indian banks', icon: 'bank-outline' },
];

// Matches mobile/backend/src/views/paymentPages.js's BRAND_COLOR.
const BRAND_COLOR = '#F45B18';

// select   - plan summary + payment method list (the first thing shown after tapping a plan)
// checking - Razorpay's native checkout is open (in-app), or the backend is confirming right after it closes
// success / failed - outcome, decided only by the backend
// manual   - backend has no online payments configured: order recorded, admin verifies later
type Stage = 'select' | 'checking' | 'success' | 'failed' | 'manual';

interface PlanPaymentSheetProps {
  visible: boolean;
  plan: Plan | null;
  businessId: string;
  businessName?: string;
  // The plan the business is on now. Buying another plan replaces it immediately, and
  // its remaining days do not carry over, so the user is told before paying.
  replacing?: { planName: string; endsAt: string } | null;
  // Called once the backend confirms the payment and the plan is active.
  onActivated?: () => void;
  onClose: () => void;
  onDone: () => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const PlanPaymentSheet: React.FC<PlanPaymentSheetProps> = ({ visible, plan, businessId, businessName, replacing, onActivated, onClose, onDone }) => {
  const { accessToken, currentUser } = useApp();
  const insets = useSafeAreaInsets();
  // Kept in a ref so an inline callback from the parent does not re-create `confirm` every render.
  const onActivatedRef = useRef(onActivated);
  onActivatedRef.current = onActivated;
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [stage, setStage] = useState<Stage>('select');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [activeUntil, setActiveUntil] = useState<string | null>(null);
  const paymentId = useRef<string | null>(null);
  const checkInFlight = useRef(false);

  // Each time the sheet opens it starts fresh on the payment method list.
  useEffect(() => {
    if (!visible) return;
    setStage('select');
    setMessage('');
    setBusy(false);
    setActiveUntil(null);
    paymentId.current = null;
  }, [visible, plan?._id]);

  // The app never decides a payment succeeded: the plan is active only if the backend
  // (which asks Razorpay directly) says so. With a `razorpayResult` in hand (fresh from
  // RazorpayCheckout.open()), that's sent for real signature verification; without one
  // (the manual "I've completed the payment" fallback), this just asks the backend
  // what it already knows.
  const confirm = useCallback(async (razorpayResult?: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => {
    const id = paymentId.current;
    if (!id || !accessToken || checkInFlight.current) return;
    checkInFlight.current = true;
    setStage('checking');
    try {
      const result = razorpayResult
        ? await verifyRazorpayPayment(accessToken, id, razorpayResult)
        : await syncPayment(accessToken, id);
      if (result.activated) {
        paymentId.current = null;
        setActiveUntil(result.subscription?.endsAt ?? null);
        setStage('success');
        onActivatedRef.current?.();
      } else {
        setMessage('We have not received your payment yet. If you already paid, wait a moment and check again.');
        setStage('failed');
      }
    } catch (error: any) {
      setMessage(error?.message || 'Could not check the payment. Please check your connection and try again.');
      setStage('failed');
    } finally {
      checkInFlight.current = false;
    }
  }, [accessToken]);

  const pay = async () => {
    if (!accessToken || !plan || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await createSubscriptionOrder(accessToken, plan._id, businessId, method);
      if (!response.razorpay) {
        setMessage(`Order ${response.payment.orderId} created for ₹${response.payment.amount}. Your plan activates once our team verifies the payment.`);
        setStage('manual');
        return;
      }
      paymentId.current = response.payment._id;
      // Opens Razorpay's native checkout — an in-app modal, no browser, no
      // external app switch. UPI apps still open via the normal Android
      // intent switch and return control straight back to this modal.
      try {
        const result = await RazorpayCheckout.open({
          key: response.razorpay.keyId,
          order_id: response.razorpay.orderId,
          amount: String(Math.round(response.payment.amount * 100)),
          currency: 'INR',
          name: 'InquiryExperts',
          description: `${plan.name} plan${businessName ? ` · ${businessName}` : ''}`,
          prefill: {
            name: currentUser?.name || undefined,
            contact: currentUser?.phone || undefined,
            email: currentUser?.email || undefined,
          },
          theme: { color: BRAND_COLOR },
        });
        await confirm({ razorpayOrderId: result.razorpay_order_id, razorpayPaymentId: result.razorpay_payment_id, razorpaySignature: result.razorpay_signature });
      } catch (error: any) {
        const description = String(error?.description || '').toLowerCase();
        if (description.includes('cancel')) {
          setMessage('Checkout was closed before the payment completed.');
          setStage('failed');
        } else {
          // Not a clean cancel — double-check with the backend before calling it failed.
          await confirm();
        }
      }
    } catch (error: any) {
      setMessage(error?.message || 'Could not start the payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy || stage === 'checking') return;
    onClose();
  };

  if (!plan) return null;
  const price = `₹${plan.price.toLocaleString('en-IN')}`;

  const renderState = (icon: IconName, tone: 'success' | 'warning' | 'info', title: string, text: string) => (
    <View style={styles.state}>
      <View style={[styles.stateBadge, tone === 'success' ? styles.badgeSuccess : tone === 'warning' ? styles.badgeWarning : styles.badgeInfo]}>
        <MaterialCommunityIcons name={icon} size={34} color={theme.colors.textInverse} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Close payment options" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {stage === 'select' ? 'Choose payment method' : stage === 'success' ? 'Payment successful' : 'Payment'}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }}>
            {stage === 'select' ? (
              <>
                <View style={styles.summary}>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planMeta}>
                      {plan.durationDays} days{businessName ? ` · ${businessName}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.price}>{price}</Text>
                </View>

                {replacing ? (
                  <View style={styles.replaceNote}>
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color={theme.colors.warning} />
                    <Text style={styles.replaceText}>
                      This replaces your current plan, {replacing.planName} (valid until {formatDate(replacing.endsAt)}). Its remaining days do not carry over.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.sectionLabel}>Pay using</Text>
                {METHODS.map((option) => {
                  const selected = option.id === method;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${option.title}. ${option.subtitle}`}
                      onPress={() => setMethod(option.id)}
                      disabled={busy}
                      style={[styles.methodRow, selected && styles.methodRowActive]}
                    >
                      <View style={styles.methodIcon}>
                        <MaterialCommunityIcons name={option.icon} size={22} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                      </View>
                      <View style={styles.methodCopy}>
                        <Text style={styles.methodTitle}>{option.title}</Text>
                        <Text style={styles.methodSubtitle}>{option.subtitle}</Text>
                      </View>
                      <MaterialCommunityIcons
                        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                        size={22}
                        color={selected ? theme.colors.primary : theme.colors.textMuted}
                      />
                    </Pressable>
                  );
                })}

                {message ? <Text style={styles.error}>{message}</Text> : null}
                <Button label={`Pay ${price}`} onPress={pay} loading={busy} fullWidth style={styles.cta} />
                <View style={styles.secureRow}>
                  <MaterialCommunityIcons name="lock-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.secureText}>Secure payment powered by Razorpay</Text>
                </View>
              </>
            ) : null}

            {stage === 'checking' ? (
              <View style={styles.state}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.stateTitle}>Confirming your payment…</Text>
                <Text style={styles.stateText}>Please wait, this only takes a moment.</Text>
              </View>
            ) : null}

            {stage === 'success' ? (
              <>
                {renderState(
                  'check',
                  'success',
                  `${plan.name} is active`,
                  `${activeUntil ? `Valid until ${formatDate(activeUntil)}. ` : ''}This is now the current plan for ${businessName || 'your business'}, so you can start posting offers.`
                )}
                <Button label="Done" onPress={onDone} fullWidth style={styles.cta} />
              </>
            ) : null}

            {stage === 'failed' ? (
              <>
                {renderState('alert-circle-outline', 'warning', 'Payment not completed', message)}
                {paymentId.current ? <Button label="Check again" onPress={() => confirm()} fullWidth style={styles.cta} /> : null}
                <Button
                  label="Try another payment method"
                  variant={paymentId.current ? 'ghost' : 'primary'}
                  onPress={() => { setMessage(''); setStage('select'); }}
                  fullWidth
                  style={paymentId.current ? undefined : styles.cta}
                />
              </>
            ) : null}

            {stage === 'manual' ? (
              <>
                {renderState('clock-outline', 'info', 'Order created', message)}
                <Button label="Done" onPress={onDone} fullWidth style={styles.cta} />
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = createThemedStyles((c) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: c.overlay,
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: c.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h3,
    color: c.text,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: c.surfaceAlt,
    marginBottom: theme.spacing.md,
  },
  summaryCopy: {
    flex: 1,
  },
  planName: {
    ...theme.typography.bodyBold,
    color: c.text,
  },
  planMeta: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginTop: 2,
  },
  price: {
    ...theme.typography.h3,
    color: c.text,
  },
  replaceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: c.surfaceAlt,
    marginBottom: theme.spacing.md,
  },
  replaceText: {
    ...theme.typography.caption,
    flex: 1,
    color: c.textSecondary,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  methodRow: {
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
  methodRowActive: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  methodCopy: {
    flex: 1,
  },
  methodTitle: {
    ...theme.typography.bodyBold,
    color: c.text,
  },
  methodSubtitle: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginTop: 1,
  },
  error: {
    ...theme.typography.caption,
    color: c.danger,
    marginTop: theme.spacing.xs,
  },
  cta: {
    marginTop: theme.spacing.md,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  secureText: {
    ...theme.typography.tiny,
    color: c.textMuted,
  },
  state: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  stateBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSuccess: {
    backgroundColor: c.success,
  },
  badgeWarning: {
    backgroundColor: c.warning,
  },
  badgeInfo: {
    backgroundColor: c.primary,
  },
  stateTitle: {
    ...theme.typography.h3,
    color: c.text,
    textAlign: 'center',
  },
  stateText: {
    ...theme.typography.body,
    color: c.textSecondary,
    textAlign: 'center',
  },
}));
