// AnyWork visual system: clean off-white surfaces, confident teal actions and a warm
// orange accent for offers, prices and attention states.
export const colors = {
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

export type Colors = typeof colors;
