# INTERSTELLAR — An Atlas of Spatial & Temporal Thresholds

An interactive architectural and cinematic atlas of the environments of Christopher Nolan’s *Interstellar* (2014).
A spherical World Map shows how the film’s spaces are connected by physical journeys, space-time relations
and information, with Gargantua at the centre and the Murph’s Bedroom ↔ Tesseract axis running through it.

Built from scratch with **React 19 · TypeScript · Vite · Three.js · React Three Fiber · Drei · GSAP**.

---

## Run it locally

Requirements: **Node.js 20.19+ or 22.12+** (required by Vite 7) and npm.

```bash
cd interstellar-spacetime-atlas
npm install
npm run dev
```

Open **http://localhost:5173**.

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Development server with hot reload                    |
| `npm run build`     | Type-check (`tsc --noEmit`) and production build      |
| `npm run preview`   | Serve the production build locally                    |
| `npm run typecheck` | Type-check only                                       |

---

## What’s in the atlas

**Explore (homepage)**
- Full-screen spherical World Map composed after the reference image (`docs/reference-world-map.png`).
- **Gargantua**: a per-pixel ray-marched black hole shader. Light rays are bent around the hole, so the
  accretion disk is lensed over and under the shadow, with a thin photon ring at the shadow edge and
  Keplerian streaks in the disk.
- Spherical linework: meridians, latitudes, tilted orbits, wormhole-like funnels toward Endurance and
  Miller’s Planet, a gravity-well sheet, and silhouette rings that always face the camera.
- 12 location nodes with original architectural line icons and reference-style white label chips.
- 20 connections on three layers: **Physical** (solid), **Space-Time** (dashed gold), **Information**
  (dotted blue, flowing). Points travel along the routes.
- Hover a node to highlight it and its connections and dim the rest, with a short tooltip. Click to focus
  the camera and open the contextual panel. Click a route for origin, destination, threshold type and
  explanation.
- Controlled orbit (limited angles), zoom, reset, mouse parallax, layer toggles, and quality, reduced-motion
  and sound toggles.

**Cinematic thresholds**: 8 unique sequences, each with its own renderer (no generic fade):

| Code | Threshold                                     | Visual language                                            |
| ---- | --------------------------------------------- | ---------------------------------------------------------- |
| TH·A | Cooper’s Farm → NASA                          | dust → binary → coordinates → tracked route → section reveal |
| TH·B | Murph’s Bedroom ↔ Tesseract (reversible)      | axial dolly, shelf extrusion, lattice of time states        |
| TH·C | NASA / Earth → Endurance                      | log-scale altitude, horizon curvature, ring reveal          |
| TH·D | Endurance → Saturn → Wormhole → Miller        | scale contrast, spherical lens, fold diagram, passage       |
| TH·E | Miller → Endurance → Mann                     | wave reveal, split-screen clocks (1 h ≈ 7 y), match cut to ice |
| TH·F | Mann → Endurance docking                      | spin, camera roll matched to rotation, concentric alignment |
| TH·G | Endurance → Gargantua → branching             | slingshot, separation, cross-cut split frame, two endings   |
| TH·H | Tesseract → Murph’s Room → Cooper Station     | gravity pulses, watch Morse, data, cylindrical habitat      |

Each has captions per beat, a scrub bar with beat markers, play/pause, previous/next beat, keyboard control
and an optional **original synthesised** sound bridge (Web Audio; no recorded audio).

**Cinematic journey** (homepage card *Begin the journey · Chapter 01 · Murph’s Room*, or the Guided Journey tab):
14 chapters rendered as lit, colour-graded 3D environments — Murph’s room, the farm and dust storm, the NASA silo,
the Endurance, Saturn, the wormhole, Miller’s wave, Mann’s frozen clouds, the docking, Gargantua, the Tesseract,
the watch, Cooper Station and Edmunds’ camp. Each chapter is entered through its own transition shader
(dust, floodlight sweep, ascent, time-lapse, lens, tunnel, time-stutter, roll, swirl, horizon, lattice, signal,
departure). HUD: chapter counter, place, Earth/mission telemetry, subtitles, chapter ticks, minimap, prev/play/next,
free look, threshold diagram link, sound, exit. Keys: Space, ← →, H (hide HUD), Esc.

**Chapter 12 · The Watch** animates the watch idea from the line diagrams in 3D: gravity pulses reach across time,
the second hand holds for long and short intervals, dots and dashes ring the dial and decode letter by letter,
the code streams into quantum data, and the data folds into a habitat cylinder (`src/cinema/scenes/watch.ts`).

**Background music**: the top-right button reads **Add music** until a track is available, then becomes a
**Music on/off** switch (also in the cinema controls and threshold player; key **M**). Source, in order: a track
embedded in a standalone build → `public/audio/cornfield-chase.mp3` (your copy, git-ignored) → a file you choose
with *Add music*, kept in your browser. The choice is remembered; music fades in on the first click and dips under FX.

