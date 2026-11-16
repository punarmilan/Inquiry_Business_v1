# InquiryExperts Dynamic UI — Phase 1 Plan

Audit date: 2026-10-18. Scope: targeted source inspection only. **Verified** means present in inspected source/manifests, not deployment-tested. **Proposed** means future implementation. No packages installed, builds/tests run, database access, or application changes made. Existing workspace changes are outside this audit.

## 1. Existing architecture — verified

| Area | Actual implementation and evidence |
|---|---|
| Mobile | Expo `~57.0.22`, React Native `0.86.3`, React `^19.2.3`, TypeScript `~6.0.3`; `mobile/frontend/package.json`. React Navigation 7 native stacks/bottom tabs, **not Expo Router**. Entry: `mobile/frontend/index.ts`; navigation: `mobile/frontend/src/navigation/{RootNavigator,AuthNavigator,MainTabNavigator,OffersNavigator,ServicesNavigator,PostNavigator,MoreNavigator,ProfileNavigator}.tsx`. |
| Navigation/security | `RootNavigator.tsx` chooses authenticated vs auth stacks. `MainTabNavigator.tsx` shows Post only when `hasApprovedBusiness`; state/auth/business refresh lives in `mobile/frontend/src/context/AppContext.tsx`. Preserve these gates. |
| Mobile theme | `mobile/frontend/src/theme/{index.ts,palettes.ts,runtime.ts,spacing.ts,typography.ts}`. Color proxy reads current light/dark palette; `createThemedStyles` caches by mode. AppContext persists mode in AsyncStorage; RootNavigator uses `key={themeMode}` and restores navigation state. Offer/Service surfaces also have their own palettes. |
| Existing remote content | `mobile/frontend/src/services/settings.ts` fetches `/settings` once on AppProvider mount; failure returns `{}`. `mobile/backend/src/controllers/settingController.js` publicly returns **all** Setting key/value pairs. Both backends have `src/models/Setting.js` with Mixed `value`, timestamps and `updatedBy`. Admin `PUT /settings/:key` writes immediately; validator accepts `Joi.any()` as value. No durable draft/history/rollback. |
| Admin | React `^19.2.7`, Vite `^8.1.1`, TypeScript, React Router `^7.18.1`; `website/admin-frontend/package.json`. Routes: `website/admin-frontend/src/router/routes.tsx`; auth wrapper: `router/ProtectedRoute.tsx`; shell/navigation: `components/layout/{AppShell.tsx,navigation.ts}`. |
| Admin UI/data | Tailwind 3, Radix components, React Query 5, React Hook Form, Zod 3, Axios, next-themes; `website/admin-frontend/src/{App.tsx,index.css}`, `website/admin-frontend/tailwind.config.ts`. Dashboard: `src/pages/DashboardPage.tsx` imports existing dashboard cards and `hooks/useDashboardStats.ts`. |
| Home Showcase | `website/admin-frontend/src/pages/hyperlocal/HomeShowcasePage.tsx` edits banner + ordered poster selection and publishes immediately. Admin API `/hyperlocal/home-showcase`; setting key `offers_home_showcase`; `website/backend/src/{controllers/homeShowcaseController.js,validators/homeShowcase.validator.js}`. Mobile `/offers/home-showcase` rechecks live offer, city, distance and business eligibility; `mobile/backend/src/controllers/homeShowcaseController.js`. OffersHome refreshes showcase every 60 seconds while focused. |
| Offer Templates | `website/admin-frontend/src/pages/hyperlocal/OfferTemplatesPage.tsx`, `components/hyperlocal/{TemplateBuilder,OfferPosterPreview,StickerCatalog}.tsx`, `utils/{templateSchema,offerTemplateJsonTools}.ts`. Existing canvas schema v2, pointer editing, layers, undo/redo, JSON import/validation/preview. Both backends have `src/models/OfferTemplate.js`; updates increment `version`, but no immutable page release history. This is a **poster canvas**, not a responsive page renderer. |
| Backends | Separate CommonJS Node/Express 4 APIs in `mobile/backend/src` and `website/backend/src`, each with routes/controllers/services/models/validators/middleware/config. Mongoose `^8.9.5`, Joi `^17.13.3`, JWT, Helmet, compression and rate limiting. `src/app.js` mounts routes without a built-in `/api` prefix. Config: each `src/config/{env,db}.js`. Defaults: app API 5000, admin API 5001. |
| Auth | Mobile `mobile/backend/src/middleware/auth.js` validates access JWT and active/unblocked User. Admin `website/backend/src/middleware/auth.js` validates active AdminUser; existing `requireSuperAdmin` also exists. Admin roles are `staff/admin/super-admin`; mobile role spelling differs. Reuse existing middleware; do not translate roles or introduce remote permissions. |
| Mongo/Redis | Both DB configurations default to the same `inquiryexperts` database; duplicate OfferTemplate models explicitly use the same `offertemplates` collection. `docker-compose.yml` configures MongoDB 6. No Redis client, Redis service, or Redis cache implementation found in the relevant manifests/source/Compose configuration. Actual production connectivity is unverified. |
| Media | New admin template uploads use `website/backend/src/services/cloudinaryTemplateAssetService.js` via native fetch/FormData, not a Cloudinary SDK. Existing `TemplateAsset.js` serves legacy Mongo Buffer images. `mobile/backend/src/services/cloudinaryService.js` handles mobile image uploads. Both paths validate image data; admin upload accepts PNG/JPEG/WebP/GIF, at most 8 MB. Neither accepts Lottie JSON. |
| Animation/editor libraries | Mobile already uses React Native Animated/Easing, react-native-svg, gesture-handler, Expo linear gradients, and slider/date-time picker packages. `components/{LogoLoader,AnimatedInfinityMark}.tsx` are existing loaders. Admin has CSS/Tailwind animation and pointer-based canvas editing. No Lottie, Reanimated, Framer Motion, dnd-kit/react-dnd, Redis client or scheduler dependency found in the relevant manifests/targeted source. This is a declared-dependency inventory, not a node_modules audit. |

