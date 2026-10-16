# InquiryExperts Website Frontend

React + Vite frontend for the public InquiryExperts website.

The marketing experience uses the existing teal identity, a lightweight DOM phone
preview, one lazy-loaded React Three Fiber scene, and native document scrolling.
All existing page routes and the environment-configured Play Store destination remain.

## Design and motion

- `src/brand-theme.css` provides the shared visual system and responsive layouts.
  Tailwind 4 utilities are integrated through the Vite plugin without resetting the existing CSS.
- `src/data/siteData.ts` contains product information, marketing copy and responsive image sources.
- `src/animations/motion.ts` owns GSAP registration and shared Framer Motion tokens.
  GSAP owns scroll choreography; Framer Motion owns UI feedback on separate elements.
- `src/hooks/` handles live reduced-motion preferences, scoped reveals, device parallax
  and scene visibility. Each component reverts its own GSAP resources on unmount.
- `src/three/scenes/HeroScene.tsx` is loaded only when the hero becomes visible and
  motion is enabled. Pixel ratio is capped; rendering stops off-screen or in a hidden tab.
  The phone preview and static rings remain available if WebGL fails.
- Discovery pins at desktop widths. WorkHub computes horizontal travel from the actual
  gallery overflow and keeps focused links reachable. Both revert to native layouts
  on smaller screens and when reduced motion is enabled.

## Validation

```bash
npm run build       # TypeScript and production Vite build
npm test            # Seven interaction/lifecycle tests in jsdom
npm run assets:optimize
```

The tests cover navigation/deep links, download links and QR anchors, mobile-menu
keyboard focus, reduced-motion changes, scoped ScrollTrigger cleanup, measured
gallery travel and a simulated lazy-scene failure. They do not measure visual layout
or actual GPU rendering. No lint command is configured.

Browser validation checklist: 390px, 768px and 1440px widths; menu Escape/Tab;
service links and Back/Forward; `/download#install`; gallery keyboard focus;
resize while pinned; live reduced-motion changes; WebGL disabled/context loss;
and switching tabs while the hero is visible.

The original images are preserved. `scripts/optimize-assets.mjs` regenerates the
committed WebP derivatives and small favicon in `assets/optimized/`.

## Run

```bash
npm install
npm run dev
```

## Play Store URL

Default URL:

```text
https://play.google.com/store/apps/details?id=com.inquiryexperts.app
```

Override it with:

```bash
VITE_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=your.package.id npm run build
```
