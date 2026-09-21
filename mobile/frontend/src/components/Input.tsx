import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  error?: string;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightIconPress?: () => void;
  rightIconAccessibilityLabel?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  style,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  ...rest
}) => {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={theme.colors.textMuted} style={styles.icon} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          {...rest}
        />
        {rightIcon && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel}
            onPress={onRightIconPress}
            hitSlop={10}
            style={styles.rightIconBtn}
          >
            <MaterialCommunityIcons name={rightIcon} size={20} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = createThemedStyles((c) => ({
  wrapper: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodyBold,
    color: c.text,
    marginBottom: theme.spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: c.surface,
  },
  inputRowError: {
    borderColor: c.danger,
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: c.text,
    paddingVertical: theme.spacing.sm,
  },
  rightIconBtn: {
    marginLeft: theme.spacing.xs,
    padding: 2,
  },
  error: {
    ...theme.typography.caption,
    color: c.danger,
    marginTop: 4,
  },
}));
