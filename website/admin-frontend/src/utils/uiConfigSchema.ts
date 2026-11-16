// Import the actual, platform-independent mobile contract; no second browser layout format.
import { defaultUIRuntime, parseUIRuntime } from '../../../../mobile/frontend/src/utils/dynamicUI';
import { palettes } from '../../../../mobile/frontend/src/theme/palettes';
import { UI_COLOR_KEYS, UI_ACTIONS } from '../../../../mobile/frontend/src/types/dynamicUI';
import type { UITheme, UIRuntime, UIPage } from '../../../../mobile/frontend/src/types/dynamicUI';
import type { UIConfig } from '../api/ui';
import { blockAssetId } from '../../../../mobile/frontend/src/utils/uiVisual';
export { UI_COLOR_KEYS, UI_ACTIONS, palettes };
export type { UITheme, UIPage, UIRuntime };
export const emptyBase = () => structuredClone(defaultUIRuntime().base);
export const validateUIEditor = (config: UIConfig, base: UIRuntime['base'], library: UIRuntime['assets'] = {}) => {
  const candidate = structuredClone(base);
  if (config.kind === 'theme') candidate.theme = config;
  else candidate.pages[config.key] = config;
  const ids = [...new Set(Object.values(candidate.pages).flatMap((page) => [...page.slots.beforeContent, ...page.slots.afterContent]).map(blockAssetId).filter((id): id is string => Boolean(id)))];
  const assets = Object.fromEntries(ids.filter((id) => library[id]).map((id) => [id, library[id]]));
  return parseUIRuntime({ ...defaultUIRuntime(), enabled: true, useNativeFallback: false, fallbackReason: null,
    releaseId: '000000000000000000000001', generation: 1, rendererVersion: Math.max(...Object.values(candidate.pages).map((page) => page.rendererVersion)), base: candidate, assets });
};
export const themePresets: Record<string, UITheme> = Object.fromEntries(Object.entries({
  Default: {}, Diwali: { primary: '#C5620B', primaryBright: '#F5A623', primaryDark: '#8A3D05', accent: '#B24D08' },
  Holi: { primary: '#A82773', primaryBright: '#DC5FA5', primaryDark: '#74144C', accent: '#AA336A' },
  Christmas: { primary: '#13754B', primaryBright: '#309965', primaryDark: '#0D5034', accent: '#BA2632' },
  'New Year': { primary: '#5F49AA', primaryBright: '#8D70D1', primaryDark: '#3C2C76', accent: '#A26A0F' },
}).map(([name, colors]) => [name, { schemaVersion: 1, kind: 'theme', key: 'global', modes: { light: { colors: { ...colors } }, dark: { colors: { ...colors } } } }])) as Record<string, UITheme>;
