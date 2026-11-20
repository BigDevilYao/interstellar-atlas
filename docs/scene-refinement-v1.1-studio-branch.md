# INTERSTELLAR · REVIEW — scene-refinement-v1.1-studio-branch (not published)

This is a local review build on the branch `feature/scene-refinement-v1.1-studio-branch`, built on top of `scene-refinement-v1`.

- **Nothing deployed:** the live site, `site/`, `vercel.json` and `main` are unchanged.
- **What it adds:** one optional side branch. Every existing scene, chapter, transition, camera path, diagram, Guided Journey and Analysis view is unchanged.

## Navigation

```
MAIN STORY (unchanged)
Murph's Room → Farm → NASA → Endurance → Saturn → Wormhole → Miller → Mann → Docking → Gargantua → Tesseract → The Watch → Cooper Station → Edmunds' Planet → END CARD
                                                                                                              │
OPTIONAL STUDIO BRANCH (new)                                                                                 │ "Optional branch · Studio Threshold" (below the end card's own buttons)
World Map ── "UCLA Studio" node (below Edmunds' Planet) ─────────────────────────────────────────────────────┤
                                                                                                              ▼
                       Printer ──touchscreen──▶ UCLA Studio ──second printer's screen / bookshelf──▶ Murph's Room
                          ▲  (Esc / Back)            ▲  (Esc / Back)                                     │
                          └──────────────────────────┴───────────────────────────────────────────────────┤
                                                                                                          ▼
                               Atlas: ▸ Continue the journey · Ch 01 │ Free look │ Diagram · TH·B │ Exit to atlas
                               (a discreet "↩ Studio branch" chip leads back in at Murph's Room)
```

## Code

- **`src/branches/studio/`** — the whole branch. It can be removed, together with the four hooks below.
  - `branch.ts`: the branch state, the entrances, the hand-off back into the Atlas, and same-document browser history.
  - `StudioBranchLayer.tsx`: mounted by App. It loads the branch lazily, owns Back/Forward and Esc while the branch is open, and shows the return chip.
  - `StudioBranchView.tsx`: the branch on screen, framed with the Atlas's own cinema HUD classes.
  - `StudioBranchEntry.tsx`: the entrance on the end card.
  - `map/`: the World Map node and its connector, drawn in the map's own styles.
  - `controller.ts`, `threshold.ts`, `printer*.ts`, `studio.ts`, `murph.ts`: reused from the Studio Threshold prototype (v0.1.0-studio-threshold-test.1). Murph's Room is the Atlas's own `buildBedroom`, unmodified.
  - `studio-branch.css`: only `.sb*` selectors.
- **`public/branches/studio/`** — the six reference photos and the window view, kept separate from the Atlas's assets.
- **Hooks in existing files:**
  - `App.tsx`: renders `<StudioBranchLayer/>`.
  - `CinemaStage.tsx`: places `<StudioBranchEntry/>` under the end card's buttons.
  - `WorldMap.tsx`: renders `<StudioMapBranch/>`.
  - `state/store.ts`: adds `'branch'` to `View`, so the map and cinema stage pause while the branch is on screen.
  - `version.ts`: adds the revision entry.

## Run

```bash
git checkout feature/scene-refinement-v1.1-studio-branch
npm install
npm run dev     # http://localhost:5173/
```

To reach the branch, either finish the Guided Journey (the end card shows the optional branch) or click **UCLA Studio** on the World Map.
