import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Bell, Bookmark, ChevronRight, CreditCard, Crown, FileText, Languages, LifeBuoy, ShieldCheck, Store, Tags, type LucideIcon } from 'lucide-react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { MoreStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme, createThemedStyles } from '../../theme';
import { tabBarScrollProps } from '../../navigation/hideTabBarOnScroll';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;
type MoreItem = { key: string; label: string; icon: LucideIcon; route?: keyof MoreStackParamList; params?: Record<string, string> };
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

  const { businessItems, activityItems, settingsItems } = useMemo(() => {
    const businessItems: MoreItem[] = [];
    if (businesses.length) businessItems.push({ key: 'businessProfiles', label: t('businessProfiles'), icon: Store, route: 'MyBusiness' });
    if (hasApprovedBusiness) {
      businessItems.push(
        { key: 'myOffers', label: t('myOffers'), icon: Tags, route: 'MyOffers' },
        { key: 'plans', label: t('subscriptionPlans'), icon: Crown, route: 'Plans' }
      );
    }
    const activityItems: MoreItem[] = [
      { key: 'savedOffers', label: t('savedOffersTitle'), icon: Bookmark, route: 'SavedOffers' },
      { key: 'payments', label: t('payments'), icon: CreditCard, route: 'Payments' },
      { key: 'notifications', label: t('notificationsLabel'), icon: Bell, route: 'Notifications' },
    ];
    const settingsItems: MoreItem[] = [
      { key: 'settings', label: t('languageSettings'), icon: Languages, route: 'Settings' },
      { key: 'help', label: t('help'), icon: LifeBuoy, route: 'HelpSupport' },
      { key: 'terms', label: t('termsConditions'), icon: FileText, route: 'LegalDocument', params: { document: 'terms' } },
      { key: 'privacy', label: t('privacyPolicy'), icon: ShieldCheck, route: 'LegalDocument', params: { document: 'privacy' } },
    ];
    return { businessItems, activityItems, settingsItems };
  }, [businesses, hasApprovedBusiness, t]);

  const renderItems = (group: MoreItem[]) => group.map((item, index) =>
    <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => item.route && (navigation as any).navigate(item.route, item.params)} style={({ pressed }) => [styles.item, index === group.length - 1 && styles.lastItem, pressed && styles.pressed]}>
      <View style={styles.icon}><item.icon size={24} color={theme.colors.text} strokeWidth={1.75} /></View>
      <View style={styles.flex}><Text style={styles.label}>{item.label}</Text></View>
      <ChevronRight size={21} color={theme.colors.textMuted} strokeWidth={1.75} />
    </Pressable>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{t('moreTitle')}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 32 }]}
        scrollIndicatorInsets={{ bottom: tabBarHeight + 32 }}
        {...tabBarScrollProps}
      >
        <View style={styles.optionGroup}>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('BusinessCenter')} style={({ pressed }) => [styles.item, styles.businessRow, businessItems.length === 0 && styles.lastItem, pressed && styles.pressed]}>
            <View style={styles.icon}><Store size={24} color={theme.colors.text} strokeWidth={1.75} /></View>
            <View style={styles.flex}>
              <Text style={styles.label}>{hasApprovedBusiness ? t('manageBusiness') : t('promoteBusiness')}</Text>
              <Text numberOfLines={2} style={styles.subtitle}>{businessSubtitle}</Text>
            </View>
            <ChevronRight size={21} color={theme.colors.textMuted} strokeWidth={1.75} />
          </Pressable>
          {renderItems(businessItems)}
        </View>
        <View style={styles.optionGroup}>{renderItems(activityItems)}</View>
        <View style={styles.optionGroup}>{renderItems(settingsItems)}</View>
      </ScrollView>
    </ScreenContainer>
  );
};
const styles = createThemedStyles((c) => ({
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.divider },
  title: { ...theme.typography.h1, color: c.text },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 18, gap: 14 },
  optionGroup: { borderWidth: 1, borderColor: c.border, borderRadius: 24, backgroundColor: c.surface, overflow: 'hidden' },
  item: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 10, paddingHorizontal: 7, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.divider },
  businessRow: { minHeight: 72 },
  lastItem: { borderBottomWidth: 0 },
  pressed: { backgroundColor: c.surfaceAlt },
  icon: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  label: { fontSize: 15.5, lineHeight: 21, fontWeight: '500', color: c.textSecondary },
  subtitle: { fontSize: 12.5, lineHeight: 17, color: c.textMuted, marginTop: 2 },
}));
