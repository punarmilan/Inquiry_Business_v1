# Dynamic UI backend v1 — Phase 2

Current extension: renderer 5 adds native home cards, banners and offer artwork
through the same revision/release/asset APIs. See [Home content administration](HOME_CONTENT_ADMIN.md)
for the current authoring contract and backward compatibility. Earlier phase
limits and deferrals below describe those historical phases.

Two collections (`uirevisions`, `uireleases`) and the reserved `Setting` key `ui.activeRelease` use the existing Mongo connections. Admin routes use the existing active-admin JWT middleware and permissions. App routes require no login. Paths are relative to each API base URL, without an additional `/api` prefix.

## Endpoints

| API | Method/path | Request / result |
|---|---|---|
| Admin | `GET /ui/configs?kind=page&status=draft&page=1&limit=20` | Paginated revision summaries; `kind` accepts page/theme. |
| Admin | `POST /ui/configs` | `{config, sourceRevisionId?}` -> `201 {success, config: revision}`. Optional source must have matching kind/key. |
| Admin | `GET /ui/configs/:id` | `{success, config: revision}`. |
| Admin | `PUT /ui/configs/:id` | `{config, expectedDraftVersion}` -> updated draft; kind/key cannot change. |
| Admin | `POST /ui/configs/validate` | `{config}` -> `{success, valid, schemaVersion, rendererVersion, config}`; structural/theme validation, no writes. |
| Admin | `POST /ui/configs/:id/validate` | `{expectedDraftVersion}` -> `{success, valid, schemaVersion, rendererVersion, draftVersion, generation}`; also checks compatibility with currently published theme/pages. |
| Admin | `POST /ui/configs/:id/publish` | `{expectedDraftVersion, expectedGeneration, reason}` -> `201 {success, releaseId, generation, release}`. First expectedGeneration is 0. |
| Admin | `GET /ui/releases?page=1&limit=20` | Paginated committed release history, newest generation first. |
| Admin | `GET /ui/releases/:id` | `{success, release}`; only active-head ancestors are eligible. |
| Admin | `POST /ui/releases/:id/rollback` | `{expectedGeneration, reason}` -> new release/generation, preserving audit history. |
| App | `GET /ui/runtime?rendererVersion=1&locale=en&cityId=<optional-object-id>` | Published configuration or valid native fallback; ETag/304 supported. City/locale are validated but do not change the global configuration in Phase 2. |

All admin responses are `Cache-Control: no-store`. Public runtime uses `public, max-age=0, must-revalidate` with a weak content ETag excluding clock metadata. On 304, clients use the HTTP Date header to refresh clock/age information. No Redis integration.

## Create, update and publish

Admin requests need `Authorization: Bearer <admin-access-token>`.

```http
POST /ui/configs
Content-Type: application/json
```

```json
{
  "config": {
    "schemaVersion": 1,
    "rendererVersion": 1,
    "kind": "page",
    "key": "offersHome",
    "slots": {
      "beforeContent": [
        { "id": "intro", "type": "heroBanner", "props": { "title": { "en": "Explore local offers", "hi": "Paas ke offers dekhein" }, "buttonLabel": { "en": "View offers" }, "action": "offers.openAll" } }
      ],
      "afterContent": []
    }
  }
}
```

The returned `config` is a revision envelope with `_id`, `status:"draft"`, `draftVersion:1`, inner `config`, source reference and actor/timestamps. Update the same ID with `{config:<replacement-payload>,expectedDraftVersion:1}` to obtain draftVersion 2. This does not change the active release. Published revision IDs are read-only; POST a new draft to fork one.

```http
POST /ui/configs/<draft-id>/publish
```

```json
{ "expectedDraftVersion": 1, "expectedGeneration": 0, "reason": "Publish initial offer header" }
```

Response: `201 {"success":true,"releaseId":"<object-id>","generation":1,"release":<immutable-release>}`. Creation of the immutable snapshot does not freeze the working draft: subsequent draft edits remain private until another explicit publication. A release preserves previously published pages/theme and replaces only this resource's reference.

Global theme draft payload:

```json
{
  "schemaVersion": 1,
  "kind": "theme",
  "key": "global",
  "modes": {
    "light": { "colors": { "background": "#FFFFFF", "text": "#171717" } },
    "dark": { "colors": { "background": "#000000", "text": "#F7FCFD" } }
  }
}
```

## Stable Phase 3 runtime shape

`200` response fields:

