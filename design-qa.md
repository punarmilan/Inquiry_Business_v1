# Home content administration QA — 31 October 2026

Scope: the requested admin control of existing home cards and both banners,
including images and Lottie. This is a functional UI extension, not another
pixel-copy iteration. Earlier scenic-home visual history is retained in
`tmp/home-redesign/design-qa-scenic-history-2026-10-31.md`.

## Evidence and state

- Browser: `artifacts/visual-editor/home-lottie-controls.png` (1440px desktop)
  and `home-controls-mobile.png` (390px narrow viewport); full-page captures
  at deviceScaleFactor 1, English editor, light preview, isolated admin session.
- Source of behavior: latest user request and `docs/HOME_CONTENT_ADMIN.md`.
- Native: `tmp/home-redesign/home-admin-native.png`, physical 1080×2340,
  450dpi (approximately 384×832dp), existing live-data home after app reload.
  Native bottom navigation is unchanged. No live home layout was published.
- Browser record: `artifacts/visual-editor/browser-qa.json`. Actual editor
  components run against isolated API fixtures; real publication is not changed.

## Findings and fixes

No outstanding P0/P1/P2 issue in this feature's verified scope.

- Fixed indistinguishable home controls: layer rows now show their title and
  named native placement.
- Prevented duplicate fixed banner/trending placements in the selector and
  backend validation. Only repeatable promo controls can be duplicated.
- Removed unused formatting controls from native placements. Offer descriptions
  and shared/per-offer artwork remain separate from native prices and eligibility.
- Reused managed image upload, safe vector validation, animation library,
  bounded playback, static fallback and the existing draft/release workflow.
- Replaced a blank test animation with a visible pulsing vector and repeated
  browser upload, preview and publication. Screenshots now show real vector media.
- Preserved native photo fallback for offer animations and bundled native home
  behavior until an administrator explicitly publishes home controls.

## Required visual surfaces

- Typography/copy: existing admin type hierarchy retained; labeled English/Hindi
  fields include headline, compact caption, badge and action label. Existing
  native home fonts and section typography remain owned by their components.
- Spacing/layout: desktop editor and stacked 390px layout checked; no horizontal
  document overflow. Banner minimum height can grow to accommodate copy.
  Native controls scroll clear of the unchanged bottom bar.
- Color/tokens: existing theme primitives and artwork fills retained. Publication
  validators check text/background contrast. No global palette changes.
- Images/animation: bundled art remains raster imagery; uploaded images and Lottie
  use managed immutable asset IDs. Inspector play/pause preview displays a vector
  animation. Native image/animation fallback and lifecycle gates are covered.
- Content: displayed offer records retain live business/price/location/save data.
  Admin controls artwork, visibility and presentation rather than trusted values.

## Verification

- Mobile: 85 tests passed; TypeScript passed. Includes actual home-host binding,
  save rollback/duplicate prevention, media validation and reduced-motion gates.
- Admin: 21 unit tests passed; production build passed.
- Browser: upload/crop, Lottie JSON upload, play/pause, multiple card/banner
  assignments, private drafts, save failure/retry, renderer-5 publication,
  keyboard focus and 390px overflow checks passed; zero page exceptions.
- Website API: 38 relevant tests passed. Mobile API: 6 runtime tests passed.
  Public renderer-5 media delivery, draft privacy, wrong media kinds,
  retained references and renderer-4 fallback are exercised.
- Local app/admin APIs restarted from the updated workspace. Both health checks
  pass, admin CORS accepts the editor origin, and a renderer-5 runtime request
  succeeds with the existing published baseline. Real release content is unchanged.
- Strict premium audit still reports the 23 existing admin-web findings outside
  this feature: `tmp/home-redesign/home-content-admin-audit.json`.

## Remaining test limits

New managed Lottie content was not published to the real database for a device
playback trial. Native lifecycle/render bindings are covered by tests, Android
autolinking includes LottiePackage, and the connected default home was inspected.
Large-font and Hindi device settings were not switched during this iteration.

final result: passed
