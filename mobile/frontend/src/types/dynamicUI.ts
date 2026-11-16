export const UI_SCHEMA_VERSION = 1;
export const UI_RENDERER_VERSION = 6;
export const UI_MAX_BYTES = 256 * 1024;
export const UI_PAGE_KEYS = ['onboarding', 'login', 'otp', 'profileSetup', 'offersHome', 'offerDetails',
  'servicesHome', 'serviceCategories', 'serviceProviders', 'businessCenter', 'plans', 'more', 'profile'] as const;
export const UI_COLOR_KEYS = ['primary', 'primaryBright', 'primaryDark', 'accent', 'background', 'surface',
  'text', 'textSecondary', 'border', 'backdropStart', 'backdropEnd'] as const;
export const UI_ACTIONS = ['offers.openAll', 'business.openCenter', 'profile.openSettings'] as const;
export type UIPageKey = typeof UI_PAGE_KEYS[number];
export type UIColorKey = typeof UI_COLOR_KEYS[number];
export type UIAction = typeof UI_ACTIONS[number];
export type UILocale = 'en' | 'hi';
export type UISlot = 'beforeContent' | 'afterContent';
export type UILocalizedText = { en: string; hi?: string };
export type UIHomeHeader = {
  style: 'photoCarousel' | 'heroShortcuts' | 'splitCarousel' | 'accordion';
  autoPlay: boolean; intervalSeconds: number; transition: 'slide' | 'fade' | 'expand';
  showArrows: boolean; showDots: boolean; height: 'small' | 'medium' | 'large';
};
export type UIHomeCardProps = {
  placement: 'promo' | 'aboveTrending' | 'belowTrending' | 'trending' | 'offer';
  title: UILocalizedText; subtitle?: UILocalizedText; compactSubtitle?: UILocalizedText; badge?: UILocalizedText; buttonLabel?: UILocalizedText;
  homeAction?: 'offers' | 'services' | 'post' | 'events' | 'link'; linkUrl?: string;
  media: 'bundled' | 'image' | 'lottie' | 'none';
  bundled: 'offers' | 'post' | 'events' | 'services' | 'support' | 'moreDeals';
  assetId?: string; offerId?: string; limit?: number; height?: number;
  speed?: number; loopCount?: number; fit?: 'cover' | 'contain'; showCopy?: boolean;
};
export type UIHomeCard = Extract<UIBlock, { type: 'homeCard' }>;
type SectionColors = { colorToken?: 'text' | 'textSecondary'; backgroundToken?: 'background' | 'surface' | 'primary' | 'primaryDark' | 'accent' };
export type UIBlockStyle = { padding?: number; marginBottom?: number; borderRadius?: number; widthPercent?: number; alignment?: 'left' | 'center' | 'right'; fontSize?: number; textAlign?: 'left' | 'center' | 'right'; fontWeight?: 'normal' | '600' | '700'; fontFamily?: 'default' | 'serif' | 'monospace'; letterSpacing?: number; color?: string; backgroundColor?: string };
export type UIBlock = (
  | { id: string; type: 'homeCard'; props: UIHomeCardProps }
  | { id: string; type: 'text'; props: SectionColors & { text: UILocalizedText; variant?: 'heading' | 'body' | 'caption' } }
  | { id: string; type: 'heroBanner'; props: SectionColors & { title: UILocalizedText; subtitle?: UILocalizedText; buttonLabel?: UILocalizedText; action?: UIAction; imageAssetId?: string; imageHeight?: number } }
  | { id: string; type: 'image'; props: { assetId: string; alt: UILocalizedText; height?: number; fit?: 'contain' | 'cover' } }
  | { id: string; type: 'icon'; props: SectionColors & { name: string; size?: number; label?: UILocalizedText } }
  | { id: string; type: 'offerRail'; props: { source: 'nearby' | 'showcase'; variant?: 'standard' | 'compact'; limit?: number } }
  | { id: string; type: 'spacer'; props: { height: number } }
  | { id: string; type: 'actionLink'; props: { label: UILocalizedText; action: UIAction } }
  | { id: string; type: 'illustration'; props: { image: 'welcome' | 'offers' | 'services' | 'business'; alt: UILocalizedText; height?: number; fit?: 'contain' | 'cover' } }
  | { id: string; type: 'lottie'; props: { assetId: string; fallback: UILocalizedText; speed?: number; loop?: boolean; loopCount?: number; width?: number; height?: number; alignment?: 'left' | 'center' | 'right' } }
) & { hidden?: boolean; style?: UIBlockStyle };
export type UIAssetMetadata = { id: string; sha256: string; size: number; width: number; height: number; fps: number; duration: number; kind?: 'lottie' | 'image'; mimeType?: 'image/png' | 'image/jpeg' };
export type UIPage = { schemaVersion: 1; rendererVersion: 1 | 2 | 3 | 4 | 5 | 6; kind: 'page'; key: UIPageKey; slots: Record<UISlot, UIBlock[]>; presentation?: Record<string, string | UILocalizedText>; homeHeader?: UIHomeHeader };
export type UITheme = { schemaVersion: 1; kind: 'theme'; key: 'global'; modes: Record<'light' | 'dark', { colors: Partial<Record<UIColorKey, string>> }> };
export type UIRuntime = {
  success: true; releaseId: string | null; generation: number; schemaVersion: 1; rendererVersion: 1 | 2 | 3 | 4 | 5 | 6;
  enabled: boolean; useNativeFallback: boolean;
  fallbackReason: null | 'not_published' | 'unsupported_renderer' | 'disabled' | 'unavailable';
  serverTime: string; refreshAfter: string; validUntil: string;
  campaign?: { id: string; identifier: string; version: number; releaseId: string; startsAt: string; endsAt: string } | null;
  nextTransitionAt?: string | null;
  base: { pages: Record<UIPageKey, UIPage>; theme: UITheme }; overlay: null; assets: Record<string, UIAssetMetadata>;
};
export type UIRuntimeHTTPResponse = { status: 200; body: unknown; etag: string | null; serverDate: string | null; serverAgeMs?: number }
  | { status: 304; etag: string | null; serverDate: string | null };
export type UIRuntimeFetchOptions = { locale: UILocale; cityId?: string; etag?: string; signal?: AbortSignal; timeoutMs?: number };
