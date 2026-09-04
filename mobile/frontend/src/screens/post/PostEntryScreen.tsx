import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { listMyBusinesses } from '../../services/api';
import type { Business } from '../../types/hyperlocal';
import type { PostStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<PostStackParamList, 'PostEntry'>;

export const PostEntryScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    listMyBusinesses(accessToken)
      .then((response) => {
        setRedirecting(false);
        setBusinesses(response.data);
        setSelectedBusinessId((current) => response.data.some((item) => item._id === current) ? current : response.data[0]?._id || '');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!loading && !businesses.length && !redirecting) {
      setRedirecting(true);
      navigation.navigate('BusinessSetup');
    }
  }, [businesses.length, loading, navigation, redirecting]);

  if (loading || redirecting) return <ScreenContainer style={styles.center}><ActivityIndicator color={theme.colors.primary} /></ScreenContainer>;

  const business = businesses.find((item) => item._id === selectedBusinessId) || businesses[0];
  if (!business) return null;

  const isApproved = business.verificationStatus === 'verified';
  const hasPlan = Boolean(isApproved && business.activeSubscription?.status === 'active' && new Date(business.activeSubscription.endsAt) >= new Date());
  const statusLabel = business.verificationStatus === 'verified' ? 'Approved' : business.verificationStatus === 'pending' ? 'Pending approval' : business.verificationStatus === 'rejected' ? 'Needs changes' : 'Suspended';

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.icon}><MaterialCommunityIcons name="palette-outline" size={52} color={theme.colors.primary} /></View>
        <Text style={styles.title}>Post a local offer</Text>
        <Text style={styles.body}>Choose a business profile, activate its plan, then design and submit an offer for admin review.</Text>
      </View>

      {businesses.length > 1 ? (
        <>
          <Text style={styles.selectionLabel}>Choose business to post from</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessChoices}>
            {businesses.map((item) => (
              <Pressable key={item._id} onPress={() => setSelectedBusinessId(item._id)} style={[styles.businessChoice, item._id === business._id && styles.businessChoiceActive]}>
                <MaterialCommunityIcons name="storefront-outline" size={18} color={item._id === business._id ? theme.colors.textInverse : theme.colors.primary} />
                <Text numberOfLines={1} style={[styles.businessChoiceText, item._id === business._id && styles.businessChoiceTextActive]}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.selectedBusiness}>
        <View style={styles.selectedIcon}><MaterialCommunityIcons name="storefront-outline" size={24} color={theme.colors.primary} /></View>
        <View style={styles.flex}><Text style={styles.selectedLabel}>POSTING AS</Text><Text style={styles.selectedName}>{business.name}</Text></View>
        <Text style={[styles.status, business.verificationStatus === 'verified' && styles.statusApproved]}>{statusLabel}</Text>
      </View>

      <View style={styles.steps}>
        <Step number="1" label="Business profile approved" done={isApproved} />
        <Step number="2" label="Eligible plan" done={hasPlan} />
        <Step number="3" label="Design & submit offer" done={false} />
      </View>

      {business.verificationStatus === 'pending' ? (
        <View style={styles.approvalCard}>
          <MaterialCommunityIcons name="clock-check-outline" size={24} color={theme.colors.secondary} />
          <View style={styles.flex}><Text style={styles.approvalTitle}>Business profile under review</Text><Text style={styles.approvalText}>Admin approval usually completes within 24 hours. Posting unlocks automatically after approval.</Text></View>
        </View>
      ) : business.verificationStatus === 'rejected' ? (
        <View style={styles.approvalCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color={theme.colors.danger} />
          <View style={styles.flex}><Text style={styles.approvalTitle}>Update your business profile</Text><Text style={styles.approvalText}>{business.verificationNote || 'Admin requested changes before approval.'}</Text></View>
        </View>
      ) : business.verificationStatus === 'suspended' ? (
        <View style={styles.approvalCard}><MaterialCommunityIcons name="pause-circle-outline" size={24} color={theme.colors.danger} /><View style={styles.flex}><Text style={styles.approvalTitle}>Business profile suspended</Text><Text style={styles.approvalText}>Contact support before posting from this profile.</Text></View></View>
      ) : !hasPlan ? (
        <Button label="View Subscription Plans" onPress={() => navigation.navigate('Plans', { businessId: business._id })} fullWidth />
      ) : (
        <View style={styles.designChoices}>
          <Button
            label="Design your offer"
            icon={<MaterialCommunityIcons name="palette-outline" size={19} color={theme.colors.textInverse} />}
            onPress={() => navigation.navigate('OfferDesignEditor', { businessId: business._id, designMode: 'templates' })}
            fullWidth
          />
        </View>
      )}

      <Pressable onPress={() => navigation.navigate('BusinessSetup', { businessId: business._id })} style={styles.customize}>
        <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.customizeText}>{business.verificationStatus === 'rejected' ? 'Update & resubmit profile' : 'Customize business profile'}</Text>
      </Pressable>
    </ScreenContainer>
  );
};

const Step = ({ number, label, done }: { number: string; label: string; done: boolean }) => <View style={styles.step}><View style={[styles.stepCircle, done && styles.done]}>{done ? <MaterialCommunityIcons name="check" size={18} color={theme.colors.textInverse} /> : <Text style={styles.stepNumber}>{number}</Text>}</View><Text style={styles.stepLabel}>{label}</Text></View>;

const styles = StyleSheet.create({
  container: { padding: 22, justifyContent: 'center' }, center: { alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 },
  hero: { alignItems: 'center' }, icon: { width: 100, height: 100, borderRadius: 32, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, title: { ...theme.typography.h1, color: theme.colors.text, marginTop: 22, textAlign: 'center' }, body: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  selectionLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '800', marginTop: 22, marginBottom: 8 }, businessChoices: { gap: 9, paddingBottom: 2 }, businessChoice: { maxWidth: 180, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, businessChoiceActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, businessChoiceText: { maxWidth: 132, ...theme.typography.caption, color: theme.colors.text, fontWeight: '800' }, businessChoiceTextActive: { color: theme.colors.textInverse },
  selectedBusiness: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.colors.primaryLight, borderRadius: 17, padding: 13, marginTop: 18 }, selectedIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }, selectedLabel: { ...theme.typography.tiny, color: theme.colors.textMuted, fontWeight: '900', letterSpacing: 1 }, selectedName: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 2 }, status: { ...theme.typography.tiny, color: theme.colors.warning, fontWeight: '900', textTransform: 'uppercase' }, statusApproved: { color: theme.colors.success },
  steps: { marginVertical: 22, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, gap: 14 }, step: { flexDirection: 'row', alignItems: 'center', gap: 12 }, stepCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, done: { backgroundColor: theme.colors.success }, stepNumber: { fontWeight: '900', color: theme.colors.textMuted }, stepLabel: { ...theme.typography.bodyBold, color: theme.colors.text }, approvalCard: { flexDirection: 'row', gap: 11, backgroundColor: theme.colors.secondaryLight, borderRadius: 16, padding: 14, marginBottom: 16 }, approvalTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, approvalText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: 3 }, customize: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 }, customizeText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '900' },
  designChoices: { marginTop: 2 },
});
