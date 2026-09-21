import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OffersNavigator } from './OffersNavigator';
import { ServicesNavigator } from './ServicesNavigator';
import { PostNavigator } from './PostNavigator';
import { MoreNavigator } from './MoreNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import type { MainTabParamList } from './types';
import { theme, createThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';
import { setTabBarHeight, tabBarTranslateY } from './hideTabBarOnScroll';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Keep tab presses clean: navigation still works, but Android won't draw a
// ripple circle over the bottom bar.
const TabBarButton = (props: BottomTabBarButtonProps) => (
  <PlatformPressable
    {...props}
    android_ripple={{
      color: 'transparent',
      radius: 0,
      borderless: false,
    }}
  />
);

// Label plus the neon underline the active tab carries in the design.
const TabLabel = ({ label, focused, color }: { label: string; focused: boolean; color: string }) => (
  <View style={styles.labelWrap}>
    <Text numberOfLines={1} style={[styles.label, { color }]}>{label}</Text>
    <View style={[styles.indicator, focused && styles.indicatorActive]} />
  </View>
);

export const MainTabNavigator: React.FC = () => {
  const { hasApprovedBusiness, t } = useApp();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 82 + insets.bottom;
  // The Post tab's raised "+" circle (and its shadow) sticks up above the
  // bar's own bounds, so it needs extra travel to fully clear the screen
  // when hiding on scroll.
  setTabBarHeight(tabBarHeight + 40);
  const tabBarStyle = { position: 'absolute' as const, left: 0, right: 0, bottom: 0, height: tabBarHeight, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, backgroundColor: theme.colors.surface, borderTopWidth: 0, borderWidth: 1, borderColor: theme.colors.cardBorder, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, shadowColor: theme.colors.cardGlow, shadowOffset: { width: 0, height: -5 }, shadowOpacity: 1, shadowRadius: 18, elevation: 10, transform: [{ translateY: tabBarTranslateY }] };
  return <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textSecondary, tabBarStyle, tabBarLabelStyle: styles.label, tabBarButton: (props) => <TabBarButton {...props} /> }}>
    <Tab.Screen name="OffersTab" component={OffersNavigator} options={{ tabBarLabel: ({ focused, color }) => <TabLabel label={t('navOffers')} focused={focused} color={color} />, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tag" size={size} color={color} /> }} />
    <Tab.Screen name="ServicesTab" component={ServicesNavigator} options={{ tabBarLabel: ({ focused, color }) => <TabLabel label={t('navServices')} focused={focused} color={color} />, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tools" size={size} color={color} /> }} />
    {hasApprovedBusiness ? <Tab.Screen name="PostTab" component={PostNavigator} options={{ tabBarLabel: () => null, tabBarIcon: ({ focused }) => <View style={styles.postWrap}><View style={[styles.postCircle, focused && styles.postFocused]}><LinearGradient colors={[theme.colors.primaryBright, theme.colors.primaryDark]} start={{ x: 0.15, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.postGradient}><View pointerEvents="none" style={styles.postShine} /><MaterialCommunityIcons name="plus" size={38} color={theme.colors.textInverse} /></LinearGradient></View><Text style={styles.postLabel}>{t('navPost')}</Text></View> }} /> : null}
    <Tab.Screen name="MoreTab" component={MoreNavigator} options={{ tabBarLabel: ({ focused, color }) => <TabLabel label={t('navMore')} focused={focused} color={color} />, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dots-grid" size={size} color={color} /> }} />
    <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ tabBarLabel: ({ focused, color }) => <TabLabel label={t('navProfile')} focused={focused} color={color} />, tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} /> }} />
  </Tab.Navigator>;
};
const styles = createThemedStyles((c) => ({ labelWrap: { alignItems: 'center', gap: 3 }, label: { ...theme.typography.tiny, fontWeight: '800' }, indicator: { width: 40, height: 3, borderRadius: 2, backgroundColor: 'transparent' }, indicatorActive: { backgroundColor: c.primary, shadowColor: c.primaryGlow, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }, postWrap: { alignItems: 'center', justifyContent: 'center', top: -4 }, postCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: c.primary, borderWidth: 1.5, borderColor: c.primaryBright, alignItems: 'center', justifyContent: 'center', elevation: 7, shadowColor: c.primaryGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' }, postFocused: { backgroundColor: c.primaryDark }, postGradient: { ...StyleSheet.absoluteFill, borderRadius: 31, alignItems: 'center', justifyContent: 'center' }, postShine: { position: 'absolute', top: 3, left: 8, right: 8, height: 10, borderRadius: 99, backgroundColor: c.textInverse, opacity: 0.22 }, postLabel: { ...theme.typography.tiny, color: c.primary, fontWeight: '900', marginTop: 1 } }));
