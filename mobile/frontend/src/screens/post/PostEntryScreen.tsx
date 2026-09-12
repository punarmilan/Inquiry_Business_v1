import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [loadError, setLoadError] = useState('');
  const [businessPickerOpen, setBusinessPickerOpen] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) { setLoading(false); setLoadError('Sign in to load your businesses.'); return; }
    setLoading(true);
    setLoadError('');
    listMyBusinesses(accessToken)
      .then((response) => {
        setBusinesses(response.data);
        setSelectedBusinessId((current) => response.data.some((item) => item._id === current) ? current : '');
      })
      .catch(() => setLoadError('Businesses could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ScreenContainer style={styles.center}><ActivityIndicator color={theme.colors.primary} /></ScreenContainer>;

  if (loadError) return <ScreenContainer style={styles.center}><Text style={styles.body}>{loadError}</Text><Button label="Retry" onPress={load} /></ScreenContainer>;

  const business = businesses.find((item) => item._id === selectedBusinessId) || null;

  if (!businesses.length) return <ScreenContainer style={styles.container}>
    <View style={styles.hero}><View style={styles.icon}><MaterialCommunityIcons name="store-plus-outline" size={52} color={theme.colors.primary} /></View><Text style={styles.title}>Add your business first</Text><Text style={styles.body}>You haven't added a business yet. Add one to start designing local offers.</Text></View>
    <Button label="Add Business" onPress={() => navigation.navigate('BusinessSetup')} fullWidth icon={<MaterialCommunityIcons name="store-plus-outline" size={19} color={theme.colors.textInverse} />} />
  </ScreenContainer>;

  const isApproved = business?.verificationStatus === 'verified';
  const hasPlan = Boolean(business && isApproved && business.activeSubscription?.status === 'active' && new Date(business.activeSubscription.endsAt) >= new Date());
  const statusLabel = business?.verificationStatus === 'verified' ? 'Approved' : business?.verificationStatus === 'pending' ? 'Pending approval' : business?.verificationStatus === 'rejected' ? 'Needs changes' : 'Suspended';

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.topBar}><Pressable onPress={navigation.goBack} style={styles.backButton}><MaterialCommunityIcons name="chevron-left" size={26} color={theme.colors.text} /></Pressable><Text style={styles.topBarTitle}>Post a Local Offer</Text><View style={styles.topBarSpacer} /></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroBanner}>
        <View style={styles.heroGlow} />
        <Image source={require('../../../assets/screen-3/03-post-offer-character.png')} style={styles.heroImage} resizeMode="contain" />
      </View>
      <View style={styles.hero}>
        <Text style={styles.title}>Post a local offer</Text>
        <Text style={styles.body}>Create attractive offers and reach{`\n`}more customers near you.</Text>
      </View>

      <Text style={styles.selectionLabel}>Your business</Text>
      <Pressable onPress={() => setBusinessPickerOpen(true)} style={styles.businessSelectCard}>
        <View style={styles.businessSelectLogo}>{business?.logoUrl ? <Image source={{ uri: business.logoUrl }} style={styles.selectedLogo} /> : <MaterialCommunityIcons name="storefront-outline" size={25} color={theme.colors.primary} />}</View>
        <Text numberOfLines={1} style={[styles.businessSelectText, !business && styles.businessPlaceholder]}>{business?.name || 'Select a business'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={theme.colors.text} />
      </Pressable>

      {!business ? <View style={styles.helperCard}><MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.primary} /><Text style={styles.helperText}>Select a business to design your offer.</Text></View> : null}

      <Button label="Design your offer" disabled={!business} onPress={() => {
        if (business) navigation.navigate('TemplateLibrary', { businessId: business._id });
      }} fullWidth />


      {business ? <Pressable onPress={() => navigation.navigate('BusinessSetup', { businessId: business._id })} style={styles.customize}>
        <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.customizeText}>{business.verificationStatus === 'rejected' ? 'Update & resubmit profile' : 'Customize business profile'}</Text>
      </Pressable> : null}
      </ScrollView>
      <Modal transparent animationType="slide" visible={businessPickerOpen} onRequestClose={() => setBusinessPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBusinessPickerOpen(false)}>
          <View style={styles.businessSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Select a business</Text>
            <ScrollView style={{ maxHeight: 360 }}>
            {businesses.map((item) => <Pressable key={item._id} onPress={() => { setSelectedBusinessId(item._id); setBusinessPickerOpen(false); }} style={[styles.sheetOption, item._id === business?._id && styles.sheetOptionActive]}>
              <View style={styles.sheetLogo}>{item.logoUrl ? <Image source={{ uri: item.logoUrl }} style={styles.selectedLogo} /> : <MaterialCommunityIcons name="storefront-outline" size={22} color={theme.colors.primary} />}</View><Text style={styles.sheetOptionText}>{item.name}</Text>{item._id === business?._id ? <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} /> : null}
            </Pressable>)}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const Step = ({ number, label, done }: { number: string; label: string; done: boolean }) => <View style={styles.step}><View style={[styles.stepCircle, done && styles.done]}>{done ? <MaterialCommunityIcons name="check" size={18} color={theme.colors.textInverse} /> : <Text style={styles.stepNumber}>{number}</Text>}</View><Text style={styles.stepLabel}>{label}</Text></View>;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14 }, scrollContent: { flexGrow: 1, paddingBottom: 20 }, center: { alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, topBar: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, topBarTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, topBarSpacer: { width: 36 },
  heroBanner: { height: 178, marginTop: 8, overflow: 'hidden', borderRadius: 18, backgroundColor: '#DDF3FC', position: 'relative' }, heroGlow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#BDE9F9', right: -35, top: -32 }, heroImage: { width: '100%', height: '100%', transform: [{ scale: 1.08 }] }, hero: { alignItems: 'center', paddingHorizontal: 8, paddingTop: 17 }, icon: { width: 96, height: 96, borderRadius: 30, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 }, title: { ...theme.typography.h2, color: theme.colors.text, textAlign: 'center' }, body: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 7 },
  selectionLabel: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '900', marginTop: 25, marginBottom: 8 }, businessSelectCard: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: '#E6EAF0', shadowColor: '#64748B', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, businessSelectLogo: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: theme.colors.primaryLight }, businessSelectText: { flex: 1, ...theme.typography.bodyBold, color: theme.colors.text }, businessPlaceholder: { color: theme.colors.textSecondary, fontWeight: '700' },
  selectedBusiness: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.colors.primaryLight, borderRadius: 17, padding: 13, marginTop: 18 }, selectedIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, selectedLogo: { width: '100%', height: '100%' }, selectedLabel: { ...theme.typography.tiny, color: theme.colors.textMuted, fontWeight: '900', letterSpacing: 1 }, selectedName: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 2 }, status: { ...theme.typography.tiny, color: theme.colors.warning, fontWeight: '900', textTransform: 'uppercase' }, statusApproved: { color: theme.colors.success }, helperCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 16, borderRadius: 13, backgroundColor: theme.colors.primaryLight }, helperText: { ...theme.typography.caption, color: theme.colors.primaryDark, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.28)' }, businessSheet: { padding: 16, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.colors.surface }, sheetHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: theme.colors.border, marginBottom: 14 }, sheetTitle: { ...theme.typography.h3, color: theme.colors.text, marginBottom: 10 }, sheetOption: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderRadius: 12 }, sheetOptionActive: { backgroundColor: theme.colors.primaryLight }, sheetLogo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt }, sheetOptionText: { flex: 1, ...theme.typography.bodyBold, color: theme.colors.text },
  steps: { marginVertical: 22, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, gap: 14 }, step: { flexDirection: 'row', alignItems: 'center', gap: 12 }, stepCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, done: { backgroundColor: theme.colors.success }, stepNumber: { fontWeight: '900', color: theme.colors.textMuted }, stepLabel: { ...theme.typography.bodyBold, color: theme.colors.text }, approvalCard: { flexDirection: 'row', gap: 11, backgroundColor: theme.colors.secondaryLight, borderRadius: 16, padding: 14, marginBottom: 16 }, approvalTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, approvalText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: 3 }, customize: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 }, customizeText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '900' },
  designChoices: { marginTop: 2 },
});
