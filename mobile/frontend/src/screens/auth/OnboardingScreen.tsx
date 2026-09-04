import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LanguageToggle } from '../../components/LanguageToggle';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type PageKind = 'welcome' | 'offers' | 'services';

const ONBOARDING_SEEN_KEY = 'anywork_onboarding_seen_v2';
const PROFESSIONAL_AVATAR = require('../../../assets/onboarding-cartoon-professional.png');
const CUSTOMER_AVATAR = require('../../../assets/onboarding-cartoon-customer.png');

const useIllustrationMotion = (duration = 2400) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, progress]);

  return progress;
};

type OnboardingPage = {
  kind: PageKind;
  eyebrow: string;
  title: string;
  accent: string;
  subtitle: string;
};

export const OnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useApp();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [checkingFirstLaunch, setCheckingFirstLaunch] = useState(true);

  const pages = useMemo<OnboardingPage[]>(() => [
    { kind: 'welcome', eyebrow: t('onboardingEyebrow'), title: t('onboardingWelcomeTitle'), accent: t('onboardingWelcomeAccent'), subtitle: t('onboardingWelcomeSubtitle') },
    { kind: 'offers', eyebrow: t('onboardingOffersEyebrow'), title: t('onboardingOffersTitle'), accent: t('onboardingOffersAccent'), subtitle: t('onboardingOffersSubtitle') },
    { kind: 'services', eyebrow: t('onboardingServicesEyebrow'), title: t('onboardingServicesTitle'), accent: t('onboardingServicesAccent'), subtitle: t('onboardingServicesSubtitle') },
  ], [t]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((seen) => {
        if (!cancelled && seen === '1' && !route.params?.force) navigation.replace('PhoneEntry');
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCheckingFirstLaunch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigation, route.params?.force]);

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1').catch(() => undefined);
    // Keep this first-run onboarding screen in the auth stack so the user can
    // review it again from the login screen using the back arrow.
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  const goNext = useCallback(() => {
    if (index >= pages.length - 1) {
      finishOnboarding();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  }, [finishOnboarding, index, pages.length, width]);

  const onPageChange = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (nextIndex >= 0 && nextIndex < pages.length) setIndex(nextIndex);
  };

  if (checkingFirstLaunch) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <View style={styles.loadingLogo}><MaterialCommunityIcons name="handshake" size={32} color={theme.colors.primary} /></View>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <LanguageToggle />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.carousel}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPageChange}
        contentContainerStyle={{ width: width * pages.length }}
      >
        {pages.map((page) => (
          <View key={page.kind} style={[styles.page, { width }]}>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{page.eyebrow}</Text>
              <Text style={styles.title}>{page.title}{'\n'}<Text style={styles.titleAccent}>{page.accent}</Text></Text>
              <Text style={styles.subtitle}>{page.subtitle}</Text>
            </View>
            <View style={styles.illustrationArea}>
              {page.kind === 'welcome' ? <WelcomeIllustration /> : null}
              {page.kind === 'offers' ? <OffersIllustration /> : null}
              {page.kind === 'services' ? <ServicesIllustration /> : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.bottomTop}>
          <View style={styles.dots} accessibilityLabel={`Onboarding page ${index + 1} of ${pages.length}`}>
            {pages.map((page, pageIndex) => <View key={page.kind} style={[styles.dot, pageIndex === index && styles.dotActive]} />)}
          </View>
          {index < pages.length - 1 ? (
            <Pressable onPress={finishOnboarding} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('onboardingSkip')}>
              <Text style={styles.skip}>{t('onboardingSkip')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={goNext} accessibilityRole="button" accessibilityLabel={index === pages.length - 1 ? t('onboardingContinue') : t('onboardingNext')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>{index === pages.length - 1 ? t('onboardingContinue') : t('onboardingNext')}</Text>
          <MaterialCommunityIcons name="arrow-right" size={21} color={theme.colors.textInverse} />
        </Pressable>
        <Pressable onPress={finishOnboarding} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t('onboardingAccountHint')} ${t('onboardingSignIn')}`}>
          <Text style={styles.accountHint}>{t('onboardingAccountHint')} <Text style={styles.accountHintAction}>{t('onboardingSignIn')}</Text></Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('ProviderRegistration')}
          accessibilityRole="button"
          accessibilityLabel="Register as a service provider"
          style={({ pressed }) => [styles.providerCta, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="briefcase-plus-outline" size={18} color={theme.colors.primary} />
          <View style={styles.providerCtaCopy}>
            <Text style={styles.providerCtaTitle}>Register as a service provider</Text>
            <Text style={styles.providerCtaSubtitle}>Submit details for admin verification</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
};

type AvatarVariant = 'blue' | 'green' | 'woman';

const AvatarCrop: React.FC<{ variant: AvatarVariant; size: number; style?: StyleProp<ViewStyle> }> = ({ variant, size, style }) => {
  return (
    <View style={[styles.avatarCrop, { width: size, height: size * 1.16 }, style]}>
      <Image source={variant === 'woman' ? CUSTOMER_AVATAR : PROFESSIONAL_AVATAR} resizeMode="contain" style={{ width: size, height: size }} />
    </View>
  );
};

const ServiceChip: React.FC<{ icon: IconName; label: string; style?: StyleProp<ViewStyle> }> = ({ icon, label, style }) => (
  <View style={[styles.serviceChip, style]}>
    <View style={styles.serviceChipIcon}><MaterialCommunityIcons name={icon} size={17} color={theme.colors.primary} /></View>
    <Text style={styles.serviceChipText}>{label}</Text>
  </View>
);

const WelcomeIllustration = () => {
  const { t } = useApp();
  const motion = useIllustrationMotion();
  const cardOffset = motion.interpolate({ inputRange: [0, 1], outputRange: [2, -4] });
  return (
    <View style={styles.welcomeScene}>
      <View style={styles.welcomeBlob} />
      <Animated.View style={[styles.serviceProfileCard, { transform: [{ translateY: cardOffset }] }]}>
        <View style={styles.profileImageBox}><AvatarCrop variant="blue" size={150} /><View style={styles.profileVerified}><MaterialCommunityIcons name="check" size={15} color={theme.colors.textInverse} /></View></View>
        <Text style={styles.profileCardTitle}>{t('onboardingDiscoverServices')}</Text>
        <View style={styles.profileCardLine} />
      </Animated.View>
      <ServiceChip icon="pipe-wrench" label={t('plumbing')} style={styles.chipPlumbing} />
      <ServiceChip icon="broom" label={t('cleaning')} style={styles.chipCleaning} />
      <ServiceChip icon="tools" label={t('homeRepair')} style={styles.chipHandyman} />
      <ServiceChip icon="lightning-bolt-outline" label={t('electrician')} style={styles.chipElectrical} />
    </View>
  );
};

const OffersIllustration = () => {
  const { t } = useApp();
  const motion = useIllustrationMotion(2200);
  const cardOffset = motion.interpolate({ inputRange: [0, 1], outputRange: [2, -4] });
  const tagScale = motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  return <View style={styles.offerScene}>
    <View style={styles.offerGlow} />
    <Animated.View style={[styles.schedulePerson, { transform: [{ translateY: cardOffset }] }]}><AvatarCrop variant="blue" size={150} /></Animated.View>
    <Animated.View style={[styles.calendarCard, { transform: [{ translateY: cardOffset }] }]}>
      <View style={styles.calendarHeader}><Text style={styles.calendarTitle}>{t('pickDateTime')}</Text><View style={styles.calendarArrows}><MaterialCommunityIcons name="chevron-left" size={17} color={theme.colors.textSecondary} /><MaterialCommunityIcons name="chevron-right" size={17} color={theme.colors.textSecondary} /></View></View>
      <View style={styles.weekRow}>{['M', 'T', 'W', 'T', 'F'].map((day, dayIndex) => <Text key={`${day}-${dayIndex}`} style={styles.weekDay}>{day}</Text>)}</View>
      <View style={styles.daysGrid}>{Array.from({ length: 20 }, (_, dayIndex) => <View key={dayIndex} style={[styles.dayCell, dayIndex === 10 && styles.daySelected]}><Text style={[styles.dayText, dayIndex === 10 && styles.daySelectedText]}>{dayIndex + 1}</Text></View>)}</View>
    </Animated.View>
    <View style={styles.timePill}><MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} /><Text style={styles.timeText}>2:00 PM</Text></View>
    <Animated.View style={[styles.offerTag, { transform: [{ rotate: '12deg' }, { scale: tagScale }] }]}><MaterialCommunityIcons name="calendar-check-outline" size={23} color={theme.colors.textInverse} /></Animated.View>
  </View>;
};

const ServicesIllustration = () => {
  const { t } = useApp();
  const motion = useIllustrationMotion(2600);
  const phoneOffset = motion.interpolate({ inputRange: [0, 1], outputRange: [3, -4] });
  const badgeOffset = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return <View style={styles.servicesScene}>
    <View style={styles.servicesBlob} />
    <Animated.View style={[styles.homeSceneCard, { transform: [{ translateY: phoneOffset }] }]}>
      <View style={styles.homeWindow}><View style={styles.homeWindowPane} /><View style={styles.homeWindowPane} /></View>
      <View style={styles.homeLamp}><View style={styles.lampStem} /><View style={styles.lampShade} /></View>
      <View style={styles.homeSofa}><View style={styles.sofaBack} /><View style={styles.sofaSeat} /><View style={styles.sofaArm} /></View>
      <View style={styles.familyAvatars}><View style={styles.smallAvatar}><AvatarCrop variant="woman" size={42} /></View><View style={styles.smallAvatar}><AvatarCrop variant="blue" size={42} /></View></View>
      <View style={styles.homePlant}><View style={styles.plantPot} /><MaterialCommunityIcons name="leaf" size={27} color={theme.colors.secondary} /></View>
    </Animated.View>
    <Animated.View style={[styles.expertCard, { transform: [{ translateY: badgeOffset }] }]}><View style={styles.expertAvatar}><AvatarCrop variant="green" size={55} /></View><View><Text style={styles.expertCardLabel}>{t('onboardingVerifiedProfessionals')}</Text><Text style={styles.expertCardSub}>{t('onboardingTrusted')}</Text></View><MaterialCommunityIcons name="check-decagram" size={20} color={theme.colors.success} /></Animated.View>
  </View>;
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: theme.colors.background },
  loadingLogo: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 22, backgroundColor: theme.colors.background },
  carousel: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 15, paddingBottom: 8 },
  copy: { paddingTop: 5 },
  eyebrow: { ...theme.typography.tiny, color: theme.colors.primary, letterSpacing: 1.2, fontWeight: '900', marginBottom: 12 },
  title: { ...theme.typography.h1, color: theme.colors.text, fontSize: 31, lineHeight: 37, textShadowColor: 'transparent', textShadowRadius: 0 },
  titleAccent: { color: theme.colors.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, maxWidth: 315, marginTop: 11 },
  illustrationArea: { flex: 1, minHeight: 255, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  bottom: { paddingHorizontal: 24, paddingBottom: 22, paddingTop: 5, backgroundColor: theme.colors.background },
  bottomTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 30, marginBottom: 10 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotActive: { width: 24, backgroundColor: theme.colors.primary },
  skip: { ...theme.typography.caption, color: theme.colors.textMuted, fontWeight: '800' },
  primaryButton: { minHeight: 56, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.23, shadowRadius: 13, elevation: 4 },
  primaryButtonText: { ...theme.typography.button, color: theme.colors.textInverse },
  accountHint: { ...theme.typography.tiny, color: theme.colors.textMuted, textAlign: 'center', marginTop: 12 },
  accountHintAction: { color: theme.colors.primary, fontWeight: '900' },
  providerCta: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10, marginTop: 13, backgroundColor: theme.colors.primaryLight },
  providerCtaCopy: { flex: 1 },
  providerCtaTitle: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '900' },
  providerCtaSubtitle: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 2 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  welcomeScene: { width: 320, height: 286, alignItems: 'center', justifyContent: 'center' },
  welcomeBlob: { position: 'absolute', bottom: 15, width: 282, height: 228, borderRadius: 76, backgroundColor: theme.colors.primaryLight },
  avatarCrop: { overflow: 'hidden' },
  serviceProfileCard: { width: 188, height: 236, borderRadius: 24, padding: 12, alignItems: 'center', backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 5 },
  profileImageBox: { width: 164, height: 150, borderRadius: 18, alignItems: 'center', overflow: 'hidden', backgroundColor: 'transparent' },
  profileVerified: { position: 'absolute', right: 12, bottom: 11, width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderWidth: 3, borderColor: theme.colors.surface },
  profileCardTitle: { ...theme.typography.bodyBold, color: theme.colors.text, alignSelf: 'flex-start', marginTop: 12 },
  profileCardLine: { width: 126, height: 7, borderRadius: 4, alignSelf: 'flex-start', marginTop: 8, backgroundColor: theme.colors.surfaceAlt },
  serviceChip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', minHeight: 43, paddingHorizontal: 9, paddingRight: 13, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.98)', shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 1, shadowRadius: 12, elevation: 5 },
  serviceChipIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 7, backgroundColor: theme.colors.primaryLight },
  serviceChipText: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '800' },
  chipPlumbing: { left: -3, top: 127 },
  chipCleaning: { right: -2, top: 75 },
  chipHandyman: { left: 10, bottom: 28 },
  chipElectrical: { right: 10, bottom: 28 },
  welcomeCore: { width: 192, height: 232, borderRadius: 34, padding: 16, backgroundColor: theme.colors.surface, borderWidth: 3, borderColor: theme.colors.primary, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 18, elevation: 6, transform: [{ rotate: '-2deg' }] },
  welcomeCoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  welcomeCoreMark: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  welcomeCoreLine: { flex: 1, height: 7, borderRadius: 4, backgroundColor: theme.colors.primaryLight },
  welcomeCoreMenu: { gap: 3 },
  welcomeCoreMenuDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.primaryDark },
  welcomeCoreIcon: { alignSelf: 'center', width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginTop: 23, backgroundColor: theme.colors.primaryLight },
  welcomeCoreTitleLine: { width: 112, height: 10, borderRadius: 5, marginTop: 18, backgroundColor: theme.colors.secondaryLight },
  welcomeCoreTextLine: { width: 140, height: 7, borderRadius: 4, marginTop: 8, backgroundColor: theme.colors.surfaceAlt },
  welcomeCoreTextLineShort: { width: 95, height: 7, borderRadius: 4, marginTop: 6, backgroundColor: theme.colors.surfaceAlt },
  welcomeCoreAction: { position: 'absolute', right: 16, bottom: 15, width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary },
  floatingCard: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 52, borderRadius: 15, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 1, shadowRadius: 12, elevation: 5 },
  nearCard: { left: 0, top: 51 },
  trustCard: { right: 1, bottom: 39, paddingHorizontal: 13 },
  floatingLabel: { ...theme.typography.tiny, color: theme.colors.textMuted },
  floatingValue: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '900', marginTop: 1 },
  trustText: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '900' },
  offerScene: { width: 320, height: 278, alignItems: 'center', justifyContent: 'center' },
  offerGlow: { position: 'absolute', width: 258, height: 218, borderRadius: 70, backgroundColor: theme.colors.primaryLight },
  schedulePerson: { position: 'absolute', left: -2, bottom: 9, width: 154, height: 176, alignItems: 'center', overflow: 'hidden' },
  calendarCard: { position: 'absolute', right: 1, top: 26, width: 208, height: 207, borderRadius: 19, padding: 13, backgroundColor: 'rgba(255,255,255,0.97)', borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.22, shadowRadius: 15, elevation: 5 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  calendarArrows: { flexDirection: 'row', gap: 2 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 2 },
  weekDay: { ...theme.typography.tiny, width: 27, color: theme.colors.textMuted, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 7 },
  dayCell: { width: 27, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: theme.colors.primary },
  dayText: { ...theme.typography.tiny, color: theme.colors.textSecondary },
  daySelectedText: { color: theme.colors.textInverse, fontWeight: '900' },
  timePill: { position: 'absolute', right: 3, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 13, borderRadius: 14, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 11, elevation: 4 },
  timeText: { ...theme.typography.bodyBold, color: theme.colors.text },
  offerCard: { width: 232, borderRadius: 21, overflow: 'hidden', backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 5, transform: [{ rotate: '-3deg' }] },
  offerImage: { height: 119, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondaryLight },
  offerCardBody: { padding: 14 },
  offerLineLong: { width: 135, height: 10, borderRadius: 5, backgroundColor: '#DDE9E8' },
  offerLineShort: { width: 88, height: 8, borderRadius: 4, backgroundColor: '#EDF2F2', marginTop: 8 },
  offerPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  offerPrice: { ...theme.typography.h3, color: theme.colors.primaryDark },
  discount: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: theme.colors.primaryLight },
  discountText: { ...theme.typography.tiny, color: theme.colors.primaryDark, fontWeight: '900' },
  approvedPill: { position: 'absolute', left: 7, bottom: 35, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, minHeight: 40, borderRadius: 13, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 },
  approvedText: { ...theme.typography.tiny, color: theme.colors.success, fontWeight: '900' },
  offerTag: { position: 'absolute', right: 14, top: 30, width: 55, height: 55, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, transform: [{ rotate: '12deg' }], shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.25, shadowRadius: 11, elevation: 4 },
  servicesScene: { width: 320, height: 278, alignItems: 'center', justifyContent: 'center' },
  servicesBlob: { position: 'absolute', width: 263, height: 226, borderRadius: 70, backgroundColor: theme.colors.secondaryLight },
  homeSceneCard: { width: 242, height: 222, borderRadius: 24, alignItems: 'center', overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.primary, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 5 },
  homeWindow: { position: 'absolute', left: 22, top: 27, width: 63, height: 61, flexDirection: 'row', padding: 5, gap: 4, backgroundColor: theme.colors.primaryLight, borderWidth: 2, borderColor: theme.colors.border },
  homeWindowPane: { flex: 1, borderRightWidth: 1, borderColor: theme.colors.primary },
  homeLamp: { position: 'absolute', top: 19, right: 55, alignItems: 'center' },
  lampStem: { width: 2, height: 25, backgroundColor: theme.colors.textMuted },
  lampShade: { width: 31, height: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: theme.colors.primaryLight },
  homeSofa: { position: 'absolute', bottom: 24, left: 47, width: 148, height: 87, alignItems: 'center' },
  sofaBack: { width: 139, height: 49, borderRadius: 18, backgroundColor: theme.colors.secondaryLight },
  sofaSeat: { position: 'absolute', bottom: 0, width: 151, height: 48, borderRadius: 17, backgroundColor: theme.colors.primaryLight },
  sofaArm: { position: 'absolute', left: -9, bottom: 3, width: 23, height: 55, borderRadius: 12, backgroundColor: theme.colors.secondaryLight },
  familyAvatars: { position: 'absolute', bottom: 48, flexDirection: 'row', gap: 9 },
  smallAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', overflow: 'hidden', backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.colors.surface },
  homePlant: { position: 'absolute', left: 17, bottom: 21, alignItems: 'center' },
  plantPot: { width: 27, height: 20, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: theme.colors.secondaryLight },
  expertCard: { position: 'absolute', right: -2, bottom: 11, flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 55, maxWidth: 238, paddingHorizontal: 9, borderRadius: 17, backgroundColor: theme.colors.secondary, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.25, shadowRadius: 13, elevation: 5 },
  expertAvatar: { width: 45, height: 45, borderRadius: 23, overflow: 'hidden', backgroundColor: 'transparent' },
  expertCardLabel: { ...theme.typography.tiny, color: theme.colors.textInverse, fontWeight: '900' },
  expertCardSub: { ...theme.typography.tiny, color: 'rgba(255,255,255,0.76)', marginTop: 2 },
  servicePhone: { width: 196, minHeight: 244, borderRadius: 27, padding: 17, backgroundColor: theme.colors.surface, borderWidth: 4, borderColor: theme.colors.primary, shadowColor: theme.colors.shadowStrong, shadowOffset: { width: 0, height: 11 }, shadowOpacity: 0.23, shadowRadius: 17, elevation: 5 },
  servicePhoneTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  servicePhoneDot: { width: 18, height: 5, borderRadius: 3, backgroundColor: theme.colors.primaryLight },
  servicePhoneLine: { width: 53, height: 5, borderRadius: 3, backgroundColor: theme.colors.border },
  servicePhoneTitle: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 17 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  serviceTile: { width: 70, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  bookButton: { height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 15, backgroundColor: theme.colors.primary },
  bookButtonText: { ...theme.typography.tiny, color: theme.colors.textInverse, fontWeight: '900' },
  verifiedPill: { position: 'absolute', right: -1, bottom: 37, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, minHeight: 42, borderRadius: 13, backgroundColor: theme.colors.secondary, shadowColor: theme.colors.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  verifiedText: { ...theme.typography.tiny, color: theme.colors.textInverse, fontWeight: '900' },
});
