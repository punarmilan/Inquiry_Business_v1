import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, createThemedStyles } from '../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  backgroundColor?: string;
  dynamicBackgroundColor?: string;
  topInsetColor?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  edges = ['top', 'left', 'right'],
  backgroundColor,
  dynamicBackgroundColor,
  topInsetColor,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.container, backgroundColor ? { backgroundColor } : undefined, style]}
    >
      <LinearGradient pointerEvents="none" colors={dynamicBackgroundColor ? [dynamicBackgroundColor, dynamicBackgroundColor, dynamicBackgroundColor] : [theme.colors.backdropStart, theme.colors.backdropEnd, theme.colors.background]} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {topInsetColor ? <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: topInsetColor }} /> : null}
      {children}
    </SafeAreaView>
  );
};

const styles = createThemedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
}));
