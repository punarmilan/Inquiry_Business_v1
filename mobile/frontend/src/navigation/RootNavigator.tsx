import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import type { NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { useApp } from '../context/AppContext';
import { theme, createThemedStyles } from '../theme';
import { GlobalLoadingHost } from '../components/GlobalLoadingHost';
import { LogoLoader } from '../components/LogoLoader';
import { WelcomeModal } from '../components/WelcomeModal';
import { AnnouncementModal } from '../components/AnnouncementModal';

const Stack = createNativeStackNavigator<RootStackParamList>();
const ROUTE_LOADING_MS = 430;

export const RootNavigator: React.FC = () => {
  const {
    isAuthenticated,
    isBootstrapping,
    currentUser,
    welcome,
    dismissWelcome,
    shouldShowAnnouncement,
    dismissAnnouncement,
    remoteSettings,
    themeMode,
  } = useApp();
  const announcement = remoteSettings['mobile.loginAnnouncement'];
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Switching theme remounts the navigator (so every themed style sheet is
  // rebuilt); replaying this state keeps the user on the screen they were on.
  const navigationStateRef = useRef<NavigationState | undefined>(undefined);

  const handleNavigationChange = useCallback((state?: NavigationState) => {
    navigationStateRef.current = state;
    if (routeLoadingTimerRef.current) {
      clearTimeout(routeLoadingTimerRef.current);
    }
    setIsRouteLoading(true);
    routeLoadingTimerRef.current = setTimeout(() => {
      setIsRouteLoading(false);
      routeLoadingTimerRef.current = null;
    }, ROUTE_LOADING_MS);
  }, []);

  useEffect(
    () => () => {
      if (routeLoadingTimerRef.current) {
        clearTimeout(routeLoadingTimerRef.current);
      }
    },
    []
  );

  // Restoring a saved session (see AppContext) takes a beat — hold here instead of
  // flashing the login screen first and then jumping to Main once it resolves.
  if (isBootstrapping) {
    return (
      <View style={styles.splash}>
        <LogoLoader size={48} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer
        key={themeMode}
        initialState={navigationStateRef.current}
        theme={themeMode === 'dark'
          ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.background, card: theme.colors.surface, text: theme.colors.text, border: theme.colors.border, primary: theme.colors.primary } }
          : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.surface, text: theme.colors.text, border: theme.colors.border, primary: theme.colors.primary } }}
        onStateChange={handleNavigationChange}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainTabNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <GlobalLoadingHost active={isRouteLoading} />
      {isAuthenticated && welcome ? (
        <WelcomeModal
          visible
          name={welcome.name}
          isNewUser={welcome.isNewUser}
          onClose={dismissWelcome}
        />
      ) : null}
      {isAuthenticated && !welcome && shouldShowAnnouncement && announcement ? (
        <AnnouncementModal visible announcement={announcement} onClose={dismissAnnouncement} />
      ) : null}
    </View>
  );
};

const styles = createThemedStyles((c) => ({
  container: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
  },
}));
