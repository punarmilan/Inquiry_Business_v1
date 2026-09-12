import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandedLaunchScreen } from './src/components/BrandedLaunchScreen';

const BRANDED_LAUNCH_DURATION_MS = 2400;

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [showBrandedLaunch, setShowBrandedLaunch] = useState(true);

  const handleBrandedLaunchReady = useCallback(() => {
    SplashScreen.hide();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBrandedLaunch(false), BRANDED_LAUNCH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style={showBrandedLaunch ? 'light' : 'dark'} hidden={showBrandedLaunch} />
          {showBrandedLaunch ? (
            <BrandedLaunchScreen onReady={handleBrandedLaunchReady} />
          ) : (
            <RootNavigator />
          )}
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
