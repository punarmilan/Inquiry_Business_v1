import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OffersNavigator } from './OffersNavigator';
import { ServicesNavigator } from './ServicesNavigator';
import { PostNavigator } from './PostNavigator';
import { MoreNavigator } from './MoreNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import type { MainTabParamList } from './types';
import { theme } from '../theme';
import { useApp } from '../context/AppContext';
import { setTabBarHeight, tabBarTranslateY } from './hideTabBarOnScroll';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabBarButton = (props: BottomTabBarButtonProps) => (
  <PlatformPressable {...props} android_ripple={{ color: 'transparent', radius: 0, borderless: false }} />
);

export const MainTabNavigator: React.FC = () => {
  const { hasApprovedBusiness, t } = useApp();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 48 + insets.bottom;
  setTabBarHeight(tabBarHeight);

  const tabBarStyle = {
    position: 'absolute' as const,
    left: 0, right: 0, bottom: 0,
    height: tabBarHeight,
    paddingTop: 0,
    paddingBottom: insets.bottom,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ translateY: tabBarTranslateY }],
  };

  return <Tab.Navigator screenOptions={{
    headerShown: false,
    tabBarShowLabel: false,
    tabBarActiveTintColor: theme.colors.text,
    tabBarInactiveTintColor: theme.colors.text,
    tabBarStyle,
    tabBarIconStyle: { width: 30, height: 30 },
    tabBarItemStyle: { paddingVertical: 0 },
    tabBarButton: props => <TabBarButton {...props} />,
  }}>
    <Tab.Screen name="OffersTab" component={OffersNavigator} options={{
      title: t('navOffers'), tabBarAccessibilityLabel: t('navOffers'),
      tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-outline" size={28} color={color} />,
    }} />
    <Tab.Screen name="ServicesTab" component={ServicesNavigator} options={{
      title: t('navServices'), tabBarAccessibilityLabel: t('navServices'),
      tabBarIcon: ({ color }) => <MaterialCommunityIcons name="tools" size={27} color={color} />,
    }} />
    {hasApprovedBusiness ? <Tab.Screen name="PostTab" component={PostNavigator} options={{
      title: t('navPost'), tabBarAccessibilityLabel: t('navPost'),
      tabBarIcon: ({ color }) => <MaterialCommunityIcons name="plus-box-outline" size={28} color={color} />,
    }} /> : null}
    <Tab.Screen name="MoreTab" component={MoreNavigator} options={{
      title: t('navMore'), tabBarAccessibilityLabel: t('navMore'),
      tabBarIcon: ({ color }) => <MaterialCommunityIcons name="menu" size={30} color={color} />,
    }} />
    <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{
      title: t('navProfile'), tabBarAccessibilityLabel: t('navProfile'),
      tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-outline" size={29} color={color} />,
    }} />
  </Tab.Navigator>;
};
