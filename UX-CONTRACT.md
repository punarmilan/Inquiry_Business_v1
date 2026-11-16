# InquiryExperts studio UX contract

The visual editor lets administrators edit app presentation and publish reviewed
drafts. Product content supports English and Hindi; admin chrome is English.
Scheduling uses Asia/Kolkata. Accessibility target: WCAG 2.2 AA.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Navigation | AdminNavigation, navigation.ts, AppShell and ProfileNavMenu | App content task grouping | Persistent desktop sidebar; Radix drawer on narrow screens | Navigation browser QA, route checks |
| Editor separation | HomeCardsPage; UIPageBuilderPage; uiEditorParts | docs/HOME_CONTENT_ADMIN.md | Home content at /home-content; extra screen layout at /ui/pages/offersHome | Merge preservation unit tests; browser edit/undo/save checks |
| Select/Listbox | Native select | DESIGN.md and UIBlockInspector | Platform popup | Browser selection and keyboard QA |
| Date | Existing native date/time inputs | Existing campaign schedule contract | Browser locale popup | Campaign tests |
| Form | Shared Input and block inspector | UI validators | Section properties and crop | Browser errors and unit tests |
| Scrollbar | Admin index.css | DESIGN.md | Document, phone and inspector scroll | Browser viewport QA |
| Toast | Existing Sonner provider | useUIWorkspace | Success and error feedback | Browser save/retry QA |
| CRUD | useUIWorkspace and UIReleaseControls | docs/DYNAMIC_UI_BACKEND_API.md | Draft, publish and rollback | Visual editor E2E and backend tests |
| Home cards/banners | UIBlockInspector, UIHomeCardControls, uiHome defaults; native UIHomeMedia/UIHomeBanner/OfferCard | docs/HOME_CONTENT_ADMIN.md; renderer-5 validators | Ordered promos, two banner positions, eligible offer artwork; managed images/Lottie | Browser upload/preview/publication and native/API runtime tests |
| Header presets | UIHomeHeaderControls, UIHomeHeaderPreview; HomePromoCarousel/HomeSlideCarousel | UIHomeHeader; renderer-6 validators; shared homeHeaderGeometry | Photo Carousel, Hero Banner + Shortcuts, Split Card Carousel, default Accordion Cards | Browser preset/settings publication/reload; native media and transition tests |
| Home service shortcuts | HomeShortcuts; shared HOME_SHORTCUTS; UIHomeHeaderPreview | Native destinations in OffersHomeScreen, independent of promotional cards | Four fixed outline icon shortcuts below every header preset; Post approval gate and Events coming-soon retained | Native navigation/gate tests; browser presets and narrow viewport |
| Card destinations | UIHomeDestination; OffersHomeScreen; homeLinks | Shared validHomeLink contract and mirrored API validators | Existing native actions or HTTP/HTTPS URL on promo cards and banners | Invalid URL tests, exact-link runtime roundtrip and native Linking failure tests |

| Concern | Canonical owner / evidence | Editor behavior |
|---|---|---|
| Business/API rules | `docs/DYNAMIC_UI_BACKEND_API.md`; backend UI validators and services | Validate drafts and atomically advance the published release generation. |
| Visual identity | `DESIGN.md`; admin CSS/Tailwind; mobile theme adapter | Reuse existing tokens and primitives. |
| Form | Shared Input and block inspector | Labeled controls, text errors, bounded values; incomplete sections stay editable. |
| Select/Listbox | Native select | Platform-owned popup geometry and keyboard behavior are intentional. |
| Range | Native range input | Visible label/value/units; standard keyboard adjustment. |
| Dialog | Shared Radix Dialog | Focus trap, Escape, labeling and focus restoration; unsaved screen-switch dialog defaults to keeping work. |
| Scrollbar | Global admin stylesheet | Visible themed baseline, system behavior in forced colors. |
| Toast | Existing Sonner provider | Short status feedback; errors also remain in the editor. |
| Image upload | UIImageUpload; `/ui/assets/image` | Crop preview, cancel, actionable error and retry; original file unchanged. |
| Simple home editing | UIBlockInspector simpleHome; UIImageUpload compact; UIReleaseControls compact | Home content controls | Immediate local editing; adjacent photo upload; generated publication reason | Browser file-picker/upload retry and automatic-save failure checks |
| CRUD/publication | useUIWorkspace and UIReleaseControls | Save, validate, publish with reason, generation check and rollback history. |

Images are immutable managed assets. MIME, bytes, dimensions, size, publication
references and readability are validated by the API. Native app reads are limited
to the currently published release/campaign. Archives referenced by retained
drafts or releases are prevented by the existing retention rule.

Sections may be selected on the phone canvas or in the layers list. Dragging,
arrow keys and Up/Down buttons reorder the same draft. Undo/redo retains a bounded
40-step history. Hiding and deleting a section are local reversible edits before
publication. Switching screens with local unsaved edits requires an app-owned
choice; browser unload uses its lifecycle warning. Related studios open in a new
tab to retain editor work.

New image/icon/style sections require renderer 4. Older snapshots remain valid;
older clients receive native fallback for a release they cannot render. Login,
payments, prices, eligibility, verification and trusted actions remain native or
server controlled. Configuration never executes scripts. Renderer 6 allows explicit
HTTP/HTTPS destinations on promotional cards/banners through the OS link handler;
the API never fetches them or attaches authentication headers. Offer and business
actions keep their existing native handlers and approval gates.

Verification owners: `website/admin-frontend/scripts/dynamic-ui.test.cjs`,
`website/admin-frontend/scripts/visual-editor.e2e.cjs`,
`website/backend/tests/ui-visual-editor.test.js`, and
`mobile/frontend/tests/dynamic-ui-runtime.test.cjs`.

Route document titles follow the shared navigation labels and the
`Page · InquiryExperts Admin` format. Studio routes refine the title for the
selected screen. App content groups home presentation and trending selection
together; the overview explains their separate publication actions. Related
studio links open new tabs to preserve local edits. Desktop navigation and the
mobile drawer share the same destinations and current-page markers. The drawer
traps focus, closes on Escape or navigation, and restores its actual trigger.
Trending load failures show a retry action and disable publication until the
saved selection has loaded successfully. Older banner settings stay available
under a clearly labelled advanced disclosure.

`UnsavedChangesGuard` protects draft editors and Trending offers from sidebar,
drawer and browser-Back navigation. Cancel preserves edits; leaving explicitly
discards them. Saved drafts and untouched published content do not prompt.
`useUIWorkspace.hasUnsavedChanges` compares against the saved draft or published
baseline, independently of the existing publication-persistence flag.
