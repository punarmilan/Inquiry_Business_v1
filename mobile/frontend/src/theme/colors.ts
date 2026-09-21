// Colour tokens now live in `palettes.ts` (light + dark) and are served through
// the live proxy in `runtime.ts`, so reads always resolve to the active mode.
export { colors } from './runtime';
export { lightColors, darkColors, palettes } from './palettes';
export type { ThemeColors, ThemeColors as Colors, ThemeMode } from './palettes';
