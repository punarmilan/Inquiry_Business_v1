import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { LanguageToggle } from '../../components/LanguageToggle';
import { useApp } from '../../context/AppContext';
import { SCREEN_1, SCREEN_2, SCREEN_3 } from './OnboardingScreen.assets';
import type { OnboardingAsset } from './OnboardingScreen.assets';
import { ONBOARDING_COLORS } from './OnboardingScreen.styles';

type Props = {
  width: number;
  bottomInset: number;
  active: boolean;
  pageIndex: number;
  title: string;
  subtitle: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

// Coordinates follow the reference's 922 × 1660 inner canvas. Text and cards
// scale uniformly with width; vertical anchors adapt to the phone's height.
export const IllustratedOnboardingPage: React.FC<Props> = ({
  width,
  bottomInset,
  active,
  pageIndex,
  title,
  subtitle,
  onNext,
  onBack,
  onSkip,
}) => {
  const { language, t } = useApp();
  const [height, setHeight] = useState(0);
  const scale = width / 922;
  const styles = useMemo(() => createStyles(scale), [scale]);
  const contentHeight = Math.max(1, height - bottomInset);
  const y = (referenceY: number) => contentHeight * referenceY / 1660;
  const womanHeight = Math.min(contentHeight * 0.55, width * 1.24);
  const womanWidth = womanHeight * SCREEN_1.woman.bounds[2] / SCREEN_1.woman.bounds[3];
  const background = [SCREEN_1.background, SCREEN_2.background, SCREEN_3.background][pageIndex];
  const isLastPage = pageIndex === 2;
  const nextLabel = t(isLastPage ? 'onboardingGetStarted' : 'onboardingNext');

  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setHeight((previous) => previous === layout.height ? previous : layout.height);
  };

  return (
    <View
      testID={`onboarding-page-${pageIndex + 1}`}
      onLayout={onLayout}
      style={[styles.page, { width }]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {height > 0 ? (
        <>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Image
              source={background}
              resizeMode="cover"
              style={styles.backgroundImage}
              accessible={false}
            />
          </View>

          <View style={[styles.language, { top: y(53) }]}>
            <LanguageToggle onboarding />
          </View>
          {pageIndex > 0 ? (
            <Pressable
              testID={`onboarding-back-${pageIndex + 1}`}
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [styles.back, { top: y(53) }, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="arrow-left" size={52 * scale} color={ONBOARDING_COLORS.ink} />
            </Pressable>
          ) : null}

          <Text
            accessibilityRole="header"
            numberOfLines={isLastPage ? 3 : 2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            maxFontSizeMultiplier={1.15}
            style={[styles.title, { top: y(149) }]}
          >
            {title}
          </Text>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.15}
            style={[styles.subtitle, { top: y(isLastPage ? 428 : 337) }]}
          >
            {subtitle}
          </Text>

          {pageIndex === 0 ? <>
          <View
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={StyleSheet.absoluteFill}
          >
            <SceneAsset
              asset={SCREEN_1.woman}
              x={(width - womanWidth) / 2 + 10 * scale}
              y={y(609)}
              width={womanWidth}
            />
            <SceneAsset asset={SCREEN_1.food} x={18 * scale} y={y(478)} width={374 * scale} />
            <SceneAsset asset={SCREEN_1.plumber} x={604 * scale} y={y(498)} width={290 * scale} />
            <SceneAsset asset={SCREEN_1.cleaning} x={22 * scale} y={y(907)} width={296 * scale} />
            <SceneAsset asset={SCREEN_1.restaurant} x={687 * scale} y={y(907)} width={205 * scale} />
          </View>

          <View
            accessible
            accessibilityLabel={language === 'hi' ? 'आसपास खोजें' : 'Explore nearby'}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 299 * scale,
              top: y(1235),
              width: 324 * scale,
              height: 324 * scale * SCREEN_1.explore.bounds[3] / SCREEN_1.explore.bounds[2],
            }}
          >
            <SceneAsset asset={SCREEN_1.explore} x={0} y={0} width={324 * scale} />
          </View>
          </> : pageIndex === 1 ? (
            <>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <SceneAsset asset={SCREEN_2.people} x={10 * scale} y={y(437)} width={902 * scale} />
                <LinearGradient
                  colors={['rgba(252,255,255,0)', '#FCFFFF', '#FCFFFF', 'rgba(252,255,255,0)']}
                  locations={[0, 0.45, 0.65, 1]}
                  style={{ position: 'absolute', left: 0, right: 0, top: y(975), height: y(473) }}
                />
              </View>
              <Text style={[styles.note, styles.trustNote, { top: y(592) }]}>
                {t('onboardingTrustNote')}{'\n'}
                <MaterialCommunityIcons name="arrow-u-down-right" size={65 * scale} color="#087681" />
              </Text>
              <View pointerEvents="none" style={[styles.trustBadge, { top: y(829) }]}>
                <MaterialCommunityIcons name="check-decagram" size={56 * scale} color="#009D8C" />
              </View>
              <SceneAsset
                asset={SCREEN_2.profile}
                x={74 * scale}
                y={y(880)}
                width={774 * scale}
                height={y(270)}
                label={language === 'hi' ? 'वेरिफाइड लोकल प्रोफेशनल, रेटिंग 4.8' : "Ali's Plumbing, verified local professional, rated 4.8"}
              />
              {[SCREEN_2.verified, SCREEN_2.prices, SCREEN_2.nearby].map((asset, tileIndex) => (
                <SceneAsset
                  key={tileIndex}
                  asset={asset}
                  x={(31 + tileIndex * 290) * scale}
                  y={y(1175)}
                  width={280 * scale}
                  height={y(185)}
                  label={language === 'hi'
                    ? ['वेरिफाइड प्रोफेशनल', 'सही कीमतें', 'आसपास के ऑफर'][tileIndex]
                    : ['Verified professionals', 'Honest prices', 'Nearby deals'][tileIndex]}
                />
              ))}
            </>
          ) : (
            <>
              <Text style={[styles.note, styles.communityNote, { top: y(568) }]}>
                {t('onboardingCommunityNote')}{' ♡'}
              </Text>
              <SceneAsset
                asset={SCREEN_3.findServices}
                x={20 * scale}
                y={y(755)}
                width={430 * scale}
                height={y(560)}
                label={t('onboardingDiscoverServices')}
              />
              <SceneAsset
                asset={SCREEN_3.postOffer}
                x={472 * scale}
                y={y(755)}
                width={430 * scale}
                height={y(560)}
                label={t('onboardingPostOffer')}
              />
            </>
          )}

          {/* A real curve stays smooth at every aspect ratio and never covers
              the badge with the rectangular edge of a footer container. */}
          <Svg
            pointerEvents="none"
            accessible={false}
            width={width}
            height={contentHeight}
            viewBox="0 0 922 1660"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}
          >
            <Path d="M -20 1585 C 150 1305 772 1305 942 1585 L 942 1660 L -20 1660 Z" fill="#FCFFFF" />
          </Svg>
          <View pointerEvents="none" style={[styles.safeBottom, { height: bottomInset + 1 }]} />

          <Pressable
            testID={`onboarding-next-${pageIndex + 1}`}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            onPress={onNext}
            style={({ pressed }) => [
              styles.next,
              { top: y(1448), minHeight: Math.max(44, y(100)) },
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={ONBOARDING_COLORS.button}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.nextGradient}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={styles.nextText}>{nextLabel}</Text>
              <MaterialCommunityIcons name="chevron-right" size={54 * scale} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <View
            accessible
            accessibilityLabel={language === 'hi' ? `3 में से पेज ${pageIndex + 1}` : `Page ${pageIndex + 1} of 3`}
            pointerEvents="none"
            style={[styles.dots, { top: y(1595) - 12 * scale }]}
          >
            {[0, 1, 2].map((dotIndex) => dotIndex === pageIndex
              ? <LinearGradient key={dotIndex} colors={ONBOARDING_COLORS.button} style={styles.dot} />
              : <View key={dotIndex} style={[styles.dot, styles.inactiveDot]} />)}
          </View>
          <Pressable
            testID={`onboarding-skip-${pageIndex + 1}`}
            accessibilityRole="button"
            accessibilityLabel={t('onboardingSkip')}
            onPress={onSkip}
            style={({ pressed }) => [styles.skip, { top: y(1595) - 22 }, pressed && styles.pressed]}
          >
            <Text maxFontSizeMultiplier={1.2} style={styles.skipText}>{t('onboardingSkip')}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
};

// Position the visible part of each existing transparent PNG, including its
// shadow, without stretching faces or introducing opaque image backgrounds.
const SceneAsset: React.FC<{
  asset: OnboardingAsset;
  x: number;
  y: number;
  width: number;
  height?: number;
  label?: string;
}> = ({ asset, x, y, width, height, label }) => {
  const [left, top, visibleWidth, visibleHeight] = asset.bounds;
  const source = Image.resolveAssetSource(asset.source);
  const boxHeight = height ?? width * visibleHeight / visibleWidth;
  const ratio = Math.min(width / visibleWidth, boxHeight / visibleHeight);
  return (
    <View
      accessible={Boolean(label)}
      accessibilityLabel={label}
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, width, height: boxHeight }}
    >
    <Image
      source={asset.source}
      accessible={false}
      resizeMode="contain"
      style={{
        position: 'absolute',
        left: (width - visibleWidth * ratio) / 2 - left * ratio,
        top: (boxHeight - visibleHeight * ratio) / 2 - top * ratio,
        width: source.width * ratio,
        height: source.height * ratio,
      }}
    />
    </View>
  );
};

const createStyles = (scale: number) => StyleSheet.create({
  page: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 64 * scale,
    backgroundColor: '#E7FAFA',
  },
  backgroundImage: { width: '100%', height: '100%' },
  language: { position: 'absolute', right: 42 * scale, zIndex: 2 },
  back: {
    position: 'absolute',
    left: 42 * scale,
    width: 82 * scale,
    height: 82 * scale,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF7F8',
    zIndex: 2,
  },
  note: {
    position: 'absolute',
    color: '#087681',
    fontFamily: Platform.select({ android: 'cursive', ios: 'Snell Roundhand', default: 'serif' }),
    textAlign: 'center',
    includeFontPadding: false,
    transform: [{ rotate: '-8deg' }],
  },
  trustNote: { left: '37%', width: '23%', fontSize: 29 * scale, lineHeight: 36 * scale },
  communityNote: { right: '8%', width: '36%', fontSize: 37 * scale, lineHeight: 44 * scale },
  trustBadge: { position: 'absolute', right: '11%', backgroundColor: '#FCFFFF', padding: 2, borderRadius: 99 },
  title: {
    position: 'absolute',
    left: 65 * scale,
    right: 65 * scale,
    color: '#073438',
    fontSize: 76 * scale,
    lineHeight: 84 * scale,
    fontWeight: '900',
    letterSpacing: -2 * scale,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subtitle: {
    position: 'absolute',
    left: 58 * scale,
    right: 58 * scale,
    color: '#45616A',
    fontSize: 40 * scale,
    lineHeight: 46 * scale,
    textAlign: 'center',
    includeFontPadding: false,
  },
  safeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FCFFFF' },
  next: {
    position: 'absolute',
    left: 170 * scale,
    right: 170 * scale,
    borderRadius: 999,
    backgroundColor: '#026D63',
    shadowColor: '#008C7C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.17,
    shadowRadius: 6,
    elevation: 3,
  },
  nextGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    gap: 20 * scale,
  },
  nextText: { color: '#FFFFFF', fontSize: 42 * scale, fontWeight: '700', includeFontPadding: false },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 29 * scale,
  },
  dot: { width: 24 * scale, height: 24 * scale, borderRadius: 99 },
  inactiveDot: { backgroundColor: '#C3D7E1' },
  skip: {
    position: 'absolute',
    right: 80 * scale,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: { color: '#45616A', fontSize: 32 * scale, includeFontPadding: false },
  pressed: { opacity: 0.8 },
});
