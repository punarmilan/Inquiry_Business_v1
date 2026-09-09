import { API_BASE_URL } from './api';

export interface OnboardingSlideFeature {
  icon?: string;
  title: string;
  body: string;
}

export interface OnboardingSlideContent {
  title?: string;
  accent?: string;
  subtitle?: string;
  icon?: string;
  tint?: 'orange' | 'green';
  features?: OnboardingSlideFeature[];
}

export interface AuthFlowContent {
  onboardingSlides?: OnboardingSlideContent[];
  phoneEntry?: {
    title?: string;
    subtitle?: string;
    sendOtpLabel?: string;
  };
  otpVerification?: {
    title?: string;
    otpSentToLabel?: string;
    resendLabel?: string;
    verifyLabel?: string;
  };
  profileSetup?: {
    title?: string;
    nameLabel?: string;
    namePlaceholder?: string;
    locationLabel?: string;
    finishLabel?: string;
  };
}

export interface LoginAnnouncement {
  enabled: boolean;
  title: string;
  body: string;
  imageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
}

export interface RemoteSettings {
  faq?: string;
  'mobile.splash.tagline'?: string;
  'mobile.onboarding.slides'?: OnboardingSlideContent[];
  'mobile.home.heroImageUrl'?: string;
  'mobile.home.heroHeadline'?: string;
  'mobile.home.heroSubhead'?: string;
  'mobile.loginAnnouncement'?: LoginAnnouncement;
  'mobile.authFlow.content'?: AuthFlowContent;
}

export const fetchRemoteSettings = async (): Promise<RemoteSettings> => {
  try {
    const res = await fetch(`${API_BASE_URL}/settings`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) return {};
    return (data.settings ?? {}) as RemoteSettings;
  } catch {
    return {};
  }
};