## 2. Reuse map and business boundaries

Paths below are relative to `mobile/frontend/src/` unless stated otherwise. All opportunities are **proposed**; current behavior is preserved until its adapter is implemented.

| Surface / exact files | Configurable presentation | Code-owned behavior that stays fixed |
|---|---|---|
| `screens/auth/{OnboardingScreen,IllustratedOnboardingPage,PhoneEntryScreen,OtpVerificationScreen,ProfileSetupScreen}.tsx`; `screens/auth/OnboardingScreen.assets.ts` | Slide copy/artwork, header/footer content, bounded colors and decorative animation slots. | Registration validation, OTP length/resend/verification, social auth, terms consent, session restore and form order. Current onboarding uses translations/bundled artwork; it **does not consume** the admin onboarding setting. ProfileSetup similarly does not consume its advertised remote-content fields. PhoneEntry consumes the remote OTP-button label; OtpVerification consumes its copy. |
| `screens/offers/OffersHomeScreen.tsx`, `components/{HyperlocalHeader,OfferCard}.tsx`, `screens/offers/heroRotation.ts` | Banner, optional rails, section labels/order within approved slots, card variants, carousel motion. | Existing location/search/filter hooks, offer loading/pagination, eligibility, saved actions. Keep showcase data flowing through `/offers/home-showcase`. Legacy `mobile.home.hero*` fields exist in admin/settings types but are not consumed by current OffersHome. |
| `screens/offers/{OfferDetailsScreen,OfferUI,BusinessDetailsScreen}.tsx` | Decorative header, information-group presentation, bounded contact-action styling. | Offer/business eligibility, actual prices/dates, event recording, Call/WhatsApp/Directions/Save/Share handlers. |
| `screens/services/{ServicesHomeScreen,ServiceCategoriesScreen,ServiceProvidersScreen,ServiceUI}.tsx`; `hooks/useHyperlocalLocation.ts` | Area/category/provider-card presentation and empty states. | City/category/area selection, verified/active provider filtering and contact handlers. Current Services navigator is a directory/contact flow; do not connect dormant booking journeys as part of SDUI. |
| `screens/more/{BusinessCenterScreen,MyBusinessScreen,MyOffersScreen}.tsx`; `screens/post/BusinessSetupScreen.tsx` | Intro copy, status-card styling, decorative content. | Approval status, ownership, business submission and plan/post eligibility. |
| `screens/post/PlansScreen.tsx`, `components/{PlanPaymentSheet,PaymentOrderSummaryCard,PaymentMethodList}.tsx` | Plan-card layout, explanatory copy and decorative slots. | Prices/quotas from APIs, purchase callbacks, payment method availability, replacement rules, Razorpay verification and subscription activation. Payment/security state cannot be hidden or fabricated by config. |
| `screens/more/MoreScreen.tsx`, `screens/profile/{ProfileScreen,SettingsScreen}.tsx` | Group labels/icons/order for allowlisted entries, background and optional banners. | Account/business gates, privacy/legal access, logout and authenticated navigation. Required entries remain pinned. |

