import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GoogleMark } from '../../components/GoogleMark';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';
import { signInWithGoogle } from '../../services/socialAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;
type SocialIcon = 'google' | 'facebook' | 'apple';

export const PhoneEntryScreen: React.FC<Props> = ({ navigation }) => {
  const { t, loginWithPassword, loginWithOAuth, requestOtp, remoteSettings } = useApp();
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useOtpLogin, setUseOtpLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [sending, setSending] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [oauthPrefill, setOauthPrefill] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const goBackFromLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Onboarding', { force: true });
  };

  const content = remoteSettings['mobile.authFlow.content']?.phoneEntry;
  const title =
    loginMode === 'email' ? 'Login with Email' : content?.title || 'Login with Phone';
  const subtitle = useOtpLogin
    ? loginMode === 'email'
      ? "We'll send you an OTP to verify your email"
      : content?.subtitle || "We'll send you an OTP to verify your number"
    : 'Enter your password to continue';
  const otpLoginLabel = content?.sendOtpLabel || 'Send OTP';

  const isValid = digits.length === 10;
  const emailValue = email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const passwordValue = password.trim();
  const identifierValid = loginMode === 'email' ? isEmailValid : isValid;
  const canPrimaryLogin = useOtpLogin ? identifierValid : identifierValid && passwordValue.length >= 6;
  const primaryLabel = useOtpLogin
    ? sending
      ? 'Sending...'
      : otpLoginLabel
    : loggingIn
      ? 'Logging in...'
      : 'Login with Password';

  const toggleOtpLogin = () => {
    setUseOtpLogin((prev) => !prev);
    setError('');
  };

  const selectLoginMode = (mode: 'phone' | 'email') => {
    if (mode === loginMode) return;
    setLoginMode(mode);
    setPassword('');
    setError('');
  };

  const handlePasswordLogin = async () => {
    if (useOtpLogin || !canPrimaryLogin || loggingIn || sending) return;
    setLoggingIn(true);
    setError('');
    setOauthPrefill(null);
    try {
      const identifier = loginMode === 'email' ? { email: emailValue } : { phone: `+91${digits}` };
      await loginWithPassword(identifier, passwordValue);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not log in. Try again.';
      setError(
        message.includes('No account found')
          ? loginMode === 'email'
            ? 'No account found with this email. Please register with your phone number first.'
            : 'This phone number is not registered. Please register first.'
          : message
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSend = async () => {
    if (!isValid || sending || loggingIn) return;
    setSending(true);
    setError('');
    setOauthPrefill(null);
    try {
      const { demoOtp } = await requestOtp({ phone: `+91${digits}` });
      navigation.navigate('OtpVerification', { demoOtp });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not send OTP. Try again.';
      setError(
        message.includes('No account found')
          ? 'This phone number is not registered. Please register first.'
          : message
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!isEmailValid || sending || loggingIn) return;
    setSending(true);
    setError('');
    setOauthPrefill(null);
    try {
      const { demoOtp } = await requestOtp({ email: emailValue });
      navigation.navigate('OtpVerification', { demoOtp });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not send OTP. Try again.';
      setError(
        message.includes('No account found')
          ? 'No account found with this email. Please register with your phone number first.'
          : message
      );
    } finally {
      setSending(false);
    }
  };

  const handlePrimaryLogin = () => {
    if (useOtpLogin) {
      if (loginMode === 'email') {
        handleSendEmailOtp();
      } else {
        handleSend();
      }
      return;
    }
    handlePasswordLogin();
  };

  const handleGoogleLogin = async () => {
    if (oauthLoading) return;
    setOauthLoading('google');
    setError('');
    setOauthPrefill(null);
    let googleProfile: { name: string; email: string } | null = null;
    try {
      const { idToken, name, email } = await signInWithGoogle();
      googleProfile = { name, email };
      await loginWithOAuth('google', idToken);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not sign in with Google.';
      if (message.includes('No account found') && googleProfile) {
        setOauthPrefill(googleProfile);
        setError('This Google email is not registered. Please register with your phone number first.');
      } else {
        setError(message);
      }
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.screen}>
          <LinearGradient
            colors={[theme.colors.primaryLight, '#F8FCFC', theme.colors.background]}
            locations={[0, 0.45, 1]}
            style={styles.glow}
          />

          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              onPress={goBackFromLogin}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.iconHaloOuter}>
                <View style={styles.iconHaloInner}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="handshake" size={32} color={theme.colors.primary} />
                  </View>
                </View>
              </View>

              <Text style={styles.welcomeTitle}>Welcome Back 👋</Text>
              <Text style={styles.welcomeSubtitle}>Login to continue to your account</Text>

              <View style={styles.tabRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: loginMode === 'phone' }}
                  onPress={() => selectLoginMode('phone')}
                  style={[styles.tabButton, loginMode === 'phone' && styles.tabButtonActive]}
                >
                  <MaterialCommunityIcons
                    name="phone"
                    size={16}
                    color={loginMode === 'phone' ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.tabText, loginMode === 'phone' && styles.tabTextActive]}>Phone</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: loginMode === 'email' }}
                  onPress={() => selectLoginMode('email')}
                  style={[styles.tabButton, loginMode === 'email' && styles.tabButtonActive]}
                >
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={16}
                    color={loginMode === 'email' ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.tabText, loginMode === 'email' && styles.tabTextActive]}>Email</Text>
                </Pressable>
              </View>

              <View style={styles.modeInfoRow}>
                <View style={styles.modeInfoIcon}>
                  <MaterialCommunityIcons
                    name={!useOtpLogin ? 'lock-outline' : loginMode === 'email' ? 'email-outline' : 'cellphone-message'}
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.modeInfoText}>
                  <Text style={styles.modeInfoTitle}>{title}</Text>
                  <Text style={styles.modeInfoSubtitle}>{subtitle}</Text>
                </View>
              </View>

              {loginMode === 'phone' && (
                <Pressable
                  style={styles.inputRow}
                  accessibilityRole="button"
                  accessibilityLabel={t('phoneNumber')}
                  onPress={() => inputRef.current?.focus()}
                >
                  <View style={styles.countryCode}>
                    <View style={styles.flag}>
                      <View style={[styles.flagStripe, styles.flagSaffron]} />
                      <View style={[styles.flagStripe, styles.flagWhite]} />
                      <View style={[styles.flagStripe, styles.flagGreen]} />
                    </View>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    ref={inputRef}
                    value={digits}
                    onChangeText={(text) => setDigits(text.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#B8B2AA"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    maxLength={10}
                    autoFocus
                    returnKeyType={useOtpLogin ? 'go' : 'next'}
                    onSubmitEditing={() => {
                      if (useOtpLogin) {
                        handleSend();
                        return;
                      }
                      passwordInputRef.current?.focus();
                    }}
                    style={styles.numberInput}
                  />
                </Pressable>
              )}

              {loginMode === 'email' && (
                <View style={styles.inputRow}>
                  <MaterialCommunityIcons name="email-outline" size={20} color={theme.colors.textMuted} style={styles.passwordIcon} />
                  <TextInput
                    ref={emailInputRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email address"
                    placeholderTextColor="#B8B2AA"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoFocus
                    returnKeyType={useOtpLogin ? 'go' : 'next'}
                    onSubmitEditing={() => {
                      if (useOtpLogin) {
                        handleSendEmailOtp();
                        return;
                      }
                      passwordInputRef.current?.focus();
                    }}
                    style={styles.passwordInput}
                  />
                </View>
              )}

              {!useOtpLogin && (
                <View style={[styles.inputRow, styles.passwordRow]}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color={theme.colors.textMuted} style={styles.passwordIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#B8B2AA"
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={handlePasswordLogin}
                    style={styles.passwordInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.eyeToggle, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </Pressable>
                </View>
              )}

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: useOtpLogin }}
                accessibilityLabel="Login with OTP instead"
                onPress={toggleOtpLogin}
                hitSlop={8}
                style={({ pressed }) => [styles.switchLinkRow, pressed && styles.pressed]}
              >
                <View style={[styles.switchCheckbox, useOtpLogin && styles.switchCheckboxChecked]}>
                  {useOtpLogin && <MaterialCommunityIcons name="check" size={13} color={theme.colors.textInverse} />}
                </View>
                <Text style={styles.switchLinkText}>Login with OTP instead</Text>
              </Pressable>

              {!!error && <Text style={styles.errorText}>{error}</Text>}
              {error.includes('not registered') ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate(
                      'ProfileSetup',
                      oauthPrefill ? { prefillName: oauthPrefill.name, prefillEmail: oauthPrefill.email } : undefined
                    )
                  }
                  style={styles.registerPromptBtn}
                >
                  <Text style={styles.registerPromptText}>Register Now</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={loginMode === 'email' ? 'Send OTP to email' : useOtpLogin ? 'Login with OTP' : 'Login with password'}
                onPress={handlePrimaryLogin}
                disabled={!canPrimaryLogin || sending || loggingIn}
                style={({ pressed }) => [
                  styles.otpButton,
                  (!canPrimaryLogin || sending || loggingIn) && styles.disabled,
                  pressed && canPrimaryLogin && !sending && !loggingIn && styles.pressed,
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.primaryBright, theme.colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.otpGradient}
                >
                  <Text style={styles.otpButtonText}>{primaryLabel}</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.registerRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() =>
                    navigation.navigate(
                      'ProfileSetup',
                      oauthPrefill ? { prefillName: oauthPrefill.name, prefillEmail: oauthPrefill.email } : undefined
                    )
                  }
                >
                  <Text style={styles.footerLink}>Register</Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('ProviderRegistration')}
                style={styles.providerRegisterLink}
              >
                <MaterialCommunityIcons name="briefcase-plus-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.providerRegisterText}>Register as a service provider</Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <SocialButton icon="google" onPress={handleGoogleLogin} loading={oauthLoading === 'google'} disabled={!!oauthLoading} />
                <SocialButton icon="facebook" disabled />
                <SocialButton icon="apple" disabled />
              </View>

              <View style={styles.secureRow}>
                <MaterialCommunityIcons name="shield-check-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.secureText}>Your data is secure with us</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const SocialButton: React.FC<{
  icon: SocialIcon;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}> = ({ icon, onPress, loading, disabled }) => {
  const iconColor = icon === 'google' ? '#4285F4' : icon === 'facebook' ? '#1877F2' : '#111111';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${icon}`}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.socialButton,
        (disabled || !onPress) && styles.disabled,
        pressed && onPress && !disabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : icon === 'google' ? (
        <GoogleMark />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -120,
    left: -96,
    right: -28,
    height: 370,
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 190,
  },
  header: {
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  backButton: {
    width: theme.MIN_TAP_TARGET,
    height: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    alignItems: 'center',
    paddingTop: 18,
    paddingHorizontal: 28,
  },
  iconHaloOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  iconHaloInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 3,
  },
  welcomeTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    padding: 4,
    marginTop: theme.spacing.xl,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  tabText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  modeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  modeInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeInfoText: {
    flex: 1,
  },
  modeInfoTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  modeInfoSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  inputRow: {
    width: '100%',
    minHeight: 56,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2,
  },
  countryCode: {
    width: 82,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#F0EBE5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  flag: {
    width: 19,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E1DDD8',
    overflow: 'hidden',
  },
  flagStripe: {
    flex: 1,
  },
  flagSaffron: {
    backgroundColor: '#FF9933',
  },
  flagWhite: {
    backgroundColor: '#FFFFFF',
  },
  flagGreen: {
    backgroundColor: '#138808',
  },
  countryCodeText: {
    ...theme.typography.tiny,
    color: theme.colors.text,
    fontWeight: '800',
  },
  numberInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 0,
    ...theme.typography.tiny,
    color: theme.colors.text,
  },
  passwordRow: {
    marginTop: theme.spacing.md,
  },
  passwordIcon: {
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.xs,
  },
  passwordInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 0,
    ...theme.typography.tiny,
    color: theme.colors.text,
  },
  eyeToggle: {
    paddingHorizontal: theme.spacing.xs,
    minHeight: 56,
    justifyContent: 'center',
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  registerPromptBtn: {
    minHeight: theme.MIN_TAP_TARGET,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  registerPromptText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  otpButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.xl,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 3,
  },
  otpGradient: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpButtonText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
  },
  switchLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: theme.MIN_TAP_TARGET,
    marginTop: theme.spacing.sm,
  },
  switchLinkText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  switchCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCheckboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    ...theme.typography.tiny,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  providerRegisterLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12,
  },
  providerRegisterText: {
    ...theme.typography.caption, color: theme.colors.primary, fontWeight: '800',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: theme.spacing.lg,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 2,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.xl,
  },
  secureText: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
