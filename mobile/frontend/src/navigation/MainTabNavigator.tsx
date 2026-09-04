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
import { theme } from '../theme';
import { useApp } from '../context/AppContext';

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

export const MainTabNavigator: React.FC = () => {
  const { hasApprovedBusiness } = useApp();
  const insets = useSafeAreaInsets();
  const tabBarStyle = { position: 'absolute' as const, left: 0, right: 0, bottom: 0, height: 70 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, backgroundColor: theme.colors.surface, borderTopWidth: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: -5 }, shadowOpacity: 1, shadowRadius: 18, elevation: 10 };
  return <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: '#8A9094', tabBarStyle, tabBarLabelStyle: styles.label, tabBarButton: (props) => <TabBarButton {...props} /> }}>
    <Tab.Screen name="OffersTab" component={OffersNavigator} options={{ tabBarLabel: 'Offers', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tag-heart-outline" size={size} color={color} /> }} />
    <Tab.Screen name="ServicesTab" component={ServicesNavigator} options={{ tabBarLabel: 'Services', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tools" size={size} color={color} /> }} />
    {hasApprovedBusiness ? <Tab.Screen name="PostTab" component={PostNavigator} options={{ tabBarLabel: () => null, tabBarIcon: ({ focused }) => <View style={styles.postWrap}><View style={[styles.postCircle, focused && styles.postFocused]}><LinearGradient colors={[theme.colors.primaryBright, theme.colors.primaryDark]} start={{ x: 0.15, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.postGradient}><View pointerEvents="none" style={styles.postShine} /><MaterialCommunityIcons name="plus" size={25} color={theme.colors.textInverse} /></LinearGradient></View><Text style={styles.postLabel}>Post</Text></View> }} /> : null}
    <Tab.Screen name="MoreTab" component={MoreNavigator} options={{ tabBarLabel: 'More', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dots-grid" size={size} color={color} /> }} />
    <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} /> }} />
  </Tab.Navigator>;
};
const styles = StyleSheet.create({ label: { ...theme.typography.tiny, fontWeight: '800' }, postWrap: { alignItems: 'center', justifyContent: 'center', top: Platform.OS === 'ios' ? 0 : 1 }, postCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 7, shadowColor: theme.colors.primaryGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' }, postFocused: { backgroundColor: theme.colors.primaryDark }, postGradient: { ...StyleSheet.absoluteFill, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, postShine: { position: 'absolute', top: 3, left: 8, right: 8, height: 14, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.22)' }, postLabel: { ...theme.typography.tiny, color: theme.colors.primary, fontWeight: '900', marginTop: 1 } });
