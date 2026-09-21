import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { PlanPaymentSheet } from '../../components/PlanPaymentSheet';
import { listMyBusinesses, listPlans } from '../../services/api';
import type { Business, Plan, Subscription } from '../../types/hyperlocal';
import { useApp } from '../../context/AppContext';
import { theme, createThemedStyles } from '../../theme';
import {
  formatPlanDate,
  formatQuota,
  isSubscriptionActive,
  subscriptionDaysLeft,
  subscriptionPlanId,
  subscriptionPlanName,
} from '../../utils/subscription';

export const PlansScreen: React.FC<any> = ({ route, navigation }) => {
  const { accessToken, refreshBusinesses } = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState(route.params?.businessId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Tapping a plan opens the payment sheet (UPI / card / netbanking). The plan is kept
  // separately from `visible` so its content does not vanish during the close animation.
  const [sheet, setSheet] = useState<{ plan: Plan | null; visible: boolean }>({ plan: null, visible: false });

  // `silent` refreshes in the background (no spinner), e.g. right after a purchase.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [plansResponse, businessResponse] = await Promise.all([
        listPlans(),
        accessToken ? listMyBusinesses(accessToken) : Promise.resolve({ data: [] } as any),
      ]);
      setPlans(plansResponse.data);
      setBusinesses(businessResponse.data);
      setSelectedBusiness((current: string) => current || businessResponse.data[0]?._id || '');
    } catch (loadError: any) {
      setPlans([]);
      setError(loadError?.message || 'Could not load subscription plans.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const choose = (plan: Plan) => {
    if (!accessToken || !selectedBusiness) {
      Alert.alert('Business required', 'Create or select a business first.');
      return;
    }
    setSheet({ plan, visible: true });
  };

  const selectedBusinessRecord = businesses.find((business) => business._id === selectedBusiness);
  const selectedBusinessName = selectedBusinessRecord?.name;
  // The plan this business is on right now (null once it has expired).
  const activeSubscription = selectedBusinessRecord?.activeSubscription;
  const currentSubscription = isSubscriptionActive(activeSubscription) ? activeSubscription : null;
  const currentPlanId = subscriptionPlanId(currentSubscription);
  const currentPlanName = subscriptionPlanName(currentSubscription);

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <Pressable onPress={navigation.goBack} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={24} />
        </Pressable>
        <Text style={styles.title}>Business Plans</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Choose the right plan</Text>
        <Text style={styles.subheading}>Prices and quotas are managed by InquiryExperts Admin.</Text>

        {businesses.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessRow}>
            {businesses.map((business) => (
              <Pressable
                key={business._id}
                onPress={() => setSelectedBusiness(business._id)}
                style={[styles.businessChip, selectedBusiness === business._id && styles.businessActive]}
              >
                <Text style={[styles.businessText, selectedBusiness === business._id && styles.businessTextActive]}>
                  {business.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}

        {!loading && error ? (
          <View style={styles.messageCard}>
            <MaterialCommunityIcons name="cloud-alert-outline" size={28} color={theme.colors.danger} />
            <Text style={styles.errorTitle}>Plans could not be loaded</Text>
            <Text style={styles.empty}>{error}</Text>
            <Button label="Retry" variant="outline" onPress={() => load()} />
          </View>
        ) : null}

        {/* Which plan the business is on right now, so it is obvious after buying. */}
        {!loading && !error && selectedBusiness ? (
          currentSubscription ? (
            <CurrentPlanCard subscription={currentSubscription} businessName={selectedBusinessName} />
          ) : (
            <View style={styles.noPlan}>
              <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.noPlanText}>
                {selectedBusinessName ? `${selectedBusinessName} has` : 'You have'} no active plan. Choose a plan below to start posting offers.
              </Text>
            </View>
          )
        ) : null}

        {!loading && !error
          ? plans.map((plan, index) => {
              const isCurrent = currentPlanId === plan._id;
              return (
              <View key={plan._id} style={[styles.card, index === 1 && !isCurrent && styles.featured, isCurrent && styles.currentPlanBorder]}>
                {isCurrent ? <Text style={styles.currentTag}>CURRENT PLAN</Text> : index === 1 && <Text style={styles.popular}>POPULAR</Text>}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.currency}>₹</Text>
                  <Text style={styles.price}>{plan.price.toLocaleString('en-IN')}</Text>
                  <Text style={styles.period}>/{plan.billingPeriod}</Text>
                </View>
                <Feature text={plan.offerPostingLimit === -1 ? 'Unlimited offer posts' : `${plan.offerPostingLimit} offer posts per period`} />
                <Feature text={plan.maximumActiveOffers === -1 ? 'Unlimited active offers' : `${plan.maximumActiveOffers} active offers`} />
                <Feature text={`${plan.imagesPerOffer} images per offer`} />
                <Feature text={plan.analyticsAccess ? 'Business analytics included' : 'Basic offer insights'} />
                <Feature text={`${plan.featuredOfferAllowance} featured offer allowance`} />
                <Button
                  label={isCurrent ? 'Current plan' : currentSubscription ? 'Switch to this plan' : 'Choose Plan'}
                  variant={isCurrent ? 'outline' : 'primary'}
                  disabled={isCurrent}
                  onPress={() => choose(plan)}
                  fullWidth
                  style={styles.button}
                />
              </View>
              );
            })
          : null}

        {!plans.length && !loading && !error ? (
          <View style={styles.messageCard}>
            <Text style={styles.empty}>No active plans are configured yet.</Text>
            <Button label="Refresh plans" variant="outline" onPress={() => load()} />
          </View>
        ) : null}

        <Text style={styles.security}>
          <MaterialCommunityIcons name="shield-check-outline" size={16} /> Payment success is never trusted from the app. Activation is server verified.
        </Text>
      </ScrollView>

      <PlanPaymentSheet
        visible={sheet.visible}
        plan={sheet.plan}
        businessId={selectedBusiness}
        businessName={selectedBusinessName}
        replacing={currentSubscription && currentPlanName ? { planName: currentPlanName, endsAt: currentSubscription.endsAt } : null}
        // As soon as the payment is confirmed, refresh behind the sheet so this screen (and the
        // rest of the app) already shows the new current plan when the sheet is closed.
        onActivated={() => {
          load(true);
          refreshBusinesses();
        }}
        onClose={() => setSheet((current) => ({ ...current, visible: false }))}
        onDone={() => setSheet((current) => ({ ...current, visible: false }))}
      />
    </ScreenContainer>
  );
};

const UsageRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.usageRow}>
    <Text style={styles.usageLabel}>{label}</Text>
    <Text style={styles.usageValue}>{value}</Text>
  </View>
);

const CurrentPlanCard = ({ subscription, businessName }: { subscription: Subscription; businessName?: string }) => {
  const days = subscriptionDaysLeft(subscription);
  const expiringSoon = days <= 7;
  return (
    <View style={styles.currentCard}>
      <View style={styles.currentHeader}>
        <MaterialCommunityIcons name="check-decagram" size={18} color={theme.colors.success} />
        <Text style={styles.currentLabel} numberOfLines={1}>
          YOUR CURRENT PLAN{businessName ? ` · ${businessName.toUpperCase()}` : ''}
        </Text>
      </View>
      <Text style={styles.currentName}>{subscriptionPlanName(subscription) || 'Active plan'}</Text>
      <Text style={[styles.currentValidity, expiringSoon && styles.currentExpiring]}>
        Valid until {formatPlanDate(subscription.endsAt)} · {days === 0 ? 'expires today' : `${days} day${days === 1 ? '' : 's'} left`}
      </Text>
      <View style={styles.currentDivider} />
      <UsageRow label="Offer posts" value={formatQuota(subscription.usage?.offersPosted ?? 0, subscription.quota.offerPostingLimit)} />
      {subscription.quota.featuredOfferAllowance > 0 ? (
        <UsageRow label="Featured offers" value={formatQuota(subscription.usage?.featuredOffersUsed ?? 0, subscription.quota.featuredOfferAllowance)} />
      ) : null}
      <UsageRow label="Images per offer" value={String(subscription.quota.imagesPerOffer)} />
    </View>
  );
};

const Feature = ({ text }: { text: string }) => (
  <View style={styles.feature}>
    <MaterialCommunityIcons name="check-circle" size={19} color={theme.colors.success} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = createThemedStyles((c) => ({
  top: {
    height: 58,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h3,
    color: c.text,
  },
  content: {
    padding: 18,
    paddingBottom: 100,
  },
  heading: {
    ...theme.typography.h1,
    color: c.text,
    textAlign: 'center',
  },
  subheading: {
    ...theme.typography.body,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  businessRow: {
    gap: 8,
    paddingBottom: 14,
  },
  businessChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: c.border,
  },
  businessActive: {
    backgroundColor: c.secondary,
    borderColor: c.secondary,
  },
  businessText: {
    ...theme.typography.caption,
    color: c.text,
  },
  businessTextActive: {
    color: c.textInverse,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 14,
  },
  featured: {
    borderColor: c.primary,
    borderWidth: 2,
  },
  popular: {
    alignSelf: 'flex-start',
    backgroundColor: c.primary,
    color: c.textInverse,
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    marginBottom: 8,
  },
  planName: {
    ...theme.typography.h2,
    color: c.text,
  },
  planDescription: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 16,
  },
  currency: {
    ...theme.typography.h3,
    color: c.primary,
  },
  price: {
    fontSize: 34,
    fontWeight: '900',
    color: c.text,
  },
  period: {
    ...theme.typography.caption,
    color: c.textMuted,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 9,
  },
  featureText: {
    ...theme.typography.body,
    color: c.textSecondary,
  },
  button: {
    marginTop: 20,
  },
  messageCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  errorTitle: {
    ...theme.typography.bodyBold,
    color: c.danger,
  },
  empty: {
    ...theme.typography.body,
    textAlign: 'center',
    color: c.textSecondary,
  },
  currentCard: {
    backgroundColor: c.successLight,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: c.success,
    padding: 18,
    marginBottom: 16,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentLabel: {
    ...theme.typography.tiny,
    flexShrink: 1,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: c.success,
  },
  currentName: {
    ...theme.typography.h2,
    color: c.text,
    marginTop: 6,
  },
  currentValidity: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginTop: 4,
  },
  currentExpiring: {
    color: c.warning,
    fontWeight: '700',
  },
  currentDivider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 12,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  usageLabel: {
    ...theme.typography.caption,
    color: c.textSecondary,
  },
  usageValue: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: c.text,
  },
  currentPlanBorder: {
    borderColor: c.success,
    borderWidth: 2,
  },
  currentTag: {
    alignSelf: 'flex-start',
    backgroundColor: c.success,
    color: c.textInverse,
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    marginBottom: 8,
    overflow: 'hidden',
  },
  noPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
    marginBottom: 16,
  },
  noPlanText: {
    ...theme.typography.caption,
    flex: 1,
    color: c.textSecondary,
  },
  security: {
    ...theme.typography.caption,
    color: c.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
}));
