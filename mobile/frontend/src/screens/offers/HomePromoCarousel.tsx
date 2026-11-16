import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { createThemedStyles } from '../../theme';
import type { UIHomeCard, UIHomeHeader } from '../../types/dynamicUI';
import { defaultHomeCards, homeCardShowsCopy, homeCopy } from '../../utils/uiHome';
import { UIHomeMedia } from '../../components/UIHomeMedia';
import type { UIPlaybackResult } from '../../components/UILottie';
import { DEFAULT_HOME_HEADER } from '../../utils/uiHomeHeader';
import { HomeSlideCarousel } from './HomeSlideCarousel';
import { openHomeLink } from '../../services/homeLinks';

const fallbackCards = defaultHomeCards().filter(card => card.props.placement === 'promo');
const CARD_GAP = 3;

export type HomePromoProps = {
  cards?: UIHomeCard[];
  settings?: UIHomeHeader; onCardPress?: (card: UIHomeCard) => void;
  onOffers: () => void; onServices: () => void; onPost: () => void; onEvents: () => void;
};
export const HomePromoCarousel = (props: HomePromoProps) => (props.settings?.style || 'accordion') === 'accordion'
  ? <AccordionCarousel {...props} /> : <HomeSlideCarousel {...props} />;

export const AccordionCarousel = ({ onOffers, onServices, onPost, onEvents, cards, onCardPress, settings = DEFAULT_HOME_HEADER }: HomePromoProps) => {
  const { t, language } = useApp();
  const promos = useMemo(() => (cards || fallbackCards).filter(card => !card.hidden).map(card => ({
    key: card.id, card, title: homeCopy(card.props.title, language), caption: homeCopy(card.props.subtitle, language),
    color: card.style?.backgroundColor || '#D3F2E1', ink: { offers: '#064D56', post: '#1873BB', events: '#673AC3', services: '#FF6927', support: '#086C6F', moreDeals: '#086C6F' }[card.props.bundled], textColor: card.style?.color || '#08152F',
  })), [cards, language]);
  const identities = promos.map(promo => promo.key).join(',');
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [start, setStart] = useState(0);
  const [settled, setSettled] = useState(true);
  const [playbackRun, setPlaybackRun] = useState(0);
  const [endedMedia, setEndedMedia] = useState<{ key: string; result: UIPlaybackResult } | null>(null);
  const startRef = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const moving = useRef(false);
  const transitionGeneration = useRef(0);
  const mounted = useRef(true);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const expansion = useRef(new Animated.Value(1)).current;
  const travel = useRef(new Animated.Value(0)).current;
  const count = Math.min(4, Math.max(1, promos.length));
  const available = width - 28 - CARD_GAP * (count - 1);
  const largeWidth = available * (count === 1 ? 1 : count === 2 ? 0.62 : count === 3 ? 0.5 : 0.44);
  const smallWidth = count === 1 ? available : (available - largeWidth) / (count - 1);
  const largeHeight = Math.max(190, width * 0.45) * ({ small: 0.85, medium: 1, large: 1.15 }[settings.height]);
  const smallHeight = largeHeight * 0.85;
  const stride = smallWidth + CARD_GAP;
  const currentPromo = promos[start % promos.length];
  const playbackKey = `${currentPromo?.key}:${currentPromo?.card.props.assetId}:${currentPromo?.card.props.speed}:${currentPromo?.card.props.loopCount}:${playbackRun}`;
  const waitsForMedia = currentPromo?.card.props.media === 'lottie' && Boolean(currentPromo.card.props.assetId);
  const mediaResult = endedMedia?.key === playbackKey ? endedMedia.result : null;

  const advance = useCallback((direction: number) => {
    if (moving.current || promos.length < 2) return;
    const generation = ++transitionGeneration.current;
    setPlaybackRun(run => run + 1);
    const next = (startRef.current + direction + promos.length) % promos.length;
    if (reduceMotion) {
      startRef.current = next; setStart(next); return;
    }
    moving.current = true;
    setSettled(false);
    const grow = () => {
      if (!mounted.current || generation !== transitionGeneration.current) return;
      startRef.current = next;
      setStart(next);
      travel.setValue(0);
      expansion.setValue(0);
      animation.current = Animated.timing(expansion, {
        toValue: 1, duration: 650, easing: Easing.out(Easing.cubic),
        useNativeDriver: false, isInteraction: false,
      });
      animation.current.start(({ finished }) => {
        if (generation !== transitionGeneration.current) return;
        moving.current = false;
        if (finished && mounted.current) setSettled(true);
      });
    };
    // The incoming card stays small during travel, then grows after landing.
    const shrink = Animated.timing(expansion, { toValue: 0, duration: 220, useNativeDriver: false, isInteraction: false });
    if (direction > 0) {
      animation.current = Animated.sequence([shrink, Animated.timing(travel, {
        toValue: -stride, duration: 1_000, easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false, isInteraction: false,
      })]);
      animation.current.start(({ finished }) => { if (finished) grow(); });
    } else {
      animation.current = shrink;
      shrink.start(({ finished }) => {
        if (!finished || !mounted.current || generation !== transitionGeneration.current) return;
        startRef.current = next; setStart(next); travel.setValue(-stride);
        requestAnimationFrame(() => {
          if (!mounted.current || generation !== transitionGeneration.current) return;
          animation.current = Animated.timing(travel, { toValue: 0, duration: 1_000,
            easing: Easing.inOut(Easing.cubic), useNativeDriver: false, isInteraction: false });
          animation.current.start(({ finished: landed }) => { if (landed) grow(); });
        });
      });
    }
  }, [expansion, promos.length, reduceMotion, stride, travel]);

  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted.current) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const activity = AppState.addEventListener('change', setAppState);
    return () => { mounted.current = false; transitionGeneration.current += 1; animation.current?.stop(); motion.remove(); activity.remove(); };
  }, []);
  useEffect(() => {
    if (!settings.autoPlay || !isFocused || appState !== 'active' || reduceMotion || !settled || promos.length < 2) return;
    if (waitsForMedia && !mediaResult) return;
    // Schedule from completion, never from a repeating wall-clock interval.
    const timer = setTimeout(() => advance(1), waitsForMedia && mediaResult === 'finished' ? 350 : settings.intervalSeconds * 1000);
    return () => clearTimeout(timer);
  }, [advance, appState, isFocused, mediaResult, playbackKey, promos.length, reduceMotion, settled, waitsForMedia, settings.autoPlay, settings.intervalSeconds]);
  useEffect(() => {
    if (isFocused && appState === 'active' && !reduceMotion) return;
    transitionGeneration.current += 1;
    animation.current?.stop(); moving.current = false; travel.setValue(0); expansion.setValue(1);
    setSettled(true);
  }, [appState, expansion, isFocused, reduceMotion, travel]);
  useEffect(() => {
    transitionGeneration.current += 1;
    animation.current?.stop(); moving.current = false; travel.setValue(0); expansion.setValue(1);
    setSettled(true);
  }, [expansion, travel, width, settings.height]);
  useEffect(() => {
    transitionGeneration.current += 1;
    animation.current?.stop(); moving.current = false; startRef.current = 0; setStart(0); travel.setValue(0); expansion.setValue(1);
    setSettled(true);
  }, [expansion, identities, travel]);
  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dx) > 25) advance(gesture.dx < 0 ? 1 : -1); },
  });
  const actions = { offers: onOffers, post: onPost, events: onEvents, services: onServices };
  if (!promos.length) return null;
  return <View style={styles.root}>
    <View style={[styles.viewport, { height: largeHeight + 6 }]} {...swipe.panHandlers}>
      <Animated.View style={[styles.rail, { transform: [{ translateX: travel }] }]}>
        {Array.from({ length: promos.length === 1 ? 1 : Math.min(5, promos.length + 1) }, (_, offset) => {
          const promo = promos[(start + offset) % promos.length];
          const active = offset === 0;
          return <Animated.View key={offset} accessibilityElementsHidden={offset >= count}
            importantForAccessibility={offset >= count ? 'no-hide-descendants' : 'auto'} style={{
            width: active ? expansion.interpolate({ inputRange: [0, 1], outputRange: [smallWidth, largeWidth] }) : smallWidth,
            height: active ? expansion.interpolate({ inputRange: [0, 1], outputRange: [smallHeight, largeHeight] }) : smallHeight,
          }}>
            <Pressable accessibilityRole={promo.card.props.homeAction === 'link' ? 'link' : 'button'} accessibilityLabel={promo.title}
              onPress={() => { if (!moving.current) { if (onCardPress) onCardPress(promo.card); else if (promo.card.props.homeAction === 'link') void openHomeLink(promo.card.props.linkUrl, language); else actions[promo.card.props.homeAction || 'offers'](); } }} style={({ pressed }) => [styles.card, active && styles.activeCard, { backgroundColor: promo.color, borderRadius: promo.card.style?.borderRadius ?? (active ? 25 : 19) }, pressed && styles.pressed]}>
              <UIHomeMedia key={`${promo.key}:${active ? playbackKey : 'preview'}`} card={promo.card} active={active && settled} expandedCard={active}
                onPlaybackEnd={active ? result => setEndedMedia({ key: playbackKey, result }) : undefined}
                style={!homeCardShowsCopy(promo.card) || (active && promo.card.props.media !== 'lottie') ? styles.fullArtwork : active && promo.card.props.media === 'lottie' ? styles.animationArtwork : styles.artwork} />
              {homeCardShowsCopy(promo.card) ? <View style={[styles.copy, active && styles.activeCopy]}>
                {active && promo.card.props.badge ? <View style={styles.dealPill}><Text style={styles.dealText}>{homeCopy(promo.card.props.badge, language)}</Text></View> : null}
                <Animated.Text numberOfLines={2} style={[styles.title, { color: promo.textColor }, active && styles.activeTitle, active && {
                  fontSize: expansion.interpolate({ inputRange: [0, 1], outputRange: [11, 19] }),
                  lineHeight: expansion.interpolate({ inputRange: [0, 1], outputRange: [12, 20] }),
                }]}>{active ? promo.title.replace(' ', '\n') : promo.title}</Animated.Text>
                {active ? <Animated.Text numberOfLines={2} style={[styles.caption, { color: promo.textColor }, styles.activeCaption, {
                  fontSize: expansion.interpolate({ inputRange: [0, 1], outputRange: [7, 9] }),
                  lineHeight: expansion.interpolate({ inputRange: [0, 1], outputRange: [9, 11] }),
                }]}>{promo.caption}</Animated.Text> : <View style={styles.smallCaption}>
                  {homeCopy(promo.card.props.compactSubtitle, language, promo.caption).split('\n').map((line, index) => <Text key={index} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.smallCaptionLine, { color: promo.textColor }, index > 0 && styles.smallCaptionLast]}>{line}</Text>)}
                </View>}
                <View style={[styles.cta, { backgroundColor: promo.ink }, active && styles.activeCta]}>
                  {active ? <Text numberOfLines={1} style={styles.ctaText}>{homeCopy(promo.card.props.buttonLabel, language, t('navExplore'))}</Text> : null}
                  <MaterialCommunityIcons name="arrow-right" size={active ? 17 : 14} color="#FFFFFF" />
                </View>
              </View> : null}
            </Pressable>
          </Animated.View>;
        })}
      </Animated.View>
    </View>
    {settings.showArrows && promos.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={t('homePreviousCard')} onPress={() => advance(-1)} style={[styles.arrow, styles.previous]}><MaterialCommunityIcons name="chevron-left" size={25} color="#075662" /></Pressable> : null}
    {settings.showArrows && promos.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={t('homeNextCard')} onPress={() => advance(1)} style={[styles.arrow, styles.next]}><MaterialCommunityIcons name="chevron-right" size={25} color="#075662" /></Pressable> : null}
    {settings.showDots && <View style={styles.dots}>{promos.map((promo, index) => <View key={promo.key} style={[styles.dot, index === start && styles.activeDot]} />)}</View>}
  </View>;
};

