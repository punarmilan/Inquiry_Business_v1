import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { getAiChatMessages, sendAiChatMessage, BackendAiChatMessage, ApiRequestError } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AiAssistant'>;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const AiAssistantScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [messages, setMessages] = useState<BackendAiChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const sendingRef = useRef(false);

  // Hide the bottom tab bar while the assistant is open so it can't sit between
  // the input row and the keyboard.
  useLayoutEffect(() => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabNavigator?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  useEffect(() => {
    if (!accessToken) return;
    getAiChatMessages(accessToken)
      .then((res) => setMessages(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !accessToken || sendingRef.current) return;
    sendingRef.current = true;
    setDraft('');
    setSending(true);

    const optimisticUser: BackendAiChatMessage = {
      _id: `pending-${Date.now()}`,
      user: '',
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await sendAiChatMessage(accessToken, text);
      setMessages((prev) => [
        ...prev.filter((message) => message._id !== optimisticUser._id),
        ...res.messages,
      ]);
    } catch (error) {
      const errorText =
        error instanceof ApiRequestError && error.code === 'AI_TIMEOUT'
          ? 'The assistant is taking longer than expected. Please try again.'
          : error instanceof ApiRequestError && ['AI_UNAVAILABLE', 'AI_MODEL_UNAVAILABLE'].includes(error.code || '')
            ? 'The AI assistant is temporarily unavailable. Please try again later.'
            : 'I could not complete that request. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          _id: `error-${Date.now()}`,
          user: '',
          role: 'assistant',
          text: errorText,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      sendingRef.current = false;
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [draft, accessToken]);

  const renderItem = ({ item }: { item: BackendAiChatMessage }) => {
    const isMe = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        {!isMe && (
          <View style={styles.botIcon}>
            <MaterialCommunityIcons name="robot-happy-outline" size={18} color={theme.colors.primary} />
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="robot-happy-outline" size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.headerName} numberOfLines={1}>
          AI Assistant
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.messageList}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="robot-happy-outline" size={40} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>Ask me anything</Text>
                <Text style={styles.emptyBody}>
                  I can help with jobs, applications, payments, and using InquiryExperts.
                </Text>
              </View>
            }
          />
        )}

        {sending && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type your question..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            multiline
            editable={!sending}
            maxLength={2000}
            blurOnSubmit={false}
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
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.xs,
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  emptyBody: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  botIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  typingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
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
