import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import type { AuthStackParamList } from '../../navigation/types';
import { IllustratedOnboardingPage } from './IllustratedOnboardingPage';
import { onboardingStyles as styles, ONBOARDING_COLORS } from './OnboardingScreen.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;
const ONBOARDING_SEEN_KEY = 'anywork_onboarding_seen_v2';

export const OnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useApp();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pageWidth = Math.max(1, width);
  const cardWidth = Math.max(
    1,
    Math.min(width - 8, 540, (height - insets.top - insets.bottom - 6) * 390 / 734),
  );
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [checkingFirstLaunch, setCheckingFirstLaunch] = useState(true);

  const pages = useMemo(() => [
    {
      key: 'welcome',
      title: t('onboardingWelcomeTitle') + '\n' + t('onboardingWelcomeAccent'),
      subtitle: t('onboardingWelcomeSubtitle'),
    },
    {
      key: 'offers',
      title: t('onboardingOffersTitle') + '\n' + t('onboardingOffersAccent'),
      subtitle: t('onboardingOffersSubtitle'),
    },
    {
      key: 'services',
      title: t('onboardingServicesTitle') + '\n' + t('onboardingServicesAccent'),
      subtitle: t('onboardingServicesSubtitle'),
    },
  ], [t]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((seen) => {
        if (!cancelled && seen === '1' && !route.params?.force) {
          navigation.replace('PhoneEntry');
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCheckingFirstLaunch(false);
      });
    return () => { cancelled = true; };
  }, [navigation, route.params?.force]);

  // Keep the visible page aligned after rotation or a safe-area layout change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: indexRef.current * pageWidth, animated: false });
  }, [pageWidth, checkingFirstLaunch]);

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1').catch(() => undefined);
    navigation.navigate('PhoneEntry');
  }, [navigation]);

  const goToPage = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= pages.length || nextIndex === indexRef.current) return;
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * pageWidth, animated: false });
  }, [pageWidth, pages.length]);

  const goNext = useCallback(() => {
    if (indexRef.current === pages.length - 1) {
      void finishOnboarding();
    } else {
      goToPage(indexRef.current + 1);
    }
  }, [finishOnboarding, goToPage, pages.length]);

  const onPageChange = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (nextIndex >= 0 && nextIndex < pages.length) {
      indexRef.current = nextIndex;
      setIndex(nextIndex);
    }
  };

  if (checkingFirstLaunch) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar hidden barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <MaterialCommunityIcons name="handshake" size={32} color={ONBOARDING_COLORS.primary} />
        </View>
        <ActivityIndicator color={ONBOARDING_COLORS.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#EDFFFC', '#D9F6F0', '#F1FFFD']} style={styles.screen}>
      <StatusBar hidden barStyle="dark-content" />
      <ScrollView
        ref={scrollRef}
        style={styles.carousel}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        snapToInterval={pageWidth}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onPageChange}
      >
        {pages.map((page, pageIndex) => (
          <View key={page.key} style={[styles.page, { width: pageWidth }]}>
            <IllustratedOnboardingPage
              width={cardWidth}
              bottomInset={insets.bottom}
              active={index === pageIndex}
              pageIndex={pageIndex}
              title={page.title}
              subtitle={page.subtitle}
              onNext={goNext}
              onBack={() => goToPage(pageIndex - 1)}
              onSkip={finishOnboarding}
            />
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
};
