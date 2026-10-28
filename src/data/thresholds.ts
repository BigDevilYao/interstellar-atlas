import type { Threshold, ThresholdId } from './types';

/**
 * CINEMATIC THRESHOLDS
 * Each threshold has its own unique sequence renderer in /src/thresholds/sequences.
 * Beats are normalised (0..1) so the same data drives captions, the scrub bar and Analysis mode.
 */
export const THRESHOLDS: Threshold[] = [
  {
    id: 'farm-nasa',
    code: 'TH·A',
    title: "Cooper's Farm → NASA Facility",
    route: ['bedroom', 'farm', 'nasa'],
    types: ['Physical', 'Information'],
    techniques: ['Insert shot', 'Top-down plan', 'Tracking shot', 'Section reveal'],
    duration: 11,
    sound: 'wind',
    summary:
      'Information becomes direction. Dust settles into binary bands, the bands become coordinates, and the coordinates become a route that ends at a hidden architecture.',
    beats: [
      { at: 0, title: 'Dust storm', caption: 'Dust drifts through the open bedroom window and settles on the floor.' },
      { at: 0.2, title: 'Binary in the dust', caption: 'Gravity sorts the dust into thick and thin bands — a code.' },
      { at: 0.38, title: 'Coordinates', caption: 'Cooper decodes the bands into a location.' },
      { at: 0.5, title: 'Tracking across the farm', caption: 'Plan view: the truck follows the coordinates across the fields at night.' },
      { at: 0.72, title: 'The fence', caption: 'A blank perimeter and a floodlight. The landscape hides an institution.' },
      { at: 0.84, title: 'Section reveal', caption: 'The ground is cut open: corridors, chambers and a launch silo lie beneath.' },
    ],
  },
  {
    id: 'bedroom-tesseract',
    code: 'TH·B',
    title: "Murph's Bedroom ↔ Tesseract",
    route: ['bedroom', 'tesseract'],
    types: ['Dimensional', 'Temporal', 'Information'],
    techniques: ['Axial dolly', 'Extrusion', 'Spatial repetition', 'Match cut', 'Time discontinuity'],
    duration: 15,
    sound: 'pulse',
    summary:
      'Not a doorway but a transformation of the same room. The bookshelf extends beyond its walls, the room repeats through time, and the camera enters the lattice.',
    beats: [
      { at: 0, title: 'The room', caption: 'Frontal, axial view of Murph’s bedroom: bed, window, door, bookshelf.' },
      { at: 0.16, title: 'Approach the bookshelf', caption: 'A slow dolly toward the shelf. Gaps between the books become openings.' },
      { at: 0.33, title: 'Shelves extend', caption: 'The shelf lines extrude beyond the boundaries of the room.' },
      { at: 0.52, title: 'The room repeats', caption: 'Architectural lines multiply: each copy is the room at another moment.' },
      { at: 0.7, title: 'Information channels', caption: 'Books, dust and the watch become separate channels of gravitational signal.' },
      { at: 0.86, title: 'Inside the Tesseract', caption: 'The camera passes through the shelf into an apparently infinite framework.' },
    ],
  },
  {
    id: 'earth-endurance',
    code: 'TH·C',
    title: 'NASA / Earth → Endurance',
    route: ['nasa', 'endurance'],
    types: ['Physical', 'Scale'],
    techniques: ['Vertical tracking', 'Scale transformation', 'Camera roll', 'Geometric reveal'],
    duration: 11,
    sound: 'rumble',
    summary:
      'A change of scale rather than of place. The ground line becomes a horizon, the horizon becomes a curve, and the curve becomes an orbit occupied by a ring.',
    beats: [
      { at: 0, title: 'Ground plane', caption: 'Launch structure in elevation. The scale bar reads in metres.' },
      { at: 0.18, title: 'Ascent', caption: 'Vertical tracking: the camera follows the vehicle upward through the atmosphere.' },
      { at: 0.42, title: 'The horizon bends', caption: 'Kilometres become hundreds of kilometres; the flat ground curves into a planet.' },
      { at: 0.62, title: 'Orbit', caption: 'Silence. The trajectory settles into a circular orbit.' },
      { at: 0.78, title: 'The ring', caption: 'The Endurance is revealed: twelve modules arranged in a rotating circle.' },
    ],
  },
  {
    id: 'endurance-miller',
    code: 'TH·D',
    title: 'Endurance → Saturn → Wormhole → Miller',
    route: ['endurance', 'saturn', 'wormhole', 'miller'],
    types: ['Physical', 'Topological'],
    techniques: ['Long shot', 'Scale contrast', 'Fold diagram', 'Subjective passage', 'Cross-cut'],
    duration: 17,
    sound: 'drone',
    summary:
      'The longest physical journey of the film, in four acts: transit, landmark, fold and descent. The wormhole is a topological shortcut — not the black hole.',
    beats: [
      { at: 0, title: 'Transit', caption: 'The Endurance travels for two years; its scale is measured against Saturn.' },
      { at: 0.14, title: 'Saturn', caption: 'A minute ship against the rings — a long shot as a ruler.' },
      { at: 0.28, title: 'A spherical door', caption: 'The wormhole is a sphere that reflects a distant galaxy.' },
      { at: 0.4, title: 'Space folds', caption: 'Two distant points of space are brought together by folding the sheet.' },
      { at: 0.54, title: 'Crossing', caption: 'The camera passes through the throat: distortion, turbulence, rings of light.' },
      { at: 0.7, title: 'Another galaxy', caption: 'The Gargantua system appears. The wormhole and the black hole are different objects.' },
      { at: 0.8, title: 'Ranger separates', caption: 'The lander detaches from the ring and banks toward the planet.' },
      { at: 0.9, title: 'Descent', caption: 'A shallow ocean, close to Gargantua: Miller’s Planet.' },
    ],
  },
  {
    id: 'miller-mann',
    code: 'TH·E',
    title: "Miller's Planet → Endurance → Mann's Planet",
    route: ['miller', 'endurance', 'mann'],
    types: ['Physical', 'Temporal'],
    techniques: ['Scale reveal', 'Split screen', 'Sound bridge (ticks)', 'Cross-cut', 'Match cut'],
    duration: 15,
    sound: 'ticks',
    summary:
      'Gravitational time dilation made visible. Every tick on the ocean is a day elsewhere. The return to the Endurance is a return to a different time, before the journey continues to ice.',
    beats: [
      { at: 0, title: 'Shallow ocean', caption: 'A flat surface of knee-deep water without landmarks.' },
      { at: 0.16, title: 'Mountains are waves', caption: 'What looked like a mountain range rises and moves.' },
      { at: 0.36, title: '1 hour = 7 years', caption: 'Two clocks side by side: Miller time and distant time.' },
      { at: 0.58, title: 'Return to Endurance', caption: 'Romilly has waited 23 years, 4 months and 8 days.' },
      { at: 0.76, title: 'Toward the ice', caption: 'Match cut from waves to frozen ridges: Mann’s Planet.' },
    ],
  },
  {
    id: 'mann-docking',
    code: 'TH·F',
    title: "Mann's Planet → Endurance docking",
    route: ['mann', 'endurance'],
    types: ['Mechanical', 'Spatial'],
    techniques: ['Camera roll', 'Geometric alignment', 'Mechanical sound bridge', 'Concentric framing'],
    duration: 12,
    sound: 'mechanical',
    summary:
      'Architecture as survival. The damaged ring spins; Cooper matches its rotation. The frame itself rolls until two circles coincide.',
    beats: [
      { at: 0, title: 'Frozen terrain', caption: 'Ice ridges and suspended cloud decks below the departing Ranger.' },
      { at: 0.18, title: 'Explosion', caption: 'Mann’s failed docking tears the ring open; it begins to spin.' },
      { at: 0.36, title: 'The spin', caption: 'Roughly 67–68 rpm. The stars streak around the frame.' },
      { at: 0.52, title: 'Match the rotation', caption: 'The Ranger rolls to match. The camera rolls with it — the ring appears still.' },
      { at: 0.74, title: 'Alignment', caption: 'Concentric circles converge: port, collar, crosshair.' },
      { at: 0.88, title: 'Docked', caption: 'A mechanical lock. Rotation is slowly brought back to rest.' },
    ],
  },
  {
    id: 'gargantua-branch',
    code: 'TH·G',
    title: 'Endurance → Gargantua → Branching routes',
    route: ['endurance', 'gargantua', 'tesseract', 'edmunds'],
    types: ['Gravitational', 'Dimensional', 'Narrative'],
    techniques: ['Slingshot trajectory', 'Separation', 'Cross-cutting', 'Split frame', 'Dimensional cut'],
    duration: 15,
    sound: 'drone',
    summary:
      'One trajectory splits into two. Cooper and TARS fall through the horizon into the Tesseract; Brand and CASE use the momentum to reach Edmunds’ Planet.',
    beats: [
      { at: 0, title: 'Approach', caption: 'The Endurance descends toward the accretion disk.' },
      { at: 0.18, title: 'Slingshot', caption: 'A hyperbolic path grazes the horizon to steal momentum.' },
      { at: 0.38, title: 'Separation', caption: 'Cooper and TARS detach to lighten the ship.' },
      { at: 0.52, title: 'Two trajectories', caption: 'Cross-cutting: one route falls inward, one is flung outward.' },
      { at: 0.7, title: 'Cooper · through the horizon', caption: 'The Ranger breaks apart; a geometric space opens — the Tesseract.' },
      { at: 0.86, title: 'Brand · onward to Edmunds', caption: 'The Endurance continues, alone, to the third planet.' },
    ],
  },
  {
    id: 'information-loop',
    code: 'TH·H',
    title: "Tesseract → Murph's Room → Cooper Station",
    route: ['tesseract', 'bedroom', 'station'],
    types: ['Information', 'Temporal'],
    techniques: ['Cross-cutting', 'Insert shots', 'Rhythmic editing', 'Scale reveal'],
    duration: 14,
    sound: 'pulse',
    summary:
      'An information route rather than a physical one. Gravity carries data from the Tesseract into the watch; Murph decodes it; the solution makes cylindrical habitats possible.',
    beats: [
      { at: 0, title: 'Inside the Tesseract', caption: 'Cooper locates the moment when Murph keeps the watch.' },
      { at: 0.18, title: 'Gravity as signal', caption: 'He plucks a thread of the lattice; the force crosses time.' },
      { at: 0.38, title: 'The watch', caption: 'The second hand twitches in long and short intervals.' },
      { at: 0.56, title: 'Decoding', caption: 'Murph translates the rhythm into data — quantum data from inside the black hole.' },
      { at: 0.72, title: 'The solution', caption: 'The gravity problem is solved. Mass can be lifted off the planet.' },
      { at: 0.86, title: 'Cooper Station', caption: 'A rotating cylinder: the farm returns, curved overhead.' },
    ],
  },
];

export const THRESHOLD_MAP: Record<ThresholdId, Threshold> = Object.fromEntries(THRESHOLDS.map((t) => [t.id, t])) as Record<
  ThresholdId,
  Threshold
>;
