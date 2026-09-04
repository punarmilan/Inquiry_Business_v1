import Constants from 'expo-constants';
import type {
  AccountType,
  AccountTypeChange,
  CategoryMeta,
  EmployerKind,
  Gender,
  JobCategory,
  KycProfile,
  WalletProfile,
  WalletTransaction,
} from '../types';
import type {
  Business,
  City,
  Offer,
  OfferTemplate,
  PaginatedResponse,
  Plan,
  ServiceBooking,
  ServiceCategory,
  ServiceProvider,
  Subscription,
} from '../types/hyperlocal';
import type { OfferCardDesign } from '../config/offerCardDesigner';
import type { OfferSticker } from '../config/offerStickers';

const API_PORT = 5000;

// Last resort only: used for production builds. Local dev should use the Expo host.
const FALLBACK_API_BASE_URL = 'https://app_api.inquiry.business';

const isTunnelHost = (host: string) =>
  host.endsWith('.exp.direct') || host.endsWith('.ngrok.io') || host.endsWith('.loca.lt');

const parseHostUri = (hostUri: string) => {
  const uri = hostUri.includes('://') ? hostUri : `http://${hostUri}`;
  try {
    const parsed = new URL(uri);
    return parsed.hostname;
  } catch {
    return undefined;
  }
};

const deriveApiBaseUrl = (): string => {
  const explicitApiBaseUrl = (Constants.expoConfig as any)?.extra?.apiBaseUrl;
  if (explicitApiBaseUrl) return explicitApiBaseUrl;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest as any)?.debuggerHost ||
    (Constants as any).manifest2?.hostUri;

  const host = hostUri ? parseHostUri(hostUri) : undefined;
  if (host && !isTunnelHost(host)) {
    return `http://${host}:${API_PORT}`;
  }

  return FALLBACK_API_BASE_URL;
};

export const API_BASE_URL = deriveApiBaseUrl();

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: { path: string; message: string }[];

  constructor(status: number, message: string, code?: string, details?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  query?: object;
}

const toQueryString = (query?: RequestOptions['query']) => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query as Record<string, string | number | boolean | undefined>).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// The access token is short-lived (15 min server-side) by design — kept in sync with
// AppContext's `tokens` state via setAuthTokens/setAuthHandlers so `request()` can silently
// refresh it and retry on expiry, without every call site that threads accessToken through
// explicitly needing to know about it. Without this, any screen that takes the user a few
// minutes to use (Wallet setup, KYC, ...) hit a raw "token expired" error mid-flow.
let currentTokens: TokenPair | null = null;
let onTokensRefreshed: ((tokens: TokenPair) => void) | null = null;
let onAuthExpired: (() => void) | null = null;
let refreshInFlight: Promise<TokenPair> | null = null;
let onRequestStart: (() => void) | null = null;
let onRequestEnd: (() => void) | null = null;

export const setAuthTokens = (tokens: TokenPair | null) => {
  currentTokens = tokens;
};

export const setAuthHandlers = (handlers: {
  onTokensRefreshed?: (tokens: TokenPair) => void;
  onAuthExpired?: () => void;
}) => {
  onTokensRefreshed = handlers.onTokensRefreshed ?? null;
  onAuthExpired = handlers.onAuthExpired ?? null;
};

export const setRequestLifecycleHandlers = (handlers: {
  onRequestStart?: () => void;
  onRequestEnd?: () => void;
}) => {
  onRequestStart = handlers.onRequestStart ?? null;
  onRequestEnd = handlers.onRequestEnd ?? null;
};

// Lets a caller read back whatever the current pair is after an await, in case a silent
// refresh (see refreshAccessToken below) rotated it mid-request.
export const getAuthTokens = () => currentTokens;

