import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { MoreStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;
type MoreItem = { key: string; label: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; route?: keyof MoreStackParamList; params?: Record<string, string> };
export const MoreScreen: React.FC<Props> = ({ navigation }) => {
  const { businesses, hasApprovedBusiness, refreshBusinesses, t } = useApp();
  const tabBarHeight = useBottomTabBarHeight();

  useFocusEffect(
    React.useCallback(() => {
      refreshBusinesses();
    }, [refreshBusinesses])
  );

  const businessSubtitle = useMemo(() => {
    if (hasApprovedBusiness) return t('businessApprovedSubtitle');
    if (businesses.some((business) => business.verificationStatus === 'rejected')) return t('businessChangesSubtitle');
    if (businesses.some((business) => business.verificationStatus === 'pending')) return t('businessPendingSubtitle');
    return t('businessStartSubtitle');
  }, [businesses, hasApprovedBusiness, t]);

  const items = useMemo<MoreItem[]>(() => {
    const businessItems: MoreItem[] = [];
    if (businesses.length) businessItems.push({ key: 'businessProfiles', label: t('businessProfiles'), subtitle: t('businessProfilesSubtitle'), icon: 'storefront-plus-outline', route: 'MyBusiness' });
    if (hasApprovedBusiness) {
      businessItems.push(
        { key: 'myOffers', label: t('myOffers'), subtitle: t('myOffersSubtitle'), icon: 'tag-multiple-outline', route: 'MyOffers' },
        { key: 'plans', label: t('subscriptionPlans'), subtitle: t('subscriptionPlansSubtitle'), icon: 'crown-outline', route: 'Plans' }
      );
    }
    const commonItems: MoreItem[] = [
      { key: 'bookings', label: t('myBookings'), subtitle: t('myBookingsSubtitle'), icon: 'clipboard-text-clock-outline', route: 'MyBookings' },
      { key: 'savedOffers', label: t('savedOffersTitle'), subtitle: t('savedOffersSubtitle'), icon: 'bookmark-outline', route: 'SavedOffers' },
      { key: 'favProviders', label: t('favouriteProviders'), subtitle: t('favouriteProvidersSubtitle'), icon: 'heart-multiple-outline', route: 'SavedProviders' },
      { key: 'payments', label: t('payments'), subtitle: t('paymentsSubtitle'), icon: 'credit-card-outline', route: 'Payments' },
      { key: 'notifications', label: t('notificationsLabel'), subtitle: t('notificationsSubtitle'), icon: 'bell-outline', route: 'Notifications' },
      { key: 'messages', label: t('messages'), subtitle: t('messagesSubtitle'), icon: 'message-text-outline', route: 'ChatList' },
      { key: 'settings', label: t('languageSettings'), subtitle: t('languageSettingsSubtitle'), icon: 'translate', route: 'Settings' },
      { key: 'help', label: t('help'), subtitle: t('helpSubtitle'), icon: 'lifebuoy', route: 'HelpSupport' },
      { key: 'terms', label: t('termsConditions'), subtitle: t('termsSubtitle'), icon: 'file-document-outline', route: 'LegalDocument', params: { document: 'terms' } },
      { key: 'privacy', label: t('privacyPolicy'), subtitle: t('privacySubtitle'), icon: 'shield-lock-outline', route: 'LegalDocument', params: { document: 'privacy' } },
    ];
    return [...businessItems, ...commonItems];
  }, [businesses, hasApprovedBusiness, businessSubtitle, t]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{t('moreTitle')}</Text>
        <Text style={styles.subtitle}>{t('moreSubtitle')}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 32 }]}
        scrollIndicatorInsets={{ bottom: tabBarHeight + 32 }}
      >
        <Pressable onPress={() => navigation.navigate('BusinessCenter')} style={({ pressed }) => [styles.businessBanner, pressed && styles.pressed]}>
          <View style={styles.bannerIcon}><MaterialCommunityIcons name="storefront-outline" size={26} color={theme.colors.textInverse} /></View>
          <View style={styles.flex}>
            <Text style={styles.bannerTitle}>{hasApprovedBusiness ? t('manageBusiness') : t('promoteBusiness')}</Text>
            <Text style={styles.bannerText}>{businessSubtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textInverse} />
        </Pressable>
        {items.map((item) => <Pressable key={item.key} onPress={() => item.route && (navigation as any).navigate(item.route, item.params)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}><View style={styles.icon}><View pointerEvents="none" style={styles.iconShine} /><MaterialCommunityIcons name={item.icon} size={23} color={theme.colors.primary} /></View><View style={styles.flex}><Text style={styles.label}>{item.label}</Text><Text style={styles.itemSubtitle}>{item.subtitle}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} /></Pressable>)}
      </ScrollView>
    </ScreenContainer>
  );
};
const styles = StyleSheet.create({ header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }, title: { ...theme.typography.h1, color: theme.colors.text }, subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 }, scroll: { flex: 1 }, content: { padding: 16, gap: 11 }, businessBanner: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 19, backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadowStrong, shadowOpacity: 0.28, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, bannerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }, bannerTitle: { ...theme.typography.bodyBold, color: theme.colors.textInverse }, bannerText: { ...theme.typography.caption, color: 'rgba(255,255,255,0.86)', lineHeight: 17, marginTop: 3 }, item: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: 17, padding: 13, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, pressed: { transform: [{ scale: 0.985 }], shadowOpacity: 0.7 }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }, iconShine: { position: 'absolute', top: 0, left: 6, right: 6, height: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.32)' }, flex: { flex: 1 }, label: { ...theme.typography.bodyBold, color: theme.colors.text }, itemSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 } });
