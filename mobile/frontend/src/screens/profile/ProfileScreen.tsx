import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, ChevronRight, Crown, LifeBuoy, LogOut, MapPin, MoreVertical, Store, Tag, UserCog, type LucideIcon } from 'lucide-react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { listMyBusinesses } from '../../services/api';
import type { Business } from '../../types/hyperlocal';
import type { MainTabParamList, ProfileStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme, createThemedStyles } from '../../theme';
import { subscriptionPlanName } from '../../utils/subscription';
import { tabBarScrollProps } from '../../navigation/hideTabBarOnScroll';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, accessToken, logout, refreshProfile, language, t } = useApp();
  const insets = useSafeAreaInsets();
  const [business, setBusiness] = useState<Business | null>(null);
  useFocusEffect(useCallback(() => {
    refreshProfile();
    if (accessToken) listMyBusinesses(accessToken).then((response) => setBusiness(response.data[0] || null)).catch(() => undefined);
  }, [accessToken, refreshProfile]));
  const confirmLogout = () => Alert.alert(t('logoutQuestion'), '', [{ text: t('cancel') }, { text: t('logout'), style: 'destructive', onPress: logout }]);
  const editProfile = () => navigation.navigate('EditProfile', { section: 'profile' });
  const openProfileActions = () => Alert.alert(t('profileTitle'), undefined, [
    { text: t('editProfileShort'), onPress: editProfile },
    { text: t('accountSettings'), onPress: () => navigation.navigate('Settings') },
    { text: t('cancel'), style: 'cancel' },
  ]);
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('MoreTab', { screen: 'MoreHome' });
  };
  const phone = currentUser?.phone?.replace(/^\+91\s*-?\s*(\d{10})$/, '+91 - $1');

  return <ScreenContainer edges={['left', 'right']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...tabBarScrollProps}>
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={goBack} style={styles.back}>
            <ArrowLeft size={26} color={theme.colors.text} strokeWidth={STROKE} />
          </Pressable>
          <View style={styles.heroActionsRight}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('help')} onPress={() => navigation.navigate('HelpSupport')} style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}>
              <Text style={styles.helpText}>{t('help')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('accountSettings')} onPress={openProfileActions} style={styles.moreButton}>
              <MoreVertical size={24} color={theme.colors.text} strokeWidth={STROKE} />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroIdentity}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('editProfileShort')} onPress={editProfile} style={styles.avatarButton}>
            <Avatar uri={currentUser?.avatar} name={currentUser?.name || t('userFallback')} size={68} verified={currentUser?.verified} />
          </Pressable>
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.name}>{currentUser?.name || t('userFallback')}</Text>
            {phone ? <Text numberOfLines={1} style={styles.identityText}>{phone}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.options}>
        <View style={styles.optionGroup}>
          <Menu icon={MapPin} title={t('savedLocationsTitle')} onPress={() => navigation.navigate('SavedLocations')} />
          <Menu icon={Tag} title={t('savedOffersTitle')} onPress={() => navigation.navigate('SavedOffers')} />
          {business ? <>
            <Menu icon={Store} title={business.name} subtitle={`${t('verification')}: ${business.verificationStatus}`} onPress={() => navigation.navigate('MyBusiness')} photo={business.logoUrl || business.coverImageUrl} />
            <Menu icon={Crown} title={business.activeSubscription ? t('activeBusinessPlan') : t('chooseBusinessPlan')} subtitle={business.activeSubscription ? `${subscriptionPlanName(business.activeSubscription) ? `${subscriptionPlanName(business.activeSubscription)} · ` : ''}${t('validUntil')} ${new Date(business.activeSubscription.endsAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}` : t('planRequired')} onPress={() => navigation.navigate('Plans', { businessId: business._id })} />
          </> : <View style={styles.menu}><View style={styles.menuIcon}><Store size={24} color={theme.colors.text} strokeWidth={STROKE} /></View><Text style={styles.noBusinessText}>{t('createBusinessHint')}</Text></View>}
          <Menu icon={UserCog} title={t('accountSettings')} onPress={() => navigation.navigate('Settings')} />
          <Menu icon={LifeBuoy} title={t('help')} onPress={() => navigation.navigate('HelpSupport')} />
          <Menu icon={LogOut} title={t('logout')} onPress={confirmLogout} last emphasized />
        </View>
      </View>
    </ScrollView>
  </ScreenContainer>;
};

const STROKE = 1.75;

const Menu = ({ icon: Icon, title, subtitle, onPress, photo, last = false, emphasized = false }: { icon: LucideIcon; title: string; subtitle?: string; onPress: () => void; photo?: string; last?: boolean; emphasized?: boolean }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.menu, last && styles.lastMenu, pressed && styles.pressed]}>
    {photo ? <Image source={{ uri: photo }} style={styles.menuPhoto} resizeMode="cover" /> : <View style={styles.menuIcon}><Icon size={24} color={theme.colors.text} strokeWidth={STROKE} /></View>}
    <View style={styles.flex}>
      <Text numberOfLines={1} style={[styles.menuTitle, emphasized && styles.emphasizedText]}>{title}</Text>
      {subtitle ? <Text numberOfLines={2} style={styles.menuSubtitle}>{subtitle}</Text> : null}
    </View>
    <ChevronRight size={21} color={theme.colors.textMuted} strokeWidth={STROKE} />
  </Pressable>
);

const styles = createThemedStyles((c) => ({
  content: { paddingBottom: 130 },
  hero: { minHeight: 214, paddingHorizontal: 18, paddingBottom: 28, justifyContent: 'space-between', backgroundColor: c.accentLight, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  heroActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroActionsRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  helpButton: { minWidth: 60, height: 36, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  helpText: { fontSize: 14, fontWeight: '600', color: c.accentDark },
  moreButton: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarButton: { width: 68, height: 68, borderRadius: 34 },
  identityCopy: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontSize: 21, lineHeight: 28, fontWeight: '800', color: c.text },
  identityText: { fontSize: 15, lineHeight: 21, color: c.textSecondary },
  options: { paddingHorizontal: 16, paddingTop: 20 },

  optionGroup: { borderWidth: 1, borderColor: c.border, borderRadius: 24, backgroundColor: c.surface, overflow: 'hidden' },
  menu: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 10, paddingHorizontal: 7, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.divider },
  lastMenu: { borderBottomWidth: 0 },
  pressed: { backgroundColor: c.surfaceAlt },
  menuIcon: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  menuPhoto: { width: 28, height: 28, borderRadius: 5, backgroundColor: c.surfaceAlt },
  flex: { flex: 1, minWidth: 0 },
  menuTitle: { fontSize: 15.5, lineHeight: 21, fontWeight: '500', color: c.textSecondary },
  menuSubtitle: { fontSize: 12.5, lineHeight: 17, color: c.textMuted, marginTop: 2 },
  noBusinessText: { flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 17, color: c.textSecondary },
  emphasizedText: { color: c.text },
}));
