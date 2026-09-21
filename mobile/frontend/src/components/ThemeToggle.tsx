import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';
import type { ThemeMode } from '../theme';

const OPTIONS: { mode: ThemeMode; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { mode: 'light', icon: 'white-balance-sunny' },
  { mode: 'dark', icon: 'weather-night' },
];

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode, t } = useApp();

  return (
    <View style={styles.track}>
      {OPTIONS.map((option) => {
        const active = themeMode === option.mode;
        return (
          <Pressable
            key={option.mode}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.mode === 'dark' ? t('themeDark') : t('themeLight')}
            onPress={() => setThemeMode(option.mode)}
            style={[styles.option, active && styles.optionActive]}
          >
            <MaterialCommunityIcons
              name={option.icon}
              size={16}
              color={active ? (themeMode === 'dark' ? '#001014' : theme.colors.textInverse) : theme.colors.textSecondary}
            />
            <Text style={[styles.label, active && styles.labelActive, active && themeMode === 'dark' && styles.labelActiveDark]}>
              {option.mode === 'dark' ? t('themeDark') : t('themeLight')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = createThemedStyles((c) => ({
  track: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  option: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
  },
  optionActive: {
    backgroundColor: c.primary,
    shadowColor: c.primaryGlow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  label: {
    ...theme.typography.caption,
    color: c.textSecondary,
    fontWeight: '800',
  },
  labelActive: {
    color: c.textInverse,
  },
  labelActiveDark: {
    color: '#001014',
  },
}));
