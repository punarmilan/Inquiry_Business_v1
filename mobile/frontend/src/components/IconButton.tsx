import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';

interface IconButtonProps {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  badge?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  size = 24,
  color = theme.colors.text,
  backgroundColor,
  style,
  accessibilityLabel,
  badge,
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        backgroundColor ? { backgroundColor } : undefined,
        pressed && styles.pressed,
        style,
      ]}
    >
      <MaterialCommunityIcons name={name} size={size} color={color} />
      {badge && <View style={styles.dot} />}
    </Pressable>
  );
};

const styles = createThemedStyles((c) => ({
  base: {
    minWidth: theme.MIN_TAP_TARGET,
    minHeight: theme.MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  pressed: {
    opacity: 0.6,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: c.danger,
    borderWidth: 1.5,
    borderColor: c.surface,
  },
}));
