// Larger-than-usual base sizes: low-literacy users scan icons/numbers more than text,
// so text that IS shown must be easy to read at a glance.
export const typography = {
  h1: { fontSize: 27, fontWeight: '800' as const, lineHeight: 34, textShadowColor: 'rgba(35, 69, 70, 0.12)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  h2: { fontSize: 21, fontWeight: '800' as const, lineHeight: 27, textShadowColor: 'rgba(35, 69, 70, 0.11)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, textShadowColor: 'rgba(35, 69, 70, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  bodyLg: { fontSize: 17, fontWeight: '500' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: '700' as const, lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 17 },
  tiny: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },
  button: { fontSize: 16, fontWeight: '800' as const, lineHeight: 20, textShadowColor: 'rgba(0, 65, 66, 0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
};

export type Typography = typeof typography;
