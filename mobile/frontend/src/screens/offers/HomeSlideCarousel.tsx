import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { UIHomeMedia } from '../../components/UIHomeMedia';
import type { UIPlaybackResult } from '../../components/UILottie';
import type { HomePromoProps } from './HomePromoCarousel';
import type { UIHomeCard } from '../../types/dynamicUI';
import { defaultHomeCards, homeCardShowsCopy, homeCopy } from '../../utils/uiHome';
import { DEFAULT_HOME_HEADER } from '../../utils/uiHomeHeader';
import { homeHeaderGeometry } from '../../utils/homeHeaderGeometry';
import { createThemedStyles } from '../../theme';
import { openHomeLink } from '../../services/homeLinks';

const fallbackCards = defaultHomeCards().filter(card => card.props.placement === 'promo');
const icons = { offers: 'tag-outline', post: 'plus', events: 'calendar-month', services: 'tools', support: 'store-outline', moreDeals: 'shopping-outline' } as const;

export function HomeSlideCarousel({ cards, settings = DEFAULT_HOME_HEADER, onCardPress, onOffers, onServices, onPost, onEvents }: HomePromoProps) {
  const { language, t } = useApp();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const promos = useMemo(() => (cards || fallbackCards).filter(card => !card.hidden), [cards]);
  const identities = promos.map(card => card.id).join(',');
  const geometry = homeHeaderGeometry(width, settings, promos.length);
  const [index, setIndex] = useState(0);
  const [settled, setSettled] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [playRun, setPlayRun] = useState(0);
  const [ended, setEnded] = useState<{ key: string; result: UIPlaybackResult } | null>(null);
  const indexRef = useRef(0), generation = useRef(0), moving = useRef(false), mounted = useRef(true);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const travel = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const current = promos[index % promos.length];
  const playKey = `${current?.id}:${current?.props.assetId}:${current?.props.speed}:${current?.props.loopCount}:${playRun}`;
  const waitsForMedia = current?.props.media === 'lottie' && Boolean(current.props.assetId);
  const mediaResult = ended?.key === playKey ? ended.result : null;
  const actions = { offers: onOffers, post: onPost, events: onEvents, services: onServices };
  const open = (card: UIHomeCard) => {
    if (moving.current) return;
    if (onCardPress) onCardPress(card);
    else if (card.props.homeAction === 'link') void openHomeLink(card.props.linkUrl, language);
    else actions[card.props.homeAction || 'offers']();
  };
  const advance = useCallback((direction: number) => {
    if (moving.current || promos.length < 2) return;
    const run = ++generation.current;
    const next = (indexRef.current + direction + promos.length) % promos.length;
    const commit = () => { indexRef.current = next; setIndex(next); setPlayRun(value => value + 1); };
    if (reduceMotion) { commit(); return; }
    moving.current = true; setSettled(false);
    animation.current = Animated.timing(settings.transition === 'fade' ? opacity : travel, {
      toValue: settings.transition === 'fade' ? 0 : -direction * geometry.stride,
      duration: settings.transition === 'fade' ? 160 : 380, useNativeDriver: true, isInteraction: false,
    });
    animation.current.start(({ finished }) => {
      if (!finished || !mounted.current || run !== generation.current) return;
      commit(); travel.setValue(0);
      if (settings.transition !== 'fade') { moving.current = false; setSettled(true); return; }
      animation.current = Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true, isInteraction: false });
      animation.current.start(({ finished: shown }) => {
        if (!mounted.current || run !== generation.current) return;
        moving.current = false; if (shown) setSettled(true);
      });
    });
  }, [geometry.stride, opacity, promos.length, reduceMotion, settings.transition, travel]);

  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted.current) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const activity = AppState.addEventListener('change', setAppState);
    return () => { mounted.current = false; generation.current++; animation.current?.stop(); motion.remove(); activity.remove(); };
  }, []);
  useEffect(() => {
    generation.current++; animation.current?.stop(); moving.current = false; travel.setValue(0); opacity.setValue(1); setSettled(true);
    indexRef.current = 0; setIndex(0); setPlayRun(value => value + 1);
  }, [identities, width, settings.style, settings.height, settings.transition, opacity, travel]);
  useEffect(() => {
    if (focused && appState === 'active' && !reduceMotion) return;
    generation.current++; animation.current?.stop(); moving.current = false; travel.setValue(0); opacity.setValue(1); setSettled(true);
  }, [focused, appState, reduceMotion, opacity, travel]);
  useEffect(() => {
    if (!settings.autoPlay || !focused || appState !== 'active' || reduceMotion || !settled || promos.length < 2 || (waitsForMedia && !mediaResult)) return;
    const timer = setTimeout(() => advance(1), waitsForMedia && mediaResult === 'finished' ? 350 : settings.intervalSeconds * 1000);
    return () => clearTimeout(timer);
  }, [advance, appState, focused, mediaResult, playKey, promos.length, reduceMotion, settled, settings.autoPlay, settings.intervalSeconds, waitsForMedia]);

  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dx) > 25) advance(gesture.dx < 0 ? 1 : -1); },
  });
  if (!promos.length) return null;
  const overlay = settings.style === 'photoCarousel';
  const split = settings.style === 'splitCarousel';
  return <View style={styles.root}>
    <View style={[styles.viewport, { height: geometry.height }]} {...swipe.panHandlers}>
      <Animated.View style={{ flexDirection: 'row', gap: geometry.gap, width: geometry.stride * (promos.length === 1 ? 1 : 4), opacity, transform: [{ translateX: Animated.add(travel, geometry.origin) }] }}>
        {(promos.length === 1 ? [0] : [-1, 0, 1, 2]).map(offset => {
          const card = promos[(index + offset + promos.length) % promos.length];
          const active = offset === 0;
          const showCopy = homeCardShowsCopy(card);
          const ink = card.style?.color || '#08152F';
          const fill = card.style?.backgroundColor || '#D3F2E1';
          return <View key={offset} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
            style={{ width: geometry.cardWidth, height: geometry.height, transform: [{ scale: active || settings.style === 'heroShortcuts' ? 1 : 0.9 }] }}>
            <Pressable accessibilityRole={card.props.homeAction === 'link' ? 'link' : 'button'} accessibilityLabel={homeCopy(card.props.title, language)} onPress={() => open(card)}
              style={({ pressed }) => [styles.card, { backgroundColor: fill, borderRadius: card.style?.borderRadius ?? 24, opacity: pressed ? 0.8 : 1 }]}>
              <UIHomeMedia key={`${card.id}:${active ? playKey : offset}`} card={card} expandedCard active={active && settled && focused && appState === 'active'}
                onPlaybackEnd={active ? result => setEnded({ key: playKey, result }) : undefined}
                style={[StyleSheet.absoluteFill, split && showCopy ? { right: '52%' } : {}]} />
              {showCopy && <View pointerEvents="none" style={[styles.copy, split ? { left: '48%', width: '52%', backgroundColor: fill } : overlay ? { width: '100%' } : { width: '60%', backgroundColor: fill }]}>
                <MaterialCommunityIcons name={icons[card.props.bundled]} size={18} color={ink} />
                {card.props.badge ? <Text numberOfLines={1} style={[styles.badge, { color: ink }]}>{homeCopy(card.props.badge, language)}</Text> : null}
                <Text numberOfLines={2} style={[styles.title, { color: ink }]}>{homeCopy(card.props.title, language)}</Text>
                {card.props.subtitle ? <Text numberOfLines={2} style={[styles.caption, { color: ink }]}>{homeCopy(card.props.subtitle, language)}</Text> : null}
                <View style={[styles.cta, overlay && { backgroundColor: '#FFFFFF' }]}><Text numberOfLines={1} style={[styles.ctaText, overlay && { color: '#08152F' }]}>{homeCopy(card.props.buttonLabel, language, t('navExplore'))}</Text><MaterialCommunityIcons name="arrow-right" color={overlay ? '#08152F' : '#FFFFFF'} size={16} /></View>
              </View>}
            </Pressable>
          </View>;
        })}
      </Animated.View>
    </View>
    {settings.showArrows && promos.length > 1 && <View pointerEvents="box-none" style={[styles.arrows, { top: geometry.height / 2 - 18 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('homePreviousCard')} onPress={() => advance(-1)} style={styles.arrow}><MaterialCommunityIcons name="chevron-left" size={25} color="#075662" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('homeNextCard')} onPress={() => advance(1)} style={styles.arrow}><MaterialCommunityIcons name="chevron-right" size={25} color="#075662" /></Pressable>
    </View>}
    {settings.showDots && <View style={styles.dots}>{promos.map((card, position) => <View key={card.id} style={[styles.dot, position === index && styles.activeDot]} />)}</View>}
  </View>;
}

const styles = createThemedStyles(c => ({
  root: { paddingTop: 8 }, viewport: { marginHorizontal: 14, overflow: 'hidden', justifyContent: 'center' },
  card: { flex: 1, borderWidth: 3, borderColor: '#FFFFFF', overflow: 'hidden' },
  copy: { height: '100%', padding: 10, justifyContent: 'center', gap: 3 }, title: { fontSize: 21, fontWeight: '800', lineHeight: 23, flexShrink: 1 },
  caption: { fontSize: 10, lineHeight: 13, flexShrink: 1 }, badge: { fontSize: 8, fontWeight: '800' },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 20, backgroundColor: '#075662', paddingVertical: 5, paddingHorizontal: 9, marginTop: 3 },
  ctaText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', flexShrink: 1 },
  arrows: { position: 'absolute', left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 18, gap: 6 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border }, activeDot: { backgroundColor: c.primary },
}));
