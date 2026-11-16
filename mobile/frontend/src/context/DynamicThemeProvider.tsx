import React, { createContext, useContext, useLayoutEffect, useMemo } from 'react';
import { theme, setThemeOverrides } from '../theme';
import { useApp } from './AppContext';
import { useUIConfig } from '../hooks/useUIConfig';

const DynamicThemeContext = createContext(theme);
export const DynamicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useUIConfig();
  const { themeMode, themeRevision } = useApp();
  const modes = state.config.enabled && !state.config.useNativeFallback ? state.config.base.theme.modes : null;
  useLayoutEffect(() => { setThemeOverrides(modes); }, [modes]);
  useLayoutEffect(() => () => { setThemeOverrides(null); }, []);
  const resolved = useMemo(() => ({ ...theme, colors: { ...theme.colors } }), [themeMode, themeRevision]);
  return <DynamicThemeContext.Provider value={resolved}>{children}</DynamicThemeContext.Provider>;
};
export const useDynamicTheme = () => useContext(DynamicThemeContext);
