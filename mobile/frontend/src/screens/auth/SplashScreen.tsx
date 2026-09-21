import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, createThemedStyles } from '../../theme';
import { Button } from '../../components/Button';
import { LanguageToggle } from '../../components/LanguageToggle';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { t, remoteSettings } = useApp();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} style={styles.container}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.logoCircle, { transform: [{ scale }], opacity }]}>
          <MaterialCommunityIcons name="handshake" size={64} color={theme.colors.primary} />
        </Animated.View>
        <Animated.Text style={[styles.title, { opacity }]}>{t('appName')}</Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity }]}>
          {remoteSettings['mobile.splash.tagline'] || t('tagline')}
        </Animated.Text>

        <View style={styles.iconRow}>
          <IconPill icon="hammer" />
          <IconPill icon="book-open-variant" />
          <IconPill icon="moped" />
          <IconPill icon="broom" />
        </View>
      </View>

      <View style={styles.bottom}>
        <Button
          label={t('getStarted')}
          onPress={() => navigation.navigate('PhoneEntry')}
          variant="secondary"
          fullWidth
        />
      </View>
    </LinearGradient>
  );
};

const IconPill: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap }> = ({ icon }) => (
  <View style={styles.iconPill}>
    <MaterialCommunityIcons name={icon} size={22} color={theme.colors.textInverse} />
  </View>
);

const styles = createThemedStyles((c) => ({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    color: c.textInverse,
    fontSize: 32,
  },
  tagline: {
    ...theme.typography.bodyLg,
    color: c.primaryLight,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xxl,
  },
  iconPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingBottom: theme.spacing.md,
  },
}));
