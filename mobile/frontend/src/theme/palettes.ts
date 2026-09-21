// InquiryExperts palettes. Light is the original off-white system; dark is the
// neon-teal night theme (deep teal-black surfaces, cyan accents, glow shadows).

export const lightColors = {
  // Primary teal — used for navigation, selected controls and main actions.
  primary: '#118F91',
  primaryBright: '#22B8B5',
  primaryDark: '#0A6F71',
  primaryLight: '#E2F6F5',
  primaryGlow: 'rgba(17, 143, 145, 0.26)',

  // Secondary teal — used for service banners and trust panels.
  secondary: '#0F766E',
  secondaryDark: '#0B564F',
  secondaryLight: '#DFF3F1',

  // Accent orange — keeps prices, ratings and offer highlights warm and visible.
  accent: '#F45B18',
  accentDark: '#D9430A',
  accentLight: '#FFF0E7',

  // Status
  success: '#2E9E5B',
  successLight: '#E3F6EA',
  warning: '#E4622A',
  danger: '#D64545',
  dangerLight: '#FBE6E6',
  verified: '#1D9BF0',

  // Neutrals
  background: '#F8FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F3F5',
  border: '#DDE3E7',
  divider: '#E5EAEC',

  // Promo banner gradient (home hero card)
  bannerStart: '#D9FAF7',
  bannerEnd: '#9DE1DA',

  // Full-screen backdrop gradient behind service/discovery screens
  backdropStart: '#F3FCFD',
  backdropEnd: '#F6FBFF',

  // Neon card system — same geometry in both modes, only the hue changes.
  // Light reads as a hairline + soft drop shadow; dark as a lit cyan edge.
  cardBorder: '#DCE6EA',
  cardGlow: 'rgba(42, 109, 112, 0.16)',
  cardFillStart: '#FFFFFF',
  cardFillEnd: '#F4FAFB',
  // Wash laid over assets/bg.png so the same night-skyline photo reads as a
  // pale daylight haze in light mode and stays dark in dark mode. Kept light
  // enough that the teal wash and skyline stay visible behind the header.
  mastheadScrim: 'rgba(246, 252, 253, 0.55)',

  text: '#171717',
  textSecondary: '#5C5C5C',
  textMuted: '#9A9A9A',
  textInverse: '#FFFFFF',

  overlay: 'rgba(17, 24, 26, 0.55)',
  shadow: 'rgba(42, 109, 112, 0.18)',
  shadowStrong: 'rgba(17, 112, 114, 0.28)',

  // Category tag colors
  categoryHomeRepair: '#F45B18',
  categoryCleaning: '#E8632F',
  categoryDelivery: '#2E9E5B',
  categoryConstruction: '#E0A030',
  categoryElectrician: '#7C5BE0',
  categoryPlumbing: '#2F7FD4',
  categoryPainting: '#2E9E8B',
  categoryMore: '#8A8A8A',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  // Keep cyan for actions, but temper it so large selected areas do not wash
  // out the surrounding dark UI.
  primary: '#00C2CC',
  primaryBright: '#36D7DE',
  primaryDark: '#0097A0',
  // "Light" tints become tinted dark fills so chips/pills stay readable.
  primaryLight: '#071C20',
  primaryGlow: 'rgba(0, 194, 204, 0.20)',

  secondary: '#24BEC2',
  secondaryDark: '#0B3B40',
  secondaryLight: '#071C20',

  accent: '#FF7A3D',
  accentDark: '#FF6020',
  accentLight: '#3A2116',

  success: '#34D399',
  successLight: '#0B3A2C',
  warning: '#FB923C',
  danger: '#F87171',
  dangerLight: '#3B1B1B',
  verified: '#38BDF8',

  background: '#000000',
  surface: '#080E10',
  surfaceAlt: '#0D1517',
  border: '#1A282B',
  divider: '#142124',

  bannerStart: '#081719',
  bannerEnd: '#0A2023',

  backdropStart: '#000000',
  backdropEnd: '#000000',

  // Resting cards use a quiet neutral edge. Bright borders are reserved for
  // selected controls and primary actions.
  cardBorder: '#1C2B2E',
  cardGlow: 'rgba(0, 194, 204, 0.05)',
  cardFillStart: '#0B1517',
  cardFillEnd: '#060B0C',
  mastheadScrim: 'rgba(0, 10, 12, 0.62)',

  text: '#F7FCFD',
  textSecondary: '#B4C2C5',
  textMuted: '#74878B',
  textInverse: '#FFFFFF',

  overlay: 'rgba(0, 8, 10, 0.72)',
  shadow: 'rgba(0, 0, 0, 0.42)',
  shadowStrong: 'rgba(0, 0, 0, 0.62)',

  // Category hues stay recognisable, just brightened for the dark ground.
  categoryHomeRepair: '#FF7A3D',
  categoryCleaning: '#FF8A52',
  categoryDelivery: '#34D399',
  categoryConstruction: '#F2B84B',
  categoryElectrician: '#A78BFA',
  categoryPlumbing: '#60A5FA',
  categoryPainting: '#2DD4BF',
  categoryMore: '#94A3B8',
};

export type ThemeMode = 'light' | 'dark';

export const palettes: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
