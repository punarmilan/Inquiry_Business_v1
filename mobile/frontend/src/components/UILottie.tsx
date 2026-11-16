import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Text, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { UIBlock, UILocale } from '../types/dynamicUI';
import { useUIConfig } from '../hooks/useUIConfig';
import { useDynamicTheme } from '../context/DynamicThemeProvider';
import { loadUIAnimation } from '../services/uiAnimations';

const Player = lazy(() => import('lottie-react-native'));
export type UIPlaybackResult = 'finished' | 'unavailable';
class PlayerBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode; onFailure?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function UILottie({ block, locale, staticFallback, style, enabled = true, onPlaybackEnd }: { block: UIBlock; locale: UILocale; staticFallback?: React.ReactNode; style?: StyleProp<ViewStyle>; enabled?: boolean; onPlaybackEnd?: (result: UIPlaybackResult) => void }) {
  const { state } = useUIConfig();
  const theme = useDynamicTheme();
  const focused = useIsFocused();
  const window = useWindowDimensions();
  const container = useRef<View>(null);
  const player = useRef<LottieView>(null);
  const loops = useRef(0);
  const playbackEnd = useRef(onPlaybackEnd);
  playbackEnd.current = onPlaybackEnd;
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [visible, setVisible] = useState(false);
  const [animation, setAnimation] = useState<AnimationObject | null>(null);
  const [completed, setCompleted] = useState(false);
  const asset = block.type === 'lottie' ? state.config.assets[block.props.assetId] : null;
  useEffect(() => {
    if (enabled && !asset) playbackEnd.current?.('unavailable');
  }, [asset, enabled]);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', (value) => setForeground(value === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    setAnimation(null); setCompleted(false); loops.current = 0;
  }, [asset?.id, asset?.sha256]);
  useEffect(() => {
    if (!enabled || !focused || !foreground || reduced) return;
    const measure = () => container.current?.measureInWindow((x, y, width, height) => setVisible(width > 0 && height > 0 && x < window.width && x + width > 0 && y < window.height && y + height > 0));
    measure(); const interval = setInterval(measure, 500);
    return () => { clearInterval(interval); setVisible(false); };
  }, [enabled, focused, foreground, reduced, window.width, window.height]);
  useEffect(() => {
    let mounted = true;
    if (enabled && asset && focused && foreground && visible && !reduced) void loadUIAnimation(asset).then((value) => { if (mounted) setAnimation(value); }).catch(() => { if (mounted) playbackEnd.current?.('unavailable'); });
    return () => { mounted = false; };
  }, [asset?.id, asset?.sha256, enabled, focused, foreground, visible, reduced]);
  useEffect(() => {
    if (enabled && animation && focused && foreground && visible && !reduced) player.current?.resume();
    else player.current?.pause();
  }, [animation, enabled, focused, foreground, visible, reduced]);
  if (block.type !== 'lottie') return null;
  const props = block.props;
  const fallback = staticFallback || <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md }}><Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{props.fallback[locale] || props.fallback.en}</Text></View>;
  const active = enabled && animation && focused && foreground && visible && !reduced && !completed;
  return <View ref={container} pointerEvents="none" style={[{ width: props.width || 160, height: props.height || 120, maxWidth: '100%', alignSelf: props.alignment === 'left' ? 'flex-start' : props.alignment === 'right' ? 'flex-end' : 'center' }, style]}>
    {active ? <PlayerBoundary key={`${asset?.id}:${asset?.sha256}`} fallback={fallback} onFailure={() => playbackEnd.current?.('unavailable')}><Suspense fallback={fallback}>
      <Player ref={player} source={animation} autoPlay loop={false} speed={props.speed || 1} style={{ width: '100%', height: '100%' }} resizeMode="contain"
        onAnimationFailure={() => { setAnimation(null); playbackEnd.current?.('unavailable'); }} onAnimationFinish={(cancelled) => {
          if (cancelled) return;
          loops.current += 1;
          if (props.loop && loops.current < (props.loopCount || 1)) player.current?.play();
          else { setCompleted(true); playbackEnd.current?.('finished'); }
        }} />
    </Suspense></PlayerBoundary> : fallback}
  </View>;
}
