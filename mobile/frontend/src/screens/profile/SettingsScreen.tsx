import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, createThemedStyles } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { LanguageToggle } from '../../components/LanguageToggle';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, logout } = useApp();

  const confirmLogout = () => {
    Alert.alert(t('logout'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel={t('back')} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>{t('language')}</Text>
              <Text style={styles.settingBody}>{t('chooseAppLanguage')}</Text>
            </View>
            <LanguageToggle />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>{t('darkMode')}</Text>
              <Text style={styles.settingBody}>{t('chooseAppTheme')}</Text>
            </View>
          </View>
          <View style={styles.themeRow}>
            <ThemeToggle />
          </View>
        </View>

        <View style={styles.card}>
          <SettingAction
            icon="account-edit-outline"
            label={t('editProfile')}
            onPress={() => navigation.navigate('EditProfile', { section: 'profile' })}
          />
          <SettingAction icon="logout" label={t('logout')} destructive onPress={confirmLogout} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const SettingAction: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}> = ({ icon, label, destructive, onPress }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
    <MaterialCommunityIcons name={icon} size={23} color={destructive ? theme.colors.danger : theme.colors.textSecondary} />
    <Text style={[styles.actionText, destructive && styles.actionTextDestructive]}>{label}</Text>
    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
  </Pressable>
);

const styles = createThemedStyles((c) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: c.text,
  },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden',
  },
  settingRow: {
    minHeight: 72,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  settingCopy: {
    flex: 1,
  },
  themeRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  settingTitle: {
    ...theme.typography.bodyBold,
    color: c.text,
  },
  settingBody: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  actionText: {
    ...theme.typography.bodyLg,
    color: c.text,
    flex: 1,
  },
  actionTextDestructive: {
    color: c.danger,
  },
  pressed: {
    opacity: 0.72,
  },
}));
