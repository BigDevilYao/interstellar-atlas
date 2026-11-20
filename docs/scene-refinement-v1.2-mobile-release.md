# INTERSTELLAR · RELEASE — scene-refinement-v1.2-mobile-release

This is the public release of `scene-refinement-v1.1.1-interactive-minimap`, with phone support added. The desktop layout and behaviour are unchanged: every mobile rule sits behind a touch-screen media query, `(hover: none) and (pointer: coarse)`.

## What phones get

- **Safe areas.** With `viewport-fit=cover`, the HUD padding includes `env(safe-area-inset-*)`, covering notches, rounded corners and the home indicator.
- **Touch targets.** Transport buttons are 40 px tall, and World Map nodes have a slightly larger invisible tap area.
- **Minimap.** It is visible on phones (it was hidden below 860 px) and compact at 0.62×.
  - A tap opens it, a tap on a node or name navigates, and the map then closes.
  - It also closes with the × control or a tap outside.
  - On touch, the first tap on the map only opens it, so a node is never triggered by accident.
  - Names are 10.5 px on screen. The open size fits the screen below the title.
- **Landscape phones.** The telemetry panel is left out, as it already was on narrow screens. The minimap stays compact above the transport bar, the World Map's journey card moves to the bottom-left corner, and the title is smaller.
- **Portrait phones.** An optional "Turn sideways for a wider view" tip appears in the cinematic views. It dismisses itself and is shown once per session.
- **Touch gestures.** A one-finger drag orbits the Free Look camera and a two-finger pinch zooms; both use the existing OrbitControls. In the Studio branch, a one-finger drag looks around, and a tap on the printer's touchscreen (or the second printer's screen) crosses. Picking happens at the tap point, since touch has no hover.
- **Text selection.** Text selection and the iOS callout are turned off on the 3D views.
- **Performance.**
  - The Studio branch renders at a pixel ratio of at most 1.5 with 2× MSAA on phones; desktop keeps 1.75 and 4×.
  - The Atlas's existing safeguards still apply: the cinema caps the pixel ratio at 1.5, and quality drops to LQ automatically when the frame rate falls below 28 fps. The LQ/HQ toggle stays on the World Map.

## Assets made public

The repository and the website are public. By the owner's choice, **the six studio and printer reference photographs are not published**: `public/branches/studio/refs/` is removed, and the Studio branch's "Photos" panel is hidden while its list is empty.

The only studio image that ships is `window-view.jpg`, a 512 × 476 crop of trees outside the windows, taken from photo 5. The 3D studio uses it as the view through its windows. It is also embedded in `site/index.html`.

## Files

- **New:**
  - `src/mobile/MobileLayer.tsx` (the rotate tip)
  - `src/mobile/mobile.css` (all rules touch-only)
  - this document
- **Changed:**
  - `src/App.tsx`: renders `<MobileLayer/>`.
  - `src/cinema/MiniMap.tsx` and `minimap.css`: compact scale from CSS, phone sizing, the × control on touch, a final clamp that keeps labels inside the viewport, and a touch label size.
  - `src/branches/studio/controller.ts`: phone render settings, drag deltas from positions (`movementX` is unreliable for touch), and picking at the tap.
  - `src/branches/studio/StudioBranchView.tsx`: the touch wording "Tap the small touchscreen…".
  - `src/version.ts`: release entry.
  - `public/branches/studio/refs/`: removed, so the reference photos are not published.
  - `src/branches/studio/assets.ts` and `StudioBranchView.tsx`: no reference photos; the Photos panel is hidden.
  - `site/index.html`: the release build.
  - `site/version.json`: the release ID, so the deployment can be checked.
