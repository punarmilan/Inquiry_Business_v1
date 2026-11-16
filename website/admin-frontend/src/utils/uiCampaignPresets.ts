// Dates and asset references are chosen by the administrator. Theme palettes
// remain owned by Theme Studio rather than a second design editor.
export const campaignPresets = {
  diwali: { name: 'Diwali', themePreset: 'Diwali' },
  holi: { name: 'Holi', themePreset: 'Holi' },
  christmas: { name: 'Christmas', themePreset: 'Christmas' },
  'new-year': { name: 'New Year', themePreset: 'New Year' },
  custom: { name: 'Custom', themePreset: 'Default' },
} as const;
export const campaignLocalTime = (instant: string) => instant ? new Date(Date.parse(instant) + 330 * 60_000).toISOString().slice(0, 16) : '';
export const campaignInstant = (local: string) => local ? new Date(`${local}:00+05:30`).toISOString() : '';
