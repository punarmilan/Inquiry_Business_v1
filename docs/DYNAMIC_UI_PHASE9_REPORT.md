# InquiryExperts — Phase 9 report

Date: 2026-10-19 (Asia/Kolkata)

## Delivered scope

Extended the existing Phase 2–8 system to all 13 supported page keys. Reused the runtime/provider, immutable revisions/releases, MongoDB connections, campaign resolution, shared registry, theme tokens, studios and Page Builder. No dependency, configuration collection, business endpoint or separate editor was introduced. Existing uncommitted work was preserved. Phase 10 was not started.

Read the Phase 8 report, Phase 4–7 report and backend API contract before implementation. Consulted the exact Expo 57 documentation at https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.

| Screen/key | Supported remote presentation | Protected native behavior |
|---|---|---|
| Offers / `offersHome` | Existing sections and theme integration; new bundled illustration section | Search, city/category filters, eligibility and existing offer sources/actions |
| Services / `servicesHome` | Header/search/location styling, area cards, empty copy, banners/images/Lottie | Supported cities, saved localities, sorting, area selection and navigation |
| Categories / `serviceCategories` | One/two/three-column categories, header/selectors, cards, empty copy, sections | City/category search, emergency filtering and provider navigation |
| Providers / `serviceProviders` | Default/compact cards, header/search, empty copy, sections | Provider API filters, verification and Call/WhatsApp/Share |
| Offer Details / `offerDetails` | Header, contained poster, business card, stacked price/details, outlined CTA, sections | Eligibility failure handling, API prices, Call/WhatsApp/Directions/Save/Share |
| Business Center / `businessCenter` | Compact dashboard, neutral guidance/business/action card styling, outlined status, sections | Approval/rejection/resubmission, subscription state and available actions |
| Plans / `plans` | Card density/borders, header, separate promotional label, sections | API plan objects, amounts/quotas, business selection and existing payment sheet |
| Onboarding / `onboarding` | Localized slide titles/subtitles, bundled artwork, compact text layout, bounded decorative slots | Three local slides, next/back/skip, language and onboarding storage/navigation |
| Login / `login` | Bundled background, form outline/card, header/icons, bounded decorative slots | Native fields, login modes, OTP/password/Google, validation, keyboard and navigation |
| OTP / `otp` | Header/form/background/spacing, optional scrollable decorations | Four-digit sanitization, cooldown, resend and confirmation |
| Register / `profileSetup` | Header/form/intro card and sections | Native fields, Google integration, terms acceptance and OTP navigation |
| More / `more` | Header, groups, separated menus, icon tone, backgrounds and sections | Existing destinations and business-gated menu entries |
| Profile / `profile` | Header/identity outline, groups/menus, icon tone, spacing and sections | Native account data, settings/destinations and confirmed logout |

The common presentation allowlist covers background/surface selection, default/compact/centered headers, default/outlined/soft cards, bounded spacing choices and icon tone. Global colors remain in Theme Studio. Native prices, status messages, approval colors and business actions are never supplied by presentation JSON. Fixed login form geometry stays native; spacing affects its decorative region. Onboarding and login decorations are bounded to keep controls reachable.

## Shared contract and safety

- `schemaVersion: 1` is unchanged; renderer capability advances to `3`. Renderer 1/2 snapshots remain valid, including existing Offers/Lottie layouts. Unsupported capabilities and malformed/cross-screen presentation fields fail closed.
- `presentation` is strict and screen-specific. The same JSON allowlist is mirrored across both backend deployments and mobile, with byte-parity coverage. Fields cannot override prices, quotas, roles, eligibility, verification, filters, routes or auth requirements.
- Added the `illustration` block: four existing bundled assets (`welcome`, `offers`, `services`, `business`), localized alt text, height 96–240, and contain/cover. No arbitrary image URL, remote code, HTML or event handler is accepted.
- Renderer 3 supports one validated decorative Lottie per page and up to 13 distinct referenced assets per runtime. Existing vector-only checks, finite playback, lazy player/asset loading, reduced-motion, viewport, focus and background behavior are reused. Renderer 2 Lottie remains Offers-only.
- The 256 KB runtime limit remains; renderer 3 bases reserve 8 KB for envelope/asset metadata. Legacy bases retain the 2 KB reserve. Existing section, animation and validation budgets remain enforced.
- The new `useUIPage` adapter reads the existing root store/theme. Screens do not create duplicate stores, API requests or pollers. Optional sections use the existing error boundaries; malformed data falls back safely.
- Services and Offer Details now honor explicit published theme tokens while retaining their original tuned palette when no token override exists. Native navigation containers and payment/auth state are not remounted for presentation changes.

