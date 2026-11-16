# Dynamic UI Phase 8 — Festival Campaign Manager

Date: 2026-10-19 (Asia/Kolkata)

## Scope and result

Phase 8 is implemented on the existing Phase 2–7 MongoDB, release, validation, Admin studio and mobile runtime infrastructure. No Phase 9 work was started. Existing uncommitted project work was preserved. No dependencies, native packages, business/payment/subscription controllers, authentication rules or deployment settings were changed.

Before implementation, read `DYNAMIC_UI_PHASE4_TO_7_REPORT.md`, `DYNAMIC_UI_BACKEND_API.md`, repository instructions, and the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). No Expo APIs or package versions needed changing.

## Completed features

- New `uicampaigns` collection on the existing connections: unique identifier/name, festival, committed release reference, optional animation reference, explicit start/end instants, Asia/Kolkata timezone, all/selected active supported cities, priority, enabled flag, version, actors, timestamps and audited changes/reasons. Configurations are retained in existing immutable release/revision collections.
- Strict server validation rejects unknown fields, invalid/ambiguous dates, invalid windows, unsupported cities, missing/orphan releases, unavailable animations, budget violations and equal-priority overlapping schedules. Mongo uniqueness and atomic per-campaign CAS protect identifiers and edits.
- Effective draft/scheduled/active/expired/disabled status derives from persisted state and current server time. Activation is inclusive; expiry is exclusive. Restart/missed-boundary recovery requires only a runtime request; no scheduler, browser, polling worker or additional service is required.
- Highest priority wins, followed by latest start, then ascending identifier. Lower campaigns resume when higher campaigns end; otherwise the then-current published default is restored. A damaged/incompatible campaign restores the validated default. Disabled global UI still prevents campaign delivery.
- `/ui/campaigns` Admin page includes create/edit, festival templates, release/animation libraries, explicit IST date inputs, city selection, priority, validation, light/dark phone previews, overlap explanations, schedule/draft/disable/cancel controls, server status, pagination and audit history. It links to the existing three studios and adds no duplicate editor.
- Diwali, Holi, Christmas and New Year templates refer to the existing Theme Studio palettes. No festival dates or presumed asset IDs are built in. Administrators select and publish their desired theme/layout/banner assets using the existing studios.
- Mobile explicitly opts in with `campaignVersion=1`. Older clients retain their original response shape/default behavior. Current renderer/schema versions and existing published layouts remain supported.
- City-scoped mobile caches and requests follow the existing hyperlocal location selection without new GPS work. Server delivery validates current city activity. Cached UI never crosses city scope; location hydration cannot overwrite a newer selection.
- Mobile schedules refresh/expiry at server boundaries, retains foreground refresh and existing periodic refresh, and expires locally even when requests fail. App resume checks expiry before fetching. Navigation remains mounted; unchanged animation identities no longer trigger reloads on metadata refresh.
- Cache deadlines cannot slide past campaign boundaries on 304s. Slow responses, HTTP cache Age, stale/replayed campaign 200s, and expired-cache restarts cannot restart an observed campaign lease. Offline clients use last-known-good UI only within its lease, then bundled native fallback until a fresh response arrives.
- Existing offer/service data and native access gates remain owned by the existing screens/APIs. Dynamic content still uses validated blocks, existing native adapters and the same size/contrast/animation limits.

## Runtime and generation semantics

Campaign selection never changes `ui.activeRelease` or creates extra release generations. Top-level release ID/generation identify the current default head; campaign metadata identifies the selected effective release and campaign version. ETags hash this metadata and the next eligible schedule boundary. Time-only metadata remains excluded, preserving stable 304s between meaningful transitions.

`refreshAfter` is at most 60 seconds away and never past the next eligible boundary; `validUntil` is capped at that boundary. The public endpoint revalidates on every request with `must-revalidate, stale-if-error=0`. New mobile requests also use `cache:no-cache` and account for response age. Animation delivery retains published-reference/hash checks and resolves the same capability/city scope.

## API changes

