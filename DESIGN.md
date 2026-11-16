---
version: alpha
name: InquiryExperts
description: A local commerce app and a practical visual publishing studio for its administrators.
colors:
  primary: "hsl(176 80% 33%)"
  background: "hsl(204 29% 96.7%)"
  surface: "#FFFFFF"
  text: "hsl(222 47% 11%)"
  muted: "hsl(215 16% 47%)"
  danger: "hsl(0 72% 55%)"
typography:
  sans:
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
rounded:
  DEFAULT: "0.5rem"
  panel: "1rem"
  phone: "2rem"
spacing:
  panel-gap: "1rem"
  page-max: "1720px"
components:
  editor: { selection: "primary outline", canvas: "muted dotted surface" }
  button: { owner: "website/admin-frontend/src/components/ui/button.tsx" }
  dialog: { owner: "website/admin-frontend/src/components/ui/dialog.tsx" }
---

# InquiryExperts design context

## Overview

The admin is a desktop publishing workspace for local business operators. Its
signature is a selectable phone canvas on a quiet dotted work surface. Familiar
controls, readable labels and visible draft/publication state take priority over
decorative effects. The mobile product serves local offers and services in India;
editable content supports English and Hindi, with English fallback. This is a
product interface, not a marketing landing page.

Runtime sources remain canonical: admin colors live in
`website/admin-frontend/src/index.css`, mapped by `tailwind.config.ts`; mobile
colors live in `mobile/frontend/src/theme/palettes.ts` and its dynamic theme
adapter. This document mirrors those owners rather than generating a second palette.

## Colors

Teal identifies editor selection, focus and primary actions. App preview colors
come from the selected app theme, independently of editor chrome. Errors use the
shared destructive role. Publish validation checks text/background contrast in
both app themes, including custom section colors. System high contrast retains
native scrollbar and focus behavior.

## Typography

Admin UI uses the shared Jakarta Sans stack, normal sentence case and tabular
values where helpful. User-authored English/Hindi copy retains native script.
Section typography is bounded by the renderer contract, not arbitrary CSS.

## Layout

At desktop width: elements on the left, a phone canvas in the middle, properties
on the right. At narrow widths the canvas comes first and controls stack below.
Only the phone and the desktop properties panel own bounded scrolling; the page
itself remains naturally scrollable. Phone widths 320/375/414 are preview choices,
not fixed mobile app dimensions. Responsive app flow uses section order, width,
alignment and spacing rather than absolute positioning.

## Elevation & Depth

Use quiet shared borders and small panel shadows. The canvas has a muted dotted
background; selection uses the primary outline. No decorative gradients or
animations are added to editor controls.

## Shapes

Reuse existing rounded controls and 16px panels. The phone frame is the deliberate
32px exception. App section corners are authorable within renderer bounds.

## Components

Reuse Button, Input and Radix Dialog. Native selects and ranges intentionally use
platform-owned popups and keyboard behavior. Phosphor icons belong to admin
chrome; native visual content uses the matching semantic Lucide icon allowlist.
Every drag action has arrow-key and move-button alternatives. Save and publish
remain explicit operations; changing a slider never publishes a draft.

## Do's and Don'ts

- Preserve the existing identity and shared primitives.
- Separate app theme colors from editor selection colors.
- Keep uploaded image content private until referenced by a published release.
- Preserve form controls and business actions inside the native app.
- Never accept arbitrary CSS, executable markup, arbitrary icon code or image URLs.

## Mobile offers home reference

The latest selected reference (31 October 2026) supersedes the earlier orange
marketplace treatment and the request to remove background imagery. Home now
uses a pale scenic city/mountain header and mint, blue, lilac and peach illustrated
promotions. The current compact bottom navigation is an explicit exception:
preserve its flat surface, dark outline icons, route order and business gate.

`HyperlocalHeader` owns the city selector, discovery eyebrow, notifications,
saved shortcut and profile avatar. The community tagline follows the header.
`HomePromoCarousel` owns the four-card accordion rail: a larger leading card and
three narrow cards, 3dp gaps, white rounded borders and bundled 3D artwork in
`mobile/frontend/assets/reference-home`. Every promotion shares the same expanded
dimensions. The subsequent size refinement sets the leading card to 44% of the usable rail
width and at least 190dp high (45% of screen width on larger screens). The three
remaining cards divide the remaining width equally and use 85% of that height.
Autoplay holds static cards for seven seconds after they settle. Animated cards
finish all configured plays before advancing, with a 350ms pause after completion.
The old leading card shrinks over 220ms, travels over one second, then the incoming
card expands over 650ms. Its media starts only after expansion finishes. A failed
animation uses the static-card hold; no repeating timer interrupts playback.
Arrows and horizontal swipes are alternatives. Focus, app activity and reduced
motion stop automatic animation. Each subject has a square expanded artwork
with space for native text, plus a portrait illustration in the narrow slot.
The skyline and support-local banner are separate raster assets; device chrome
remains native.

Search follows the promotion rail, then All, Popular, Offers, Nearby and Saved
chips. Saved opens the existing saved-offers route. Search and four feed filters
retain the current API/filter rules. Create Post opens PostMenu only for approved
businesses and otherwise opens Business Center. Events retain the existing
coming-soon action. Published dynamic blocks and configured showcase content
remain authoritative; bundled artwork is fallback presentation.

