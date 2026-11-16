import React, { createContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './AppContext';
import { API_BASE_URL, fetchUIRuntime } from '../services/api';
import { createUIRuntimeStore, type UIConfigState } from '../services/uiRuntime';
import { defaultUIRuntime } from '../utils/dynamicUI';
import type { UILocale } from '../types/dynamicUI';
import { getUICity, getUICityRevision, setUICity, subscribeUICity } from '../services/uiCampaignLocation';

const initial: UIConfigState = { config: defaultUIRuntime(), source: 'default', loading: false, error: null, etag: null };
export const UIConfigContext = createContext<{ state: UIConfigState; locale: UILocale; refresh: () => Promise<UIConfigState> }>({
  state: initial, locale: 'en', refresh: () => Promise.resolve(initial),
});

export const UIConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useApp();
  const cityId = useSyncExternalStore(subscribeUICity, getUICity, getUICity);
  // Keep children/navigation mounted; only the scoped metadata store changes.
  const store = useMemo(() => createUIRuntimeStore({ scope: `${API_BASE_URL}:city:${cityId || 'all'}`, cityId, locale: language, storage: AsyncStorage, fetchRuntime: fetchUIRuntime }), [cityId]);
  useEffect(() => {
    let mounted = true;
    const initialRevision = getUICityRevision();
    void AsyncStorage.getItem('inquiryexperts_hyperlocal_location').then((raw) => {
      if (mounted && getUICityRevision() === initialRevision && raw) setUICity(JSON.parse(raw)?.city?._id);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    void store.start();
    const subscription = AppState.addEventListener('change', (next) => {
      store.expire();
      if (next === 'active') void store.refresh();
    });
    const interval = setInterval(() => {
      store.expire();
      if (AppState.currentState === 'active') void store.refresh();
    }, 60_000);
    return () => { subscription.remove(); clearInterval(interval); store.stop(); };
  }, [store]);
  useEffect(() => { void store.setLocale(language); }, [store, language]);
  useEffect(() => {
    const timer = setTimeout(() => { store.expire(); if (AppState.currentState === 'active') void store.refresh(); }, store.nextRefreshDelay());
    return () => clearTimeout(timer);
  }, [store, state]);
  return <UIConfigContext.Provider value={{ state, locale: language, refresh: store.refresh }}>{children}</UIConfigContext.Provider>;
};
