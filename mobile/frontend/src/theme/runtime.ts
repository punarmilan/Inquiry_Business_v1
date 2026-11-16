import { StyleSheet } from 'react-native';
import { palettes, type ThemeColors, type ThemeMode } from './palettes';
import { UI_COLOR_KEYS, type UITheme } from '../types/dynamicUI';

// The active mode lives outside React so that module-level style sheets and
// inline `theme.colors.x` reads resolve against it without every file needing
// to thread a hook through.
let currentMode: ThemeMode = 'dark';

type Listener = (mode: ThemeMode) => void;
const listeners = new Set<Listener>();
let tokenRevision = 0;
let overrideKey = JSON.stringify({ light: {}, dark: {} });
let resolvedPalettes = palettes;
let activeOverrides: Record<ThemeMode, Partial<ThemeColors>> = { light: {}, dark: {} };
export const getThemeOverride = (key: typeof UI_COLOR_KEYS[number]) => activeOverrides[currentMode][key];
const tokenListeners = new Set<() => void>();

export const getThemeRevision = () => tokenRevision;
export const subscribeToThemeRevision = (listener: () => void) => {
  tokenListeners.add(listener);
  return () => { tokenListeners.delete(listener); };
};

/** Only the eleven Phase 2 color tokens are remotely writable. Geometry,
 * typography, secondary/status colors and all other tokens stay bundled. */
export function setThemeOverrides(modes: UITheme['modes'] | null) {
  const overrides = { light: {}, dark: {} } as Record<ThemeMode, Partial<ThemeColors>>;
  for (const mode of ['light', 'dark'] as const) for (const key of UI_COLOR_KEYS) {
    const value = modes?.[mode]?.colors?.[key];
    if (typeof value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value)) overrides[mode][key] = value;
  }
  const nextKey = JSON.stringify(overrides);
  if (nextKey === overrideKey) return;
  overrideKey = nextKey;
  activeOverrides = overrides;
  resolvedPalettes = { light: { ...palettes.light, ...overrides.light }, dark: { ...palettes.dark, ...overrides.dark } };
  tokenRevision += 1;
  tokenListeners.forEach((listener) => listener());
}

export function getThemeMode(): ThemeMode {
  return currentMode;
}

export function setThemeMode(mode: ThemeMode) {
  if (mode === currentMode) return;
  currentMode = mode;
  listeners.forEach((listener) => listener(mode));
}

export function subscribeToThemeMode(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Live colour palette. Every property read resolves against the active mode,
 * so inline usages like `color={theme.colors.primary}` stay correct after a
 * theme switch without any change at the call site.
 */
export const colors: ThemeColors = new Proxy({} as ThemeColors, {
  get: (_target, property: string) => resolvedPalettes[currentMode][property as keyof ThemeColors],
  has: (_target, property: string) => property in resolvedPalettes[currentMode],
  ownKeys: () => Reflect.ownKeys(resolvedPalettes[currentMode]),
  getOwnPropertyDescriptor: (_target, property: string) =>
    Object.getOwnPropertyDescriptor(resolvedPalettes[currentMode], property),
});

/**
 * Drop-in replacement for `StyleSheet.create` that rebuilds per theme mode.
 * The returned object resolves each style at access time (render time), so
 * module-level declarations still pick up the active palette.
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ThemeColors) => T & StyleSheet.NamedStyles<T>
): T {
  const cache = new Map<ThemeMode, T>();
  let cachedRevision = tokenRevision;

  const sheetFor = (mode: ThemeMode): T => {
    if (cachedRevision !== tokenRevision) { cache.clear(); cachedRevision = tokenRevision; }
    let sheet = cache.get(mode);
    if (!sheet) {
      sheet = StyleSheet.create(factory(resolvedPalettes[mode]));
      cache.set(mode, sheet);
    }
    return sheet;
  };

  return new Proxy({} as T, {
    get: (_target, property: string) => sheetFor(currentMode)[property as keyof T],
    has: (_target, property: string) => property in sheetFor(currentMode),
    ownKeys: () => Reflect.ownKeys(sheetFor(currentMode)),
    getOwnPropertyDescriptor: (_target, property: string) =>
      Object.getOwnPropertyDescriptor(sheetFor(currentMode), property),
  });
}
