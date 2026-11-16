# Visual app editor

Open `/ui/pages/offersHome` in the admin. Choose the screen and click a section
inside the phone preview to edit it. Changes stay in the draft until published.

- Add banners, images, icons, text, offer rails, actions, animations and spacers.
- Upload PNG/JPEG/WebP originals up to 10 MB. Crop by aspect ratio, zoom and
  horizontal/vertical focus. Export creates a JPEG up to 1600 pixels and 2 MB;
  originals are unchanged and transparent areas export on white.
- Replace a banner photo or select a managed image. Edit English/Hindi copy,
  font family, size, weight, alignment, colors, width, padding, spacing and corners.
- Drag sections in the phone or layers list; arrow keys and move buttons are
  alternatives. Hide, duplicate, delete and undo/redo update the draft.
- Preview at 320/375/414px and in both themes. Save, validate, enter a reason,
  then publish. Release history supports rollback.

## Renderer and API contract

Image/icon blocks and optional `block.style` require renderer 4. Update both APIs
and the mobile JavaScript bundle before publishing these sections. Renderer
1/2/3 snapshots remain valid; old clients receive native fallback for a renderer 4
release. Login, payments, eligibility and trusted native navigation stay in code.

`UIAsset` adds immutable `kind:image` records with PNG/JPEG bytes, dimensions,
size and SHA-256. Existing Lottie records retain their representation.

| Route | Access | Result |
|---|---|---|
| `POST /ui/assets/image` | Admin | `{name,mimeType,dataBase64}` creates a private image. |
| `GET /ui/assets/:id/content` | Admin | Binary preview; bytes stay out of config JSON. |
| `GET /ui/assets/:id?rendererVersion=4&campaignVersion=1` | Public | Image only if referenced by the currently published snapshot/campaign. |

Input signatures, MIME, dimensions and decoded size are checked. Arbitrary URLs,
SVG, markup and CSS are excluded. Stored length/hash are checked before delivery.
Runtime metadata allows 128 assets; renderer 4 reserves 40 KiB of the existing
256 KiB response budget for metadata/envelope overhead. Retained draft/release
references prevent archival, including images attached to banners.

## Verification

- `npm --prefix website/admin-frontend run test:ui`
- `npm --prefix website/admin-frontend run test:visual` (Vite and Playwright browser
  available). This uses isolated API fixtures and never publishes real app data.
- `node --test website/backend/tests/ui-visual-editor.test.js`
- Existing UI/campaign/animation/native runtime suites, admin build and mobile tsc.

Screenshots and QA receipts are under `artifacts/visual-editor`. The strict static
audit records 23 existing admin findings outside the changed editor components
(actionless controls, form validation markup and textarea resizing), with no
findings in the changed editor components. This is not full-app accessibility
certification. Physical-device image QA and iOS font rendering remain release
checks; native unit tests cover image identity/URLs, fallbacks, icons, typography
and old-client compatibility.
