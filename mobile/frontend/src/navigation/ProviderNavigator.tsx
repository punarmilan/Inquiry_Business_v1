import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProviderStackParamList } from './types';
import { ProviderTabNavigator } from './ProviderTabNavigator';
import { ChatThreadScreen } from '../screens/profile/ChatThreadScreen';
import { ProviderNotificationsScreen } from '../screens/provider/ProviderNotificationsScreen';
import { LiveLocationScreen } from '../screens/job/LiveLocationScreen';

const Stack = createNativeStackNavigator<ProviderStackParamList>();

export const ProviderNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProviderTabs" component={ProviderTabNavigator} />
    <Stack.Screen name="ChatThread" component={ChatThreadScreen as React.ComponentType<any>} />
    <Stack.Screen name="ProviderNotifications" component={ProviderNotificationsScreen} />
    <Stack.Screen name="LiveLocation" component={LiveLocationScreen as React.ComponentType<any>} />
  </Stack.Navigator>
);
