import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { useApp } from '../../context/AppContext';
import type { BackendNotification } from '../../services/api';
import type { OffersStackParamList, ServicesStackParamList, MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  OffersStackParamList | ServicesStackParamList | MoreStackParamList,
  'Notifications'
>;

const iconFor = (type: BackendNotification['type']) => {
  if (type === 'application_accepted') return 'check-decagram-outline';
  if (type === 'new_application') return 'account-arrow-right-outline';
  if (type === 'new_message') return 'message-text-outline';
  if (type === 'business_approved') return 'storefront-check-outline';
  if (type === 'business_rejected') return 'storefront-remove-outline';
  return 'close-circle-outline';
};

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { notifications, unreadNotificationCount, fetchNotifications, markNotificationRead, markAllNotificationsRead } =
    useApp();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications().finally(() => setRefreshing(false));
  };

  const handlePress = (notification: BackendNotification) => {
    if (!notification.read) markNotificationRead(notification._id);
    if (notification.type === 'new_message' && notification.data?.chatId) {
      navigation.navigate('ChatThread', {
        chatId: notification.data.chatId,
        jobId: notification.data.jobId ?? '',
        jobTitle: '',
        otherUserId: notification.data.otherUserId ?? '',
        otherUserName: notification.data.otherUserName ?? 'User',
        otherUserAvatar: notification.data.otherUserAvatar,
      });
      return;
    }
    // OfferDetails/BookingDetails aren't present in every stack this screen is mounted
    // under (e.g. Services lacks OfferDetails, Offers lacks BookingDetails) — soft-typed
    // the same way MyBookingsScreen/OfferCard already are when reused across tabs.
    if (notification.data?.offerId) {
      (navigation as any).navigate('OfferDetails', { offerId: notification.data.offerId });
      return;
    }
    if (notification.data?.bookingId) {
      (navigation as any).navigate('BookingDetails', { bookingId: notification.data.bookingId });
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadNotificationCount > 0 ? (
          <Pressable accessibilityRole="button" onPress={markAllNotificationsRead} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => handlePress(item)}
            style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && styles.pressed]}
          >
            <View style={[styles.icon, !item.read && styles.iconUnread]}>
              <MaterialCommunityIcons
                name={iconFor(item.type)}
                size={22}
                color={item.read ? theme.colors.textMuted : theme.colors.primary}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              {!!item.body && (
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
              )}
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <MaterialCommunityIcons name="bell-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
};

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
    flex: 1,
  },
  markAllText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowUnread: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: `${theme.colors.primary}33`,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: {
    backgroundColor: theme.colors.surface,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  body: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  time: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  pressed: {
    opacity: 0.75,
  },
});
