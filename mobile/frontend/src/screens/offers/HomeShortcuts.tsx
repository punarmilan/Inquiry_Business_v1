import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { createThemedStyles, theme } from '../../theme';

import { HOME_SHORTCUTS, type HomeShortcut } from '../../utils/homeShortcuts';

export const HomeShortcuts = ({ onSelect }: {
  onSelect: (shortcut: HomeShortcut) => void;
}) => {
  const { t } = useApp();
  return <View style={styles.row}>
    {HOME_SHORTCUTS.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={t(item.labelKey)}
      onPress={() => onSelect(item.key)} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={item.icon} size={28} color={theme.colors.text} />
      <Text style={styles.label} numberOfLines={2}>{t(item.labelKey)}</Text>
    </Pressable>)}
  </View>;
};

const styles = createThemedStyles(c => ({
  row: { marginHorizontal: 14, paddingBottom: 6, flexDirection: 'row', gap: 8 },
  shortcut: { flex: 1, minWidth: 0, minHeight: 64, borderRadius: 12, paddingHorizontal: 2, paddingVertical: 6, alignItems: 'center', gap: 6 },
  label: { color: c.text, textAlign: 'center', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  pressed: { backgroundColor: c.surface, opacity: 0.65 },
}));
