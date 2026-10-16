import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { PaymentOrderSummaryCard } from '../../components/PaymentOrderSummaryCard';
import { PaymentMethodList } from '../../components/PaymentMethodList';
import { useApp } from '../../context/AppContext';
import { theme, createThemedStyles } from '../../theme';
import {
  createServicePaymentOrder,
  getServiceBooking,
  retryPayment,
  syncPayment,
  verifyRazorpayPayment,
  type PaymentMethod,
} from '../../services/api';
import type { ServiceBooking } from '../../types/hyperlocal';
import type { OffersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OffersStackParamList, 'Payment'>;

// select     - order summary + payment method list
// verifying  - RazorpayCheckout is open (native, in-app), or the backend is confirming right after it closes
// cancelled  - the user closed the native checkout without attempting a payment
// failed     - the gateway/webhook reported a real failure
// pending    - a genuine attempt was made but the backend hasn't confirmed capture yet
// manual     - Razorpay not configured: order recorded, admin verifies later
// already_paid / error - edge cases on load
type Stage = 'loading' | 'select' | 'verifying' | 'cancelled' | 'failed' | 'pending' | 'manual' | 'already_paid' | 'error';

// Matches mobile/backend/src/views/paymentPages.js's BRAND_COLOR.
const BRAND_COLOR = '#F45B18';

const formatAmount = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export const PaymentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const { accessToken, currentUser } = useApp();
  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const paymentIdRef = useRef<string | null>(null);

  const goToSuccess = (payment: { _id: string; orderId: string; amount: number }, forBooking: ServiceBooking) => {
    navigation.replace('PaymentSuccess', {
      paymentId: payment._id,
      bookingId: forBooking._id,
      amount: payment.amount,
      orderId: payment.orderId,
      serviceName: forBooking.category.name,
      providerName: forBooking.worker?.name,
    });
  };

  // The backend never lets a booking's paymentStatus become 'paid' except via a
  // server-verified settlement (see settleRazorpayPayment/ensureServicePaid) — this
  // screen never marks anything paid on its own judgement, native SDK result included.
  // With a `razorpayResult` in hand (fresh from RazorpayCheckout.open()), that's sent
  // for real signature verification; without one (e.g. recovering a stale payment),
  // this just asks the backend what it already knows.
  const settleAndAdvance = async (razorpayResult?: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => {
    const id = paymentIdRef.current;
    if (!id || !accessToken) return;
    setStage('verifying');
    try {
      const result = razorpayResult
        ? await verifyRazorpayPayment(accessToken, id, razorpayResult)
        : await syncPayment(accessToken, id);
      if (result.activated && booking) {
        goToSuccess(result.payment, booking);
        return;
      }
      setStage(result.payment.status === 'failed' ? 'failed' : 'pending');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not verify the payment. Check your connection and try again.');
      setStage('pending');
    }
  };

  // Opens Razorpay's native checkout (an in-app modal — no browser, no external
  // app switch) and routes its outcome. A genuine cancel (closed without
  // attempting anything) never reaches the backend at all, since there is
  // nothing to verify; anything else still gets a server-truth check before
  // this screen calls it failed.
  const openNativeCheckout = async (razorpayOrder: { keyId: string; orderId: string }, amount: number, forBooking: ServiceBooking) => {
    try {
      const result = await RazorpayCheckout.open({
        key: razorpayOrder.keyId,
        order_id: razorpayOrder.orderId,
        amount: String(Math.round(amount * 100)),
        currency: 'INR',
        name: 'InquiryExperts',
        description: `${forBooking.category.name} · ${forBooking.bookingNumber}`,
        prefill: {
          name: currentUser?.name || undefined,
          contact: currentUser?.phone || undefined,
          email: currentUser?.email || undefined,
        },
        theme: { color: BRAND_COLOR },
      });
      await settleAndAdvance({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      });
    } catch (error: any) {
      const description = String(error?.description || '').toLowerCase();
      if (description.includes('cancel')) {
        setStage('cancelled');
      } else {
        await settleAndAdvance();
      }
    }
  };

  // On open: load the booking, and if a payment was already left in flight
  // (app closed mid-payment, network dropped after paying), silently recover
  // its true status before showing any UI — never assume it failed just
  // because we're seeing it again.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { booking: loaded } = await getServiceBooking(accessToken, bookingId);
        if (cancelled) return;
        setBooking(loaded);
        if (loaded.paymentStatus === 'paid') { setStage('already_paid'); return; }
        if (loaded.paymentStatus === 'pending') {
          const order = await createServicePaymentOrder(accessToken, bookingId);
          if (cancelled) return;
          if (order.payment.status === 'verified') { goToSuccess(order.payment, loaded); return; }
          paymentIdRef.current = order.payment._id;
          const synced = await syncPayment(accessToken, order.payment._id);
          if (cancelled) return;
          if (synced.activated) { goToSuccess(synced.payment, loaded); return; }
        }
        setStage('select');
      } catch (error: any) {
        if (!cancelled) {
          setErrorMessage(error?.message || 'Could not load this booking.');
          setStage('error');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, bookingId]);

  // Verification is brief and server-truth-driven; block the hardware back
  // button only for that moment so it can't be abandoned mid-check.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => stage === 'verifying');
    return () => sub.remove();
  }, [stage]);

  const pay = async () => {
    if (!accessToken || !booking || busy) return;
    setBusy(true);
    setErrorMessage('');
    try {
      const response = await createServicePaymentOrder(accessToken, booking._id, method);
      if (response.payment.status === 'verified') { goToSuccess(response.payment, booking); return; }
      if (!response.razorpay) {
        setManualMessage(response.paymentInstructions?.message || `Order ${response.payment.orderId} created for ${formatAmount(response.payment.amount)}.`);
        setStage('manual');
        return;
      }
      paymentIdRef.current = response.payment._id;
      await openNativeCheckout(response.razorpay, response.payment.amount, booking);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not start the payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const tryAgain = async () => {
    const id = paymentIdRef.current;
    if (!accessToken || !id || busy || !booking) return;
    setBusy(true);
    setErrorMessage('');
    try {
      const response = await retryPayment(accessToken, id, method);
      if (response.alreadyPaid) { goToSuccess(response.payment, booking); return; }
      if (!response.razorpay) {
        setManualMessage(response.paymentInstructions?.message || '');
        setStage('manual');
        return;
      }
      paymentIdRef.current = response.payment._id;
      await openNativeCheckout(response.razorpay, response.payment.amount, booking);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not restart the payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const checkAgain = () => settleAndAdvance();

  const renderOutcome = (icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'], tone: 'warning' | 'danger', title: string, body: string) => (
    <View style={styles.state}>
      <View style={[styles.stateBadge, tone === 'danger' ? styles.badgeDanger : styles.badgeWarning]}>
        <MaterialCommunityIcons name={icon} size={34} color={theme.colors.textInverse} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );

  const header = (
    <View style={styles.header}>
      <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Payment</Text>
    </View>
  );

  if (stage === 'loading') {
    return <ScreenContainer style={styles.center}><ActivityIndicator color={theme.colors.primary} /></ScreenContainer>;
  }

  if (stage === 'error') {
    return (
      <ScreenContainer>
        {header}
        <View style={styles.center}>
          {renderOutcome('alert-circle-outline', 'danger', 'Could not load payment', errorMessage)}
          <Button label="Go Back" onPress={() => navigation.goBack()} style={styles.cta} />
        </View>
      </ScreenContainer>
    );
  }

  if (!booking) return null;
  const amount = booking.finalPrice ?? booking.priceEstimate;

  return (
    <ScreenContainer>
      {header}
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {stage === 'select' ? (
          <>
            <PaymentOrderSummaryCard
              serviceName={booking.category.name}
              providerName={booking.worker?.name}
              scheduledFor={booking.scheduledFor}
              bookingNumber={booking.bookingNumber}
              totalAmount={amount}
            />
            <Text style={styles.sectionLabel}>Pay using</Text>
            <PaymentMethodList value={method} onChange={setMethod} disabled={busy} />
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <Button label={`Pay ${formatAmount(amount)}`} onPress={pay} loading={busy} fullWidth style={styles.cta} />
            <View style={styles.secureRow}>
              <MaterialCommunityIcons name="lock-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.secureText}>Secure payment powered by Razorpay</Text>
            </View>
          </>
        ) : null}

        {stage === 'verifying' ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.stateTitle}>Verifying payment…</Text>
            <Text style={styles.stateText}>Please wait, this only takes a moment.</Text>
          </View>
        ) : null}

        {stage === 'cancelled'
          ? (
            <>
              {renderOutcome('close-circle-outline', 'warning', 'Payment cancelled', 'You closed the checkout before completing the payment.')}
              <Button label="Try Again" onPress={tryAgain} loading={busy} fullWidth style={styles.cta} />
              <Button label="Change Payment Method" variant="ghost" onPress={() => setStage('select')} fullWidth />
            </>
          )
          : null}

        {stage === 'failed'
          ? (
            <>
              {renderOutcome('alert-circle-outline', 'danger', 'Payment failed', 'Your payment could not be completed. If any amount was deducted, it is usually refunded automatically by your bank.')}
              <Button label="Try Again" onPress={tryAgain} loading={busy} fullWidth style={styles.cta} />
              <Button label="Change Payment Method" variant="ghost" onPress={() => setStage('select')} fullWidth />
            </>
          )
          : null}

        {stage === 'pending'
          ? (
            <>
              {renderOutcome('progress-clock', 'warning', 'Payment verification is taking a little longer', 'If you completed the payment, it will confirm shortly. You can check again, or try a fresh payment.')}
              <Button label="Check status again" onPress={checkAgain} fullWidth style={styles.cta} />
              <Button label="Try again instead" variant="ghost" onPress={tryAgain} fullWidth />
              <Text style={styles.supportText}>Still stuck? Reach us from Help & Support in the More tab, mentioning booking #{booking.bookingNumber}.</Text>
            </>
          )
          : null}

        {stage === 'manual'
          ? (
            <>
              {renderOutcome('clock-outline', 'warning', 'Order created', manualMessage || 'Your payment will be confirmed after verification.')}
              <Button label="Done" onPress={() => navigation.replace('BookingDetails', { bookingId: booking._id })} fullWidth style={styles.cta} />
            </>
          )
          : null}

        {stage === 'already_paid'
          ? (
            <>
              {renderOutcome('check-circle', 'warning', 'Already paid', 'This booking has already been paid for.')}
              <Button label="View Booking" onPress={() => navigation.replace('BookingDetails', { bookingId: booking._id })} fullWidth style={styles.cta} />
            </>
          )
          : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = createThemedStyles((c) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  title: { ...theme.typography.h2, color: c.text },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.xs },
  sectionLabel: { ...theme.typography.caption, color: c.textSecondary, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
  error: { ...theme.typography.caption, color: c.danger, marginTop: theme.spacing.xs },
  cta: { marginTop: theme.spacing.md },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: theme.spacing.sm },
  secureText: { ...theme.typography.tiny, color: c.textMuted },
  state: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: theme.spacing.sm },
  stateBadge: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  badgeWarning: { backgroundColor: c.warning },
  badgeDanger: { backgroundColor: c.danger },
  badgeInfo: { backgroundColor: c.primary },
  stateTitle: { ...theme.typography.h3, color: c.text, textAlign: 'center' },
  stateText: { ...theme.typography.body, color: c.textSecondary, textAlign: 'center' },
  supportText: { ...theme.typography.caption, color: c.textMuted, textAlign: 'center', marginTop: theme.spacing.sm },
}));
