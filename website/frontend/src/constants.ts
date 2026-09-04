import type { NavItem } from './types';

export const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.kaamsaathi.app';

export const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'How It Works', path: '/work-hub' },
  { label: 'Services', path: '/services' },
  { label: 'Features', path: '/features' },
  { label: 'Download', path: '/download' },
];
