# Offer designer audit — 2026-09-14

Read-only inspection completed before implementation. Scope: admin TemplateBuilder,
templateSchema, OfferTemplatesPage preview/normalizer, mobile OfferDesignEditorScreen,
offerCardDesigner, TemplateLibraryScreen, OfferCard/PosterLayers, offerDesignStorage,
template API/model. Expo SDK 57 reference, ImagePicker and LinearGradient docs read.

| Area | Finding |
| --- | --- |
| Canvas / save-load | Admin hardcodes 1080×1350 at load, update, render and save; landscape geometry changes on reopening. |
| Layer schema / normalization | Flat and nested geometry coexist. Admin misses nested underline/vertical alignment/border style. Canonical export drops unknown element metadata. |
| Selection | Admin resize pointer bubbles into move; mobile text uses binding names as selection IDs, so repeated bindings select multiple layers. Empty mobile canvas does not deselect. |
| Drag / touch | Mobile applies translation after rotation/scale. Responders recreate when selection changes callbacks. Locked mobile elements still respond. Admin lacks pointer cancellation cleanup. |
| Resize / rotation | Admin handle is clipped and scales down with zoom; resize ignores rotation. Mobile minimum 80×80 distorts thin lines and aspect ratios; rotations are stored but unsnapped. |
| Text / keyboard | Separate native input exists, but taps immediately edit; move can claim touch during typing. Style controls exist. Native fonts are platform substitutions, so exact cross-platform font metrics are not guaranteed. |
| Images | Picker has no error boundary; replacement uses global imageUrls and custom first image, not selected image. Resize/fit exist; no persisted crop rectangle/editor. |
| Shapes / stickers / avatars | Existing layer-based rendering and native sprite assets; same gesture/lock defects. Legacy avatar offsets/scale are separately tracked. |
| Groups | `group` renders as an ordinary layer. No children, groupId, group/ungroup implementation found. Implementing real groups would expand the current feature set. |
| Ordering / lock / hidden | Admin +/- zIndex produces ties; descending layer list does not reverse equal-z canvas order. Mobile hides invisible layers, but mutations ignore lock/editable. |
| History | Admin pushes history on pointer-down, even taps. Mobile commits transforms on release, but every text/slider state change enters history. Legacy offsets/avatars are outside snapshots. |
| Bindings | Existing token and explicit-field resolvers support fallbacks, but recursive cycles overflow; image arrays become comma-separated URLs; broad image-field regex overrides unrelated bindings. |
| Permissions | Existing editable, locked, editableFields.editable and template allowColorChange/allowAvatarChange/allowLayoutChange. No established per-action permission model found. |
| Master isolation / storage | Functional layer updates preserve master objects; saved creations omit editor customizations assembled only for navigation; reload initializes text offsets/values empty. |
| Admin preview | Builder shares its surface with modal preview. Library preview has a separate renderer with reduced styling. |
| Mobile preview / final rendering | Multiple renderers; editor gradient opacity inherits image opacity 0.48, final renderer ignores linear-gradient/colors. Overlay missing from editor. |
| Export | Admin exports JSON, mobile saves structured design and continues existing offer flow. No bitmap export pipeline found in inspected editor. |
| Performance | Stable layer keys exist; live mobile transforms use local state, but responder identity is unstable. Admin updates whole document each pointer event. |

Implementation must preserve backend contracts, publishing/versioning, categories and
navigation. Crop, true groups, per-action permission schema and new export features
are outside this polish pass. Automated geometry/roundtrip checks must cover both
portrait and landscape; native gesture/keyboard and pixel equivalence require device QA.