Reusable primitives: `components/{ScreenContainer,Button,Input,IconButton,Avatar,Chip,CityPickerModal,AnnouncementModal,WelcomeModal,GlobalLoadingHost}.tsx`. Reuse callbacks and safe-area/keyboard wrappers; do not serialize JSX or functions. Reuse `services/{api.ts,settings.ts,offerDesignStorage.ts}` request/storage patterns, not session-token storage for public UI data.

Keep `screens/offers/OfferUI.tsx` and `screens/services/ServiceUI.tsx` palette adapters in scope: they contain local mode palettes/raw colors, so changing global tokens alone will not theme every surface. Admin reuse: `website/admin-frontend/src/components/shared/{PageHeader,SectionCard,FormField,ConfirmDialog}.tsx`; existing form/dialog primitives are under `website/admin-frontend/src/components/ui/`. Reuse `website/admin-frontend/src/api/client.ts`, `website/admin-frontend/src/hooks/{useSettings,useHyperlocal}.ts` and poster-editor inspector/undo patterns. Keep the dashboard itself in its current React implementation.

## 3. Missing functionality and decisions

**Missing:** page component registry/renderer; strict versioned UI contract; durable drafts and immutable revisions; atomic releases/rollback; token editor and token-revision invalidation; authenticated preview isolation; Lottie upload/player/studio; campaign schedules/conflict resolution; Redis integration; last-known-good UI persistence; central refresh/kill switch.

**Proposed simplest architecture:** add functionality to the existing admin API for authoring and app API for delivery. MongoDB is authority; Redis is optional acceleration. No new microservice, workflow engine, arbitrary CSS interpreter, or server-provided JavaScript.

- Start with a **slot-based visual page builder**. Each existing screen retains its controller and protected core. Admin can add/reorder allowlisted blocks in named slots around that core; core forms, payment actions and permission checks cannot be deleted. Reuse poster-editor UX patterns, not its absolute canvas coordinates for whole pages.
- `ComponentRegistry` maps stable IDs to bundled React Native adapters and strict prop schemas. `DynamicRenderer` renders only those blocks with existing screen data/callbacks. Registry examples: `text`, `image`, `heroBanner`, `offerRail`, `spacer`, `animation`, `actionLink`. Adapters accept fixed local data keys, never arbitrary API paths or expressions. `offerRail` receives already-filtered existing offer results.
- Registry actions are fixed identifiers such as `offers.openAll`, `business.openCenter`, `profile.openSettings`. Resolve them to current typed navigation/callbacks with existing gates. Do not accept route names, HTTP mutations, `onPress` strings, arbitrary deep links or custom URLs.
- Add `UIRevision` (kind `page/theme/campaign`, draft content/version, actor/timestamps, immutable after publication), `UIRelease` (immutable complete reference snapshot and previous release ID), and `UIAsset` (image/Lottie metadata, content hash and immutable asset reference). Mirror read models in app backend as existing shared-collection models do; no cross-service controller imports.
- Reserve one **published-only** `Setting` key `ui.activeRelease` containing `{releaseId,generation,enabled}`. Never store drafts/tickets/private asset data in Setting: the legacy public endpoint returns all settings. Exclude new UI metadata from that legacy response and reserve `ui.*` against generic settings writes; only the validated publish service owns the pointer. Existing setting keys/permissions continue unchanged.
- Draft save uses `expectedDraftVersion`; publish revalidates the page, compatible registry, themes, assets and all references, persists immutable revisions/release, then atomically compare-and-swaps the pointer using `expectedGeneration`. Conflict returns 409; orphan immutable records are harmless. No Mongo multi-document transaction requirement. Rollback creates a **new generation** referencing the previous valid snapshot. Keep actor/time/reason/parent and rollback provenance in these records.
- Existing `requireAdminAuth` protects all authoring operations, matching existing settings/showcase access. Do not change existing role permissions. Public delivery returns only the selected published release. Preview uses a separate short-lived, scoped signed ticket validated with a backend-only `UI_PREVIEW_SIGNING_SECRET` shared by the two APIs, never an admin access token exposed to the mobile renderer.

