import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { listThreads, BackendChat } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useApp } from '../../context/AppContext';
import { OffersStackParamList, ServicesStackParamList, MoreStackParamList, ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  OffersStackParamList | ServicesStackParamList | MoreStackParamList | ProfileStackParamList,
  'ChatList'
>;

type ChatTab = 'chats' | 'requests';

// Today shows a clock time, anything older reads as a day offset — matches how
// the rest of the app phrases recency.
const chatTimestamp = (iso: string) => {
  const then = new Date(iso);
  const now = new Date();
  const sameDay = then.toDateString() === now.toDateString();
  if (sameDay) return then.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days <= 1) return 'Yesterday';
  return `${days} Days Ago`;
};

export const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const { t, accessToken } = useApp();
  const [threads, setThreads] = useState<BackendChat[]>([]);
  const [tab, setTab] = useState<ChatTab>('chats');
  const [refreshing, setRefreshing] = useState(false);

  const fetchThreads = useCallback(() => {
    if (!accessToken) return Promise.resolve();
    return listThreads(accessToken)
      .then((res) => setThreads(res.data))
      .catch(() => {});
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchThreads();
    }, [fetchThreads])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchThreads().finally(() => setRefreshing(false));
  }, [fetchThreads]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onThreadUpdated = () => fetchThreads();
    socket.on('thread:updated', onThreadUpdated);
    return () => {
      socket.off('thread:updated', onThreadUpdated);
    };
  }, [fetchThreads]);

  // A thread nobody has written in yet is a pending request rather than a
  // conversation, so it gets its own tab.
  const { chats, requests } = useMemo(
    () => ({
      chats: threads.filter((thread) => !!thread.lastMessage),
      requests: threads.filter((thread) => !thread.lastMessage),
    }),
    [threads]
  );

  const visible = tab === 'chats' ? chats : requests;

  const renderItem = ({ item }: { item: BackendChat }) => {
    const other = item.otherUser;
    const jobTitle = typeof item.job === 'object' ? item.job.title : '';
    const jobId = typeof item.job === 'object' ? item.job._id : item.job;
    const unread = typeof item.unreadCount === 'number' ? item.unreadCount : 0;
    const openThread = (params: any) => {
      if (navigation.getState().routeNames.includes('ChatThread')) {
        (navigation as any).navigate('ChatThread', params);
      } else {
        (navigation.getParent() as any)?.navigate('ChatThread', params);
      }
    };
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={other?.name}
        onPress={() =>
          openThread({
            chatId: item._id,
            jobId,
            jobTitle,
            otherUserId: other?._id ?? '',
            otherUserName: other?.name || 'User',
            otherUserAvatar: other?.photoUrl,
          })
        }
      >
        <Avatar uri={other?.photoUrl} name={other?.name || 'User'} size={52} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {other?.name || 'User'}
            </Text>
            <Text style={styles.time}>{chatTimestamp(item.lastMessageAt)}</Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]} numberOfLines={1}>
              {item.lastMessage || jobTitle || 'Say hello 👋'}
            </Text>
            {unread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('messages')}</Text>
      </View>

      <View style={styles.tabsRow}>
        <TabButton label="Chats" active={tab === 'chats'} onPress={() => setTab('chats')} />
        <TabButton label="Requests" active={tab === 'requests'} onPress={() => setTab('requests')} />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="chat-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>{tab === 'chats' ? t('noMessages') : 'No pending requests'}</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
};

const TabButton: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tabButton}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.xs,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  tabUnderline: {
    height: 2.5,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: theme.colors.divider,
  },
  tabUnderlineActive: {
    backgroundColor: theme.colors.primary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 96,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 74,
  },
  pressed: {
    opacity: 0.7,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    flex: 1,
  },
  time: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 3,
  },
  lastMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    ...theme.typography.tiny,
    color: theme.colors.textInverse,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.bodyLg,
    color: theme.colors.textMuted,
  },
});
