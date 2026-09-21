import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';
import { Button } from './Button';
import { Input } from './Input';
import { useApp } from '../context/AppContext';
import { ApiRequestError, REPORT_REASONS, ReportReason, submitReport } from '../services/api';

interface ReportModalProps {
  visible: boolean;
  targetType: 'job' | 'user';
  targetId: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ visible, targetType, targetId, onClose }) => {
  const { accessToken } = useApp();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setReason(null);
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const doSubmit = async () => {
    if (!accessToken || !reason) return;
    setSubmitting(true);
    setError('');
    try {
      await submitReport(accessToken, { targetType, targetId, reason, description: description.trim() || undefined });
      reset();
      onClose();
      Alert.alert('Report submitted successfully.', 'Our support team will review it.');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not submit report. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPress = () => {
    if (!reason) return;
    if (reason === 'Other' && !description.trim()) {
      setError('Please describe the issue.');
      return;
    }
    setError('');
    Alert.alert(
      `Report this ${targetType === 'job' ? 'job' : 'user'}?`,
      'Our support team will review your report.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: doSubmit },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{targetType === 'job' ? 'Report Job' : 'Report User'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Why are you reporting this {targetType}?</Text>

          {REPORT_REASONS.map((option) => {
            const selected = reason === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setReason(option)}
                style={[styles.reasonRow, selected && styles.reasonRowActive]}
              >
                <MaterialCommunityIcons
                  name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={selected ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text style={[styles.reasonText, selected && styles.reasonTextActive]}>{option}</Text>
              </Pressable>
            );
          })}

          {reason === 'Other' && (
            <Input
              label="Description"
              placeholder="Describe the issue"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.descriptionInput}
            />
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actions}>
            <Button label="Cancel" variant="outline" onPress={handleClose} style={styles.actionBtn} disabled={submitting} />
            <Button
              label="Submit Report"
              onPress={handleSubmitPress}
              style={styles.actionBtn}
              loading={submitting}
              disabled={!reason}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = createThemedStyles((c) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: theme.radius.xl,
    backgroundColor: c.surface,
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...theme.typography.h3,
    color: c.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: c.textSecondary,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 44,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
  },
  reasonRowActive: {
    backgroundColor: c.primaryLight,
  },
  reasonText: {
    ...theme.typography.body,
    color: c.text,
  },
  reasonTextActive: {
    color: c.primary,
    fontWeight: '700',
  },
  descriptionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.caption,
    color: c.danger,
    marginBottom: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
}));