## 4. Proposed v1 JSON contract

Example page payload; ObjectIds are shown as strings for readability. This is a contract proposal, not an implemented endpoint/schema.

```json
{
  "schemaVersion": 1,
  "kind": "page",
  "key": "offersHome",
  "rendererVersion": 1,
  "slots": {
    "beforeContent": [
      {
        "id": "festival-hero",
        "type": "heroBanner",
        "props": {
          "title": { "en": "Discover local offers", "hi": "Paas ke offers dekhein" },
          "imageAssetId": "asset-id",
          "backgroundToken": "primary",
          "action": "offers.openAll"
        }
      }
    ],
    "afterContent": []
  }
}
```

| Contract | Required fields / rules |
|---|---|
| Page | `schemaVersion=1`, `kind=page`, key from `onboarding/login/otp/profileSetup/offersHome/offerDetails/servicesHome/serviceCategories/serviceProviders/businessCenter/plans/more/profile`, `rendererVersion=1`, `slots` keyed by that screen's compiled slot manifest. Initial slots: beforeContent/afterContent; header/footer only where explicitly supported. Each block: unique `id`, allowlisted `type`, type-specific strict `props`. No arbitrary nested styles. |
| Theme | `schemaVersion=1, kind=theme, key, modes:{light:{colors:{}},dark:{colors:{}}}`. Colors may override known semantic keys from `ThemeColors` using six-digit hex. Initially expose primary/primaryBright/primaryDark/accent/background/surface/text/textSecondary/border/backdropStart/backdropEnd. Merge missing keys with local palette. Optional radius and typography preset IDs must map to compiled, bounded presets; no downloaded fonts. |
| Campaign | `schemaVersion=1, kind=campaign, key, startsAt, endsAt, timezone, priority, cityIds, pageRevisionIds, themeRevisionId?`. Times are UTC ISO instants with an explicit IANA timezone for editor display; example timezone `Asia/Kolkata`. `startsAt < endsAt`; active interval `[start,end)`. Page map keys must match referenced page keys. All references point to immutable published revisions and are frozen into the release. |
| Asset | `kind=image|lottie, sha256, mimeType, size, createdBy, createdAt`; images add Cloudinary URL/public ID, Lottie adds normalized JSON plus width/height/fps/duration/layerCount and required fallback image reference. Asset content never mutates in place. |
| Release/runtime | Stored release: `schemaVersion, rendererVersion, pageRevisionIds, themeRevisionId?, campaignRevisionIds, previousReleaseId, actor, reason`. Runtime response: `releaseId,generation,schemaVersion,serverTime,refreshAfter,validUntil,base,overlay,assets`. Hydrate base and eligible campaign content into a self-contained bounded response so client can remove an expired overlay offline. `base` retains default published pages/theme; no business records or secrets embedded. |

Validation authority: existing backend **Joi**, with versioned fixtures shared logically by admin Zod and mobile typed runtime checks. Do not add a generic schema/expression engine. Use a strict UI-specific middleware path: current `middleware/validate.js` globally enables `allowUnknown` and strips unknown fields; UI writes must reject unknown keys instead of silently accepting/stripping them.

Proposed starting budgets: UI runtime JSON <=256 KB, <=40 blocks/page, localized strings <=500 characters, spacer <=48 dp, known token/asset/action IDs only. No recursive containers in v1. Publish checks accessible text/background contrast, both modes, required fallbacks and active asset references. Invalid required reference/version rejects the entire candidate; runtime failure renders the native screen. Unknown optional block skips with diagnostics; invalid optional image/animation uses its local/static fallback. No `eval`, Function constructor, JS imports, HTML/WebView blocks, CSS text, executable expressions or prototype-path access.

## 5. Proposed endpoints

Paths are relative to the existing API base URL; do not add a second `/api` prefix. Reuse response/error helpers, rate limiting and auth conventions.