## Admin Builder

Expanded the existing `/ui/pages/offersHome` workspace with one selector covering all 13 screens. The selected page loads its published configuration and own drafts; creating a new draft starts from that page instead of the old Offers-only fallback. Screen switches use a keyed workspace and an unsaved-edit prompt.

The same library, inspector, drag/drop, keyboard/Up/Down reorder, duplicate/hide/remove, undo/redo, validation, save, publication reason, generation conflict handling, history and rollback controls are reused. Added screen-specific native presentation controls and bundled-image controls. Existing validated animation assets can be selected on every supported page. Auth pages cannot author remote actions; the builder exposes CTA/action-link authoring on Offers only. Protected native components cannot be removed or reordered by sections.

The phone preview switches by page and shows representative native content, visual variants, selected bundled artwork and optional sections in both theme modes. It explicitly labels sample data and approximate browser rendering. Theme Studio and Animation Studio remain the design/asset authorities; there is no duplicate design editor. Animation Studio assignments preserve a page's renderer 3 capability.

## API and campaign behavior

No new endpoint or collection. Existing draft/validate/publish/rollback APIs now accept renderer 3 page presentation and illustration blocks. Page-specific publication changes only the selected revision reference and retains the rest of the release.

- Public runtime: `GET /ui/runtime?rendererVersion=3&campaignVersion=1&locale=en&cityId=<optional-id>`.
- Public animation: `GET /ui/assets/:id?rendererVersion=3&campaignVersion=1&cityId=<optional-id>`. The optional asset renderer capability is new; omission retains renderer 2 compatibility.
- Campaigns continue referencing complete immutable snapshots, including the new pages and their native presentation. Optional campaign animation assignment remains Offers-only and no longer downgrades renderer 3 pages.
- Priority, city targeting, server-time activation/expiry, restart recovery, ETags and monotonic publication generations retain Phase 8 semantics. Campaign activation does not publish a new generation. Online expiry restores the then-current baseline snapshot.
- The existing cache and boundary timers are reused. Offline content expires at the observed boundary and returns to bundled native UI; an expired campaign cannot remain indefinitely. The current published baseline is fetched when connectivity resumes. Foreground resume expires before refresh.

## Files changed in this phase

Paths below describe Phase 9 edits, including extensions to files created in earlier uncommitted phases. They do not claim ownership of unrelated working-tree changes.

Both `website/backend/src/` and `mobile/backend/src/`:

- `validators/ui.validator.js`
- `validators/uiPresentation.json` (new)
- `models/UIRelease.js`
- `services/uiRuntimeService.js`
- `services/uiCampaignRuntime.js`

Additional backend and backend tests:

- `mobile/backend/src/controllers/uiController.js`
- `website/backend/tests/dynamic-ui.test.js`
- `mobile/backend/tests/dynamic-ui.test.js`
- `website/backend/tests/ui-screens.test.js` (new)
- `website/backend/tests/ui-campaign.integration.test.js`

Under `mobile/frontend/src/`:

