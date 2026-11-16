import { useMemo } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { useUIConfig } from './useUIConfig';
import { useDynamicTheme } from '../context/DynamicThemeProvider';
import { isUIPresentation } from '../utils/dynamicUI';
import type { UIPageKey, UILocalizedText } from '../types/dynamicUI';

export function useUIPage(pageKey: UIPageKey) {
  const { state, locale } = useUIConfig();
  const theme = useDynamicTheme();
  const page = state.config.base.pages[pageKey];
  const p = state.config.enabled && !state.config.useNativeFallback && page?.rendererVersion >= 3 && isUIPresentation(page.presentation, pageKey) ? page.presentation : undefined;
  return useMemo(() => {
    const option = (key: string, fallback = 'default'): string => typeof p?.[key] === 'string' ? p[key] as string : fallback;
    const copy = (key: string, fallback: string) => {
      const value = p?.[key];
      return value && typeof value !== 'string' ? (value as UILocalizedText)[locale] || value.en : fallback;
    };
    const content: ViewStyle = option('spacing') === 'compact' ? { gap: 8, paddingVertical: 8 } : option('spacing') === 'comfortable' ? { gap: 20, paddingVertical: 24 } : {};
    const card: ViewStyle = option('cardVariant') === 'outlined' ? { borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.surface } : option('cardVariant') === 'soft' ? { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderWidth: 1 } : {};
    const header: ViewStyle = option('headerVariant') === 'compact' ? { minHeight: 56, paddingVertical: 8 } : {};
    const title: TextStyle = option('headerVariant') === 'centered' ? { textAlign: 'center' } : {};
    const screen: ViewStyle = p?.backgroundToken ? { backgroundColor: theme.colors[option('backgroundToken') as 'background' | 'surface'] } : {};
    const iconColor = option('iconTone') === 'primary' ? theme.colors.primary : option('iconTone') === 'accent' ? theme.colors.accent : theme.colors.text;
    const selector: ViewStyle = option('selectorVariant') === 'outlined' ? { borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 16, backgroundColor: theme.colors.surface } : {};
    return { option, copy, card, header, title, content, screen, selector, backgroundColor: typeof screen.backgroundColor === 'string' ? screen.backgroundColor : undefined, iconColor, hasSections: state.config.enabled && !state.config.useNativeFallback && !!page && [...page.slots.beforeContent, ...page.slots.afterContent].some((block) => !block.hidden), themed: state.config.enabled && !state.config.useNativeFallback };
  }, [p, page, locale, theme, state.config.enabled, state.config.useNativeFallback]);
}