| API | Endpoint | Behavior |
|---|---|---|
| Admin, authenticated | `GET /ui/configs?kind=page|theme|campaign` | Paginated revision/resource summaries. |
| Admin | `POST /ui/configs` | Create typed draft; return ID/draftVersion. |
| Admin | `GET /ui/configs/:id` / `PUT /ui/configs/:id` | Read/save draft using expectedDraftVersion; published revisions are read-only, edits fork a draft. |
| Admin | `POST /ui/configs/:id/preview` | Validate/hydrate draft; return preview data and five-minute signed ticket scoped to revision/renderer. Response no-store. |
| Admin | `POST /ui/configs/:id/publish` | `{expectedDraftVersion,expectedGeneration,reason}`; create revisions/release and CAS pointer. |
| Admin | `GET /ui/releases` / `GET /ui/releases/:id` | Paginated immutable release/audit history and snapshot. |
| Admin | `POST /ui/releases/:id/rollback` | `{expectedGeneration,reason}`; revalidate and publish snapshot as a new generation. |
| Admin | `PUT /ui/status` | `{enabled,expectedGeneration,reason}`; audited kill switch for remote UI. |
| Admin | `GET /ui/assets` / `POST /ui/assets` | Paginated library / bounded upload. Images delegate existing Cloudinary service; Lottie gets strict JSON validation and dedicated UIAsset storage. |
| Admin | `DELETE /ui/assets/:id` | Reject deletion while referenced by retained revisions/releases/fallbacks; do not break rollback. |
| App, public | `GET /ui/runtime?rendererVersion=1&cityId=...&locale=en` | Published base + eligible overlay; ETag/304 includes resolved campaign/variant. Unsupported renderer gets native-fallback directive. Reject unsupported query dimensions; no user role input. |
| App, public | `GET /ui/assets/:id` | Approved immutable Lottie JSON (or image metadata/redirect to approved Cloudinary URL), content type/hash and immutable cache headers. Never expose draft-only assets. |
| App, ticket-scoped | `POST /ui/preview/resolve` | Validate signed ticket and resolve draft read-only, no-store. Native preview only in a compiled internal/development preview screen; never switch production mode through public config. |
| App, ticket-scoped | `POST /ui/preview/assets/:id` | Ticket in body; allow only assets referenced by that preview revision, no-store. Draft animation content must not require opening the public published-asset endpoint. |

Admin builder routes: `/ui/pages`, `/ui/pages/:id`, `/ui/themes`, `/ui/animations`, `/ui/campaigns`; release history/publish/rollback dialogs live in the page builder. Extend existing router/sidebar; preserve Home Showcase, Settings and Offer Templates routes.

## 6. Themes, animation, scheduling and fallback

**Theme:** keep the user's chosen light/dark mode. Apply base theme then eligible campaign overrides inside that mode. Extend `theme/runtime.ts` with validated token overrides, a token revision and cache invalidation keyed by mode + revision; notify React consumers. Do not key navigation by remote revision. Keep focused OTP/payment/edit forms mounted and defer presentation swaps until a safe screen boundary. Adopt tokens in the scoped OfferUI/ServiceUI adapters and dynamic blocks first; spacing/typography exports are currently static, so do not promise live global changes without migrating their specific consumers.

**Lottie studio:** import/upload self-contained vector JSON, preview/play/pause/scrub, choose segment/speed/loop and a static fallback, then place an asset in an animation slot. This is playback management, not an After Effects authoring replacement. Proposed limits: 2 MB, 2048x2048, 60 fps, 30 seconds, 100 layers, one playing animation per screen. Reject expressions, external image/font/audio references, unknown effects and archives/.lottie files in v1. Web preview must use an expression-free/light player build; parse validated data rather than running a URL-provided player. Pause offscreen/in background; respect native Reduce Motion and web prefers-reduced-motion; show static fallback on error/offline. Existing loaders remain usable without Lottie.

**Festival scheduling:** publish one-off explicit intervals; never guess holiday dates or recurrence. Resolve active campaigns on each runtime request using server UTC, city and renderer compatibility; highest priority wins, then latest start, then stable ID. One campaign overlay at a time; show conflict warnings in admin. A campaign can override approved page slots/theme only, never offers eligibility, prices, permissions or feature enforcement. Request-time evaluation is the scheduler; no cron/BullMQ worker needed for UI-only activation. Cancel/reschedule through a new release; preserve history.

**Redis/offline:** introduce Redis cache-aside for immutable release/revision hydration. Read the current published pointer from Mongo on runtime requests, avoiding distributed pointer invalidation initially. Any resolved-response cache key includes releaseId, cityId, rendererVersion, locale and campaign ID; TTL <=60 seconds and never beyond the next campaign start/end. Redis failure falls back to Mongo with bounded connection timeout, not a startup dependency. Do not cache personalized offers/providers/payments as UI config.

