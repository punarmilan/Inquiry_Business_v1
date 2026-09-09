import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { useApp } from '../../context/AppContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Faq'>;

const FALLBACK_FAQS = [
  {
    question: 'How do I find nearby offers?',
    answer: 'Open the Offers tab and choose your city, area, or current location. The app will show eligible offers near that location.',
  },
  {
    question: 'How do I book a service?',
    answer: 'Open Services, choose a category and provider, enter the booking details, and review the booking before confirming it.',
  },
  {
    question: 'Where can I manage my bookings?',
    answer: 'Open More and select My Bookings to review the latest status and details of your service bookings.',
  },
  {
    question: 'How do I publish an offer?',
    answer: 'Create or select an approved business, activate an eligible plan, then use the Post tab to design and submit an offer for approval.',
  },
  {
    question: 'How can I contact support?',
    answer: 'Return to Help & Support to call, email, or ask the AI Assistant for help using the app.',
  },
];

export const FaqScreen: React.FC<Props> = ({ navigation }) => {
  const { remoteSettings } = useApp();
  const managedContent = remoteSettings.faq?.trim();

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Quick answers about offers, services, bookings and business profiles.</Text>
        {managedContent ? (
          <View style={styles.managedCard}>
            <Text style={styles.managedText}>{managedContent}</Text>
          </View>
        ) : (
          FALLBACK_FAQS.map((item) => (
            <View key={item.question} style={styles.card}>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.answer}>{item.answer}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  headerTitle: { flex: 1, ...theme.typography.h3, color: theme.colors.text },
  content: { padding: theme.spacing.lg, paddingBottom: 40, gap: theme.spacing.sm },
  intro: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: theme.spacing.xs },
  card: { padding: theme.spacing.md, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  question: { ...theme.typography.bodyBold, color: theme.colors.text },
  answer: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.xs },
  managedCard: { padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  managedText: { ...theme.typography.body, color: theme.colors.text, lineHeight: 23 },
});
