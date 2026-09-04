import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProviderTabParamList } from './types';
import { ProviderHomeScreen } from '../screens/provider/ProviderHomeScreen';
import { ProviderDashboardScreen } from '../screens/provider/ProviderDashboardScreen';
import { ProviderProfileScreen } from '../screens/provider/ProviderProfileScreen';
import { ChatListScreen } from '../screens/profile/ChatListScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator<ProviderTabParamList>();

const TabBarButton = (props: BottomTabBarButtonProps) => (
  <PlatformPressable
    {...props}
    android_ripple={{ color: 'transparent', radius: 0, borderless: false }}
  />
);

export const ProviderTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    position: 'absolute' as const,
    left: 12,
    right: 12,
    bottom: Math.max(insets.bottom, 8),
    height: 70,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 23,
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  };

  return (
    <Tab.Navigator
      initialRouteName="ProviderHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle,
        tabBarLabelStyle: styles.label,
        tabBarButton: (props) => <TabBarButton {...props} />,
      }}
    >
      <Tab.Screen name="ProviderHome" component={ProviderHomeScreen} options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size, focused }) => <TabIcon name="home-variant" color={color} size={size} focused={focused} /> }} />
      <Tab.Screen name="ProviderMessages" component={ChatListScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Messages', tabBarIcon: ({ color, size, focused }) => <TabIcon name="message-text-outline" color={color} size={size} focused={focused} /> }} />
      <Tab.Screen name="ProviderDashboard" component={ProviderDashboardScreen} options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color, size, focused }) => <TabIcon name="chart-box-outline" color={color} size={size} focused={focused} /> }} />
      <Tab.Screen name="ProviderProfile" component={ProviderProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, size, focused }) => <TabIcon name="account-circle-outline" color={color} size={size} focused={focused} /> }} />
    </Tab.Navigator>
  );
};

const TabIcon: React.FC<{ name: keyof typeof MaterialCommunityIcons.glyphMap; color: string; size: number; focused: boolean }> = ({ name, color, size, focused }) => (
  <View style={[styles.icon, focused && styles.iconActive]}>
    <MaterialCommunityIcons name={name} color={color} size={size} />
  </View>
);

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '800', marginTop: 1 },
  icon: { width: 38, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  iconActive: { backgroundColor: theme.colors.primaryLight },
});
