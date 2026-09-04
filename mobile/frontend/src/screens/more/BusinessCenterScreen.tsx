import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../context/AppContext';
import type { MoreStackParamList } from '../../navigation/types';
import type { Business } from '../../types/hyperlocal';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'BusinessCenter'>;

const steps = [
  { icon: 'storefront-plus-outline' as const, title: 'Register your business', text: 'Add your business details, location and contact information.' },
  { icon: 'shield-check-outline' as const, title: 'Get admin approval', text: 'Our team checks the profile before it can be promoted.' },
  { icon: 'crown-outline' as const, title: 'Choose a plan', text: 'Select a plan based on the number of offers you want to post.' },
  { icon: 'palette-outline' as const, title: 'Create an offer', text: 'Design your offer and submit it for final review.' },
];

const statusText = (business: Business) => {
  if (business.verificationStatus === 'verified') return 'Approved';
  if (business.verificationStatus === 'pending') return 'Pending approval';
  if (business.verificationStatus === 'rejected') return 'Changes required';
  return 'Suspended';
};

const statusColor = (business: Business) => {
  if (business.verificationStatus === 'verified') return theme.colors.success;
  if (business.verificationStatus === 'rejected' || business.verificationStatus === 'suspended') return theme.colors.danger;
  return theme.colors.secondary;
};

const hasActivePlan = (business: Business) => Boolean(
  business.verificationStatus === 'verified' &&
    business.activeSubscription?.status === 'active' &&
    new Date(business.activeSubscription.endsAt) >= new Date()
);

export const BusinessCenterScreen: React.FC<Props> = ({ navigation }) => {
  const { businesses, businessAccessLoading, refreshBusinesses } = useApp();

  useFocusEffect(
    useCallback(() => {
      refreshBusinesses();
    }, [refreshBusinesses])
  );

  const openBusiness = (business: Business) => navigation.navigate('BusinessSetup', { businessId: business._id });

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <Pressable onPress={navigation.goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title}>Business Center</Text>
          <Text style={styles.subtitle}>Promote your business to nearby customers</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={businessAccessLoading} onRefresh={refreshBusinesses} colors={[theme.colors.primary]} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="storefront-outline" size={35} color={theme.colors.textInverse} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>Grow your local business</Text>
            <Text style={styles.heroText}>Create approved offers and reach customers in your nearby area.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.stepsCard}>
          {steps.map((step, index) => (
            <View key={step.title} style={[styles.step, index === steps.length - 1 && styles.stepLast]}>
              <View style={styles.stepIcon}><MaterialCommunityIcons name={step.icon} size={22} color={theme.colors.primary} /></View>
              <View style={styles.flex}>
                <Text style={styles.stepTitle}>{index + 1}. {step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {businesses.length ? (
          <>
            <Text style={styles.sectionTitle}>Your businesses</Text>
            {businesses.map((business) => {
              const approved = business.verificationStatus === 'verified';
              const activePlan = hasActivePlan(business);
              return (
                <View key={business._id} style={styles.businessCard}>
                  <View style={styles.businessHeader}>
                    <View style={styles.businessIcon}><MaterialCommunityIcons name="storefront-outline" size={24} color={theme.colors.primary} /></View>
                    <View style={styles.flex}>
                      <Text style={styles.businessName}>{business.name}</Text>
                      <Text style={styles.businessCategory}>{business.category}</Text>
                    </View>
                    <Text style={[styles.status, { color: statusColor(business) }]}>{statusText(business)}</Text>
                  </View>

                  {business.verificationStatus === 'pending' ? (
                    <Text style={styles.businessNote}>Your profile is under review. Posting unlocks automatically after approval.</Text>
                  ) : null}
                  {business.verificationStatus === 'rejected' ? (
                    <Text style={[styles.businessNote, styles.dangerText]}>{business.verificationNote || 'Please update the profile and submit it again.'}</Text>
                  ) : null}
                  {approved ? (
                    <View style={styles.planRow}>
                      <MaterialCommunityIcons name="crown-outline" size={18} color={activePlan ? theme.colors.accentDark : theme.colors.textMuted} />
                      <Text style={styles.planText}>{activePlan ? 'Active plan' : 'No active plan — choose a plan before posting'}</Text>
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    <Button label={business.verificationStatus === 'rejected' ? 'Update & resubmit' : 'View profile'} variant="outline" onPress={() => openBusiness(business)} style={styles.actionButton} />
                    {approved && !activePlan ? <Button label="Choose plan" onPress={() => navigation.navigate('Plans', { businessId: business._id })} style={styles.actionButton} /> : null}
                    {approved && activePlan ? <Button label="My offers" onPress={() => navigation.navigate('MyOffers')} style={styles.actionButton} /> : null}
                  </View>
                </View>
              );
            })}
            <Button label="Add another business" variant="outline" onPress={() => navigation.navigate('BusinessSetup')} fullWidth />
          </>
        ) : (
          <View style={styles.startCard}>
            <MaterialCommunityIcons name="rocket-launch-outline" size={30} color={theme.colors.primary} />
            <Text style={styles.startTitle}>Ready to get started?</Text>
            <Text style={styles.startText}>Register your business using your existing InquiryExperts account. No separate account is needed.</Text>
            <Button label="Register your business" onPress={() => navigation.navigate('BusinessSetup')} fullWidth />
          </View>
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={21} color={theme.colors.secondary} />
          <Text style={styles.infoText}>The Post option appears in the bottom bar only after your business profile is approved by admin.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  top: { minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { ...theme.typography.h3, color: theme.colors.text },
  subtitle: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 2 },
  content: { padding: 16, paddingBottom: 110, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 18, borderRadius: 21, backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadowStrong, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  heroTitle: { ...theme.typography.h3, color: theme.colors.textInverse },
  heroText: { ...theme.typography.caption, color: 'rgba(255,255,255,0.86)', lineHeight: 18, marginTop: 4 },
  sectionTitle: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 4 },
  stepsCard: { backgroundColor: theme.colors.surface, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.border },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  stepLast: { borderBottomWidth: 0 },
  stepIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  stepTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  stepText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 17, marginTop: 3 },
  businessCard: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 11, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  businessHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  businessIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  businessName: { ...theme.typography.bodyBold, color: theme.colors.text },
  businessCategory: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  status: { ...theme.typography.tiny, fontWeight: '900' },
  businessNote: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
  dangerText: { color: theme.colors.danger },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 12, backgroundColor: theme.colors.background },
  planText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', gap: 9 },
  actionButton: { flex: 1 },
  startCard: { alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: theme.colors.border, gap: 9 },
  startTitle: { ...theme.typography.h3, color: theme.colors.text, textAlign: 'center' },
  startText: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 4 },
  infoCard: { flexDirection: 'row', gap: 9, padding: 13, borderRadius: 15, backgroundColor: theme.colors.secondaryLight },
  infoText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
});
