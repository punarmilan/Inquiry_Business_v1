import { NavigatorScreenParams } from '@react-navigation/native';
import type { Offer } from '../types/hyperlocal';
import type { OfferCardDesign } from '../config/offerCardDesigner';
import type { PickedPoster } from '../services/posterUpload';

export type ProfileEditSection = 'profile' | 'kyc' | 'wallet';

export type AuthStackParamList = {
  Onboarding: { force?: boolean } | undefined;
  Splash: undefined;
  PhoneEntry: undefined;
  OtpVerification: { demoOtp: string };
  ProfileSetup: { prefillName?: string; prefillEmail?: string } | undefined;
  LegalDocument: { document: 'terms' | 'privacy' };
};

export type LiveLocationParams = { jobId?: string; bookingId?: string; contextType?: 'job' | 'booking'; otherUserName: string };

export type PostStackParamList = {
  PostMenu: undefined;
  PostEntry: undefined;
  BusinessSetup: { businessId?: string } | undefined;
  Plans: { businessId: string };
  TemplateLibrary: { businessId: string };
  OfferDesignEditor: {
    businessId: string;
    designMode: 'custom' | 'templates';
    initialTemplateId?: string;
    initialDesign?: OfferCardDesign;
    initialTitle?: string;
    initialDescription?: string;
    initialCategory?: string;
    initialImageUrls?: string[];
  };
  CreateOffer: {
    businessId: string;
    offer?: Offer;
    designMode?: 'custom' | 'templates';
    initialDesign?: Offer['cardDesign'];
    initialTitle?: string;
    initialDescription?: string;
    initialCategory?: string;
    initialImageUrls?: string[];
    uploadedPoster?: PickedPoster;
  };
  OfferSubmitted: undefined;
};

export type OffersStackParamList = {
  OffersHome: undefined;
  AllOffers: { latitude: number; longitude: number; cityId?: string; locality?: string };
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
  ServiceCategories: { cityId: string; cityName: string; locality: string };
  ServiceProviders: { cityId: string; cityName: string; locality: string; categoryId: string; categoryName: string };
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
  Payments: undefined;
  LegalDocument: { document: 'terms' | 'privacy' };
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
  SavedLocations: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  Faq: undefined;
  AiAssistant: undefined;
  EditProfile: { section?: ProfileEditSection } | undefined;
  Wallet: undefined;
  LiveLocation: LiveLocationParams;
  ViewProfile: { userId: string };
  ChatList: undefined;
  ChatThread: ChatThreadParams;
  MyBusiness: undefined;
  BusinessSetup: { businessId?: string } | undefined;
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

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
