# Home cards, banners and Lottie

## Editing

1. Open **App content → Home cards & banners** (`/home-content`).
   **App content overview** explains which editor controls each home section.
   Select one of the four **Header card style** thumbnails. The full header
   preview updates immediately; selecting a style retains card content and order.
   **Accordion Cards** (one large + three compact cards) is the default.
2. Select the item in **Card or banner**. Defaults are immediately editable; the
   first content change creates local editable controls. Opening the editor alone
   does not save or publish anything. Existing optional sections are retained.
3. Edit **Title**, **Description**, **Button text**, or **Show in app**. Choose
   **Change photo** beside the preview to pick, crop and upload a replacement.
   **When tapped → Open link** accepts a full HTTP/HTTPS URL, including YouTube
   and other websites. The whole promotional card or banner opens that URL via
   the device's registered app or browser. **Test link** opens it in a new admin
   browser tab. Internal app destinations remain available in the same select.
4. Optional controls stay collapsed: **Hindi text**, **Image library & animation**,
   and **More settings**. These retain Lottie upload/preview, speed and play limits,
   static fallback, geometry, colors, badges and compact captions.
   **Manage cards & order** contains add/remove/reorder and missing-banner tools.
5. Use **Publish to app** to save, validate and publish in one action. The audit
   reason is supplied as “Update home cards and banners”. **Save draft** remains
   available for private work. The app receives publication on its next successful
   refresh, normally within a minute. Existing draft tools and release history
   remain available through the Dynamic UI editor link.

**Trending offers:** **App content → Trending offers** (`/home-showcase`) chooses and orders eligible offer
records. The trending control changes its title, visibility, limit and shared
artwork. For a different animation on one offer, add another home control, select
**Individual offer artwork**, select a showcase offer and choose its media.
Hiding that control hides that offer on home; it does not unpublish the offer.
Offer prices, business names, saves, detail links and eligibility remain native.

**Dynamic UI is separate:** **Dynamic UI → Dynamic UI editor**
(`/ui/pages/offersHome`) owns screen selection, extra sections, slots, layout,
drag ordering and undo/redo. Home cards are absent from its library and editable
canvas. Each editor retains the other editor's controls. They share the existing
home-screen draft and release: publication applies the full saved home draft,
as explained beside the publish controls. Draft-version and release-generation
checks continue to prevent stale tabs from overwriting newer saves.

## Runtime contract

- Schema 1, renderer **5** introduced `homeCard` on `offersHome` only. Renderer
  **6** adds optional `homeHeader` settings and external card/banner links. Native
  placements: `promo`, `aboveTrending`, `belowTrending`, `trending`, `offer`.
- Four fixed presets: `photoCarousel` (**Photo Carousel**), `heroShortcuts`
  (**Hero Banner + Shortcuts**), `splitCarousel` (**Split Card Carousel**),
  `accordion` (**Accordion Cards**). Layout is native, not downloaded executable UI.
  Slide settings control autoplay, a 3–10 second static-card hold, slide/fade
  (expand for accordion), small/medium/large height, arrows and dots. Swiping
  remains available with arrows hidden. Header settings are retained by both editors.
- Up to eight carousel controls, one control per banner/trending placement and
  twelve individual offer overrides. Page budget remains forty total blocks.
- Managed image/Lottie IDs only. Existing immutable assets, enabled/archive
  checks, retained-reference protection, release generation and draft-version
  checks remain authoritative. Artwork still uses managed assets. Only promotional
  cards and the two banners accept `homeAction: link` with `linkUrl`: HTTP/HTTPS,
  maximum 2048 characters, no whitespace, backslashes or embedded credentials.
  Links are passed directly to the device, never fetched by the authenticated API.
  Offer details, saved offers and eligibility retain their existing native actions.
- Multiple cards/banners may reference animations. The existing one-per-page
  rule applies only to legacy standalone Lottie decorations.
- Only the leading promo animation plays. All animation players also respect
  viewport visibility, focus, foreground state, reduced motion and play limits.
  Existing offer photos or bundled artwork remain the static fallback.
- Older clients receive native fallback for releases beyond their renderer version. App, mobile API,
  admin API and admin frontend must be updated together. A published native home
  layout owns the two banner placements; the older Home Showcase banner is used
  only when no native home layout is published.
- Bottom navigation and trusted business/approval gates are unchanged.

## Verification — 31 October 2026

Mobile: 85 tests passed and TypeScript passed. Admin: 21 unit tests, production
build and isolated Playwright workflow passed, including Lottie upload, visible
vector preview, multiple card/banner assignments, save, publication, failure
recovery and a 390px viewport. Website API: 38 relevant tests passed. Mobile API:
6 runtime tests passed. Public asset delivery, draft privacy, wrong asset kinds,
retained references, older clients and publication validation are covered.

Browser evidence: `artifacts/visual-editor/home-lottie-controls.png`,
`home-controls-mobile.png` and `browser-qa.json`. Browser publication uses isolated
API fixtures; no real release or user content was published during testing.

The verified local app and admin APIs were restarted with the updated workspace
code on ports 5000 and 5001. Both health checks pass, and the public app runtime
accepts renderer 5. No real home layout was published during verification; use
the editor's draft/review/publish flow to choose the live content.

## Header styles and links verification — 1 November 2026

Renderer-6 publication/runtime tests cover all four presets, exact URLs and older
client fallback. Native tests cover card callbacks, HTTP URL opening/failure,
animation completion, stale callbacks, slide/fade, background cancellation and
reduced motion. Isolated browser QA covers all four thumbnails, full-header
previews, publication/reload, settings, link errors and a 320px viewport. No real
release is published by these tests. Evidence: `artifacts/visual-editor/header-*.png`
and `browser-qa.json`.

The connected OnePlus device was also checked against a separate local fixture
API/Metro origin: all four native header layouts rendered, and tapping a hero
card opened the configured HTTPS URL in the installed YouTube app. Screenshots
are `artifacts/visual-editor/device-header-*.png`. The test origin is separate
from the regular app cache and publishes no database release. Local APIs were
restarted with renderer 6 support; the device was returned to the regular server.
