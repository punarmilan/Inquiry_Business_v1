import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

interface WelcomeModalProps {
  visible: boolean;
  name: string;
  isNewUser: boolean;
  onClose: () => void;
}

// Shown once right after OTP verification — greets the user by name and
// distinguishes a fresh sign-up from a returning login.
export const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, name, isNewUser, onClose }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.8);
      opacity.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  const firstName = name?.trim().split(' ')[0];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.crest}
          >
            <MaterialCommunityIcons
              name={isNewUser ? 'party-popper' : 'hand-wave'}
              size={44}
              color={theme.colors.textInverse}
            />
          </LinearGradient>

          <Text style={styles.title}>
            {isNewUser ? 'Welcome aboard' : 'Welcome back'}
            {firstName ? `, ${firstName}!` : '!'}
          </Text>

          <Text style={styles.body}>
            {isNewUser
              ? 'Your account is ready. Discover nearby offers or book a trusted local service in minutes.'
              : 'Good to see you again. Fresh offers near you are waiting.'}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started"
            onPress={onClose}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{isNewUser ? 'Get Started' : 'Continue'}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  crest: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  button: {
    alignSelf: 'stretch',
    minHeight: 50,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.75,
  },
});