const rawFetch = async (path: string, options: RequestOptions) => {
  const res = await fetch(`${API_BASE_URL}${path}${toQueryString(options.query)}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
};

const refreshAccessToken = async (): Promise<TokenPair> => {
  if (!currentTokens?.refreshToken) {
    throw new ApiRequestError(401, 'Session expired', 'AUTH_TOKEN_INVALID');
  }
  if (!refreshInFlight) {
    // Concurrent requests that all 401 at once share one refresh call instead of each
    // racing to rotate the refresh token (the server revokes it on every use).
    refreshInFlight = (async () => {
      const { res, data } = await rawFetch('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: currentTokens!.refreshToken },
      });
      if (!res.ok || data.success === false) {
        throw new ApiRequestError(res.status, data.error?.message ?? 'Session expired', data.error?.code ?? data.code);
      }
      const tokens: TokenPair = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      currentTokens = tokens;
      onTokensRefreshed?.(tokens);
      return tokens;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  if (!isRetry) onRequestStart?.();
  try {
  const { res, data } = await rawFetch(path, options);

  if (!res.ok || data.success === false) {
    const code = data.error?.code ?? data.code;
    const isExpiredAccessToken =
      res.status === 401 &&
      !!options.accessToken &&
      !isRetry &&
      ['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_MISSING', 'AUTH_TOKEN_INVALID_TYPE'].includes(code);

    if (isExpiredAccessToken) {
      try {
        const fresh = await refreshAccessToken();
        return request<T>(path, { ...options, accessToken: fresh.accessToken }, true);
      } catch (refreshError) {
        // Only force a logout when the server actually rejected the refresh token (expired,
        // revoked, or user deactivated) — a network blip while refreshing shouldn't sign
        // someone out, just surface the original error and let them retry.
        if (refreshError instanceof ApiRequestError) {
          onAuthExpired?.();
        }
      }
    }

    throw new ApiRequestError(
      res.status,
      data.error?.message ?? data.message ?? 'Something went wrong',
      code,
      data.error?.details
    );
  }

  return data as T;
  } finally {
    if (!isRetry) onRequestEnd?.();
  }
}

export interface BackendUser {
  _id: string;
  name?: string;
  phone: string;
  photoUrl?: string;
  email?: string;
  role?: 'user' | 'staff' | 'worker' | 'admin' | 'superadmin';
  accountType?: AccountType;
  dateOfBirth?: string;
  gender?: Gender;
  languages?: string[];
  education?: string;
  currentAddress?: string;
  workerProfile?: {
    skills?: string[];
    experienceYears?: number;
    preferredWorkCategories?: JobCategory[];
    workRadiusKm?: number;
  };
  employerProfile?: {
    kind?: EmployerKind;
    companyName?: string;
    gstNumber?: string;
    officeAddress?: string;
    companyLogoUrl?: string;
    companyVerificationRequested?: boolean;
  };
  kyc?: KycProfile;
  wallet?: WalletProfile;
  accountTypeChange?: AccountTypeChange;
  location?: {
    type: 'Point';
    coordinates?: [number, number];
    address?: string;
  };
  ratingAverage: number;
  ratingCount: number;
  jobsCompletedCount: number;
  jobsPostedCount: number;
  aadhaarVerification?: { isVerified: boolean };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface BackendCategory {
  _id: string;
  key: string;
  name: string;
  groupKey: string;
  groupName: string;
  icon: string;
  color: string;
  kycDocumentLabel?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const toCategoryMeta = (category: BackendCategory): CategoryMeta => ({
  key: category.key,
  label: category.name,
  groupKey: category.groupKey,
  groupName: category.groupName,
  icon: category.icon,
  color: category.color,
  kycDocumentLabel: category.kycDocumentLabel,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
});

export const listCategories = () =>
  request<{ success: true; categories: BackendCategory[] }>('/categories');

export interface BackendAd {
  _id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  targetAccountType: AccountType | 'all';
  isActive: boolean;
  sortOrder: number;
}

export const listAds = (accountType?: AccountType) =>
  request<{ success: true; ads: BackendAd[] }>('/ads', { query: { accountType } });

export const listAdminCategories = (accessToken: string, includeInactive = true) =>
  request<{ success: true; categories: BackendCategory[] }>('/admin/categories', {
    accessToken,
    query: { includeInactive },
  });

export const createAdminCategory = (accessToken: string, category: Omit<CategoryMeta, 'labelKey'>) =>
  request<{ success: true; category: BackendCategory }>('/admin/categories', {
    method: 'POST',
    accessToken,
    body: {
      key: category.key,
      name: category.label,
      groupKey: category.groupKey,
      groupName: category.groupName,
      icon: category.icon,
      color: category.color,
      kycDocumentLabel: category.kycDocumentLabel,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    },
  });

export const updateAdminCategory = (accessToken: string, key: string, category: Partial<Omit<CategoryMeta, 'key' | 'labelKey'>>) =>
  request<{ success: true; category: BackendCategory }>(`/admin/categories/${key}`, {
    method: 'PUT',
    accessToken,
    body: {
      ...(category.label !== undefined ? { name: category.label } : {}),
      ...(category.groupKey !== undefined ? { groupKey: category.groupKey } : {}),
      ...(category.groupName !== undefined ? { groupName: category.groupName } : {}),
      ...(category.icon !== undefined ? { icon: category.icon } : {}),
      ...(category.color !== undefined ? { color: category.color } : {}),
      ...(category.kycDocumentLabel !== undefined ? { kycDocumentLabel: category.kycDocumentLabel } : {}),
      ...(category.sortOrder !== undefined ? { sortOrder: category.sortOrder } : {}),
      ...(category.isActive !== undefined ? { isActive: category.isActive } : {}),
    },
  });

// Exactly one of phone/email — email-based OTP is only for logging into an existing account
// (accounts are always created phone-first), see authController.sendOtp/verifyOtp.
export type AuthIdentifier = { phone: string; email?: undefined } | { phone?: undefined; email: string };

export const sendOtp = (identifier: AuthIdentifier, intent: 'login' | 'register' = 'login') =>
  request<{ success: true; otp: string; message: string }>('/auth/send-otp', {
    method: 'POST',
    body: { ...identifier, intent },
  });

export const verifyOtp = (identifier: AuthIdentifier, otp: string, intent: 'login' | 'register' = 'login') =>
  request<{ success: true; user: BackendUser; isNewUser: boolean } & TokenPair>('/auth/verify-otp', {
    method: 'POST',
    body: { ...identifier, otp, intent },
  });

export const loginWithPassword = (identifier: AuthIdentifier, password: string) =>
  request<{ success: true; user: BackendUser; isNewUser: false } & TokenPair>('/auth/login', {
    method: 'POST',
    body: { ...identifier, password },
  });

export type OAuthProvider = 'google' | 'facebook';

// Only logs into an existing account (the one whose profile has this email attached) —
// same rule as email-based OTP login, see authController.oauthLogin.
export const oauthLogin = (provider: OAuthProvider, token: string) =>
  request<{ success: true; user: BackendUser; isNewUser: false } & TokenPair>('/auth/oauth', {
    method: 'POST',
    body: { provider, token },
  });

// Creates a new account directly from a verified Google/Facebook profile — no OTP round-trip,
// see authController.oauthRegister. Phone is required but NOT verified at this step.
export const oauthRegister = (provider: OAuthProvider, token: string, phone: string, accountType: AccountType) =>
  request<{ success: true; user: BackendUser; isNewUser: true } & TokenPair>('/auth/oauth-register', {
    method: 'POST',
    body: { provider, token, phone, accountType, termsAccepted: true },
  });

export const getProfile = (accessToken: string) =>
  request<{ success: true; user: BackendUser }>('/users/profile', {
    accessToken,
  });

export const updateProfile = (
  accessToken: string,
  profile: {
    name: string;
    photoUrl?: string;
    email?: string;
    password?: string;
    accountType?: AccountType;
    termsAccepted?: boolean;
    termsAcceptedAt?: string;
    dateOfBirth?: string;
    gender?: Gender;
    languages?: string[];
    education?: string;
    currentAddress?: string;
    workerProfile?: {
      skills?: string[];
      experienceYears?: number;
      preferredWorkCategories?: JobCategory[];
      workRadiusKm?: number;
    };
    employerProfile?: {
      kind?: EmployerKind;
      companyName?: string;
      gstNumber?: string;
      officeAddress?: string;
      companyLogoUrl?: string;
      companyVerificationRequested?: boolean;
    };
    kyc?: {
      aadhaarCardUrl?: string;
      selfieUrl?: string;
      drivingLicenseUrl?: string;
      categoryDocuments?: KycProfile['categoryDocuments'];
    };
    wallet?: {
      upiId?: string;
      bankAccountNumber?: string;
      bankAccountHolderName?: string;
      ifscCode?: string;
      panNumber?: string;
    };
    location?: { latitude: number; longitude: number; address: string };
  }
) =>
  request<{ success: true; user: BackendUser }>('/users/profile', {
    method: 'PUT',
    accessToken,
    body: {
      name: profile.name,
      ...(profile.photoUrl ? { photoUrl: profile.photoUrl } : {}),
      ...(profile.email ? { email: profile.email } : {}),
      ...(profile.password ? { password: profile.password } : {}),
      ...(profile.accountType ? { accountType: profile.accountType } : {}),
      ...(profile.termsAccepted !== undefined ? { termsAccepted: profile.termsAccepted } : {}),
      ...(profile.termsAcceptedAt ? { termsAcceptedAt: profile.termsAcceptedAt } : {}),
      ...(profile.dateOfBirth ? { dateOfBirth: profile.dateOfBirth } : {}),
      ...(profile.gender ? { gender: profile.gender } : {}),
      ...(profile.languages ? { languages: profile.languages } : {}),
      ...(profile.education ? { education: profile.education } : {}),
      ...(profile.currentAddress ? { currentAddress: profile.currentAddress } : {}),
      ...(profile.workerProfile ? { workerProfile: profile.workerProfile } : {}),
      ...(profile.employerProfile ? { employerProfile: profile.employerProfile } : {}),
      ...(profile.kyc ? { kyc: profile.kyc } : {}),
      ...(profile.wallet ? { wallet: profile.wallet } : {}),
      ...(profile.location
        ? {
            location: {
              lat: profile.location.latitude,
              lng: profile.location.longitude,
              address: profile.location.address,
            },
          }
        : {}),
    },
  });

export const requestAccountTypeChange = (accessToken: string, requestedType: AccountType) =>
  request<{ success: true; user: BackendUser }>('/users/account-type/request', {
    method: 'POST',
    accessToken,
    body: { requestedType },
  });

export const cancelAccountTypeChangeRequest = (accessToken: string) =>
  request<{ success: true; user: BackendUser }>('/users/account-type/request', {
    method: 'DELETE',
    accessToken,
  });

// ---- Wallet ----

export const addWalletMoney = (accessToken: string, amount: number) =>
  request<{ success: true; user: BackendUser; transaction: WalletTransaction }>('/users/wallet/add-money', {
    method: 'POST',
    accessToken,
    body: { amount },
  });

export const withdrawWalletMoney = (accessToken: string, amount: number) =>
  request<{ success: true; user: BackendUser; transaction: WalletTransaction }>('/users/wallet/withdraw', {
    method: 'POST',
    accessToken,
    body: { amount },
  });

export const listWalletTransactions = (accessToken: string, query: { page?: number; limit?: number } = {}) =>
  request<{ success: true; data: WalletTransaction[]; pagination: PaginationMeta }>('/users/wallet/transactions', {
    accessToken,
    query,
  });

export interface PublicProfileReview {
  _id: string;
  score: number;
  comment?: string;
  createdAt: string;
  raterName?: string;
  raterPhotoUrl?: string;
}

export interface PublicProfile {
  _id: string;
  name?: string;
  photoUrl?: string;
  accountType?: AccountType;
  skills: string[];
  experienceYears?: number;
  isKycVerified: boolean;
  ratingAverage: number;
  ratingCount: number;
  jobsCompletedCount: number;
  memberSince: string;
  reviews: PublicProfileReview[];
}

export const getPublicProfile = (accessToken: string, userId: string) =>
  request<{ success: true; profile: PublicProfile }>(`/users/${userId}/profile`, { accessToken });

// ---- Jobs ----

export interface BackendJobApplicant {
  userId: BackendUser;
  status: 'applied' | 'accepted' | 'rejected' | 'cancelled';
  appliedAt: string;
  updatedAt: string;
}

export interface BackendJob {
  _id: string;
  postedBy: BackendUser;
  category: string;
  categoryGroup?: string;
  title: string;
  description: string;
  location: { type: 'Point'; coordinates: [number, number]; address: string };
  duration: number;
  payAmount: number;
  peopleNeeded: number;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  applicants: BackendJobApplicant[];
  acceptedApplicant?: BackendUser;
  workerOtp?: {
    code?: string;
    verifiedAt?: string;
    verifiedBy?: string;
  };
  scheduledFor: string;
  endAt?: string;
  suggestedMinimumPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateJobPayload {
  category: string;
  title: string;
  description: string;
  location: { lat: number; lng: number; address: string };
  city?: string;
  area?: string;
  duration: number;
  payAmount: number;
  peopleNeeded: number;
  scheduledFor: string;
}

export interface PriceSuggestion {
  suggestedMinimum: number;
  currency: string;
  source: string;
}

export const getPriceSuggestion = (
  accessToken: string,
  query: { city?: string; area?: string; category?: string; durationMinutes: number }
) =>
  request<{ success: true; data: PriceSuggestion }>('/jobs/price-suggestion', {
    method: 'POST',
    accessToken,
    body: query,
  });

export const createJob = (accessToken: string, payload: CreateJobPayload) =>
  request<{ success: true; job: BackendJob }>('/jobs', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export interface ListJobsQuery {
  category?: string;
  categoryGroup?: string;
  status?: string;
  mine?: boolean;
  applied?: boolean;
  search?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  payMin?: number;
  payMax?: number;
  date?: string;
  page?: number;
  limit?: number;
}

export const listJobs = (accessToken: string, query: ListJobsQuery = {}) =>
  request<{ success: true; data: BackendJob[]; pagination: PaginationMeta }>('/jobs', {
    accessToken,
    query,
  });

export const getJob = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}`, { accessToken });

export const updateJob = (accessToken: string, jobId: string, payload: Partial<CreateJobPayload>) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}`, {
    method: 'PUT',
    accessToken,
    body: payload,
  });

export const deleteJob = (accessToken: string, jobId: string) =>
  request<{ success: true; message: string }>(`/jobs/${jobId}`, {
    method: 'DELETE',
    accessToken,
  });

export const applyToJob = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/apply`, {
    method: 'POST',
    accessToken,
  });