const styles = createThemedStyles(c => ({
  root: { paddingTop: 8 },
  viewport: { marginHorizontal: 14, overflow: 'hidden', justifyContent: 'center' },
  rail: { flexDirection: 'row', gap: CARD_GAP, alignItems: 'center' },
  card: { flex: 1, borderRadius: 19, borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden' },
  activeCard: { borderRadius: 25, borderWidth: 2.5 },
  artwork: { position: 'absolute', top: 0, width: '100%', height: '70%' },
  animationArtwork: { position: 'absolute', top: 0, width: '100%', height: '40%' },
  fullArtwork: { position: 'absolute', width: '100%', height: '100%' },
  copy: { position: 'absolute', bottom: 9, left: 6, right: 6 },
  activeCopy: { bottom: 10, left: 11, right: 8 },
  title: { color: '#08152F', fontSize: 11, lineHeight: 12, fontWeight: '800', letterSpacing: -0.3 },
  activeTitle: { fontSize: 19, lineHeight: 20, maxWidth: '90%' },
  caption: { color: '#122C43', fontSize: 6, lineHeight: 8, marginTop: 4, maxWidth: '100%', paddingRight: 18 },
  activeCaption: { fontSize: 9, lineHeight: 11, paddingRight: 0 },
  smallCaption: { minHeight: 18, marginTop: 4 },
  smallCaptionLine: { color: '#122C43', fontSize: 6, lineHeight: 9 },
  smallCaptionLast: { paddingRight: 18 },
  dealPill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 12, backgroundColor: '#008D86', marginBottom: 5 },
  dealText: { color: '#FFFFFF', fontSize: 7, fontWeight: '700' },
  cta: { position: 'absolute', right: -1, bottom: 0, width: 19, height: 19, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activeCta: { position: 'relative', right: undefined, bottom: undefined, width: undefined, height: 25, borderRadius: 15, flexDirection: 'row', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 10, marginTop: 5 },
  ctaText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  arrow: { position: 'absolute', top: '43%', width: 29, height: 29, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  previous: { left: 1 }, next: { right: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', height: 18, gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border },
  activeDot: { backgroundColor: c.primary },
}));
