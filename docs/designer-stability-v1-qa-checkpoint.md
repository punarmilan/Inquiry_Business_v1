# Designer Stability V1 — Pre Device QA

Status: **READY FOR REAL DEVICE QA** (not production-ready yet).

## Verified
- Portrait (1080×1350) and landscape (1350×1080) canvas dimensions preserved through save/reload; no active-path portrait coercion.
- Deterministic layer ordering (dense zIndex reassignment; panel order matches canvas paint order).
- Stable drag/resize/rotate with gesture commit-on-release, pointerId checks, dead zones, pointercancel restore.
- Single stored rotation applied in admin preview, mobile editor, library preview, and final OfferCard (stored 45° = rendered 45°).
- 45° rotation snapping (±3° threshold) intact.
- Atomic resize+rotate: one pinch gesture = one `cardDesign` update = one undo step.
- Text history coalescing: typing bursts collapse to one undo step; structural edits stay immediate.
- Template-switch history reset: Undo never restores the previous template.
- Image replacement preserves x/y, size, rotation, opacity, z-order, lock, and resize mode.
- Lock/hidden/editable guards on admin (gesture + panel + layer actions) and mobile (all mutation paths); unlock/unhide/editable controls remain available.
- Rectangle/circle/line render as shapes in the final OfferCard.
- Dynamic bindings with recursion cap, single-URL image fallback, save/reload persistence (posterText, offsets, avatar).
- Renderer parity checked across admin / mobile editor / library / final offer.
- Admin TypeScript: PASS (exit 0). Mobile TypeScript: PASS (exit 0). `git diff --check`: clean.

## Deferred non-blocking notes (Phase 2, not fixed in this pass)
- Style sliders can create granular (per-tick) undo entries; behavior is correct.
- `selectedShapeId` can remain stale after template switch but is harmless (lookup fails safe).
- Avatar layer renders as placeholder in admin preview; correct on mobile/final.
- Group rendering differs between admin (text-box outline) and mobile (shape-box); true groups are Phase 2.
- Admin pointermove still updates the whole document; large performance refactor deferred.
- Proper crop, true groups, granular per-action permissions, and bitmap export are Phase 2.

## Changed files (designer only, no backend/API/schema/routes/publishing)
- `mobile/frontend/src/components/OfferCard.tsx`
- `mobile/frontend/src/config/offerCardDesigner.ts`
- `mobile/frontend/src/screens/post/OfferDesignEditorScreen.tsx`
- `mobile/frontend/src/screens/post/TemplateLibraryScreen.tsx`
- `website/admin-frontend/src/components/hyperlocal/TemplateBuilder.tsx`
- `website/admin-frontend/src/utils/templateSchema.ts`
