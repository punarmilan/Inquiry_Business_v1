import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SkylineMasthead } from '../../components/NeonUI';
import type { PostStackParamList } from '../../navigation/types';
import { theme, createThemedStyles } from '../../theme';
import { tabBarScrollProps } from '../../navigation/hideTabBarOnScroll';

type Props = NativeStackScreenProps<PostStackParamList, 'PostMenu'>;

// Each option owns a hue. The card border, icon tile, chevron ring and the
// gradient wash are all derived from it, so adding an option needs one color.
const OPTIONS = [
  { title: 'Post an Update', icon: 'pencil-outline' as const, tone: '#00CFFF', enabled: false },
  { title: 'Post an Event', icon: 'calendar-month-outline' as const, tone: '#A86BFF', enabled: false },
  { title: 'Post a Local Offer', icon: 'cube-outline' as const, tone: '#00E2B0', enabled: true },
  { title: 'Post a Service', icon: 'tools' as const, tone: '#FF7A3D', enabled: false },
];

export const PostMenuScreen: React.FC<Props> = ({ navigation }) => (
  <ScreenContainer style={styles.container}>
    <SkylineMasthead height={250} />
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={navigation.goBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
      </Pressable>
      <Text style={styles.headerTitle}>Post</Text>
      <View style={{ width: 38 }} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} {...tabBarScrollProps}>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.title}
          accessibilityRole="button"
          accessibilityLabel={option.title}
          onPress={() => option.enabled ? navigation.navigate('PostEntry') : Alert.alert('Coming soon', option.title + ' will be available here soon.')}
          style={({ pressed }) => [styles.card, { shadowColor: option.tone }, pressed && styles.pressed]}
        >
          <LinearGradient colors={[option.tone + '33', option.tone + '0D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[styles.icon, { backgroundColor: option.tone + '88', borderColor: option.tone, borderWidth: 1.5, boxShadow: `0 0 12px ${option.tone}66` }]}><MaterialCommunityIcons name={option.icon} size={22} color="#FFFFFF" /></View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>{option.title}</Text>
          </View>
          <View style={[styles.chevron, { borderColor: option.tone }]}><MaterialCommunityIcons name="chevron-right" size={18} color={option.tone} /></View>
        </Pressable>
      ))}
    </ScrollView>
  </ScreenContainer>
);

const styles = createThemedStyles((c) => ({
  container: { paddingHorizontal: 16, backgroundColor: c.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, lineHeight: 28, fontWeight: '900', color: c.text },
  content: { paddingTop: 14, paddingBottom: 120, gap: 11 },
  card: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: c.surface, boxShadow: `0 0 14px ${c.cardGlow}`, overflow: 'hidden', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16.5, lineHeight: 21, fontWeight: '800', color: c.text },
  chevron: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
}));
