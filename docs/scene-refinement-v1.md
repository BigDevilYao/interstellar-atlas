# scene-refinement-v1 — Free Look environment upgrade

Review version on Git branch **`scene-refinement-v1`** (recovery tag: `checkpoint-before-scene-refinement`).
The published site (`main`, served from `site/` by Vercel) is **not** modified by this work.

## How the existing animations are preserved

Free Look already builds its own copy of a scene: the cinema engine calls `showScene()`, which constructs the
scene fresh, separately from the chaptered journey. This refinement uses that separation:

- `SceneCtx.freeLook` (new, `src/cinema/types.ts`) is `true` only for Free Look builds; journey builds pass
  `false`. Every environment addition in this version is behind that flag, so **cinematic frames, camera
  paths, timing, easing, transitions, diagrams, Guided Journey and Analysis are unchanged**.
- Shader changes shared by both modes use uniforms whose cinematic values equal the old constants (Miller's
  fog range, Mann's cloud fade, the planet `uDetail` switch), so the cinematic output is identical.
- Free Look always starts with the engine's fade-in from black and builds its scene up front, so nothing pops in.
- `SceneInstance.constrainFreeLook()` (new, optional) keeps the orbiting camera physically plausible — above
  water, ice, sand or corn, and inside rooms, the silo and the habitat. All viewing directions stay available.
- The bedroom's Free Look orbit pivots on the middle of the room, so turning around shows every wall. Its
  cinematic reference point (the shelf) is unchanged.

## Scene by scene (Free Look only)

| Scene | Before | Now |
|---|---|---|
| **Miller's Planet** | A square water plane with visible edges; empty grey haze | Camera-following radial ocean to 14 km (world-space waves, so nothing swims). Haze matched to the sky's horizon, so there is no seam. Slow overcast cloud layer. Distant wave ridges stand on the horizon like mountains. Crest spray along a much longer front. Camera stays above the water |
| **Mann's Planet** | Ice ended in flat haze; frozen clouds showed square outlines from above | The same ice terrain reaches the horizon and rises into a ring of distant ridges and peaks. Frozen cloud decks surround the valley at several heights, with organic noise-shaped outlines. Matched horizon haze. Camera stays above the ice |
| **Edmunds' Planet** | Finite terrain; camera could dip under the ground | Desert to the horizon with mesas and a far eroded mountain range. Boulders scattered all around the camp. Dusk haze matched to the horizon glow. Camera stays above the sand |
| **Cooper's Farm** | A floating square cornfield on a flat striped plane | Patchwork farmland of corn, drying corn, harvested and fallow fields, with field margins and section roads, toned to match the real corn. Ten neighbouring farmsteads (houses, barns, silos). Windbreak tree lines. A county road with power poles. The dust-storm wall spans most of the horizon. Camera stays above the corn |
| **Murph's Bedroom** | The camera could orbit out of the room; a box floating in black | The camera stays inside the room and pivots on its centre, so every wall can be seen. The unseen side is furnished: a panelled door with frame and handle, baseboard, dresser with lamp and model rocket, framed pictures, rug, ceiling light. Wider view outside the window |
| **NASA silo** | The camera could leave the silo; a tube in a void | Stays inside the silo. Adds a blast door and tunnel mouth at the base, a lit control-room window band, vertical conduits, a hazard-striped floor edge and stencilled bay markings |
| **Endurance** | Near-black space; crude night-side blotches on Earth | Full deep-space backdrop (Milky Way band with dust lanes, dense faint stars). Detailed Earth: finer coasts, swirling clouds, clustered city lights. The Moon off Earth's limb |
| **Saturn** | Sparse stars | Subtle deep-space backdrop behind Saturn |
| **Cooper Station** | The camera could leave the cylinder; the near end was open | Stays inside the habitat. A near end wall with structural rings, spokes, lit windows and a glowing hub, softened by the same haze |
| **Tesseract** | Already convincing; lattice began just behind the camera | The lattice, bookshelves and gravity threads continue behind the opening view and further to the sides |
| **Gargantua, Wormhole** | Already complete in every direction (ray-marched / starry skies) | Unchanged |

## Changed files

- `src/cinema/types.ts`: `SceneCtx.freeLook`, `SceneInstance.constrainFreeLook`
- `src/cinema/engine.ts`: passes `freeLook` to builders; applies the camera constraint in Free Look
- `src/cinema/lib.ts`: new helpers `radialGrid`, `radialTerrain`, `horizonColor`, `keepAbove`, `cloudDome`, `milkyWay`
- `src/cinema/scenes/miller.ts`, `mann.ts`, `edmunds.ts`, `farm.ts`, `bedroom.ts`, `nasa.ts`, `endurance.ts`,
  `saturn.ts`, `station.ts`, `tesseract.ts`, `parts.ts` (planet `detail` option)
- `src/version.ts` (review entry), `docs/scene-refinement-v1.md` (this file)

## Remaining limitations

- Free Look is an orbit around each scene's point of interest (unchanged behaviour). Outdoors you see the full
  360° panorama, but the camera always faces the focus point rather than turning freely in place.
- Distant scenery (farmsteads, ridges, wave mountains, end walls) is procedural and stylised, in keeping with
  the rest of the atlas. It evokes the film's locations but is not a reproduction of them.
- Heavier Free Look builds (Farm, Tesseract) add geometry; they are fine on a normal GPU and drop to the
  existing low-quality mode on slow devices.
