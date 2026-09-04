import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Avatar } from '../../components/Avatar';
import { getThreadMessages, markThreadRead, BackendMessage } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useApp } from '../../context/AppContext';
import { OffersStackParamList, ServicesStackParamList, MoreStackParamList, ProfileStackParamList, ProviderStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  OffersStackParamList | ServicesStackParamList | MoreStackParamList | ProfileStackParamList | ProviderStackParamList,
  'ChatThread'
>;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const ChatThreadScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, otherUserName, otherUserAvatar } = route.params;
  const { t, accessToken, currentUser } = useApp();
  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  // Hide the bottom tab bar while the thread is open so it can't sit between
  // the input row and the keyboard.
  useLayoutEffect(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabNavigator?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  useEffect(() => {
    if (!accessToken) return;
    getThreadMessages(accessToken, chatId, { limit: 30 })
      .then((res) => setMessages(res.data))
      .catch(() => {});
    markThreadRead(accessToken, chatId).catch(() => {});
  }, [accessToken, chatId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_thread', { chatId });

    const onNewMessage = (message: BackendMessage) => {
      if (message.chat !== chatId) return;
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      if (message.sender !== currentUser?.id && accessToken) {
        markThreadRead(accessToken, chatId).catch(() => {});
      }
    };

    socket.on('message:new', onNewMessage);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.emit('leave_thread', { chatId });
    };
  }, [chatId, currentUser?.id, accessToken]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    getSocket()?.emit('send_message', { chatId, text }, (ack: { ok: boolean; error?: string }) => {
      if (!ack?.ok) {
        // best-effort — the message just won't appear; user can retry
      }
    });
  }, [chatId, draft]);

  const renderItem = ({ item }: { item: BackendMessage }) => {
    const isMe = item.sender === currentUser?.id;
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel={t('back')} onPress={() => navigation.goBack()} />
        <Avatar uri={otherUserAvatar} name={otherUserName} size={38} />
        <Text style={styles.headerName} numberOfLines={1}>
          {otherUserName}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          style={styles.messageList}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('typeMessage')}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            multiline
          />
          <IconButton
            name="send"
            accessibilityLabel="Send"
            onPress={send}
            backgroundColor={theme.colors.primary}
            color={theme.colors.textInverse}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  bubbleThem: {
    backgroundColor: theme.colors.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  bubbleTextMe: {
    color: theme.colors.textInverse,
  },
  bubbleTime: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  bubbleTimeMe: {
    color: theme.colors.primaryLight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    maxHeight: 100,
    minHeight: theme.MIN_TAP_TARGET,
  },
});
