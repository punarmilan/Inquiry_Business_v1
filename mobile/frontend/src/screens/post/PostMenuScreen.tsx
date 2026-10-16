import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, CalendarDays, ChevronRight, PencilLine, Tags, Wrench, type LucideIcon } from 'lucide-react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { PostStackParamList } from '../../navigation/types';
import { theme, createThemedStyles } from '../../theme';
import { tabBarScrollProps } from '../../navigation/hideTabBarOnScroll';

type Props = NativeStackScreenProps<PostStackParamList, 'PostMenu'>;

type PostOption = { title: string; icon: LucideIcon; enabled: boolean };

const OPTIONS: PostOption[] = [
  { title: 'Post an Update', icon: PencilLine, enabled: false },
  { title: 'Post an Event', icon: CalendarDays, enabled: false },
  { title: 'Post a Local Offer', icon: Tags, enabled: true },
  { title: 'Post a Service', icon: Wrench, enabled: false },
];

export const PostMenuScreen: React.FC<Props> = ({ navigation }) => {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={navigation.goBack} style={styles.back}>
          <ArrowLeft size={24} color={theme.colors.text} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 32 }]}
        scrollIndicatorInsets={{ bottom: tabBarHeight + 32 }}
        {...tabBarScrollProps}
      >
        <View style={styles.optionGroup}>
          {OPTIONS.map((option, index) => (
            <Pressable
              key={option.title}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              onPress={() => option.enabled ? navigation.navigate('PostEntry') : Alert.alert('Coming soon', option.title + ' will be available here soon.')}
              style={({ pressed }) => [styles.item, index === OPTIONS.length - 1 && styles.lastItem, pressed && styles.pressed]}
            >
              <View style={styles.icon}><option.icon size={24} color={theme.colors.text} strokeWidth={1.75} /></View>
              <View style={styles.copy}><Text style={styles.label}>{option.title}</Text></View>
              <ChevronRight size={21} color={theme.colors.textMuted} strokeWidth={1.75} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = createThemedStyles((c) => ({
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.divider },
  back: { width: 32, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { ...theme.typography.h1, color: c.text },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 18 },
  optionGroup: { borderWidth: 1, borderColor: c.border, borderRadius: 24, backgroundColor: c.surface, overflow: 'hidden' },
  item: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 10, paddingHorizontal: 7, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.divider },
  lastItem: { borderBottomWidth: 0 },
  pressed: { backgroundColor: c.surfaceAlt },
  icon: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 15.5, lineHeight: 21, fontWeight: '500', color: c.textSecondary },
}));
