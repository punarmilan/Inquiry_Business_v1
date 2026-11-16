# Mobile Dynamic UI runtime - Phase 3

Current extension: renderer 5 lets the existing admin editor control native home
carousel cards, both banners and offer artwork, including managed images and
multiple Lottie animations. See [Home content administration](HOME_CONTENT_ADMIN.md).
Earlier phase descriptions below remain historical implementation notes.

## Current animation size limit (2026-10-29)

Animation Studio, both backend validators, the web preview, mobile runtime metadata
and mobile animation parsing now accept self-contained vector Lottie JSON up to
10 MiB (10,485,760 bytes). Oversized uploads report the selected size and the limit.
The API body limits already accommodate this payload, including its JSON envelope.
Dimensions, frame rate, duration, layer count and structural complexity checks remain
in force; embedded media, expressions and external resources are still unsupported.

Animation downloads allow 30 seconds and check both declared and actual response
size, with a 4 KiB allowance for the response envelope. Persistent animation caching
remains below 2 MiB per entry to accommodate Android AsyncStorage v2's row limit.
Larger animations play online and use the existing static fallback when offline;
they do not overwrite the small last-known-good animation cache.

The mobile JavaScript bundle and both APIs must be updated together. Older mobile
bundles retain their original 2 MiB validation limit. The exact 10 MiB boundary,
one-byte-over rejection, authenticated upload/public delivery, metadata validation,
download bounds and cache behavior are covered by the animation/runtime tests.
Actual playback performance of a user's 10 MB animation still requires device QA.

> Historical Phase 3 details follow. Phase 9 now integrates all 13 supported pages with renderer 3; see the current notes at the end and `DYNAMIC_UI_PHASE9_REPORT.md`.

Originally implemented against `DYNAMIC_UI_BACKEND_API.md` schema/renderer v1. No dependencies were added. Expo 57's versioned documentation was consulted before implementation: https://docs.expo.dev/versions/v57.0.0/.

## Runtime and provider structure

```text
AppProvider (existing auth, language and chosen light/dark mode)
  UIConfigProvider -> useUIConfig()
    DynamicThemeProvider -> useDynamicTheme()
      existing launch screen, status bar and RootNavigator
```

Configuration loads in the background; children render immediately. One store per root restores AsyncStorage and revalidates on startup, locale changes, app resume and every 60 seconds in the foreground. Storage startup is bounded to 500 ms. Public UI requests bypass session-refresh and global request-loading hooks.

`fetchUIRuntime` uses the existing API base URL and development localhost fallback. It sends `rendererVersion=1`, the existing en/hi language and an optional `If-None-Match`. Its eight-second timeout covers fetching and body parsing; cancellation and HTTP/JSON/size errors reach the store's safe recovery path. A 304 has no JSON body: reuse matching validated content and renew clock/lifetime metadata using HTTP Date. Without a matching cache, retry once without an ETag. Without Date, preserve the original expiry.

The store deduplicates concurrent refreshes, tracks releaseId/generation, ignores responses from superseded requests/locales and rejects decreasing generations or conflicting release identities. Immutable validated snapshots are persisted through serialized writes. Cache keys include schema version and API origin; records include locale and ETag. Corrupt, incompatible, expired or unavailable storage falls back to the bundled native UI. Cached content expires after the server's bounded lifetime (currently seven days); failures retain unexpired last-known-good data. Explicit backend native-fallback directives replace cached live content. No credentials or offer records are cached here.

## Renderer and theme boundaries

- `DynamicRenderer` accepts a documented page key and beforeContent/afterContent slot. Arrays define order; page/slot/block IDs form stable keys. Invalid, duplicate or unsupported blocks are skipped; each registered block has a rendering error boundary. Local `isVisible` callbacks can enforce additional host policy.
- The frozen registry contains only text, heroBanner, offerRail, spacer and actionLink. English/Hindi copy, supported color tokens and bounded props follow Phase 2. No URLs, HTML, remote code, expressions or arbitrary styles are accepted.
- Hosts must supply trusted action callbacks and already-filtered business data. Missing action handlers hide CTAs; offer rails reuse `OfferCard` and require the host's open handler. No config can supply prices, eligibility, approval state, payment behavior or route permissions.
- Theme overrides merge only the 11 Phase 2 color tokens into both bundled palettes. User mode is preserved. Revision notifications invalidate same-mode style caches and update existing AppContext consumers without adding a navigation key.
- **Contract limit:** v1 has no remote secondary color, typography, spacing, radius, card/button geometry or visibility properties. Existing typography, secondary/status colors, Button styling and card/spacing/radius tokens remain bundled. Text variants and approved section colors are supported. Adding more remote tokens requires a versioned backend contract change.
- **Integration limit:** providers and theme updates are mounted; page blocks are available for future screen adapters. No screen layout or navigation file changed. The Offers homepage migration remains deferred as requested. The registry is exercised in focused tests rather than adding a production demo surface.

## Exact Phase 3 file inventory

Paths are relative to the repository root.

