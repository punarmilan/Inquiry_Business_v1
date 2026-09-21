import React from 'react';
import { View, Text, StyleSheet, Modal, Image, Linking, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';
import { Button } from './Button';
import { LoginAnnouncement } from '../services/settings';

interface AnnouncementModalProps {
  visible: boolean;
  announcement: LoginAnnouncement;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ visible, announcement, onClose }) => {
  const handlePress = () => {
    if (announcement.buttonUrl) {
      Linking.openURL(announcement.buttonUrl).catch(() => {});
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
          </Pressable>

          {announcement.imageUrl ? (
            <Image source={{ uri: announcement.imageUrl }} style={styles.image} />
          ) : null}

          <View style={styles.body}>
            {announcement.title ? <Text style={styles.title}>{announcement.title}</Text> : null}
            {announcement.body ? <Text style={styles.text}>{announcement.body}</Text> : null}

            {announcement.buttonLabel ? (
              <Button label={announcement.buttonLabel} onPress={handlePress} fullWidth style={styles.button} />
            ) : (
              <Button label="Close" onPress={onClose} variant="outline" fullWidth style={styles.button} />
            )}
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
    maxWidth: 380,
    borderRadius: theme.radius.xl,
    backgroundColor: c.surface,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  body: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h3,
    color: c.text,
  },
  text: {
    ...theme.typography.body,
    color: c.textSecondary,
    marginTop: theme.spacing.xs,
  },
  button: {
    marginTop: theme.spacing.lg,
  },
}));
