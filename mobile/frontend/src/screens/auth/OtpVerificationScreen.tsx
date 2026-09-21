import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, createThemedStyles } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const OTP_LENGTH = 4;
const RESEND_COOLDOWN = 30;

export const OtpVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, authIdentifierValue, authIdentifierType, confirmOtp, requestOtp, remoteSettings } = useApp();
  const [demoOtp, setDemoOtp] = useState(route.params.demoOtp);
  const [otp, setOtp] = useState('');
  const [errorText, setErrorText] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);
  const lastAutoSubmittedOtpRef = useRef<string | null>(null);

  const content = remoteSettings['mobile.authFlow.content']?.otpVerification;
  const title = content?.title || 'Enter OTP';
  const otpSentToLabel = content?.otpSentToLabel || "We've sent a 4-digit code to";
  const resendLabel = content?.resendLabel || t('resendOtp');
  const verifyLabel = content?.verifyLabel || t('verify');

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(digitsOnly);
    setErrorText('');
    if (digitsOnly.length < OTP_LENGTH) {
      lastAutoSubmittedOtpRef.current = null;
    }
  };

  const handleVerify = useCallback(async (code = otp) => {
    if (code.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    try {
      await confirmOtp(code);
      // RootNavigator reacts when auth state flips after OTP verification.
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Incorrect code. Please try again.';
      setErrorText(
        message.includes('No account found')
          ? authIdentifierType === 'email'
            ? 'No account found with this email. Please register with your phone number first.'
            : 'This phone number is not registered. Please register first.'
          : message
      );
    } finally {
      setVerifying(false);
    }
  }, [authIdentifierType, confirmOtp, otp, verifying]);

  useEffect(() => {
    if (otp.length !== OTP_LENGTH || verifying || lastAutoSubmittedOtpRef.current === otp) return;
    lastAutoSubmittedOtpRef.current = otp;
    handleVerify(otp);
  }, [handleVerify, otp, verifying]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setOtp('');
    setErrorText('');
    lastAutoSubmittedOtpRef.current = null;
    try {
      const { demoOtp: newOtp } =
        authIdentifierType === 'email' ? await requestOtp({ email: authIdentifierValue }) : await requestOtp({ phone: authIdentifierValue });
      setDemoOtp(newOtp);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      // best-effort resend; user can retry via the button again
    }
  };

  const cooldownLabel = `0:${String(cooldown).padStart(2, '0')}`;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel={t('back')} onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="message-text-outline" size={36} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {otpSentToLabel} {authIdentifierValue || '+91 XXXXX XXXXX'}
        </Text>
        <Text style={styles.hint}>(Demo code: {demoOtp})</Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpBoxRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.otpBox, !!errorText && styles.otpBoxError, otp[i] && styles.otpBoxFilled]}>
              <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          accessibilityLabel={t('verifyOtp')}
        />

        {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}
        {errorText.includes('not registered') ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ProfileSetup')}
            style={styles.registerPromptBtn}
          >
            <Text style={styles.registerPromptText}>Register Now</Text>
          </Pressable>
        ) : null}

        {cooldown > 0 ? (
          <Text style={styles.cooldownText}>Resend OTP in {cooldownLabel}</Text>
        ) : (
          <Pressable onPress={handleResend} style={styles.resendBtn}>
            <Text style={styles.resendText}>{resendLabel}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label={verifyLabel}
          onPress={handleVerify}
          disabled={otp.length !== OTP_LENGTH}
          loading={verifying}
          fullWidth
        />
        <Pressable onPress={() => navigation.goBack()} style={styles.changeNumberBtn}>
          <Text style={styles.changeNumberText}>{t('changeNumber')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
};

const styles = createThemedStyles((c) => ({
  header: {
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h2,
    color: c.text,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.caption,
    color: c.accentDark,
    marginTop: theme.spacing.xs,
  },
  otpBoxRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  otpBox: {
    width: 56,
    height: 60,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  otpBoxFilled: {
    borderColor: c.primary,
  },
  otpBoxError: {
    borderColor: c.danger,
  },
  otpDigit: {
    ...theme.typography.h2,
    color: c.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  errorText: {
    ...theme.typography.caption,
    color: c.danger,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  registerPromptBtn: {
    minHeight: theme.MIN_TAP_TARGET,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: c.primary,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  registerPromptText: {
    ...theme.typography.bodyBold,
    color: c.primary,
  },
  resendBtn: {
    marginTop: theme.spacing.lg,
    minHeight: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  resendText: {
    ...theme.typography.bodyBold,
    color: c.primary,
  },
  cooldownText: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginTop: theme.spacing.lg,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    marginTop: 'auto',
  },
  changeNumberBtn: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    minHeight: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  changeNumberText: {
    ...theme.typography.body,
    color: c.textSecondary,
  },
}));
