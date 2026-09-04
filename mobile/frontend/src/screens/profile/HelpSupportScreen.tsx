import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'HelpSupport'>;

export const HelpSupportScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <MaterialCommunityIcons name="lifebuoy" size={34} color={theme.colors.primary} />
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroBody}>Get help with offers, bookings, your account and payments.</Text>
        </View>

        <View style={styles.card}>
          <HelpAction
            icon="robot-happy-outline"
            label="AI Assistant"
            body="Get instant answers to your questions"
            onPress={() => navigation.navigate('AiAssistant')}
          />
          <HelpAction
            icon="phone-outline"
            label="Call Support"
            body="+91 98765 43210"
            onPress={() => Linking.openURL('tel:+919876543210').catch(() => {})}
          />
          <HelpAction
            icon="email-outline"
            label="Email Support"
            body="support@anywork.app"
            onPress={() => Linking.openURL('mailto:support@anywork.app').catch(() => {})}
          />
          <HelpAction
            icon="frequently-asked-questions"
            label="FAQs"
            body="Common questions and answers"
            onPress={() => Linking.openURL('https://anywork.app/help').catch(() => {})}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const HelpAction: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  body: string;
  onPress: () => void;
}> = ({ icon, label, body, onPress }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
    <View style={styles.actionIcon}>
      <MaterialCommunityIcons name={icon} size={22} color={theme.colors.primary} />
    </View>
    <View style={styles.actionCopy}>
      <Text style={styles.actionTitle}>{label}</Text>
      <Text style={styles.actionBody}>{body}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  hero: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  heroTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  heroBody: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  actionRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  actionBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