One UIConfigProvider refreshes at startup, app resume, relevant city/locale changes and a shared 60-second foreground timer (or sooner at refreshAfter). Never delay authentication for config. Validate before swapping/persisting one complete last-known-good snapshot to a new AsyncStorage key. Order: valid network response -> compatible cached base/eligible overlay -> bundled native screen/tokens. Cache contains no auth tokens; asset metadata goes in the snapshot, bounded Lottie JSON is cached separately by hash. Use server-time offset for campaign expiry and HTTP Date on 304 responses; use a weak ETag for stable content excluding clock metadata. If clock confidence is lost on offline cold start, show base content. Always remove expired overlays; proposed base snapshot horizon seven days, then bundled defaults. Keep active form/checkout state intact. A remote kill switch takes effect at next successful refresh; it cannot guarantee immediate offline revocation.

## 7. Minimal new files — proposed, not created

Keep existing service boundaries; braces below enumerate exact files. Add focused contract/service tests alongside these units in their existing test folders during the relevant implementation phase.

```text
mobile/frontend/src/dynamic-ui/
  {contract.ts,validate.ts,api.ts,registry.tsx,DynamicRenderer.tsx,
   UIConfigProvider.tsx,storage.ts,CampaignAnimation.tsx,PreviewScreen.tsx}
website/admin-frontend/src/
  api/ui.ts
  hooks/useUIConfig.ts
  pages/dynamic-ui/{PagesPage.tsx,PageBuilder.tsx,ThemesPage.tsx,
                   AnimationsPage.tsx,CampaignsPage.tsx}
  components/dynamic-ui/{BlockInspector.tsx,PagePreview.tsx}
  utils/uiConfigSchema.ts
website/backend/src/
  routes/uiRoutes.js
  controllers/uiController.js
  validators/ui.validator.js
  models/{UIRevision.js,UIRelease.js,UIAsset.js}
  services/{uiConfigService.js,uiAssetService.js}
mobile/backend/src/
  routes/uiRoutes.js
  controllers/uiController.js
  validators/ui.validator.js
  models/{UIRevision.js,UIRelease.js,UIAsset.js}
  services/{uiRuntimeService.js,uiCacheService.js}
```

Extend existing route indexes, admin navigation, AppProvider boundary, theme runtime, scoped screens, env configuration and Compose only when their phase begins. No shared package/build-system migration. Contract parity is enforced by small common acceptance/rejection fixtures; duplicate read-model schema definitions follow the current repository pattern.

## 8. Dependencies — future only