- `types/dynamicUI.ts`
- `utils/dynamicUI.ts`
- `utils/uiPresentation.json` (new)
- `utils/uiIllustrations.ts` (new)
- `hooks/useUIPage.ts` (new)
- `components/ComponentRegistry.tsx`
- `components/DynamicRenderer.tsx`
- `components/ScreenContainer.tsx`
- `services/uiAnimations.ts`
- `theme/index.ts`
- `theme/runtime.ts`
- `screens/services/ServiceUI.tsx`
- `screens/services/ServicesHomeScreen.tsx`
- `screens/services/ServiceCategoriesScreen.tsx`
- `screens/services/ServiceProvidersScreen.tsx`
- `screens/offers/OfferUI.tsx`
- `screens/offers/OfferDetailsScreen.tsx`
- `screens/more/BusinessCenterScreen.tsx`
- `screens/more/MoreScreen.tsx`
- `screens/post/PlansScreen.tsx`
- `screens/profile/ProfileScreen.tsx`
- `screens/auth/OnboardingScreen.tsx`
- `screens/auth/IllustratedOnboardingPage.tsx`
- `screens/auth/PhoneEntryScreen.tsx`
- `screens/auth/OtpVerificationScreen.tsx`
- `screens/auth/ProfileSetupScreen.tsx`

Under `website/admin-frontend/`:

- `src/hooks/useUIWorkspace.ts`
- `src/utils/uiPageBuilder.ts`
- `src/utils/uiIllustrations.ts` (new)
- `src/pages/admin/UIPageBuilderPage.tsx`
- `src/pages/admin/AnimationStudioPage.tsx`
- `src/components/hyperlocal/UIBlockInspector.tsx`
- `src/components/hyperlocal/UIPhonePreview.tsx`
- `scripts/dynamic-ui.test.cjs`

Additional verification/documentation:

- `mobile/frontend/tests/dynamic-ui-runtime.test.cjs`
- `docs/DYNAMIC_UI_BACKEND_API.md`
- `docs/DYNAMIC_UI_MOBILE_RUNTIME.md`
- `docs/DYNAMIC_UI_PHASE9_REPORT.md` (this report)

No Phase 9 changes to package manifests, navigation, offer/provider business controllers, auth/payment controllers or database connection configuration.

## Verification results

| Check | Result |
|---|---|
| Backend Dynamic UI, animation, campaigns, all-screen publication/rollback and mobile backend suites | 38 passed |
| Mobile runtime, parser, actual screen functions with mocked native/API boundaries, offline/cache and navigation gates | 38 passed |
| Existing subscription utilities | 5 passed |
| Existing USB development connection regression suite | 5 passed |
| Admin contract, Builder/preview/studio rendering and transport | 13 passed |
| Existing Razorpay, auth-session, offer validation and Admin plan/payment security suites | 80 passed |
| Isolated live MongoDB/HTTP Admin → Publish → Campaign → Mobile store integration | 1 passed |
| **Total** | **180 passed; 0 failed; 0 skipped** |
| Mobile `npx.cmd tsc --noEmit` | Passed |
| Admin `npm.cmd run build` (TypeScript + Vite) | Passed |
| Admin full `npm.cmd run lint` | Exit 0; 5 existing unrelated warnings; no errors |
| Focused mobile oxlint on affected sources | Exit 0; 8 unused import/parameter warnings; no errors |
| Backend syntax (`node --check`, 9 affected JS source files) | Passed |
| Actual Admin development route/module loading | All 22 pages; 154 module requests passed |
| Impeccable mechanical UI detector on Builder, inspector and preview | No findings |
| Metro Android development bundle | HTTP 200; 12,381,414 bytes after final presentation changes |

Mocked/unit coverage includes all 13 renderer keys, renderer 1/2 compatibility, strict cross-screen schemas, unsafe configuration rejection, multiple referenced animations, draft/publication reference retention, rollback, campaign presentation/expiry, cache/304/Age/replay behavior, city scope, offline recovery, provider filtering/contact actions, category grid/emergency filters/navigation, offer eligibility failure/contacts/save/share/directions, business approval/resubmission gates, conditional Post tab, unchanged plan-object/payment-sheet handoff, OTP sanitization/cooldown, local registration terms, trusted menus and logout confirmation. These execute actual application modules with isolated native/network/storage/model boundaries; they are not physical-device interaction tests.

The 80 existing backend security tests use isolated doubles and cover auth sessions, server offer validation, payment ownership/order/signature/amount/currency/settlement/idempotence and Admin plan/payment access. No live payment or charge was performed.

