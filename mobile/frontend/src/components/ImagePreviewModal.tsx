import React from 'react';
import { View, Text, Image, Modal, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';

interface ImagePreviewModalProps {
  visible: boolean;
  uri: string | null;
  title?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Shown after any photo/document pick (profile photo, KYC docs, selfie, company logo) — the
// native picker's own crop step already ran by this point, this is the app's own explicit
// "save this?" step so the user sees a clear confirm action instead of the image just
// silently landing in the form.
export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ visible, uri, title, onCancel, onConfirm }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Discard"
          onPress={onCancel}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.textInverse} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title ?? 'Preview'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          onPress={onConfirm}
          hitSlop={10}
          style={styles.saveBtn}
        >
          <MaterialCommunityIcons name="arrow-right-circle" size={34} color={theme.colors.primary} />
        </Pressable>
      </View>

      {uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}

      <View style={styles.footer}>
        <Text style={styles.hint}>Tap the arrow above to save</Text>
      </View>
    </View>
  </Modal>
);

const styles = createThemedStyles((c) => ({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.bodyBold,
    color: c.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  image: {
    flex: 1,
  },
  footer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  hint: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
}));
