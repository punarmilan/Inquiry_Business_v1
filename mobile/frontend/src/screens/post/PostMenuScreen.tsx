import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { PostStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<PostStackParamList, 'PostMenu'>;

const OPTIONS = [
  { title: 'Post an Update', description: 'Share news, photos or updates about your business', icon: 'pencil-outline' as const, color: '#2B8EF3', enabled: false },
  { title: 'Post an Event', description: 'Let people know about your upcoming event', icon: 'calendar-month-outline' as const, color: '#7566E8', enabled: false },
  { title: 'Post a Local Offer', description: 'Design an offer for customers near you', icon: 'cube-outline' as const, color: '#1677E8', enabled: true },
  { title: 'Post a Service', description: 'Highlight your services', icon: 'tools' as const, color: '#0D9A8D', enabled: false },
];

export const PostMenuScreen: React.FC<Props> = ({ navigation }) => (
  <ScreenContainer style={styles.container}>
    <View style={styles.header}><Pressable onPress={navigation.goBack} style={styles.back}><MaterialCommunityIcons name="chevron-left" size={27} color={theme.colors.text} /></Pressable><Text style={styles.headerTitle}>Post</Text><View style={styles.back} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {OPTIONS.map((option) => <Pressable key={option.title} onPress={() => option.enabled ? navigation.navigate('PostEntry') : Alert.alert('Coming soon', option.title + ' will be available here soon.')} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={[styles.icon, { backgroundColor: option.color }]}><MaterialCommunityIcons name={option.icon} size={24} color="#FFFFFF" /></View>
        <View style={styles.copy}><Text style={styles.cardTitle}>{option.title}</Text><Text style={styles.cardDescription}>{option.description}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
      </Pressable>)}
    </ScrollView>
  </ScreenContainer>
);

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, backgroundColor: '#F7FAFC' }, header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, headerTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, content: { paddingTop: 8, paddingBottom: 24, gap: 14 }, card: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: '#E6EBF1', shadowColor: '#64748B', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] }, icon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, cardTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, cardDescription: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 17, marginTop: 3 },
});