| API | Addition |
|---|---|
| Admin | `GET /ui/campaigns`, paginated, computed statuses |
| Admin | `GET /ui/campaigns/:id`, detail and audit history |
| Admin | `POST /ui/campaigns`, validated create |
| Admin | `PUT /ui/campaigns/:id`, replacement fields with `expectedVersion` |
| Admin | `POST /ui/campaigns/preview`, validated appearance/assets and conflicts, no writes |
| Mobile public | Optional `campaignVersion=1` on `/ui/runtime`; adds `campaign` and `nextTransitionAt` |
| Mobile assets | Optional `campaignVersion=1` and `cityId` on `/ui/assets/:id` |

All Admin routes retain active-admin authorization and no-store responses. Detailed request/response, default-publication workflow and conflict behavior are documented in `DYNAMIC_UI_BACKEND_API.md`.

## Files created or modified in Phase 8

Paths below identify this phase's changes, including edits to files that were already untracked when this work began.

In **both** `website/backend/src/` and `mobile/backend/src/`:

- New `models/UICampaign.js`
- New `services/uiCampaignRuntime.js`
- Modified `services/uiRuntimeService.js`
- Modified `services/uiAssetService.js`
- Modified `validators/ui.validator.js`

Additional backend files:

- New `website/backend/src/services/uiCampaignService.js`
- Modified `website/backend/src/routes/uiRoutes.js`
- Modified `mobile/backend/src/routes/uiRoutes.js`
- Modified `mobile/backend/src/controllers/uiController.js`

Admin frontend:

- New `src/pages/admin/CampaignManagerPage.tsx`
- New `src/utils/uiCampaignPresets.ts`
- Modified `src/api/ui.ts`
- Modified `src/router/routes.tsx`
- Modified `src/components/layout/navigation.ts`

Mobile frontend:

- New `src/services/uiCampaignLocation.ts`
- Modified `src/services/api.ts`
- Modified `src/services/uiRuntime.ts`
- Modified `src/services/uiAnimations.ts`
- Modified `src/context/UIConfigProvider.tsx`
- Modified `src/components/UILottie.tsx`
- Modified `src/hooks/useHyperlocalLocation.ts`
- Modified `src/types/dynamicUI.ts`
- Modified `src/utils/dynamicUI.ts`

Verification and documentation:

- New `website/backend/tests/ui-campaign.test.js`
- New `website/backend/tests/ui-campaign.integration.test.js`
- Modified `website/backend/tests/ui-store.helper.js`
- Modified `mobile/frontend/tests/dynamic-ui-runtime.test.cjs`
- Modified `website/admin-frontend/scripts/dynamic-ui.test.cjs`
- Modified `docs/DYNAMIC_UI_BACKEND_API.md`
- New `docs/DYNAMIC_UI_PHASE8_REPORT.md`

## Verification results

| Suite/check | Result |
|---|---|
| Website backend existing Dynamic UI | 12 passed |
| Website backend existing animation | 5 passed |
| Mobile backend existing Dynamic UI | 6 passed |
| New campaign backend | 9 passed |
| Mobile frontend runtime, including 7 new campaign/cache cases | 26 passed |
| Admin UI, including 3 new campaign cases | 10 passed |
| Isolated live MongoDB integration | 1 passed |
| **Total focused tests** | **69 passed, 0 failed** |
| Mobile `npx.cmd tsc --noEmit` | Passed |
| Admin `npm.cmd run build` (`tsc -b` + Vite) | Passed |
| Admin focused oxlint | Passed |
| Backend `node --check` across 14 changed source files | Passed |
| Admin actual dev-server route/module loading | All 22 pages / 148 module requests passed |
| Impeccable mechanical UI detector | No findings |

Acceptance coverage:

