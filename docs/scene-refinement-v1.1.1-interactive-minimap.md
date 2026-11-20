# INTERSTELLAR · REVIEW — scene-refinement-v1.1.1-interactive-minimap (not published)

This is a local review build on branch `feature/scene-refinement-v1.1.1-interactive-minimap`, built on top of `scene-refinement-v1.1-studio-branch`. The live site, `site/`, `vercel.json` and `main` are unchanged.

It changes one thing: the orbital minimap in the cinema HUD (bottom right; Guided Journey and Free Look).

| State | Behaviour |
|---|---|
| Compact (default) | Unchanged. It is the same `FlatMap` diagram (150 px), with the same caption, position and colours. |
| Hover, keyboard focus, or a tap on touch screens | Over 0.34 s it scales up from its bottom-right corner, toward the upper left, to as much as 1.45×. The scale depends on the room below the telemetry panel and on the window size: 1.3× maximum below 1100 × 700, 1.12× minimum. Scene names fade in beside their nodes (0.18 s, after a 0.12 s delay). |
| Hovering a node or name | The node gets a white ring and soft glow, the name turns white, and the cursor becomes a pointer. |
| Click or Enter on a node or name | In the Guided Journey, it jumps to that place's chapter through the engine's own `goto` (its time-lapse transition). In Free Look, it opens that place's scene through the World Map's own `openScene`. The current place is shown in gold and does nothing on click. Extra clicks within 1.4 s are ignored, and the engine also ignores a jump while a transition is running. |
| Leaving the map | After 0.24 s, the names fade out and the map settles back. Gaps between names are covered by an invisible hover pad, so the map does not flicker. Esc, a tap elsewhere and window resizing also close it. |

## Nodes and destinations

The nodes are the World Map's own nodes, from `data/nodes.ts`. Each one leads to the first chapter of the same node, found with `chapterIndexForNode`.

| Node | Name shown | Chapter | Scene ID |
|---|---|---|---|
| bedroom | Murph's Room | CH 01 | bedroom |
| farm | Cooper's Farm | CH 02 | farm |
| nasa | NASA Facility | CH 03 | nasa |
| endurance | Endurance | CH 04 | endurance |
| saturn | Saturn | CH 05 | saturn |
| wormhole | Wormhole | CH 06 | wormhole |
| miller | Miller's Planet | CH 07 | miller |
| mann | Mann's Planet | CH 08 | mann |
| gargantua (gold core) | Gargantua | CH 10 | gargantua |
| tesseract | Tesseract | CH 11 | tesseract |
| station | Cooper Station | CH 13 | station |
| edmunds | Edmunds' Planet | CH 14 | edmunds |

Notes:

- **Chapters without their own node:** CH 09 (The Docking) belongs to the Endurance node and CH 12 (The Watch) to the bedroom node. They have no separate markers, so they are reached through the chapter ticks as before.
- **UCLA Studio:** it is not part of this diagram, so it is not added. It stays on the World Map and the end card.
- **Short names in small windows:** if the full names cannot be placed cleanly, the map uses shorter ones: Farm, NASA, Miller, Mann, Edmunds, Station.

## Label layout

Labels are placed by a small greedy layout (`MiniMap.tsx → layout`).

- **Candidate positions:** each label tries right, left, above, below and the four diagonals of its node. It can also sit just outside the disc on a hairline leader.
- **Rejected or penalised positions:**
  - overlapping another label (with spacing);
  - touching or sitting next to another node;
  - leaving the allowed area (inside the window and below the telemetry panel);
  - lying on the diagram's lines, which are sampled from the SVG.
- **Search:** about 60 label orders are tried, and the cheapest arrangement is kept.
- **Text:** labels stay 9.5 px on screen at any scale.

## Files

- `src/cinema/MiniMap.tsx` (new): the expandable, navigable minimap.
- `src/cinema/minimap.css` (new): `.mm*` styles only.
- `src/cinema/CinemaStage.tsx`: the minimap `<figure>` becomes `<MiniMap …/>`, plus a `navigateTo` callback.
- `src/modes/FlatMap.tsx`: exports `flatPoint`. The drawing is unchanged.
- `src/version.ts`: revision entry.