The live integration used a separate MongoDB 8.3 listener on loopback port 27029 and ephemeral HTTP servers for the real Admin/mobile Express apps. It exercised real Admin password login and bearer authorization, validated asset creation, publication of all 13 page keys, immutable festival snapshot selection, Mongo unique-index rejection, campaign preview, public renderer 3 delivery, asset delivery, 200/304 ETags, actual mobile TypeScript store parsing/caching, injected expiry boundaries, fresh runtime-module recovery, baseline restoration and stale-edit CAS. It created/dropped only a uniquely named `inquiryexperts_phase8_test_*` database (the reused harness retains its name). The disposable process/data directory was removed. Application databases were not used for test publication.

Reproduction from repository root (dependencies already installed):

```powershell
node --test website/backend/tests/dynamic-ui.test.js website/backend/tests/ui-animation.test.js website/backend/tests/ui-campaign.test.js website/backend/tests/ui-screens.test.js mobile/backend/tests/dynamic-ui.test.js
node --test mobile/frontend/tests/dynamic-ui-runtime.test.cjs mobile/frontend/tests/subscription-utils.test.cjs mobile/frontend/tests/dev-connection.test.cjs
node --test website/admin-frontend/scripts/dynamic-ui.test.cjs
node --test mobile/backend/tests/razorpay-payments.test.js mobile/backend/tests/auth-session.test.js mobile/backend/tests/offer-validation.test.js website/backend/tests/plan-payment-admin.test.js
# Requires a dedicated local test MongoDB listener; no application .env database:
$env:PHASE8_TEST_MONGO = 'mongodb://127.0.0.1:27029'
node --test website/backend/tests/ui-campaign.integration.test.js
```

## Browser, Android and remaining limitations

- UI automation inventory returned no enabled apps or browsers. Interactive Admin editing, screenshot comparison and full screen-by-screen device visual QA could not be performed. Admin server rendering, actual route loading and production compilation passed.
- A connected OnePlus 7 was available through ADB. USB reverse mappings for Metro 8081 and API 5000 were present; the installed development client accepted its launch intent. Metro compiled the updated Android bundle, and sampled app logs showed JavaScript `Running main` without a sampled JS fatal or `NoRouteToHostException`. Existing native Dev Launcher/ReactHost soft warnings appeared before JS startup. This is a connection/bundle/startup smoke check, not verification of campaign rendering on all physical screens. No new native binary or iOS device build was produced.
- The already-running application backend process was not restarted or used for test publication; newly edited server modules require restart/deployment. End-to-end campaign delivery was verified against the isolated test database and mobile store, not through the physical phone's application database.
- Live Google sign-in, delivered SMS/email OTP, native payment gateway UI, real payment settlement and real contact applications were not invoked. Native screen logic and backend regression tests cover their retained boundaries.
- The browser phone preview is approximate and uses sample data. Native font scaling, keyboard/insets, long translated copy and selected asset composition should receive visual QA on target devices before rollout.
- Artwork selection is limited to four existing bundled images; Admin image uploading is outside this phase. Original PNGs are relatively large (about 1.4–2.0 MB each) and remain lazy preview assets rather than duplicated/generated files.
- The existing bounded animation disk cache retains one last-known asset globally. Other offline page animations use their localized static fallback until fetched again; UI configuration remains available within its validated lifetime. No unbounded per-screen media cache was introduced.
- Phase 8 limitations remain: Asia/Kolkata scheduling, complete release selection, Offers-only optional campaign animation override, deterministic tie handling for concurrent overlaps, normal refresh latency for newly edited schedules, and bundled native fallback after offline expiry. Campaigns can include per-page animations through their published snapshot.
- Deploy both backends, Admin and renderer 3 mobile support before publishing renderer 3 releases. Older clients receive native fallback for incompatible releases; they do not partially render unknown layouts. No deployment was performed by this task.

## Phase 10 readiness

Shared screen contracts, native adapters, one multi-screen Builder, immutable publication/rollback, all-page asset delivery and Phase 8 campaign compatibility are implemented and pass automated acceptance checks. Operational rollout should include the visual/device checks listed above. No Phase 10 implementation or speculative configuration surface was added.

PHASE 9 COMPLETE