| Change | File | Responsibility |
|---|---|---|
| Modified | `mobile/frontend/App.tsx` | Mount both providers within AppProvider. |
| Modified | `mobile/frontend/src/context/AppContext.tsx` | Subscribe existing consumers to token revisions. |
| Modified | `mobile/frontend/src/services/api.ts` | Isolated public runtime transport; existing endpoints unchanged. |
| Modified | `mobile/frontend/src/theme/runtime.ts` | Allowlisted palette overrides and style-cache invalidation. |
| Modified | `mobile/frontend/src/theme/index.ts` | Export revision/override helpers. |
| Added | `mobile/frontend/src/types/dynamicUI.ts` | Frozen v1 types and allowlists. |
| Added | `mobile/frontend/src/utils/dynamicUI.ts` | Strict validation, contrast/size limits and safe defaults. |
| Added | `mobile/frontend/src/services/uiRuntime.ts` | Fetch coordination, persistent cache and recovery. |
| Added | `mobile/frontend/src/context/UIConfigProvider.tsx` | Nonblocking app lifecycle integration. |
| Added | `mobile/frontend/src/context/DynamicThemeProvider.tsx` | Connect published tokens to the existing theme. |
| Added | `mobile/frontend/src/hooks/useUIConfig.ts` | Shared runtime hook. |
| Added | `mobile/frontend/src/components/ComponentRegistry.tsx` | Five allowlisted native adapters. |
| Added | `mobile/frontend/src/components/DynamicRenderer.tsx` | Safe slot renderer and error containment. |
| Added | `mobile/frontend/tests/dynamic-ui-runtime.test.cjs` | Focused runtime/renderer/navigation verification. |
| Added | `docs/DYNAMIC_UI_MOBILE_RUNTIME.md` | This handoff. |

## Verification and readiness

From `mobile/frontend`:

```text
node --test tests/dynamic-ui-runtime.test.cjs
16 passed, 0 failed

node node_modules/typescript/bin/tsc --noEmit
Passed
```

Tests execute actual TypeScript modules with isolated native/network/storage boundaries. Coverage includes backend default/validation parity, 200 parsing, conditional requests, bodyless 304/cache renewal, timeout/cancellation, offline/corrupt cache, locale-hydration and late-response races, published fallback directives, color token resolution, renderer order/allowlisting/host callbacks and the existing boot/auth/conditional Post-tab branches. This does not establish Android/iOS device behavior or performance.

Read-only local smoke check on 2026-10-18: `GET http://127.0.0.1:5000/ui/runtime?rendererVersion=1&locale=en` returned **404**. The reachable process does not expose the Phase 2 runtime route, so live backend/database integration remains unverified. No running service or database was changed. The mobile runtime handles this through native/cache fallback.

Phase 4 can use these providers, hooks, registry and token-revision APIs. Deploy/run the Phase 2 backend route and qualify on a native device before live rollout. No Admin UI, drag-and-drop, Lottie, Redis, campaign scheduling or later-phase screen migration was implemented.

## Current Phase 9 behavior

The above describes the original Phase 3 implementation. Phases 4–8 added the studios, Offers integration, validated Lottie and deterministic campaigns. Phase 9 extends the same runtime to every supported screen; schema 1 remains stable and renderer capability is now 3.

- `useUIPage(pageKey)` reads the existing shared configuration/theme providers. Screen mounts do not create stores or issue runtime requests. Strict per-screen presentation choices come from `utils/uiPresentation.json`; invalid or native-fallback configurations produce bundled presentation defaults.
- All 13 screen keys render optional slots. The 12 new native screen adapters add only visual variants. Provider/offer data, auth fields, navigation, approval, Post-tab gating, plan/payment contracts and logout remain native/server controlled. Login/onboarding decorations use bounded areas so optional content cannot displace their controls; login form spacing remains native.
- The registry adds bundled `illustration` artwork. Files resolve only when selected; there are no remote image URLs or uploaded image slots. Renderer 3 allows one Lottie per page; the runtime accepts up to 13 referenced metadata records. Lottie uses the existing lazy player, viewport/focus/background gating, reduced-motion fallback and vector-only validation.
- Asset reads explicitly send `rendererVersion=3&campaignVersion=1` and the chosen city. The existing bounded animation cache retains one last-known asset, not every page's animation. Missing/offline/reduced-motion media renders its localized static fallback. UI configuration caches remain shared and bounded.
- Renderer 1/2 snapshots still validate. Older client capabilities receive native fallback for newer releases. Theme token overrides now reach the existing Services and Offer Details palettes while their original tuned colors remain the default when no override exists.
- Campaign pages and presentation fields are part of the selected immutable release. No per-screen schedule job, fetch loop or navigation remount was added. Known activation/expiry boundaries use the Phase 8 store timers; offline expiry discards campaign presentation and restores bundled native UI until the current published baseline can be fetched. App resume expires stale content before refresh.

See `DYNAMIC_UI_PHASE9_REPORT.md` for the current file inventory, automated/live verification and rollout limitations. Phase 10 has not started.