| Missing dependency | Where/when | Decision |
|---|---|---|
| `lottie-react-native` | Mobile, Phase 7 | Install only after Expo 57/RN 0.86/New Architecture compatibility check; use Expo's compatible package resolution, pin the resolved version and rebuild the development client. The current upstream requires RN >=0.84/New Architecture, but that alone does not verify this app. [Upstream installation](https://github.com/lottie-react-native/lottie-react-native). |
| `lottie-web` | Admin, Phase 7 | Lazy-load an expression-free/light player for studio preview; verify feature parity against the native player. [Official player documentation](https://github.com/airbnb/lottie-web). |
| `@redis/client` | App backend, Phase 9 | Small base client sufficient for runtime cache commands, plus a Redis deployment and REDIS_URL. Admin publishes to Mongo and does not need another Redis connection. No Redis infrastructure is currently configured. [Official Node Redis packages](https://github.com/redis/node-redis). |

No new drag/drop library is required initially: reuse pointer patterns plus Up/Down controls/keyboard reorder. Reuse Joi, admin Zod, AsyncStorage, React Query, existing primitives and date inputs. No Reanimated, Cloudinary SDK, cron, queue or animation-editor framework required. Exact future package pins remain a Phase 7/9 compatibility gate; no node_modules inspected. [Required Expo 57 reference consulted](https://docs.expo.dev/versions/v57.0.0/) lists RN 0.86 and minimum Node 22.13.x. The versioned Lottie SDK URL was unavailable during this audit; no claim of Expo Go support is made.

## 9. Implementation order: Phases 2–10

| Phase | Bounded deliverable and exit check |
|---|---|
| **2 — Contract/storage** | Lock registry/slots/action IDs, Joi/Zod/mobile contract fixtures, models and reserved settings handling. Seed no live content. Invalid/oversized/unknown payloads reject; legacy settings and business APIs unchanged. |
| **3 — Renderer pilot** | Add registry/provider/native fallbacks and integrate OffersHome decorative slots only, feature disabled by default. Existing showcase/feed and callbacks remain authoritative; unsupported block/fetch failure cannot break Home. |
| **4 — Theme runtime** | Remote palette merge, revision-aware styles, persistence/user mode, scoped OfferUI/ServiceUI token adapters. Same-mode token update works; theme fallback preserves form state and contrast. |
| **5 — Release lifecycle** | Draft CRUD, optimistic concurrency, publish/rollback/history, preview tickets and kill switch. Verify draft isolation, concurrent publish 409, atomic pointer and rollback with referenced assets. |
| **6 — Visual Page Builder** | Admin pages, slot canvas, properties inspector, reorder/undo, mock-data preview and publish dialogs using Phase 5 APIs. Locked native anchors cannot be removed; keyboard reorder works. Web preview is labeled approximate until native comparison. |
| **7 — Lottie studio** | Compatibility-gated player additions, safe upload/library, metadata validation, playback controls, asset references and fallback. Verify expression/external-resource rejection and reduced-motion/background behavior on Android/iOS. |
| **8 — Remaining surfaces** | Onboarding/auth decoration, Offer Details, Services, Business Center, Plans, More/Profile adapters; migrate only scoped palette/copy consumers. Verify existing auth, approval, quota, provider and checkout paths with config both enabled and disabled. |
| **9 — Festival delivery** | Admin campaign editor, deterministic time/city resolution, Redis connection/cache bounds, shared refresh and complete offline/expiry behavior. Test overlaps, boundaries, Redis outage, clock uncertainty and rollback during a campaign. |
| **10 — Qualification/rollout** | Internal native preview, old/new renderer contract matrix, targeted regression and low-end Android performance checks; gradual per-screen rollout with kill switch and baseline release. Confirm web/native preview differences, offline startup and rollback drills before enabling widely. |

## 10. Risks, compatibility and assumptions

- **P1 draft exposure/bypass:** do not reuse generic Mixed settings for drafts or allow generic `PUT /settings/:key` to mutate the new pointer. Legacy `/settings` must not enumerate new private UI metadata. New UI assets need publication/reference checks; the old public image endpoint is not a Lottie library.
- **P1 business boundary:** `mobile/backend/src/controllers/{offerController,serviceController,commerceController,webhookController}.js` and `services/razorpayService.js` stay authoritative. Keep OTP, approvals, quota/active subscription, Razorpay HMAC/server settlement, moderation, provider filtering and all current permissions unchanged. UI config must not disable checks or supply authoritative prices/statuses.
- **P1 theme state:** same-mode cache invalidation is missing; navigation remounts can discard local screen/form state even if route state is restored. Do not propagate theme/release changes through a new navigator key.
- **P1 asset safety:** Lottie is not automatically harmless JSON; expressions/external assets must be rejected before web/native playback. Asset deletion/Cloudinary changes can invalidate rollback; retain referenced content, use immutable IDs, limits and hashes.
- **P2 compatibility/performance:** old clients do not know new registry IDs. Match schema/renderer versions, use native fallback, virtualize existing data lists, bound animation/JSON budgets and avoid placing scroll containers inside current lists. Preserve accessibility labels, text scaling, safe areas and keyboard handling in wrappers. Static analysis does not establish frame rate or accessibility conformance.
- **P2 ownership/drift:** Home Showcase and legacy Settings remain editors of existing data; new SDUI chooses presentation, not duplicate offer records or a second set of business rules. Poster schema v2 and page schema v1 remain distinct. Mirror shared collection/contract changes across both APIs and test against the same fixtures.
- **Assumptions/unverified:** production DBs actually share the same intended database; admin-host Cloudinary credentials/delivery policy are configured; Redis hosting is available in Phase 9; calendar intervals and content licenses come from operators. None was checked against live services. Existing Cloudinary image upload is verified in code, not upload-tested. Native Lottie playback/versions require Phase 7 qualification. No unrelated defects are assigned to this rollout.

Readiness: existing services and components support an incremental slot-based SDUI rollout. Phase 2 can start with the contract, immutable revision/release models and draft isolation; Lottie/native and Redis deployment compatibility remain explicit later gates. **Phase 2 has not been implemented.**

PHASE 1 COMPLETE