export const cancelAcceptedApplication = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/application/cancel`, {
    method: 'POST',
    accessToken,
  });

export const getCallInfo = (accessToken: string, jobId: string) =>
  request<{ success: true; name: string; phone: string }>(`/jobs/${jobId}/call-info`, {
    accessToken,
  });

export interface JobLocationShare {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

export const getJobLocations = (accessToken: string, jobId: string) =>
  request<{ success: true; data: JobLocationShare[] }>(`/jobs/${jobId}/location`, {
    accessToken,
  });

export const getServiceBookingLocations = (accessToken: string, bookingId: string) =>
  request<{ success: true; data: JobLocationShare[] }>(`/services/bookings/${bookingId}/location`, {
    accessToken,
  });

export const acceptApplicant = (accessToken: string, jobId: string, userId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/applicants/${userId}/accept`, {
    method: 'POST',
    accessToken,
  });

export const rejectApplicant = (accessToken: string, jobId: string, userId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/applicants/${userId}/reject`, {
    method: 'POST',
    accessToken,
  });

export const completeJob = (accessToken: string, jobId: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/complete`, {
    method: 'POST',
    accessToken,
  });

export const getJobChat = (accessToken: string, jobId: string, applicantId?: string) =>
  request<{ success: true; chat: BackendChat | null }>(`/jobs/${jobId}/chat`, {
    accessToken,
    query: applicantId ? { applicantId } : undefined,
  });

