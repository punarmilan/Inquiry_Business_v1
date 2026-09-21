import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { setRequestLifecycleHandlers } from '../services/api';
import { LogoLoader } from './LogoLoader';
import { createThemedStyles } from '../theme';

interface GlobalLoadingHostProps {
  active?: boolean;
}

const SHOW_DELAY_MS = 110;
const MIN_VISIBLE_MS = 360;

export const GlobalLoadingHost: React.FC<GlobalLoadingHostProps> = ({ active = false }) => {
  const [requestCount, setRequestCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRequestLifecycleHandlers({
      onRequestStart: () => setRequestCount((count) => count + 1),
      onRequestEnd: () => setRequestCount((count) => Math.max(0, count - 1)),
    });

    return () => {
      setRequestLifecycleHandlers({});
    };
  }, []);

  const shouldShow = active || requestCount > 0;

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (shouldShow) {
      if (visible || showTimerRef.current) return;
      showTimerRef.current = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
        showTimerRef.current = null;
      }, SHOW_DELAY_MS);
      return;
    }

    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (!visible) return;

    const visibleFor = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - visibleFor);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, remaining);
  }, [shouldShow, visible]);

  useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    []
  );

  if (!visible) return null;

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      <LogoLoader />
    </View>
  );
};

const styles = createThemedStyles((c) => ({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 247, 241, 0.86)',
  },
}));
