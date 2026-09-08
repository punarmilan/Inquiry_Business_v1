import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { legalDocuments } from '../../data/legalContent';
import { theme } from '../../theme';

type Props = { navigation: { goBack: () => void }; route: { params: { document: 'terms' | 'privacy' } } };

export const LegalDocumentScreen: React.FC<Props> = ({ navigation, route }) => {
  const document = legalDocuments[route.params.document];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={navigation.goBack} />
        <Text style={styles.headerTitle}>{document.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.effective}>InquiryExperts · Effective 8 September 2026</Text>
        <Text style={styles.intro}>{document.intro}</Text>
        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  headerTitle: { ...theme.typography.h2, color: theme.colors.text },
  content: { flexGrow: 1, padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 },
  title: { ...theme.typography.h1, color: theme.colors.text },
  effective: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 5 },
  intro: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 23, marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg },
  section: { marginBottom: theme.spacing.lg },
  heading: { ...theme.typography.bodyBold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  body: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 23 },
});