The slim support-local shop/scooter banner precedes a four-column trending rail.
`OfferCard` owns the `neighbourhood` variant: photo, category badge, business name,
offer summary, distance, detail arrow and saved heart. Uploaded posters remain
intact in details and other poster variants. Live business/offer names and photos
come from the API, rather than replacing them with the reference's example data.
Home restores saved hearts on focus, suppresses repeated pending toggles and
rolls back a failed save.

A second, warm peach shopping banner sits immediately below the trending offer
cards, filling the previously empty end of the feed. Its bundled shopping-bag
artwork leaves space for native English/Hindi copy and an Explore action that
opens the existing All Offers route. It remains visible while offers load or the
nearby list is empty and scrolls above the unchanged bottom navigation.

Bottom navigation remains owned by `MainTabNavigator`: 48dp plus native inset,
`surface`, `border` and `text` tokens, hidden visual labels, localized accessible
labels, and approved-business-only Post. This file was left unchanged during
the scenic-home iteration.

## Home content administration

Admin navigation uses a persistent grouped sidebar on desktop and a labelled
Menu drawer on smaller screens. Shared `AdminNavigation` uses `navigation.ts`
as its destination and label source; destinations remain visible within each
group instead of hiding behind category accordions. App content is placed
immediately after Dashboard. Its overview maps the home screen to two tasks:
Home cards & banners, and Trending offers. Utility editors remain secondary.
Studio headers use plain content labels and shared tokens; the former decorative
glow and mandatory-looking Theme/Layout/Animation workflow have been removed.

`HomeCardsPage` owns home content authoring at `/home-content`, with a grouped
card selector, adjacent preview and basic English fields. Change photo directly
opens the shared crop/upload flow. The shared `UIBlockInspector` has a simple-home
variant: Hindi, image library/animation and other appearance settings are collapsed.
Defaults are editable immediately; the first change seeds local home controls.
A compact shared publication bar saves and validates when Publish is clicked,
with a descriptive audit reason. Draft saving remains separate and explicit.
`UIPageBuilderPage` remains the separate Dynamic UI editor for screen selection,
extra sections and layout; home cards are absent from its library and editable
canvas. Both use the existing draft/validate/publish workspace. Renderer 5 adds
`homeCard` controls for ordered promos, the two banner positions, trending
presentation and individual eligible-offer artwork. `uiHome.defaultHomeCards`
seeds the current layout without changing live content. Named content rows identify
each native placement. Home Showcase remains the offer-record selection owner
and links to the visual editor for cards and animated banners.

The native screen consumes these placements directly. `UIHomeMedia` reuses the
managed image loader and the existing `UILottie` lifecycle, cache and fallback
rules. `UIHomeBanner` owns editable banner copy and geometry; `OfferCard` still
owns live offer summaries and save/detail actions. No extra slot copy of native
home controls is rendered. Until a home layout is published, bundled native home
presentation and legacy showcase banner behavior are retained. See
`docs/HOME_CONTENT_ADMIN.md` for authoring steps and renderer compatibility.

Four illustrated preset buttons precede home content editing: Photo Carousel,
Hero Banner + Shortcuts, Split Card Carousel and default Accordion Cards. A full
header preview uses the same geometry as the native slide layouts. Additional
motion/height/navigation settings stay under Slide settings. Changing a preset
retains content and destinations. UIHomeDestination places When tapped and Link
URL beside the basic fields; valid HTTP/HTTPS links have a Test link action.
Renderer 6 owns these capabilities. Publication still uses the shared saved home
draft, validation and generation checks.

Photo Carousel header cards show undimmed artwork with transparent copy layers
and the configured card text color in both native rendering and admin previews.

The separate `HomeShortcuts` row follows every header preset. Its four native
destinations (Local Offers, Create Post, Local Events and Find Services) are
independent of promotional content, visibility, links and active slide. Use flat
outline icons in the bottom navigation's text color with centered labels below,
without pastel promotion tiles, arrows or slide-selection borders. Post retains
the approved-business gate and Events retains its existing coming-soon action.

Hero and split header copy panels use an opaque configured background so embedded
image text cannot show through native copy. Photo Carousel remains transparent.
Uploaded promotional images take precedence over these copy layouts: show the
complete original image with contain fit and no native title, badge, subtitle,
CTA, colored copy panel or split-media crop, regardless of saved showCopy/fit.
The card's accessible name and destination remain available. These rules are
shared by every native preset and the admin preview; other placements retain
their configured copy and fit.
Keep the card-to-shortcuts spacing compact: an 18dp dot rail, no extra carousel
bottom margin or shortcut top padding, and 6dp padding above shortcut icons. The
64dp shortcut minimum height allows two-line English/Hindi labels. Admin previews
mirror the native spacing.

Mobile tokens remain canonical in `mobile/frontend/src/theme/palettes.ts`, flowing
through the shared runtime theme adapter and `createThemedStyles`. Primary teal
colors selected filters, location and controls; surfaces, card borders, text and
secondary text adapt to dark mode. Scenic artwork is dimmed in dark mode.
Promotion pastels are artwork-specific fills with deliberately dark text.
Earlier orange marketplace tokens remain available for existing consumers, but
are no longer used by this home screen.