```json
{
  "success": true,
  "releaseId": null,
  "generation": 0,
  "schemaVersion": 1,
  "rendererVersion": 1,
  "enabled": false,
  "useNativeFallback": true,
  "fallbackReason": "not_published",
  "serverTime": "2026-10-18T09:00:00.000Z",
  "refreshAfter": "2026-10-18T09:01:00.000Z",
  "validUntil": "2026-10-25T09:00:00.000Z",
  "base": { "pages": {}, "theme": { "schemaVersion": 1, "kind": "theme", "key": "global", "modes": { "light": { "colors": {} }, "dark": { "colors": {} } } } },
  "overlay": null,
  "assets": {}
}
```

The example abbreviates `base.pages`: the actual response always includes all 13 page keys with valid configurations and empty slots for unpublished pages. Empty theme colors mean preserve the bundled palette, not erase it. Live responses set enabled=true/useNativeFallback=false/fallbackReason=null and carry the active releaseId/generation. Other fallback reasons: `unsupported_renderer`, `disabled`, `unavailable`. Missing/corrupt revisions or storage errors expose no draft/error internals. Client must obey useNativeFallback and keep existing native business UI intact.

## Frozen contract and limits

- Page keys: `onboarding`, `login`, `otp`, `profileSetup`, `offersHome`, `offerDetails`, `servicesHome`, `serviceCategories`, `serviceProviders`, `businessCenter`, `plans`, `more`, `profile`. Slots: beforeContent/afterContent only. Maximum 40 blocks total, unique IDs.
- Localized text: required `en`, optional `hi`, each 1–500 characters, plain text. Omitted Hindi falls back to English in the future renderer.
- `text` props: required localized `text`; optional `variant:heading|body|caption`, colorToken and backgroundToken.
- `heroBanner` props: required localized `title`; optional localized subtitle; buttonLabel/action must appear together. Optional colorToken/backgroundToken.
- `offerRail` props: source=`nearby|showcase`; optional variant=`standard|compact`, limit=1–12. Allowed only on offersHome; data remains owned/filtered by the existing screen/API.
- `spacer` props: integer height=0–48. `actionLink` props: localized label and action.
- Actions: `offers.openAll`, `business.openCenter`, `profile.openSettings`. Auth pages cannot contain remote actions. Native adapters must still enforce existing route/access gates.
- Foreground tokens: text/textSecondary. Background tokens: background/surface/primary/primaryDark/accent. Default foreground/background: text/surface. No arbitrary styles, URLs, expressions, HTML, callback source or nested blocks.
- Theme overrides: primary, primaryBright, primaryDark, accent, background, surface, text, textSecondary, border, backdropStart, backdropEnd; six-digit hex only, both modes required. Text/background/surface pairs and configured text/banner block pairs must meet 4.5:1 contrast in both modes. Contextual page checks run on draft validation and publication against the complete candidate release.
- Each config <=256 KB; combined base reserves 2 KB within the 256 KB runtime budget. Unsupported properties, prototype keys, malformed IDs and unknown query dimensions reject with 422. Stale draft/generation or attempts to mutate frozen versions reject with 409.
- Pointer updates happen only after all immutable records and their complete references validate. Compare-and-swap protects concurrent publishers, including initial unique-key insertion. Failed candidates are not reachable in committed history and cannot be rollback targets. No Mongo transaction/replica-set requirement. Direct database writes bypass application-level protections and are outside this API contract.
- `ui.*` cannot be written by the generic settings API; public `/settings` excludes these keys. Existing non-UI settings/business/auth/payment routes keep their prior behavior.

Assets/image blocks, Lottie, campaign kind/scheduling, preview tickets, token editors, kill-switch authoring and renderer/UI integration are intentionally deferred. `overlay:null` and `assets:{}` reserve stable response fields without implementing those features.

Verification: `node --test website/backend/tests/dynamic-ui.test.js mobile/backend/tests/dynamic-ui.test.js`. Tests use isolated model doubles with actual Mongoose document validation and real HTTP route/auth checks; no live MongoDB or production data is used.

## Phase 2 file inventory

New in **both** `mobile/backend/src/` and `website/backend/src/`: `models/UIRevision.js`, `models/UIRelease.js`, `validators/ui.validator.js`, `services/uiRuntimeService.js`, `controllers/uiController.js`, `routes/uiRoutes.js`. The read-model/contract/runtime copies are intentionally identical and covered by a parity check.

Additional admin service: `website/backend/src/services/uiConfigService.js`.