**Revisions**: `src/version.ts` lists every revision with its preview link; the current version shows in the browser tab title. Git tags: `v0.1-line-style`, `v0.2-cinematic`, `v0.3-watch`, `v0.4-music`, `v0.5-sound`, `v0.6-add-music`.

**Scenes**: *Enter scene* on any location opens the same environment in free-look (orbit) mode with 3D labels,
and *Play the journey from here*.

All scene artwork is original procedural geometry and shaders (no film frames, footage or proprietary models).
Rendering: HDR targets → transition → custom bloom → ACES grade with split-toning, vignette and grain;
quality drops automatically below 28 fps (`src/cinema/`).

**Analysis**: threshold classification matrix; physical vs space-time vs information small multiples;
a conceptual temporal chart (Earth vs mission time, Miller dilation, Tesseract loops); a logarithmic scale
bar; a set / space / camera table; character trajectories (Cooper, Brand, Murph).

**Accessibility & resilience**: keyboard shortcuts, focusable nodes, reduced-motion support, loading veil,
an error boundary, and a flat SVG atlas fallback when WebGL is unavailable.

### Keyboard

| Key                 | Action                                         |
| ------------------- | ---------------------------------------------- |
| `Esc`               | Back to map / close panel                      |
| `R`                 | Reset camera                                   |
| `+` / `-`           | Zoom                                           |
| `1` `2` `3`         | Toggle Physical / Space-Time / Information     |
| `Space`             | Play / pause a threshold                       |
| `←` / `→`           | Previous / next beat in a threshold            |
| `Tab` / `Enter`     | Move between and select nodes                  |

---

## Project structure

```
src/
  data/            ← narrative data (edit here, no rendering code)
    types.ts         data model
    nodes.ts         12 locations: position, icon, texts, thresholds
    connections.ts   20 connections, layers, route glyphs
    thresholds.ts    8 thresholds: beats, techniques, sound character
    journey.ts       guided route
  state/store.ts   ← tiny global store (useSyncExternalStore) + actions
  three/           ← World Map (React Three Fiber)
    WorldMap.tsx     canvas, controls, parallax
    Gargantua.tsx    black hole component
    shaders/gargantuaShader.ts   ray-marching shader + uniforms update
    SphereStructure.tsx          sphere, limb, axes
    geometry/sphereGeometry.ts   pure line builders (grid, orbits, funnels, well)
    geometry/space.ts            composition ↔ world mapping, curves
    geometry/framing.ts          responsive camera framing
    Trajectories.tsx  layered routes, hover/select, travelling points
    NodeMarkers.tsx   HTML icons, labels, poles, route glyphs
    OrbitalDots.tsx · Starfield.tsx · CameraRig.tsx · materials.ts
  icons/Icons.tsx  ← original SVG line icons
  thresholds/      ← threshold engine
    ThresholdPlayer.tsx  timeline, captions, scrubbing, sound
    registry.ts          id → sequence renderer
    sequences/*.ts       one renderer per threshold
  cinema/          ← cinematic engine, transitions, bloom, chapters, HUD (CinemaStage) and scenes/
  modes/           ← Analysis, temporal chart, flat map
  ui/              ← top bar, HUD, panels, tooltip, loader
  lib/             ← wire3d (canvas perspective line renderer), easing, sound
  styles/global.css
```

**Adding or moving a location**: edit `src/data/nodes.ts` (position is in sphere radii: x right, y up,
`depth` 0–1 toward the viewer). **Adding a route**: add an entry to `src/data/connections.ts`. Optional `via`
points shape the curve. **New threshold**: add data in `thresholds.ts`, write a renderer in
`thresholds/sequences/`, and register it in `thresholds/registry.ts`.

---

## Notes on content and assets

- All icons, geometry, shaders, diagrams and sounds are original. No film footage, stills, soundtrack or
  proprietary models are used. The reference image is kept in `docs/` as art direction only.
- Scene environments and thresholds are **stylised interpretations**, not reconstructions of production sets.
- Temporal figures follow the film’s dialogue (e.g. 1 h ≈ 7 years on Miller’s Planet; 23 years 4 months 8 days)
  and are presented as conceptual diagrams, not as a universal clock.
- Production notes in the panels are deliberately general.

## Performance

- The black-hole shader is the main GPU cost; it discards empty pixels early and uses adaptive step sizes.
- `HQ/LQ` halves the ray-march steps and caps device pixel ratio; a performance monitor switches to LQ
  automatically if the frame rate drops.
- The 3D map is code-split and paused (`frameloop="never"`) while a threshold or scene is open; the cinema module is lazy-loaded and suspends rendering when covered.
