import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { SkylineMasthead } from '../../components/NeonUI';
import { listMyBusinesses } from '../../services/api';
import type { Business } from '../../types/hyperlocal';
import type { ProfileStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme, createThemedStyles } from '../../theme';
import { subscriptionPlanName } from '../../utils/subscription';
import { tabBarScrollProps } from '../../navigation/hideTabBarOnScroll';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, accessToken, logout, refreshProfile, language, t } = useApp();
  const [business, setBusiness] = useState<Business | null>(null);
  useFocusEffect(useCallback(() => { refreshProfile(); if (accessToken) listMyBusinesses(accessToken).then((r) => setBusiness(r.data[0] || null)).catch(() => undefined); }, [accessToken, refreshProfile]));
  const confirmLogout = () => Alert.alert(t('logoutQuestion'), '', [{ text: t('cancel') }, { text: t('logout'), style: 'destructive', onPress: logout }]);
  const editProfile = () => navigation.navigate('EditProfile', { section: 'profile' });

  return <ScreenContainer>
    <SkylineMasthead height={260} />
    <View style={styles.top}>
      <View style={styles.topCopy}>
        <Text style={styles.topTitle}>{t('profileTitle')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('accountSettings')} onPress={() => navigation.navigate('Settings')} style={({ pressed }) => [styles.settings, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="cog-outline" size={20} color={theme.colors.primary} />
      </Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...tabBarScrollProps}>
      <View style={styles.identity}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('editProfileShort')} onPress={editProfile} style={styles.avatarWrap}>
          <Avatar uri={currentUser?.avatar} name={currentUser?.name || t('userFallback')} size={58} verified={currentUser?.verified} />
          <View style={styles.cameraBadge}><MaterialCommunityIcons name="camera" size={13} color={theme.colors.background} /></View>
        </Pressable>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.name}>{currentUser?.name || t('userFallback')}</Text>
          {currentUser?.phone ? <View style={styles.identityLine}><MaterialCommunityIcons name="phone" size={14} color={theme.colors.primary} /><Text numberOfLines={1} style={styles.identityText}>{currentUser.phone}</Text></View> : null}
          {currentUser?.email ? <View style={styles.identityLine}><MaterialCommunityIcons name="email-outline" size={14} color={theme.colors.primary} /><Text numberOfLines={1} style={styles.identityText}>{currentUser.email}</Text></View> : null}
        </View>
        <View style={styles.identityDivider} />
        <Pressable accessibilityRole="button" onPress={editProfile} style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.colors.primary} />
          <Text numberOfLines={1} style={styles.editText}>{t('editProfileShort')}</Text>
        </Pressable>
      </View>

      <SectionLabel title={t('exploreSection')} />
      <Menu icon="map-marker-outline" tone="#2F80ED" title={t('savedLocationsTitle')} onPress={() => navigation.navigate('SavedLocations')} />
      <Menu icon="tag-outline" tone="#12B76A" title={t('savedOffersTitle')} onPress={() => navigation.navigate('SavedOffers')} />

      <SectionLabel title={t('businessSection')} />
      {business ? <>
        <Menu icon="storefront-outline" tone="#00A6B4" title={business.name} subtitle={`${t('verification')}: ${business.verificationStatus}`} onPress={() => navigation.navigate('MyBusiness')} photo={business.logoUrl || business.coverImageUrl} />
        <Menu icon="crown-outline" tone="#7A5AF8" title={business.activeSubscription ? t('activeBusinessPlan') : t('chooseBusinessPlan')} subtitle={business.activeSubscription ? `${subscriptionPlanName(business.activeSubscription) ? `${subscriptionPlanName(business.activeSubscription)} · ` : ''}${t('validUntil')} ${new Date(business.activeSubscription.endsAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}` : t('planRequired')} onPress={() => navigation.navigate('Plans', { businessId: business._id })} />
      </> : <View style={styles.noBusiness}><MaterialCommunityIcons name="storefront-plus-outline" size={28} color={theme.colors.primary} /><Text style={styles.noBusinessText}>{t('createBusinessHint')}</Text></View>}

      <SectionLabel title={t('settingsSection')} />
      <Menu icon="account-cog-outline" tone="#00A6B4" title={t('accountSettings')} onPress={() => navigation.navigate('Settings')} />
      <Menu icon="lifebuoy" tone="#FF7A3D" title={t('help')} onPress={() => navigation.navigate('HelpSupport')} />
      <Pressable accessibilityRole="button" onPress={confirmLogout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="logout" size={21} color={theme.colors.danger} />
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </Pressable>
    </ScrollView>
  </ScreenContainer>;
};

const SectionLabel = ({ title }: { title: string }) => (
  <View style={styles.sectionWrap}>
    <Text style={styles.section}>{title}</Text>
  </View>
);

const Menu = ({ icon, title, subtitle, onPress, tone, photo }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle?: string; onPress: () => void; tone: string; photo?: string }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.menu, pressed && styles.pressed]}>
    {photo ? <Image source={{ uri: photo }} style={styles.menuPhoto} resizeMode="cover" /> : <View style={[styles.menuIcon, { backgroundColor: tone + '88', borderColor: tone, borderWidth: 1 }]}><MaterialCommunityIcons name={icon} size={20} color="#FFFFFF" /></View>}
    <View style={styles.flex}>
      <Text numberOfLines={1} style={styles.menuTitle}>{title}</Text>
      {subtitle ? <Text numberOfLines={2} style={styles.menuSubtitle}>{subtitle}</Text> : null}
    </View>
    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
  </Pressable>
);

const styles = createThemedStyles((c) => ({
  top: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, gap: 12 },
  topCopy: { flex: 1, minWidth: 0 },
  topTitle: { fontSize: 23, lineHeight: 29, fontWeight: '900', color: c.text },
  settings: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: c.cardBorder, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  content: { padding: 16, paddingBottom: 130 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.cardBorder, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  avatarWrap: { position: 'relative', borderWidth: 1.5, borderColor: c.primary, borderRadius: 40 },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, lineHeight: 24, fontWeight: '900', color: c.text },
  identityLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  identityText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16, color: c.textSecondary },
  identityDivider: { width: 1, alignSelf: 'stretch', marginVertical: 4, backgroundColor: c.divider },
  edit: { maxWidth: 102, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 18, borderWidth: 1.5, borderColor: c.primary, paddingHorizontal: 10, paddingVertical: 8 },
  editText: { flexShrink: 1, fontSize: 11.5, fontWeight: '800', color: c.primary },

  sectionWrap: { marginTop: 18, marginBottom: 8 },
  section: { fontSize: 15.5, lineHeight: 21, fontWeight: '900', color: c.text },

  menu: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: c.surface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 9, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.85 },
  menuIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuPhoto: { width: 42, height: 42, borderRadius: 13, backgroundColor: c.surfaceAlt },
  flex: { flex: 1, minWidth: 0 },
  menuTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: c.text },
  menuSubtitle: { fontSize: 11.5, lineHeight: 15, color: c.textSecondary, marginTop: 2 },

  noBusiness: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary, borderRadius: 16, padding: 13, shadowColor: c.primaryGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  noBusinessText: { flex: 1, ...theme.typography.caption, color: c.textSecondary, lineHeight: 18 },
  logout: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  logoutText: { ...theme.typography.bodyBold, color: c.danger },
}));