Modified in both backend `src/` roots: `routes/index.js` (mount UI routes), `controllers/settingController.js` (reserve/protect the UI setting namespace).

Tests: `website/backend/tests/dynamic-ui.test.js`, `website/backend/tests/ui-store.helper.js`, `mobile/backend/tests/dynamic-ui.test.js`. Documentation: this file. No package manifests, mobile screens, admin UI, existing business controllers or database connection configuration changed in Phase 2.

## Phase 8 — Festival campaigns

Phase 8 adds `uicampaigns` to the existing MongoDB connections. The earlier campaign deferral describes Phase 2 only. Campaigns retain references to committed immutable releases; they do not copy theme/page configurations or mutate `ui.activeRelease`.

All campaign administration uses the existing active-admin bearer authentication and `Cache-Control: no-store`:

| Method/path | Contract |
|---|---|
| `GET /ui/campaigns?page=1&limit=20` | Paginated campaigns, with computed `status`; audit bodies excluded. |
| `GET /ui/campaigns/:id` | Campaign detail including version, actor information and audit history. |
| `POST /ui/campaigns` | Create a validated draft, scheduled or disabled campaign. Returns `201 {success,campaign}`. |
| `PUT /ui/campaigns/:id` | Replace editable fields using required `expectedVersion`; atomic CAS, `409` for stale edits. |
| `POST /ui/campaigns/preview` | Same campaign payload; returns validated `base`, `assets` and overlapping campaign summaries without writes. |

Example create payload (dates are illustrative administrator input, not built-in festival dates):

```json
{
  "identifier": "diwali-local-offers",
  "name": "Diwali local offers",
  "festival": "diwali",
  "releaseId": "507f1f77bcf86cd799439011",
  "animationAssetId": null,
  "startsAt": "2030-10-21T00:00:00+05:30",
  "endsAt": "2030-10-22T00:00:00+05:30",
  "timezone": "Asia/Kolkata",
  "cityIds": [],
  "priority": 10,
  "state": "scheduled",
  "enabled": true,
  "reason": "Schedule approved festival release"
}
```

`festival`: `diwali|holi|christmas|new-year|custom`. Identifier: 3–80 lowercase letters/digits/hyphens, unique. Name: 1–120 plain characters. Priority: integer 0–1000. Dates require ISO timestamps with explicit UTC offset or Z, with end strictly after start. Timezone defaults to `Asia/Kolkata`; Phase 8 supports this timezone only. Empty `cityIds` targets all cities, including unknown locations; otherwise at most 100 unique active supported city IDs. Optional `animationAssetId` selects an enabled validated asset and replaces the release's Offers homepage animation in memory, subject to existing page/runtime budgets. All fields and references validate on preview/save; expired campaigns cannot be scheduled enabled.

Persisted `state` is `draft|scheduled|disabled`; effective `status` is `draft|scheduled|active|expired|disabled`. Active and expired are derived from server time, never dependent on jobs or a running Admin Panel. `startsAt <= now < endsAt`. Disable with `state:"disabled",enabled:false`; cancel with `state:"draft"`. Supply `expectedVersion` and a new audit reason when editing. Unchanged references can be deactivated even after an asset/city becomes unavailable. Retained campaign asset references prevent archival.

Overlapping eligible campaigns use descending priority, descending start instant, then ascending ASCII identifier. Normal saves reject equal-priority overlaps (`UI_CAMPAIGN_OVERLAP`); concurrent cross-document inserts may still tie and use this deterministic order. Different priorities and disjoint cities/time windows are allowed. Identifiers use Mongo uniqueness; edits use per-document CAS. No replica set/transaction requirement was added.

### Campaign-aware public delivery

New mobile clients explicitly request `GET /ui/runtime?rendererVersion=2&campaignVersion=1&locale=en&cityId=<optional-id>`. Without `campaignVersion=1`, the original response shape and published default remain unchanged; older clients never receive campaigns. Unsupported capability versions reject with 422.

Campaign-aware responses add:

```json
{
  "campaign": {
    "id": "507f1f77bcf86cd799439012",
    "identifier": "diwali-local-offers",
    "version": 1,
    "releaseId": "507f1f77bcf86cd799439011",
    "startsAt": "2030-10-20T18:30:00.000Z",
    "endsAt": "2030-10-21T18:30:00.000Z"
  },
  "nextTransitionAt": "2030-10-21T18:30:00.000Z"
}
```

