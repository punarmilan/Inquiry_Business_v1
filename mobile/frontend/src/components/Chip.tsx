import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

interface ChipProps {
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  trailingIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Chip: React.FC<ChipProps> = ({ label, icon, trailingIcon, selected, onPress, color, compact, style }) => {
  const accent = color ?? theme.colors.primary;
  const iconSize = compact ? 14 : 17;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        selected && { backgroundColor: accent, borderColor: accent, shadowColor: accent, shadowOpacity: 0.34, shadowRadius: 10, elevation: 4 },
        pressed && styles.pressed,
        style,
      ]}
    >
      {selected && <View pointerEvents="none" style={styles.chipGloss} />}
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={iconSize}
          color={selected ? theme.colors.textInverse : accent}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, compact && styles.labelCompact, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon && (
        <MaterialCommunityIcons
          name={trailingIcon}
          size={iconSize}
          color={selected ? theme.colors.textInverse : accent}
          style={styles.trailingIcon}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  chipCompact: {
    height: 36,
    paddingHorizontal: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  icon: {
    marginRight: 5,
  },
  trailingIcon: {
    marginLeft: 4,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  labelCompact: {
    ...theme.typography.tiny,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  labelSelected: {
    color: theme.colors.textInverse,
  },
  chipGloss: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: '42%',
    borderBottomLeftRadius: theme.radius.pill,
    borderBottomRightRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
