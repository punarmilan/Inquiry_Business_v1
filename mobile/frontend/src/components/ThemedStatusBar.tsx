import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../context/AppContext';

/** Keeps the system status bar readable against the active theme. */
export const ThemedStatusBar: React.FC<{ hidden?: boolean; forceLight?: boolean }> = ({
  hidden = false,
  forceLight = false,
}) => {
  const { themeMode } = useApp();
  return <StatusBar style={forceLight || themeMode === 'dark' ? 'light' : 'dark'} hidden={hidden} />;
};
