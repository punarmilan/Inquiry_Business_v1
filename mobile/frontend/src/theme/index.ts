import { colors } from './runtime';
import { spacing, radius, MIN_TAP_TARGET } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  MIN_TAP_TARGET,
};

export type Theme = typeof theme;

export * from './colors';
export * from './spacing';
export * from './typography';
export {
  createThemedStyles,
  getThemeMode,
  setThemeMode,
  subscribeToThemeMode,
} from './runtime';