export const verifyWorkerOtp = (accessToken: string, jobId: string, otp: string) =>
  request<{ success: true; job: BackendJob }>(`/jobs/${jobId}/worker-otp/verify`, {
    method: 'POST',
    accessToken,
    body: { otp },
  });

// ---- Chat ----

export interface BackendChat {
  _id: string;
  job: { _id: string; title: string; status: string } | string;
  poster: BackendUser | string;
  applicant: BackendUser | string;
  otherUser?: BackendUser;
  unreadCount: number | { poster: number; applicant: number };
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSender?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMessage {
  _id: string;
  chat: string;
  sender: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const listThreads = (accessToken: string, query: { page?: number; limit?: number } = {}) =>
  request<{ success: true; data: BackendChat[]; pagination: PaginationMeta }>('/chats', {
    accessToken,
    query,
  });

export const getThreadMessages = (
  accessToken: string,
  chatId: string,
  query: { before?: string; page?: number; limit?: number } = {}
) =>
  request<{ success: true; data: BackendMessage[]; pagination: PaginationMeta }>(`/chats/${chatId}/messages`, {
    accessToken,
    query,
  });

export const sendMessage = (accessToken: string, chatId: string, text: string) =>
  request<{ success: true; message: BackendMessage }>(`/chats/${chatId}/messages`, {
    method: 'POST',
    accessToken,
    body: { text },
  });

export const markThreadRead = (accessToken: string, chatId: string) =>
  request<{ success: true; chat: BackendChat }>(`/chats/${chatId}/read`, {
    method: 'POST',
    accessToken,
  });

// ---- AI Assistant ----

export interface BackendAiChatMessage {
  _id: string;
  user: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const getAiChatMessages = (accessToken: string, query: { limit?: number } = {}) =>
  request<{ success: true; data: BackendAiChatMessage[] }>('/ai-chat', {
    accessToken,
    query,
  });

export const sendAiChatMessage = (accessToken: string, text: string) =>
  request<{ success: true; message: BackendAiChatMessage }>('/ai-chat', {
    method: 'POST',
    accessToken,
    body: { text },
  });

// ---- Places (location search) ----

export interface PlaceSuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

export const placesAutocomplete = (
  accessToken: string,
  query: { input: string; lat?: number; lng?: number; sessionToken?: string }
) =>
  request<{ success: true; data: PlaceSuggestion[] }>('/places/autocomplete', {
    accessToken,
    query,
  });

export const getPlaceLocation = (accessToken: string, placeId: string, sessionToken?: string) =>
  request<{ success: true; location: { latitude: number; longitude: number; address: string } }>(
    `/places/${placeId}`,
    {
      accessToken,
      query: sessionToken ? { sessionToken } : undefined,
    }
  );

// ---- Reports ----

export const REPORT_REASONS = [
  'Spam / Fake job',
  'Spam / Fake offer',
  'Fraud / Scam',
  'Abusive behavior',
  'Unsafe behavior',
  'Incorrect information',
  'Payment issue',
  'Harassment',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export interface BackendReport {
  _id: string;
  targetType: 'job' | 'user' | 'business' | 'offer' | 'service_booking';
  targetId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const submitReport = (
  accessToken: string,
  payload: { targetType: 'job' | 'user' | 'business' | 'offer' | 'service_booking'; targetId: string; reason: ReportReason; description?: string }
) =>
  request<{ success: true; report: BackendReport }>('/reports', {
    method: 'POST',
    accessToken,
    body: payload,
  });

// ---- Notifications ----

export interface BackendNotification {
  _id: string;
  type:
    | 'application_accepted'
    | 'application_rejected'
    | 'new_application'
    | 'new_message'
    | 'nearby_featured_offer'
    | 'offer_expiring'
    | 'offer_approved'
    | 'offer_rejected'
    | 'business_approved'
    | 'business_rejected'
    | 'offer_milestone'
    | 'plan_expiring'
    | 'booking_confirmed'
    | 'worker_assigned'
    | 'worker_arriving'
    | 'booking_completed'
    | 'payment_update'
    | 'provider_booking_request'
    | 'provider_booking_closed'
    | 'provider_booking_status';
  title: string;
  body: string;
  data: {
    jobId?: string;
    chatId?: string;
    otherUserId?: string;
    otherUserName?: string;
    otherUserAvatar?: string;
    offerId?: string;
    businessId?: string;
    bookingId?: string;
    paymentId?: string;
  };
  read: boolean;
  createdAt: string;
}

export const listNotifications = (accessToken: string, query: { page?: number; limit?: number } = {}) =>
  request<{ success: true; data: BackendNotification[]; unreadCount: number; pagination: PaginationMeta }>(
    '/notifications',
    { accessToken, query }
  );

export const markNotificationRead = (accessToken: string, notificationId: string) =>
  request<{ success: true; notification: BackendNotification }>(`/notifications/${notificationId}/read`, {
    method: 'POST',
    accessToken,
  });

export const markAllNotificationsRead = (accessToken: string) =>
  request<{ success: true }>('/notifications/read-all', {
    method: 'POST',
    accessToken,
  });

// ---- Hyperlocal offers + company-managed services ----

export type Coordinates = { latitude: number; longitude: number };

export const listSupportedCities = (feature?: 'offers' | 'services') =>
  request<{ success: true; data: City[] }>('/cities', { query: { feature } });

export const getCityAvailability = (query: { cityId?: string; latitude?: number; longitude?: number }) =>
  request<{
    success: true;
    city: City | null;
    supported: boolean;
    offersAvailable: boolean;
    servicesAvailable: boolean;
    comingSoon: boolean;
    message: string;
    availableCities: City[];
  }>('/cities/availability', { query });

export const listNearbyOffers = (query: Coordinates & {
  cityId?: string;
  radiusKm?: number;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) =>
  request<{ success: true; radiusKm: number; comingSoon: boolean; availableCities: City[] } & PaginatedResponse<Offer>>(
    '/offers/nearby',
    { query }
  );

export const listOfferTemplates = (category?: string) =>
  request<{ success: true; data: OfferTemplate[] }>('/offer-templates', { query: category ? { category } : undefined });

export const getOfferTemplate = (templateId: string) =>
  request<{ success: true; template: OfferTemplate }>(`/offer-templates/${templateId}`);

export const listTemplateStickers = () =>
  request<{ success: true; data: OfferSticker[] }>('/stickers');

export const getOfferDetails = (offerId: string, coordinates?: Coordinates) =>
  request<{ success: true; offer: Offer }>(`/offers/${offerId}`, { query: coordinates });

export const listSavedOffers = (accessToken: string) =>
  request<{ success: true; data: Offer[] }>('/offers/saved', { accessToken });

export const toggleSavedOffer = (accessToken: string, offerId: string) =>
  request<{ success: true; saved: boolean }>(`/offers/${offerId}/save`, { method: 'POST', accessToken });

export const recordOfferEvent = (offerId: string, event: 'impression' | 'view' | 'business_profile_visit' | 'share' | 'call' | 'whatsapp' | 'directions') =>
  request<void>(`/offers/${offerId}/analytics`, { method: 'POST', body: { event } });

export const listMyOffers = (accessToken: string) =>
  request<{ success: true; data: Offer[] }>('/offers/mine', { accessToken });

export type OfferPayload = {
  businessId: string; title: string; description: string; category: string; originalPrice: number; offerPrice: number;
  discountPercentage: number; imageUrls: string[]; startsAt: string; expiresAt: string; address: string; locality?: string;
  latitude: number; longitude: number; phone?: string; whatsapp?: string; terms?: string; cardDesign?: OfferCardDesign;
};

export const createOffer = (accessToken: string, payload: OfferPayload) =>
  request<{ success: true; offer: Offer }>('/offers', { method: 'POST', accessToken, body: payload });

export const updateOffer = (accessToken: string, offerId: string, payload: Omit<OfferPayload, 'businessId'>) =>
  request<{ success: true; offer: Offer }>(`/offers/${offerId}`, { method: 'PUT', accessToken, body: payload });

export const deleteOffer = (accessToken: string, offerId: string) =>
  request<{ success: true; message: string }>(`/offers/${offerId}`, { method: 'DELETE', accessToken });

export const listMyBusinesses = (accessToken: string) =>
  request<{ success: true; data: Business[] }>('/businesses/mine', { accessToken });

export const getBusinessDetails = (businessId: string) =>
  request<{ success: true; business: Business; offers: Offer[] }>(`/businesses/${businessId}`);

export const createBusiness = (accessToken: string, payload: {
  name: string; cityId: string; category: string; description?: string; logoUrl?: string; coverImageUrl?: string;
  address: string; locality?: string; latitude: number; longitude: number; phone: string; whatsapp?: string;
  email?: string; website?: string;
}) => request<{ success: true; business: Business }>('/businesses', { method: 'POST', accessToken, body: payload });

export const updateBusiness = (accessToken: string, businessId: string, payload: {
  name?: string; cityId?: string; category?: string; description?: string; logoUrl?: string; coverImageUrl?: string;
  address?: string; locality?: string; latitude?: number; longitude?: number; phone?: string; whatsapp?: string;
  email?: string; website?: string;
}) => request<{ success: true; business: Business }>(`/businesses/${businessId}`, { method: 'PUT', accessToken, body: payload });

export const listPlans = () => request<{ success: true; data: Plan[] }>('/plans');

export const listMySubscriptions = (accessToken: string) =>
  request<{ success: true; data: Subscription[] }>('/subscriptions/mine', { accessToken });

export const createSubscriptionOrder = (accessToken: string, planId: string, businessId: string) =>
  request<{ success: true; payment: { _id: string; orderId: string; amount: number; status: string }; paymentInstructions: { mode: string; message: string } }>(
    '/payments/subscription-orders',
    { method: 'POST', accessToken, body: { planId, businessId } }
  );

export const createServicePaymentOrder = (accessToken: string, bookingId: string) =>
  request<{ success: true; payment: { _id: string; orderId: string; amount: number; status: string } }>(
    '/payments/service-orders',
    { method: 'POST', accessToken, body: { bookingId } }
  );

export const listServiceCategories = (cityId: string) =>
  request<{ success: true; data: ServiceCategory[]; city?: City; availableAreas?: string[]; comingSoon: boolean; message?: string; availableCities?: City[] }>(
    '/services/categories',
    { query: { cityId } }
  );

export type ProviderApplicationPayload = {
  name: string;
  phone: string;
  email?: string;
  cityId: string;
  categoryIds: string[];
  experienceYears?: number;
  serviceAreas?: string[];
  message?: string;
  termsAccepted: true;
};

export const createProviderApplication = (payload: ProviderApplicationPayload) =>
  request<{ success: true; application: { _id: string; status: 'pending'; createdAt: string } }>(
    '/provider-applications', { method: 'POST', body: payload }
  );

export const listServiceProviders = (cityId: string, categoryId?: string, locality = '') =>
  request<{ success: true; data: ServiceProvider[] }>('/services/providers', {
    query: { cityId, categoryId: categoryId || undefined, locality: locality || undefined },
  });

export const createServiceBooking = (accessToken: string, payload: {
  cityId: string; categoryId: string; workerId?: string; address: string; locality?: string; latitude: number; longitude: number;
  scheduleType: 'now' | 'later'; scheduledFor: string; problemDescription?: string;
}) => request<{ success: true; booking: ServiceBooking }>('/services/bookings', { method: 'POST', accessToken, body: payload });

export const listMyBookings = (accessToken: string, page = 1) =>
  request<{ success: true } & PaginatedResponse<ServiceBooking>>('/services/bookings', { accessToken, query: { page, limit: 30 } });

export const getServiceBooking = (accessToken: string, bookingId: string) =>
  request<{ success: true; booking: ServiceBooking }>(`/services/bookings/${bookingId}`, { accessToken });

export const cancelServiceBooking = (accessToken: string, bookingId: string, reason: string) =>
  request<{ success: true; booking: ServiceBooking }>(`/services/bookings/${bookingId}/cancel`, { method: 'POST', accessToken, body: { reason } });

export const rateServiceBooking = (accessToken: string, bookingId: string, stars: number, review = '') =>
  request<{ success: true; booking: ServiceBooking }>(`/services/bookings/${bookingId}/rating`, { method: 'POST', accessToken, body: { stars, review } });

export const openBookingChat = (accessToken: string, bookingId: string) =>
  request<{ success: true; chat: BackendChat }>(`/services/bookings/${bookingId}/chat`, { method: 'POST', accessToken });

export interface ProviderBooking extends ServiceBooking {
  customer?: { _id: string; name?: string; phone: string; photoUrl?: string };
  dispatchedProviders?: { provider: string; status: 'invited' | 'accepted' | 'rejected' | 'already_accepted' | 'expired'; note?: string; expiresAt?: string }[];
}

export const listProviderBookings = (accessToken: string, page = 1) =>
  request<{ success: true; data: ProviderBooking[]; pagination: PaginatedResponse<ProviderBooking>['pagination']; provider: { _id: string; name: string; phone: string; availability: string; serviceAreas: string[]; city: { name: string; localities: string[] }; categories: { name: string }[] } }>(
    '/services/provider/bookings', { accessToken, query: { page, limit: 50 } }
  );

export const respondToProviderBooking = (accessToken: string, bookingId: string, response: 'accepted' | 'rejected', note = '') =>
  request<{ success: true; booking: ProviderBooking }>(`/services/provider/bookings/${bookingId}/respond`, { method: 'POST', accessToken, body: { response, note } });

export const updateProviderBookingStatus = (accessToken: string, bookingId: string, status: 'in_progress' | 'completed' | 'cancelled', finalPrice?: number) =>
  request<{ success: true; booking: ProviderBooking }>(`/services/provider/bookings/${bookingId}/status`, { method: 'POST', accessToken, body: { status, finalPrice } });

export const updateProviderAvailability = (accessToken: string, availability: 'available' | 'offline') =>
  request<{ success: true; provider: { availability: string } }>('/services/provider/availability', { method: 'PATCH', accessToken, body: { availability } });

export const openProviderBookingChat = (accessToken: string, bookingId: string) =>
  request<{ success: true; chat: BackendChat; customer?: { _id: string; name?: string; phone: string; photoUrl?: string } }>(`/services/provider/bookings/${bookingId}/chat`, { method: 'POST', accessToken });
