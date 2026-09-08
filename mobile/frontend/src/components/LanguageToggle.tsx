import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useApp } from '../context/AppContext';
import type { Language } from '../i18n/translations';

const OPTIONS: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
];

export const LanguageToggle: React.FC<{ onboarding?: boolean }> = ({ onboarding = false }) => {
  const { language, setLanguage } = useApp();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change language"
        onPress={() => setVisible(true)}
        style={[styles.button, onboarding && styles.onboardingButton]}
      >
        <MaterialCommunityIcons name="web" size={18} color={onboarding ? '#103C48' : theme.colors.textSecondary} />
        <Text style={[styles.buttonText, onboarding && styles.onboardingButtonText]}>{language === 'en' ? 'EN' : 'HI'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={17} color={onboarding ? '#103C48' : theme.colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.card}>
            <Text style={styles.title}>Language</Text>
            {OPTIONS.map((option) => (
              <Pressable
                key={option.code}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => {
                  setLanguage(option.code);
                  setVisible(false);
                }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={styles.optionText}>{option.label}</Text>
                {language === option.code ? (
                  <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  onboardingButton: { backgroundColor: '#EFF7F8', height: 34 },
  onboardingButtonText: { color: '#103C48', fontWeight: '600' },
  button: {
    minWidth: 82,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
  },
  buttonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  optionPressed: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  optionText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
