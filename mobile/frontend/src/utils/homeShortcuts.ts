/** Native app destinations, independent of editable promotional cards. */
export const HOME_SHORTCUTS = [
  { key: 'offers', labelKey: 'quickTileLocalOffer', icon: 'home-outline' },
  { key: 'post', labelKey: 'quickTileUpdate', icon: 'plus-box-outline' },
  { key: 'events', labelKey: 'quickTileEvent', icon: 'calendar-month-outline' },
  { key: 'services', labelKey: 'quickTilePostService', icon: 'tools' },
] as const;

export type HomeShortcut = typeof HOME_SHORTCUTS[number]['key'];
