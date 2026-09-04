import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { MoreStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;
type MoreItem = { label: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; route?: keyof MoreStackParamList };

const commonItems: MoreItem[] = [
  { label: 'My Bookings', subtitle: 'Track services and assigned professionals', icon: 'clipboard-text-clock-outline', route: 'MyBookings' },
  { label: 'Saved Offers', subtitle: 'Your favourite nearby deals', icon: 'bookmark-outline', route: 'SavedOffers' },
  { label: 'Payments', subtitle: 'Service and subscription payment status', icon: 'credit-card-outline' },
  { label: 'Notifications', subtitle: 'Bookings, offers and plan updates', icon: 'bell-outline', route: 'Notifications' },
  { label: 'Messages', subtitle: 'Booking, business and support inbox', icon: 'message-text-outline', route: 'ChatList' },
  { label: 'Language & Settings', subtitle: 'Language, privacy and preferences', icon: 'translate', route: 'Settings' },
  { label: 'Help & Support', subtitle: 'About, help and contact', icon: 'lifebuoy', route: 'HelpSupport' },
  { label: 'Terms & Conditions', subtitle: 'Platform usage terms', icon: 'file-document-outline' },
  { label: 'Privacy Policy', subtitle: 'How InquiryExperts protects your data', icon: 'shield-lock-outline' },
];
export const MoreScreen: React.FC<Props> = ({ navigation }) => {
  const { businesses, hasApprovedBusiness, refreshBusinesses } = useApp();

  useFocusEffect(
    React.useCallback(() => {
      refreshBusinesses();
    }, [refreshBusinesses])
  );

  const businessSubtitle = useMemo(() => {
    if (hasApprovedBusiness) return 'Approved — manage your offers and plans';
    if (businesses.some((business) => business.verificationStatus === 'rejected')) return 'Changes requested — update and resubmit';
    if (businesses.some((business) => business.verificationStatus === 'pending')) return 'Application pending admin approval';
    return 'Learn how to promote your business and get started';
  }, [businesses, hasApprovedBusiness]);

  const items = useMemo<MoreItem[]>(() => {
    const businessItems: MoreItem[] = [];
    if (businesses.length) businessItems.push({ label: 'Business Profiles', subtitle: 'Add, customize and manage multiple businesses', icon: 'storefront-plus-outline', route: 'MyBusiness' });
    if (hasApprovedBusiness) {
      businessItems.push(
        { label: 'My Offers', subtitle: 'Pending, live and expired offers', icon: 'tag-multiple-outline', route: 'MyOffers' },
        { label: 'Subscription / Plans', subtitle: 'Quota, billing and plan options', icon: 'crown-outline', route: 'Plans' }
      );
    }
    return [...businessItems, ...commonItems];
  }, [businessSubtitle, businesses.length, hasApprovedBusiness]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Everything else, in one place</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.navigate('BusinessCenter')} style={({ pressed }) => [styles.businessBanner, pressed && styles.pressed]}>
          <View style={styles.bannerIcon}><MaterialCommunityIcons name="storefront-outline" size={26} color={theme.colors.textInverse} /></View>
          <View style={styles.flex}>
            <Text style={styles.bannerTitle}>{hasApprovedBusiness ? 'Manage your business' : 'Promote your business'}</Text>
            <Text style={styles.bannerText}>{businessSubtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textInverse} />
        </Pressable>
        {items.map((item) => <Pressable key={item.label} onPress={() => item.route && navigation.navigate(item.route as any)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}><View style={styles.icon}><View pointerEvents="none" style={styles.iconShine} /><MaterialCommunityIcons name={item.icon} size={23} color={theme.colors.primary} /></View><View style={styles.flex}><Text style={styles.label}>{item.label}</Text><Text style={styles.itemSubtitle}>{item.subtitle}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} /></Pressable>)}
      </ScrollView>
    </ScreenContainer>
  );
};
const styles = StyleSheet.create({ header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }, title: { ...theme.typography.h1, color: theme.colors.text }, subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 }, content: { padding: 16, paddingBottom: 120, gap: 11 }, businessBanner: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 19, backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadowStrong, shadowOpacity: 0.28, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, bannerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }, bannerTitle: { ...theme.typography.bodyBold, color: theme.colors.textInverse }, bannerText: { ...theme.typography.caption, color: 'rgba(255,255,255,0.86)', lineHeight: 17, marginTop: 3 }, item: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: 17, padding: 13, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, pressed: { transform: [{ scale: 0.985 }], shadowOpacity: 0.7 }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }, iconShine: { position: 'absolute', top: 0, left: 6, right: 6, height: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.32)' }, flex: { flex: 1 }, label: { ...theme.typography.bodyBold, color: theme.colors.text }, itemSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 } });
