import { NavigatorScreenParams } from '@react-navigation/native';
import type { Offer } from '../types/hyperlocal';

export type ProfileEditSection = 'profile' | 'kyc' | 'wallet';

export type AuthStackParamList = {
  Onboarding: { force?: boolean } | undefined;
  Splash: undefined;
  PhoneEntry: undefined;
  OtpVerification: { demoOtp: string };
  ProfileSetup: { prefillName?: string; prefillEmail?: string } | undefined;
  ProviderRegistration: undefined;
};

export type LiveLocationParams = { jobId?: string; bookingId?: string; contextType?: 'job' | 'booking'; otherUserName: string };

export type PostStackParamList = {
  PostEntry: undefined;
  BusinessSetup: { businessId?: string } | undefined;
  Plans: { businessId: string };
  OfferDesignEditor: { businessId: string; designMode: 'custom' | 'templates' };
  CreateOffer: {
    businessId: string;
    offer?: Offer;
    designMode?: 'custom' | 'templates';
    initialDesign?: Offer['cardDesign'];
    initialTitle?: string;
    initialDescription?: string;
    initialCategory?: string;
    initialImageUrls?: string[];
  };
  OfferSubmitted: undefined;
};

export type OffersStackParamList = {
  OffersHome: undefined;
  OfferDetails: { offerId: string; latitude?: number; longitude?: number };
  BusinessDetails: { businessId: string };
  BookingDetails: { bookingId: string };
  LiveLocation: LiveLocationParams;
  Notifications: undefined;
  ChatList: undefined;
  ChatThread: ChatThreadParams;
};

export type ServicesStackParamList = {
  ServicesHome: undefined;
  BookService: { categoryId: string; categoryName: string; basePrice: number; cityId: string; availableAreas?: string[]; providerId?: string };
  MyBookings: undefined;
  BookingDetails: { bookingId: string };
  Notifications: undefined;
  ChatList: undefined;
  ChatThread: ChatThreadParams;
  LiveLocation: LiveLocationParams;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  BusinessCenter: undefined;
  MyBookings: undefined;
  BookingDetails: { bookingId: string };
  LiveLocation: LiveLocationParams;
  MyOffers: undefined;
  CreateOffer: { businessId: string; offer: Offer; designMode?: 'custom' | 'templates' };
  SavedOffers: undefined;
  MyBusiness: undefined;
  BusinessSetup: { businessId?: string } | undefined;
  Plans: { businessId?: string } | undefined;
  Notifications: undefined;
  ChatList: undefined;
  ChatThread: ChatThreadParams;
  Settings: undefined;
  HelpSupport: undefined;
  AiAssistant: undefined;
  OfferDetails: { offerId: string; latitude?: number; longitude?: number };
  BusinessDetails: { businessId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  AiAssistant: undefined;
  EditProfile: { section?: ProfileEditSection } | undefined;
  Wallet: undefined;
  LiveLocation: LiveLocationParams;
  ViewProfile: { userId: string };
  ChatList: undefined;
  ChatThread: ChatThreadParams;
  MyBusiness: undefined;
  Plans: { businessId?: string } | undefined;
  SavedOffers: undefined;
};

export type ChatThreadParams = {
  chatId: string;
  jobId?: string;
  bookingId?: string;
  jobTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
};

export type MainTabParamList = {
  OffersTab: NavigatorScreenParams<OffersStackParamList>;
  ServicesTab: NavigatorScreenParams<ServicesStackParamList>;
  PostTab: NavigatorScreenParams<PostStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type ProviderTabParamList = {
  ProviderHome: undefined;
  ProviderMessages: undefined;
  ProviderDashboard: undefined;
  ProviderProfile: undefined;
};

export type ProviderStackParamList = {
  ProviderTabs: NavigatorScreenParams<ProviderTabParamList>;
  ChatThread: ChatThreadParams;
  LiveLocation: LiveLocationParams;
  ProviderNotifications: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Provider: NavigatorScreenParams<ProviderStackParamList>;
};
