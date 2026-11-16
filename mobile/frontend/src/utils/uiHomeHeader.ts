import type { UIHomeHeader } from '../types/dynamicUI';

export const HOME_HEADER_PRESETS = [
  { id: 'photoCarousel', name: 'Photo Carousel', description: 'Large photo card in the centre with side cards.' },
  { id: 'heroShortcuts', name: 'Hero Banner + Shortcuts', description: 'Wide sliding banner with four shortcuts below.' },
  { id: 'splitCarousel', name: 'Split Card Carousel', description: 'Photo on the left, text on the right, with side cards.' },
  { id: 'accordion', name: 'Accordion Cards', description: 'One large illustrated card with three compact cards.' },
] as const;

export const DEFAULT_HOME_HEADER: UIHomeHeader = {
  style: 'accordion', autoPlay: true, intervalSeconds: 7, transition: 'expand', showArrows: true, showDots: true, height: 'medium',
};
export const headerPreset = (style: UIHomeHeader['style'], previous = DEFAULT_HOME_HEADER): UIHomeHeader => ({
  ...previous, style, transition: style === 'accordion' ? 'expand' : previous.transition === 'expand' ? 'slide' : previous.transition,
});
export const isHomeHeader = (value: unknown): value is UIHomeHeader => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  return Object.keys(p).length === 7 && Object.keys(p).every(key => key in DEFAULT_HOME_HEADER)
    && HOME_HEADER_PRESETS.some(preset => preset.id === p.style)
    && ['autoPlay', 'showArrows', 'showDots'].every(key => typeof p[key] === 'boolean')
    && Number.isInteger(p.intervalSeconds) && Number(p.intervalSeconds) >= 3 && Number(p.intervalSeconds) <= 10
    && ['small', 'medium', 'large'].includes(String(p.height))
    && (p.style === 'accordion' ? p.transition === 'expand' : ['slide', 'fade'].includes(String(p.transition)));
};

/** Links are opened on the device; never fetched by the API or authenticated transport. */
export const validHomeLink = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\u0000-\u001f\u007f\\]/.test(value) || !/^https?:\/\//i.test(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
};
