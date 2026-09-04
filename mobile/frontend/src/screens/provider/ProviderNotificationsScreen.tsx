import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { useApp } from '../../context/AppContext';
import type { BackendNotification } from '../../services/api';
import type { ProviderStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ProviderStackParamList, 'ProviderNotifications'>;
const iconFor = (type: BackendNotification['type']) => type === 'provider_booking_request' ? 'briefcase-plus-outline' : type === 'new_message' ? 'message-text-outline' : type === 'worker_assigned' ? 'check-decagram-outline' : 'bell-outline';
const timeAgo = (iso: string) => { const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`; };

export const ProviderNotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { notifications, unreadNotificationCount, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));
  const refresh = () => { setRefreshing(true); fetchNotifications().finally(() => setRefreshing(false)); };
  const open = (item: BackendNotification) => { if (!item.read) markNotificationRead(item._id); if (item.type === 'new_message' && item.data?.chatId) { navigation.navigate('ChatThread', { chatId: item.data.chatId, bookingId: item.data.bookingId, jobTitle: 'Message', otherUserId: item.data.otherUserId || '', otherUserName: item.data.otherUserName || 'Customer', otherUserAvatar: item.data.otherUserAvatar }); } else if (item.data?.bookingId) { navigation.navigate('ProviderTabs', { screen: 'ProviderHome' }); } };
  return <ScreenContainer><View style={styles.header}><IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} /><Text style={styles.headerTitle}>Notifications</Text>{unreadNotificationCount > 0 ? <Pressable onPress={markAllNotificationsRead}><Text style={styles.markAll}>Mark all read</Text></Pressable> : null}</View><FlatList data={notifications} keyExtractor={(item) => item._id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.colors.primary]} />} renderItem={({ item }) => <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && styles.pressed]}><View style={[styles.icon, !item.read && styles.iconUnread]}><MaterialCommunityIcons name={iconFor(item.type)} size={22} color={item.read ? theme.colors.textMuted : theme.colors.primary} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{item.title}</Text>{item.body ? <Text style={styles.body} numberOfLines={2}>{item.body}</Text> : null}<Text style={styles.time}>{timeAgo(item.createdAt)}</Text></View>{!item.read ? <View style={styles.dot} /> : null}</Pressable>} ListEmptyComponent={<View style={styles.empty}><MaterialCommunityIcons name="bell-off-outline" size={48} color={theme.colors.textMuted} /><Text style={styles.emptyText}>No notifications yet</Text></View>} /></ScreenContainer>;
};

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }, headerTitle: { ...theme.typography.h2, color: theme.colors.text, flex: 1 }, markAll: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '800' }, list: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: 40 }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border }, unread: { backgroundColor: theme.colors.primaryLight, borderColor: `${theme.colors.primary}33` }, icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, iconUnread: { backgroundColor: theme.colors.surface }, copy: { flex: 1 }, itemTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, body: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3, lineHeight: 18 }, time: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 5 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.primary, marginTop: 4 }, empty: { alignItems: 'center', paddingTop: 100, gap: 10 }, emptyText: { ...theme.typography.body, color: theme.colors.textMuted }, pressed: { opacity: 0.75 } });