`campaign` is null when no compatible campaign wins. `base` and `assets` contain the resolved full snapshot. Top-level `releaseId`/`generation` continue to identify the current published default head, preserving monotonic publishing semantics; `campaign.releaseId` identifies the effective campaign snapshot. The next eligible start/end boundary caps `validUntil` and `refreshAfter`. ETags include campaign identity/version/release and `nextTransitionAt`, while excluding moving clock fields. Activation, expiry, disabling, schedule edits and default-head publication therefore revalidate correctly. Public runtime caching is `public, max-age=0, must-revalidate, stale-if-error=0`.

Animation reads use `GET /ui/assets/:id?campaignVersion=1&cityId=<optional-id>` with the same active reference checks, hash verification and expiry/city resolution. Requests without the capability use the published default asset references. No enabled-asset library is exposed publicly.

Default publishing/rollback semantics remain unchanged. To prepare a future campaign, publish its design through the existing studios, retain that release ID, and publish/rollback the intended default before scheduling the retained festival release. After campaign expiry, delivery reads the then-current published default, including any default updates made during the campaign.

## Phase 9 — All supported mobile screens (renderer 3)

`schemaVersion` remains `1`. Renderer capability is now `3`; published renderer 1/2 snapshots still validate and render. The 13 reserved page keys are now integrated: `onboarding`, `login`, `otp`, `profileSetup`, `offersHome`, `offerDetails`, `servicesHome`, `serviceCategories`, `serviceProviders`, `businessCenter`, `plans`, `more`, `profile`.

No endpoint, configuration collection, permission or publication workflow was added. Existing `/ui/configs` draft/validation/publication APIs accept each page's key, retain all other published revision references, and use the same release history, CAS generation and rollback. A release requiring renderer 3 returns native fallback to renderer 1/2 clients; deploy both backends and the updated clients together before publishing new presentations.

Renderer 3 pages may add strict `presentation` fields. The complete allowlist is `validators/uiPresentation.json`, mirrored and parity-tested against mobile. Common visual fields on the 12 new screens are `backgroundToken`, `headerVariant`, `cardVariant`, `spacing`, `iconTone`. Screen-specific fields cover category columns, provider density, selector outlines, offer poster/details/actions, dashboard/status outlines, plan density/promotional copy, auth form outlines, onboarding copy/bundled artwork and profile/menu presentation. Unknown or cross-screen fields reject. Offers keeps its existing section editor and has no new native presentation fields.

Example page, supplied as `config` to the existing draft API:

```json
{
  "schemaVersion": 1,
  "rendererVersion": 3,
  "kind": "page",
  "key": "plans",
  "presentation": {
    "cardVariant": "outlined",
    "planLayout": "compact",
    "promotionalLabel": { "en": "Celebrate with your community" }
  },
  "slots": {
    "beforeContent": [{
      "id": "community",
      "type": "illustration",
      "props": { "image": "business", "alt": { "en": "Support local businesses" }, "height": 160, "fit": "contain" }
    }],
    "afterContent": []
  }
}
```

The new `illustration` block requires renderer 3: `image` is `welcome|offers|services|business`, `alt` is localized text, optional `height` is 96–240 and `fit` is `contain|cover`. These are existing bundled assets; remote image URLs, HTML and code are rejected. Lottie is available on all renderer 3 pages (one animation per page, at most 13 distinct referenced assets per runtime); renderer 2 Lottie remains Offers-only. Existing vector validation, reduced-motion behavior, size limits and asset reference/hash checks remain enforced. Runtime 3 bases reserve 8 KB of the existing 256 KB limit for response/asset metadata; older bases retain their 2 KB reserve.

Use `GET /ui/runtime?rendererVersion=3&campaignVersion=1&locale=en&cityId=<optional-id>` and `GET /ui/assets/:id?rendererVersion=3&campaignVersion=1&cityId=<optional-id>`. The asset endpoint's optional renderer capability is new; omission retains renderer 2 compatibility. Campaigns select entire immutable snapshots including all pages and their presentations. Optional campaign animation assignment still affects only Offers and preserves an existing renderer 3 page. Boundary resolution, ETags, generations, cache headers and expiry behavior are unchanged.

Native forms, menus, eligibility, filtering, approval, plan prices/quotas and payment operations are never configuration fields. Authentication pages reject remote actions; other pages render remote CTAs only when the native host supplies a trusted handler. The builder authors action links/hero CTAs on Offers only. All other new sections are decorative and leave native business actions available.
