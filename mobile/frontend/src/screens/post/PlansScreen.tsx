import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { createSubscriptionOrder, listMyBusinesses, listPlans } from '../../services/api';
import type { Business, Plan } from '../../types/hyperlocal';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

export const PlansScreen: React.FC<any> = ({ route, navigation }) => {
  const { accessToken } = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState(route.params?.businessId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
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

  const choose = async (plan: Plan) => {
    if (!accessToken || !selectedBusiness) {
      Alert.alert('Business required', 'Create or select a business first.');
      return;
    }
    setBuying(plan._id);
    try {
      const response = await createSubscriptionOrder(accessToken, plan._id, selectedBusiness);
      Alert.alert(
        'Payment awaiting verification',
        `Order ${response.payment.orderId} created for ₹${response.payment.amount}. Subscription activates only after secure server/admin verification.`,
        [{ text: 'Done', onPress: navigation.goBack }]
      );
    } catch (chooseError: any) {
      Alert.alert('Order not created', chooseError.message);
    } finally {
      setBuying('');
    }
  };

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
            <Button label="Retry" variant="outline" onPress={load} />
          </View>
        ) : null}

        {!loading && !error
          ? plans.map((plan, index) => (
              <View key={plan._id} style={[styles.card, index === 1 && styles.featured]}>
                {index === 1 && <Text style={styles.popular}>POPULAR</Text>}
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
                <Button label="Choose Plan" onPress={() => choose(plan)} loading={buying === plan._id} fullWidth style={styles.button} />
              </View>
            ))
          : null}

        {!plans.length && !loading && !error ? (
          <View style={styles.messageCard}>
            <Text style={styles.empty}>No active plans are configured yet.</Text>
            <Button label="Refresh plans" variant="outline" onPress={load} />
          </View>
        ) : null}

        <Text style={styles.security}>
          <MaterialCommunityIcons name="shield-check-outline" size={16} /> Payment success is never trusted from the app. Activation is server verified.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
};

const Feature = ({ text }: { text: string }) => (
  <View style={styles.feature}>
    <MaterialCommunityIcons name="check-circle" size={19} color={theme.colors.success} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  top: {
    height: 58,
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.text,
  },
  content: {
    padding: 18,
    paddingBottom: 100,
  },
  heading: {
    ...theme.typography.h1,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subheading: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
    borderColor: theme.colors.border,
  },
  businessActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  businessText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  businessTextActive: {
    color: theme.colors.textInverse,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  featured: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  popular: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    color: theme.colors.textInverse,
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    marginBottom: 8,
  },
  planName: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  planDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 16,
  },
  currency: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  price: {
    fontSize: 34,
    fontWeight: '900',
    color: theme.colors.text,
  },
  period: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 9,
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
    color: theme.colors.danger,
  },
  empty: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  security: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
