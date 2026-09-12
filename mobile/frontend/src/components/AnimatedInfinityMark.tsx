import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Image as SvgImage, Mask, Path, Rect } from 'react-native-svg';

const infinityLogo = require('../../assets/splash-icon.png');
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Follows the centre of the two ribbons in the supplied InquiryExperts mark.
const INFINITY_PATH = [
  'M 512 542',
  'C 414 389 344 355 272 376',
  'C 178 403 136 518 190 618',
  'C 244 718 356 735 438 641',
  'L 586 444',
  'C 660 346 774 348 844 427',
  'C 918 512 887 641 797 691',
  'C 703 744 616 671 512 542',
].join(' ');

const DRAW_LENGTH = 1900;

interface AnimatedInfinityMarkProps {
  size: number;
  loop?: boolean;
  duration?: number;
}

export const AnimatedInfinityMark: React.FC<AnimatedInfinityMarkProps> = ({
  size,
  loop = false,
  duration = 1350,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const cycleOpacity = useRef(new Animated.Value(1)).current;
  const maskId = useMemo(() => `infinity-draw-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    progress.setValue(0);
    cycleOpacity.setValue(1);

    const draw = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });

    if (!loop) {
      draw.start();
      return () => draw.stop();
    }

    const animation = Animated.loop(
      Animated.sequence([
        draw,
        Animated.delay(420),
        Animated.timing(cycleOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      { resetBeforeIteration: true }
    );
    animation.start();
    return () => animation.stop();
  }, [cycleOpacity, duration, loop, progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAW_LENGTH, 0],
  });
  const finalLogoOpacity = progress.interpolate({
    inputRange: [0, 0.78, 1],
    outputRange: [0, 0, 1],
  });
  const finalLogoScale = progress.interpolate({
    inputRange: [0, 0.78, 1],
    outputRange: [0.96, 0.96, 1],
  });

  return (
    <Animated.View style={[styles.container, { width: size, height: size, opacity: cycleOpacity }]}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Defs>
          <Mask id={maskId} x="0" y="0" width="1024" height="1024">
            <Rect x="0" y="0" width="1024" height="1024" fill="black" />
            <AnimatedPath
              d={INFINITY_PATH}
              fill="none"
              stroke="white"
              strokeWidth={250}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${DRAW_LENGTH} ${DRAW_LENGTH}`}
              strokeDashoffset={dashOffset}
            />
          </Mask>
        </Defs>
        <SvgImage
          href={infinityLogo}
          x="0"
          y="0"
          width="1024"
          height="1024"
          preserveAspectRatio="xMidYMid meet"
          mask={`url(#${maskId})`}
        />
      </Svg>

      <Animated.Image
        source={infinityLogo}
        resizeMode="contain"
        style={[
          styles.finalLogo,
          {
            opacity: finalLogoOpacity,
            transform: [{ scale: finalLogoScale }],
          },
        ]}
        accessibilityLabel="InquiryExperts infinity logo"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalLogo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
