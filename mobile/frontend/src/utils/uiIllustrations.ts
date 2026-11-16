import type { ImageSourcePropType } from 'react-native';
export type UIIllustrationName = 'welcome' | 'offers' | 'services' | 'business';
// Bundled and allowlisted: no remote URL, SVG source or executable asset input.
export function uiIllustration(name: string): ImageSourcePropType | undefined {
  switch (name) {
    case 'welcome': return require('../../assets/screen-1/ChatGPT Image Sep 7, 2026, 12_05_40 PM.png');
    case 'offers': return require('../../assets/screen-2/ChatGPT Image Sep 7, 2026, 12_08_51 PM.png');
    case 'services': return require('../../assets/screen-3/ChatGPT Image Sep 7, 2026, 12_02_38 PM.png');
    case 'business': return require('../../assets/support-local-banner.png');
    default: return undefined;
  }
}
