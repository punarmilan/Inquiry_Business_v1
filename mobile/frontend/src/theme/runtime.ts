import { StyleSheet } from 'react-native';
import { palettes, type ThemeColors, type ThemeMode } from './palettes';

// The active mode lives outside React so that module-level style sheets and
// inline `theme.colors.x` reads resolve against it without every file needing
// to thread a hook through.
let currentMode: ThemeMode = 'dark';

type Listener = (mode: ThemeMode) => void;
const listeners = new Set<Listener>();

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
  get: (_target, property: string) => palettes[currentMode][property as keyof ThemeColors],
  has: (_target, property: string) => property in palettes[currentMode],
  ownKeys: () => Reflect.ownKeys(palettes[currentMode]),
  getOwnPropertyDescriptor: (_target, property: string) =>
    Object.getOwnPropertyDescriptor(palettes[currentMode], property),
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

  const sheetFor = (mode: ThemeMode): T => {
    let sheet = cache.get(mode);
    if (!sheet) {
      sheet = StyleSheet.create(factory(palettes[mode]));
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