1. Scheduling/activation: exact inclusive boundary, no early activation, actual HTTP delivery.
2. Automatic expiry: exclusive boundary, default restoration, lower-priority resumption.
3. Overlap priority: unequal priorities, equal-priority rejection, deterministic tie ordering.
4. Timezone: IST midnight crossing UTC day boundary; missing offsets/invalid windows rejected.
5. City targeting: selected/global/unknown/inactive cities, cache isolation, city-scoped animations.
6. Invalid configuration: unsafe/unknown fields, unavailable assets, unsupported/orphan release references.
7. Public/cache behavior: 200/304, activation/expiry ETag transitions, generation invariance, Age, slow/replayed responses, bounded 304 renewal and legacy capability behavior.
8. Restart recovery: fresh runtime module instances read persisted state at missed start/end boundaries; live MongoDB retained references were exercised.
9. Offline fallback: last-known-good before expiry, local expiry, expired-cache restart and replay rejection.
10. Admin authorization: missing bearer/inactive Admin rejected; real login and authenticated campaign writes exercised.
11. Published-layout compatibility: existing release/rollback/schema tests, renderer 1 snapshots, renderer 2 animations, existing studio palettes and actual page rendering checks passed.

Reproduction commands from the repository root:

```powershell
node --test website/backend/tests/dynamic-ui.test.js website/backend/tests/ui-animation.test.js website/backend/tests/ui-campaign.test.js mobile/backend/tests/dynamic-ui.test.js
node --test mobile/frontend/tests/dynamic-ui-runtime.test.cjs
node --test website/admin-frontend/scripts/dynamic-ui.test.cjs
$env:PHASE8_TEST_MONGO = 'mongodb://127.0.0.1:27028'
node --test website/backend/tests/ui-campaign.integration.test.js
```

The opt-in integration test requires a local MongoDB listener, creates a uniquely named `inquiryexperts_phase8_test_*` database, and drops only that database afterward. It never uses an application `.env` database. A separate loopback MongoDB 8.3 instance was used for this run. The flow covered real Admin login, release publication, campaign creation/preview, Mongo unique-index rejection, public ETags, actual mobile TypeScript store parsing/caching, local expiry, persisted schedule recovery, CAS and cancellation/default restoration. Future clock boundaries were injected rather than waiting for real festival dates.

## Remaining limits and rollout notes

- No enabled browser or native app surface was available in the UI automation inventory. Browser interaction/screenshots and live-device/emulator rendering were not performed. Server-side rendering, production build, dev module loading and runtime tests are verified; a fresh Android/iOS native binary was not built in this phase.
- This phase supports Asia/Kolkata scheduling only. Inputs accept explicit offsets and are stored as UTC instants; no recurring schedules, date guessing or additional timezones are implemented.
- Existing publication semantics remain immediate. Prepare a festival snapshot through the studios, retain its release ID, then publish/rollback the intended default before scheduling the historical festival release. Campaign expiry restores whichever default is published at that time.
- Snapshots are selected as complete releases. Independent arbitrary theme/page composition still belongs to the existing studios and validation pipeline. Optional campaign animation assignment is limited to the existing supported Offers homepage slot.
- Equal-priority overlap validation is a read-before-write check across documents, not a transaction. Concurrent inserts may both succeed; deterministic priority/start/identifier ordering still guarantees a single resolved winner on every server. Per-document edits and unique identifiers have database-level protection.
- Newly created/edited/disabled schedules reach an already-open online app on its next existing refresh (normally within 60 seconds). Known start/end boundaries have dedicated local timers. Offline devices cannot discover new server edits; they still obey the previously observed hard expiry and use native fallback afterward. Platform suspension can delay timers, so foreground resume expires before requesting again.
- Bundled native fallback is intentional after offline lease expiry; a second full default snapshot is not duplicated into campaign responses/cache. Online expiry restores the current published default automatically.
- Legacy clients continue receiving the default until upgraded to the campaign-aware mobile runtime. Both backends and the updated Admin/mobile code must be deployed together using the existing shared database architecture. Deployment itself was outside this request.

## Phase 9 readiness

Campaign references, deterministic runtime resolution, audit/version controls, capability negotiation, boundary/cache metadata and focused tests are ready for future work. No Phase 9 features, recurring scheduling engine, new design editor or additional campaign platform were implemented.

PHASE 8 COMPLETE
