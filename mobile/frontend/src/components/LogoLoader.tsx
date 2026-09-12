import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../theme';
import { AnimatedInfinityMark } from './AnimatedInfinityMark';

interface LogoLoaderProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({ size = 44, style }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1150,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spinLoop.start();
    return () => {
      spinLoop.stop();
    };
  }, [spin]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.wrap, { width: size * 1.95, height: size * 1.95 }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size * 1.42,
            height: size * 1.42,
            borderRadius: size * 0.71,
            transform: [{ rotate }],
          },
        ]}
      />
      <AnimatedInfinityMark size={size * 1.48} duration={980} loop />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: theme.colors.primaryLight,
    borderTopColor: theme.colors.primary,
    borderRightColor: 'rgba(244, 91, 24, 0.25)',
  },
});
