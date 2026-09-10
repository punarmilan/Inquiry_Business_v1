import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type KeyboardEvent,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { GoogleMark } from '../../components/GoogleMark';
import { useApp } from '../../context/AppContext';
import { AuthStackParamList } from '../../navigation/types';
import { signInWithGoogle } from '../../services/socialAuth';
import { isValidIndianPhoneDigits, sanitizeIndianPhoneInput } from '../../utils/phoneValidation';
import { ApiRequestError } from '../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;
type SocialIcon = 'google' | 'facebook' | 'apple';

// Assumes this screen lives under src/screens/... and the asset is at mobile/frontend/assets/login.png.
// If your real file is login.webp/login.jpg, change ONLY the extension on this line.
const LOGIN_BACKGROUND = require('../../../assets/login.png');
// Android keyboards can render a suggestion/password strip above the IME frame
// reported to React Native. The extra clearance keeps the complete OAuth row visible.
const KEYBOARD_CARD_GAP = Platform.OS === 'android' ? 40 : 12;

const authErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError && error.status === 429) {
    return error.message || 'Too many login attempts. Please wait a few minutes and try again.';
  }
  return error instanceof Error ? error.message : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const PhoneEntryScreen: React.FC<Props> = ({ navigation }) => {
  const {
    t,
    language,
    setLanguage,
    loginWithPassword,
    loginWithOAuth,
    requestOtp,
    remoteSettings,
  } = useApp();

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Android's resize mode can temporarily reduce `height` while the IME is open.
  // Keep the form's own dimensions stable so it moves as one panel instead of reflowing.
  const layoutHeightRef = useRef(height);
  if (height > layoutHeightRef.current) {
    layoutHeightRef.current = height;
  }
  const styles = useMemo(
    () => createStyles(width, layoutHeightRef.current, insets.top, insets.bottom),
    [width, height, insets.top, insets.bottom]
  );

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
  const cardRef = useRef<View>(null);
  const keyboardTranslateY = useRef(new Animated.Value(0)).current;
  const appliedKeyboardOffset = useRef(0);

  useEffect(() => {
    const animateCard = (offset: number, duration?: number) => {
      appliedKeyboardOffset.current = offset;
      Animated.timing(keyboardTranslateY, {
        toValue: -offset,
        duration: duration && duration > 0 ? duration : 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const handleKeyboardShow = (event: KeyboardEvent) => {
      // Measure after Android has applied any adjustResize inset. This avoids double-moving
      // the panel, while still handling keyboards that overlay an edge-to-edge window.
      requestAnimationFrame(() => {
        cardRef.current?.measureInWindow((_x, y, _width, cardHeight) => {
          const baseCardBottom = y + cardHeight + appliedKeyboardOffset.current;
          const requiredOffset = Math.max(
            0,
            baseCardBottom - event.endCoordinates.screenY + KEYBOARD_CARD_GAP
          );
          animateCard(requiredOffset, event.duration);
        });
      });
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      animateCard(0, event.duration);
    });

    return () => {
      keyboardTranslateY.stopAnimation();
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardTranslateY]);

  const goBackFromLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Onboarding', { force: true });
  };

  const otpLoginLabel =
    remoteSettings['mobile.authFlow.content']?.phoneEntry?.sendOtpLabel || 'Send OTP';

  const isValid = isValidIndianPhoneDigits(digits);
  const emailValue = email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const passwordValue = password.trim();
  const identifierValid = loginMode === 'email' ? isEmailValid : isValid;
  const canPrimaryLogin = useOtpLogin
    ? identifierValid
    : identifierValid && passwordValue.length >= 6;

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
      const identifier =
        loginMode === 'email' ? { email: emailValue } : { phone: `+91${digits}` };
      await loginWithPassword(identifier, passwordValue);
    } catch (e) {
      const message = authErrorMessage(e, 'Could not log in. Try again.');
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
      const message = authErrorMessage(e, 'Could not send OTP. Try again.');
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
      const message = authErrorMessage(e, 'Could not send OTP. Try again.');
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
      const { idToken, name, email: googleEmail } = await signInWithGoogle();
      googleProfile = { name, email: googleEmail };
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

  // Current source has no dedicated forgot-password route/handler.
  // This safely reuses the already-existing OTP login flow instead of changing backend auth.
  const handleForgotPassword = () => {
    if (!useOtpLogin) {
      setUseOtpLogin(true);
      setError('');
    }
    Alert.alert('Forgot password?', 'OTP login has been enabled so you can continue securely.');
  };

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const goToProfileSetup = () => {
    navigation.navigate(
      'ProfileSetup',
      oauthPrefill
        ? { prefillName: oauthPrefill.name, prefillEmail: oauthPrefill.email }
        : undefined
    );
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <ImageBackground
        source={LOGIN_BACKGROUND}
        resizeMode="cover"
        style={baseStyles.flex}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.softOverlay} />

        <View style={styles.screen}>
          {/* Top navigation */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              onPress={goBackFromLogin}
              style={({ pressed }) => [
                styles.roundTopButton,
                pressed && baseStyles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={styles.metrics.topIcon}
                color="#073B3E"
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change language"
              onPress={handleLanguageToggle}
              style={({ pressed }) => [
                styles.languagePill,
                pressed && baseStyles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                name="web"
                size={styles.metrics.languageIcon}
                color="#073B3E"
              />
              <Text style={styles.languageText}>{String(language || 'en').toUpperCase()}</Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={styles.metrics.languageChevron}
                color="#073B3E"
              />
            </Pressable>
          </View>

          <View style={styles.locationCard} pointerEvents="none">
            <MaterialCommunityIcons
              name="map-marker"
              size={styles.metrics.locationIcon}
              color="#07978F"
            />
            <Text style={styles.locationText}>
              Same{`\n`}neighbourhood.{`\n`}More{`\n`}possibilities.
            </Text>
          </View>

          {/* Error is kept outside the form so it never expands the no-scroll card. */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText} numberOfLines={2}>
                {error}
              </Text>
              {error.includes('not registered') && (
                <Pressable
                  accessibilityRole="button"
                  onPress={goToProfileSetup}
                  hitSlop={8}
                >
                  <Text style={styles.errorAction}>Register Now</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Glass login panel */}
          <Animated.View
            ref={cardRef}
            style={[
              styles.cardWrap,
              { transform: [{ translateY: keyboardTranslateY }] },
            ]}
          >
            <View style={styles.glassCard}>
              {/* Phone / Email segmented control */}
              <View style={styles.segmentOuter}>
                <ModeTab
                  active={loginMode === 'phone'}
                  icon="phone"
                  label="Phone"
                  onPress={() => selectLoginMode('phone')}
                  styles={styles}
                />
                <ModeTab
                  active={loginMode === 'email'}
                  icon="email-outline"
                  label="Email"
                  onPress={() => selectLoginMode('email')}
                  styles={styles}
                />
              </View>

              {/* Phone / email input */}
              {loginMode === 'phone' ? (
                <Pressable
                  style={styles.inputShell}
                  accessibilityRole="button"
                  accessibilityLabel={t('phoneNumber')}
                  onPress={() => inputRef.current?.focus()}
                >
                  <View style={styles.countryCode}>
                    <View style={styles.flag}>
                      <View style={[styles.flagStripe, baseStyles.flagSaffron]} />
                      <View style={[styles.flagStripe, baseStyles.flagWhite]} />
                      <View style={[styles.flagStripe, baseStyles.flagGreen]} />
                    </View>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>

                  <TextInput
                    ref={inputRef}
                    value={digits}
                    onChangeText={(text) =>
                      setDigits(sanitizeIndianPhoneInput(text).digits)
                    }
                    placeholder="Enter your phone number"
                    placeholderTextColor="#8E99AA"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    maxLength={10}
                    returnKeyType={useOtpLogin ? 'go' : 'next'}
                    onSubmitEditing={() => {
                      if (useOtpLogin) {
                        handleSend();
                        return;
                      }
                      passwordInputRef.current?.focus();
                    }}
                    style={styles.phoneInput}
                  />
                </Pressable>
              ) : (
                <View style={styles.inputShell}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={styles.metrics.inputIcon}
                    color="#768399"
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    ref={emailInputRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email address"
                    placeholderTextColor="#8E99AA"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    autoCapitalize="none"
                    returnKeyType={useOtpLogin ? 'go' : 'next'}
                    onSubmitEditing={() => {
                      if (useOtpLogin) {
                        handleSendEmailOtp();
                        return;
                      }
                      passwordInputRef.current?.focus();
                    }}
                    style={styles.textInput}
                  />
                </View>
              )}

              {/* Password */}
              {!useOtpLogin && (
                <View style={styles.inputShell}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={styles.metrics.inputIcon}
                    color="#768399"
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    ref={passwordInputRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#8E99AA"
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={handlePasswordLogin}
                    style={styles.textInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.eyeButton,
                      pressed && baseStyles.pressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={styles.metrics.eyeIcon}
                      color="#768399"
                    />
                  </Pressable>
                </View>
              )}

              {/* OTP + forgot */}
              <View style={styles.optionRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: useOtpLogin }}
                  accessibilityLabel="Login with OTP instead"
                  onPress={toggleOtpLogin}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.otpToggle,
                    pressed && baseStyles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      useOtpLogin && styles.checkboxChecked,
                    ]}
                  >
                    {useOtpLogin && (
                      <MaterialCommunityIcons
                        name="check"
                        size={styles.metrics.checkIcon}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                  <Text style={styles.optionText}>Login with OTP instead</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleForgotPassword}
                  hitSlop={8}
                  style={({ pressed }) => pressed && baseStyles.pressed}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Primary button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  loginMode === 'email'
                    ? useOtpLogin
                      ? 'Send OTP to email'
                      : 'Login with email and password'
                    : useOtpLogin
                      ? 'Login with OTP'
                      : 'Login with password'
                }
                onPress={handlePrimaryLogin}
                disabled={!canPrimaryLogin || sending || loggingIn}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!canPrimaryLogin || sending || loggingIn) && baseStyles.disabled,
                  pressed && canPrimaryLogin && baseStyles.pressed,
                ]}
              >
                <LinearGradient
                  colors={['#0CB5AD', '#047E7B', '#006A68']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryGradient}
                >
                  <View style={styles.primaryCenter}>
                    {(loggingIn || sending) && (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    )}
                    <Text style={styles.primaryText}>{primaryLabel}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={styles.metrics.primaryArrow}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Pressable>

              {/* Register */}
              <View style={styles.registerRow}>
                <Text style={styles.registerMuted}>Don't have an account? </Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={goToProfileSetup}
                >
                  <Text style={styles.registerLink}>Register</Text>
                </Pressable>
              </View>

              {/* Provider registration */}
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('ProviderRegistration')}
                style={({ pressed }) => [
                  styles.providerButton,
                  pressed && baseStyles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={styles.metrics.providerIcon}
                  color="#078D89"
                />
                <Text style={styles.providerText}>Register as a service provider</Text>
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social auth */}
              <View style={styles.socialRow}>
                <SocialButton
                  icon="google"
                  onPress={handleGoogleLogin}
                  loading={oauthLoading === 'google'}
                  disabled={!!oauthLoading}
                  size={styles.metrics.socialSize}
                />
                <SocialButton icon="facebook" disabled size={styles.metrics.socialSize} />
                <SocialButton icon="apple" disabled size={styles.metrics.socialSize} />
              </View>
            </View>
          </Animated.View>
        </View>
      </ImageBackground>
    </ScreenContainer>
  );
};

type ModeTabProps = {
  active: boolean;
  icon: 'phone' | 'email-outline';
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
};

const ModeTab: React.FC<ModeTabProps> = ({ active, icon, label, onPress, styles }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.segmentButton,
      pressed && baseStyles.pressed,
    ]}
  >
    {active && (
      <LinearGradient
        colors={['#0CB5AD', '#078B87']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    )}
    <MaterialCommunityIcons
      name={icon}
      size={styles.metrics.segmentIcon}
      color={active ? '#FFFFFF' : '#667085'}
    />
    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
  </Pressable>
);

const SocialButton: React.FC<{
  icon: SocialIcon;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size: number;
}> = ({ icon, onPress, loading, disabled, size }) => {
  const iconColor =
    icon === 'google' ? '#4285F4' : icon === 'facebook' ? '#1877F2' : '#111111';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${icon}`}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        baseStyles.socialButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        (disabled || !onPress) && baseStyles.socialDisabled,
        pressed && onPress && !disabled && baseStyles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : icon === 'google' ? (
        <GoogleMark />
      ) : (
        <MaterialCommunityIcons name={icon} size={Math.round(size * 0.42)} color={iconColor} />
      )}
    </Pressable>
  );
};

const createStyles = (width: number, height: number, topInset: number, bottomInset: number) => {
  const usableHeight = Math.max(520, height - topInset - bottomInset);
  const scale = clamp(usableHeight / 844, 0.72, 1.04);
  const compact = usableHeight < 720;
  const veryCompact = usableHeight < 640;

  const hPad = clamp(width * 0.055, 18, 30);
  const cardSide = clamp(width * 0.028, 12, 24);
  const cardRatio = veryCompact ? 0.59 : compact ? 0.55 : 0.51;
  const cardHeight = clamp(usableHeight * cardRatio, 378, 470);
  const cardBottom = Math.max(34, bottomInset * 0.18);

  const inputHeight = Math.round(clamp(56 * scale, 44, 58));
  const segmentHeight = Math.round(clamp(50 * scale, 40, 52));
  const primaryHeight = Math.round(clamp(56 * scale, 46, 58));
  const providerHeight = Math.round(clamp(46 * scale, 38, 48));
  const socialSize = Math.round(clamp(54 * scale, 42, 56));


  // ScreenContainer already consumes the top safe-area inset.
  const topNav = Math.max(6, Math.round(6 * scale));
  const heroTop = topNav + Math.round(clamp(58 * scale, 44, 62));
  const locationTop = heroTop + Math.round(clamp(74 * scale, 58, 82));

  const metrics = {
    topIcon: Math.round(clamp(30 * scale, 23, 31)),
    languageIcon: Math.round(clamp(26 * scale, 20, 27)),
    languageChevron: Math.round(clamp(24 * scale, 18, 25)),
    locationIcon: Math.round(clamp(38 * scale, 28, 40)),
    inputIcon: Math.round(clamp(24 * scale, 19, 25)),
    eyeIcon: Math.round(clamp(27 * scale, 21, 28)),
    checkIcon: Math.round(clamp(15 * scale, 11, 16)),
    primaryArrow: Math.round(clamp(28 * scale, 22, 29)),
    providerIcon: Math.round(clamp(23 * scale, 18, 24)),
    segmentIcon: Math.round(clamp(21 * scale, 17, 22)),
    socialSize,
  };

  const sheet = StyleSheet.create({
    backgroundImage: {
      width: '100%',
      height: '145%',
      top: -Math.round(usableHeight * 0.45),
    },
    softOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(228, 251, 255, 0.06)',
    },
    screen: {
      flex: 1,
      overflow: 'hidden',
    },
    topBar: {
      position: 'absolute',
      top: topNav,
      left: hPad,
      right: hPad,
      zIndex: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    roundTopButton: {
      width: Math.round(clamp(58 * scale, 46, 60)),
      height: Math.round(clamp(58 * scale, 46, 60)),
      borderRadius: Math.round(clamp(29 * scale, 23, 30)),
      backgroundColor: 'rgba(255,255,255,0.82)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.82)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0A4B50',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 2,
    },
    languagePill: {
      minWidth: Math.round(clamp(122 * scale, 104, 130)),
      height: Math.round(clamp(58 * scale, 46, 60)),
      borderRadius: Math.round(clamp(29 * scale, 23, 30)),
      paddingHorizontal: Math.round(clamp(16 * scale, 12, 18)),
      backgroundColor: 'rgba(255,255,255,0.84)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.84)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Math.round(clamp(10 * scale, 7, 10)),
      shadowColor: '#0A4B50',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 2,
    },
    languageText: {
      color: '#073B3E',
      fontSize: Math.round(clamp(18 * scale, 15, 19)),
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    heroCopy: {
      position: 'absolute',
      top: heroTop,
      left: hPad + Math.round(8 * scale),
      right: hPad,
      zIndex: 15,
    },
    welcomeTitle: {
      color: '#043C3E',
      fontSize: Math.round(clamp(37 * scale, 28, 39)),
      fontWeight: '900',
      lineHeight: Math.round(clamp(43 * scale, 34, 45)),
      letterSpacing: -0.8,
    },
    welcomeSubtitle: {
      marginTop: Math.round(clamp(10 * scale, 6, 11)),
      color: '#315D68',
      fontSize: Math.round(clamp(17 * scale, 13, 18)),
      fontWeight: '500',
      lineHeight: Math.round(clamp(24 * scale, 18, 25)),
    },
    locationCard: {
      position: 'absolute',
      top: locationTop,
      left: hPad + Math.round(8 * scale),
      zIndex: 14,
      width: Math.round(clamp(width * 0.39, 190, 282)),
      minHeight: Math.round(clamp(90 * scale, 64, 96)),
      paddingHorizontal: Math.round(clamp(12 * scale, 9, 14)),
      paddingVertical: Math.round(clamp(10 * scale, 7, 12)),
      borderRadius: Math.round(clamp(24 * scale, 18, 26)),
      backgroundColor: 'rgba(255,255,255,0.74)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.82)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Math.round(clamp(8 * scale, 5, 9)),
      shadowColor: '#0A4B50',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 2,
    },
    locationText: {
      flex: 1,
      color: '#123D45',
      fontSize: Math.round(clamp(14 * scale, 11, 15)),
      lineHeight: Math.round(clamp(18 * scale, 14, 19)),
      fontWeight: '600',
    },
    errorBanner: {
      position: 'absolute',
      left: cardSide + Math.round(12 * scale),
      right: cardSide + Math.round(12 * scale),
      bottom: cardHeight + cardBottom + Math.round(7 * scale),
      zIndex: 40,
      minHeight: Math.round(clamp(38 * scale, 30, 42)),
      borderRadius: Math.round(clamp(13 * scale, 10, 14)),
      backgroundColor: 'rgba(255,245,245,0.94)',
      borderWidth: 1,
      borderColor: 'rgba(220,70,70,0.28)',
      paddingHorizontal: Math.round(clamp(12 * scale, 9, 13)),
      paddingVertical: Math.round(clamp(7 * scale, 5, 8)),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: {
      flex: 1,
      color: theme.colors.danger,
      fontSize: Math.round(clamp(11.5 * scale, 10, 12)),
      lineHeight: Math.round(clamp(15 * scale, 13, 16)),
      fontWeight: '600',
    },
    errorAction: {
      color: '#087F7B',
      fontSize: Math.round(clamp(11.5 * scale, 10, 12)),
      fontWeight: '800',
    },
    cardWrap: {
      position: 'absolute',
      left: cardSide,
      right: cardSide,
      bottom: cardBottom,
      height: cardHeight,
      zIndex: 20,
    },
    glassCard: {
      flex: 1,
      borderRadius: Math.round(clamp(34 * scale, 26, 38)),
      backgroundColor: 'rgba(247,255,255,0.80)',
      borderWidth: 1.2,
      borderColor: 'rgba(255,255,255,0.90)',
      paddingHorizontal: Math.round(clamp(18 * scale, 13, 20)),
      paddingTop: Math.round(clamp(17 * scale, 12, 19)),
      paddingBottom: Math.round(clamp(12 * scale, 8, 14)),
      shadowColor: '#0C5D61',
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.11,
      shadowRadius: 22,
      elevation: 7,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    glassCardContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      paddingBottom: Math.round(clamp(64 * scale, 48, 68)),
    },
    segmentOuter: {
      height: segmentHeight,
      borderRadius: segmentHeight / 2,
      padding: Math.max(3, Math.round(4 * scale)),
      backgroundColor: 'rgba(255,255,255,0.72)',
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.85)',
    },
    segmentButton: {
      flex: 1,
      borderRadius: segmentHeight / 2,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Math.round(clamp(8 * scale, 5, 8)),
    },
    segmentText: {
      color: '#667085',
      fontSize: Math.round(clamp(15 * scale, 12, 16)),
      fontWeight: '800',
    },
    segmentTextActive: {
      color: '#FFFFFF',
    },
    inputShell: {
      width: '100%',
      height: inputHeight,
      borderRadius: Math.round(clamp(18 * scale, 14, 20)),
      backgroundColor: 'rgba(255,255,255,0.86)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.94)',
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      shadowColor: '#0A4B50',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    countryCode: {
      width: Math.round(clamp(98 * scale, 76, 102)),
      height: '100%',
      borderRightWidth: 1,
      borderRightColor: 'rgba(116,132,151,0.34)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Math.round(clamp(8 * scale, 5, 8)),
    },
    flag: {
      width: Math.round(clamp(26 * scale, 20, 27)),
      height: Math.round(clamp(18 * scale, 14, 19)),
      borderRadius: 2,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      overflow: 'hidden',
    },
    flagStripe: {
      flex: 1,
    },
    countryCodeText: {
      color: '#173B47',
      fontSize: Math.round(clamp(17 * scale, 14, 18)),
      fontWeight: '900',
    },
    phoneInput: {
      flex: 1,
      height: inputHeight,
      paddingHorizontal: Math.round(clamp(15 * scale, 11, 16)),
      paddingVertical: 0,
      color: '#173B47',
      fontSize: Math.round(clamp(15 * scale, 12, 16)),
      fontWeight: '500',
    },
    inputLeftIcon: {
      marginLeft: Math.round(clamp(16 * scale, 12, 17)),
      marginRight: Math.round(clamp(4 * scale, 2, 5)),
    },
    textInput: {
      flex: 1,
      height: inputHeight,
      paddingHorizontal: Math.round(clamp(12 * scale, 9, 13)),
      paddingVertical: 0,
      color: '#173B47',
      fontSize: Math.round(clamp(15 * scale, 12, 16)),
      fontWeight: '500',
    },
    eyeButton: {
      width: Math.round(clamp(48 * scale, 38, 50)),
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionRow: {
      width: '100%',
      minHeight: Math.round(clamp(30 * scale, 24, 32)),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Math.round(clamp(8 * scale, 5, 8)),
    },
    otpToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Math.round(clamp(8 * scale, 5, 8)),
      flexShrink: 1,
    },
    checkbox: {
      width: Math.round(clamp(22 * scale, 18, 23)),
      height: Math.round(clamp(22 * scale, 18, 23)),
      borderRadius: Math.round(clamp(6 * scale, 4, 6)),
      borderWidth: 1.5,
      borderColor: '#95A0B2',
      backgroundColor: 'rgba(255,255,255,0.75)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#078D89',
      borderColor: '#078D89',
    },
    optionText: {
      color: '#078D89',
      fontSize: Math.round(clamp(12.5 * scale, 10, 13)),
      fontWeight: '700',
      flexShrink: 1,
    },
    forgotText: {
      color: '#078D89',
      fontSize: Math.round(clamp(12.5 * scale, 10, 13)),
      fontWeight: '800',
    },
    primaryButton: {
      width: '100%',
      height: primaryHeight,
      borderRadius: primaryHeight / 2,
      overflow: 'hidden',
      shadowColor: '#087F7B',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.20,
      shadowRadius: 10,
      elevation: 3,
    },
    primaryGradient: {
      flex: 1,
      paddingHorizontal: Math.round(clamp(22 * scale, 16, 24)),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    primaryCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Math.round(clamp(8 * scale, 5, 8)),
      marginLeft: Math.round(clamp(20 * scale, 14, 22)),
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: Math.round(clamp(17 * scale, 14, 18)),
      fontWeight: '900',
    },
    registerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Math.round(clamp(23 * scale, 18, 24)),
    },
    registerMuted: {
      color: '#667085',
      fontSize: Math.round(clamp(13 * scale, 11, 14)),
      fontWeight: '500',
    },
    registerLink: {
      color: '#078D89',
      fontSize: Math.round(clamp(13 * scale, 11, 14)),
      fontWeight: '900',
    },
    providerButton: {
      width: '100%',
      height: providerHeight,
      borderRadius: providerHeight / 2,
      borderWidth: 1.2,
      borderColor: 'rgba(8,159,155,0.68)',
      backgroundColor: 'rgba(236,255,255,0.46)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Math.round(clamp(8 * scale, 5, 8)),
    },
    providerText: {
      color: '#078D89',
      fontSize: Math.round(clamp(13.5 * scale, 11, 14)),
      fontWeight: '900',
    },
    dividerRow: {
      width: '100%',
      minHeight: Math.round(clamp(22 * scale, 18, 24)),
      flexDirection: 'row',
      alignItems: 'center',
      gap: Math.round(clamp(10 * scale, 7, 11)),
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(91,110,129,0.34)',
    },
    dividerText: {
      color: '#667085',
      fontSize: Math.round(clamp(12.5 * scale, 10, 13)),
      fontWeight: '500',
    },
    socialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Math.round(clamp(30 * scale, 20, 34)),
      minHeight: socialSize,
    },

  });

  return { ...sheet, metrics };
};

const baseStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.52,
  },
  socialDisabled: {
    opacity: 0.72,
  },
  socialButton: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#0A4B50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 11,
    elevation: 3,
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
});
