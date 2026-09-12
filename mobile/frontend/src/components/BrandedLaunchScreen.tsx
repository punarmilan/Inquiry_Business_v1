import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { AnimatedInfinityMark } from './AnimatedInfinityMark';

const launchBackground = require('../../assets/android-icon-background.png');

interface BrandedLaunchScreenProps {
  onReady?: () => void;
}

export const BrandedLaunchScreen: React.FC<BrandedLaunchScreenProps> = ({ onReady }) => {
  const copyEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(1100),
      Animated.timing(copyEntrance, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [copyEntrance]);

  return (
    <ImageBackground
      source={launchBackground}
      resizeMode="cover"
      style={styles.container}
      onLayout={onReady}
    >
      <View style={styles.lockup}>
        <View style={styles.logoStage}>
          <AnimatedInfinityMark size={360} duration={1350} />
        </View>

        <Animated.View
          style={[
            styles.copy,
            {
              opacity: copyEntrance,
              transform: [
                {
                  translateY: copyEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.brandRow} accessibilityRole="text">
            <Text style={styles.brandInquiry}>Inquiry</Text>
            <Text style={styles.brandExperts}>Experts</Text>
          </View>
          <View style={styles.taglineRow}>
            <View style={styles.rule} />
            <Text style={styles.tagline}>LOCAL DEALS &amp; SERVICES</Text>
            <View style={styles.rule} />
          </View>
        </Animated.View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#02343D',
  },
  lockup: {
    width: '92%',
    alignItems: 'center',
    transform: [{ translateY: -18 }],
  },
  logoStage: {
    width: '100%',
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    width: '100%',
    alignItems: 'center',
    marginTop: -16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandInquiry: {
    color: '#FFFFFF',
    fontSize: 45,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: -2.2,
    textShadowColor: 'rgba(0,0,0,0.78)',
    textShadowOffset: { width: 0, height: 7 },
    textShadowRadius: 8,
  },
  brandExperts: {
    color: '#13DAD1',
    fontSize: 45,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: -2.2,
    textShadowColor: 'rgba(0,0,0,0.78)',
    textShadowOffset: { width: 0, height: 7 },
    textShadowRadius: 8,
  },
  taglineRow: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 11,
  },
  rule: {
    flex: 1,
    maxWidth: 48,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  tagline: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 2.3,
    textShadowColor: 'rgba(0,0,0,0.72)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
