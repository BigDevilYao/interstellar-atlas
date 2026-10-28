import type { AtlasConnection, Layer, NodeId, RouteGlyph } from './types';

/**
 * CONNECTIONS
 * physical    – actual travel of characters and spacecraft (continuous lines)
 * spacetime   – wormhole, gravity, time dilation, dimensional relations (dashed / curved)
 * information – dust, bookshelf, watch, transmissions, solutions (fine pulsing lines)
 *
 * `via` control points use composition coordinates [x, y, depth].
 * Note how the routes deliberately separate visual symbolism (the axis) from physical travel.
 */
export const CONNECTIONS: AtlasConnection[] = [
  // ───────────────────────────── PHYSICAL ─────────────────────────────
  {
    id: 'farm-nasa',
    from: 'farm',
    to: 'nasa',
    layer: 'physical',
    alsoLayer: 'information',
    label: 'Following the coordinates',
    types: ['Physical', 'Information'],
    carrier: 'Pickup truck',
    summary:
      'Binary lines of dust are decoded into coordinates. Cooper and Murph drive across the dark landscape until a fence and a floodlight reveal a hidden institution.',
    thresholdId: 'farm-nasa',
    via: [[-0.5, 0.86, 0.3]],
  },
  {
    id: 'nasa-endurance',
    from: 'nasa',
    to: 'endurance',
    layer: 'physical',
    label: 'Launch: from ground to orbit',
    types: ['Physical', 'Scale'],
    carrier: 'Ranger on launch vehicle',
    summary:
      'A scale transformation. The camera leaves the ground plane, the horizon bends into a curve, and the ring of the Endurance appears in orbit, waiting to be docked.',
    thresholdId: 'earth-endurance',
    via: [
      [-0.62, 0.5, 0.55],
      [-0.84, 0.24, 0.4],
    ],
  },
  {
    id: 'endurance-saturn',
    from: 'endurance',
    to: 'saturn',
    layer: 'physical',
    label: 'Two years to Saturn',
    types: ['Physical', 'Temporal'],
    carrier: 'Endurance',
    summary: 'The crew sleeps through a roughly two-year voyage. The Endurance becomes a speck against the rings of Saturn.',
    thresholdId: 'endurance-miller',
    bend: 0.25,
  },
  {
    id: 'saturn-wormhole',
    from: 'saturn',
    to: 'wormhole',
    layer: 'physical',
    alsoLayer: 'spacetime',
    label: 'Approaching the sphere',
    types: ['Physical', 'Topological'],
    carrier: 'Endurance',
    summary: 'Near Saturn a spherical distortion reflects another galaxy. The ship aligns with it and enters.',
    thresholdId: 'endurance-miller',
    bend: -0.3,
  },
  {
    id: 'wormhole-miller',
    from: 'wormhole',
    to: 'miller',
    layer: 'physical',
    alsoLayer: 'spacetime',
    label: 'Crossing and descent',
    types: ['Physical', 'Topological'],
    carrier: 'Endurance → Ranger',
    summary:
      'Space folds: the exit lies in another galaxy. The Ranger separates from the Endurance and descends to the ocean of Miller’s Planet, close to Gargantua.',
    thresholdId: 'endurance-miller',
    via: [
      [-0.66, 0.16, 0.6],
      [-0.1, 0.38, 0.95],
      [0.55, 0.26, 0.7],
    ],
  },
  {
    id: 'miller-endurance',
    from: 'miller',
    to: 'endurance',
    layer: 'physical',
    alsoLayer: 'spacetime',
    label: 'Return: 23 years later',
    types: ['Physical', 'Temporal'],
    carrier: 'Ranger',
    summary:
      'The Ranger escapes the waves and returns to the Endurance. For the landing party a few hours have passed; for Romilly and Earth, 23 years, 4 months and 8 days.',
    thresholdId: 'miller-mann',
    via: [
      [0.62, -0.2, 0.7],
      [0.05, -0.43, 0.95],
      [-0.6, -0.16, 0.6],
    ],
  },
  {
    id: 'endurance-mann',
    from: 'endurance',
    to: 'mann',
    layer: 'physical',
    label: 'To the frozen world',
    types: ['Physical'],
    carrier: 'Ranger',
    summary: 'With fuel running low, the crew chooses Mann’s signal over Edmunds’. The landscape shifts from water to ice.',
    thresholdId: 'miller-mann',
    via: [
      [-0.62, -0.58, 0.55],
      [0.05, -0.97, 0.15],
      [0.62, -0.74, 0.35],
    ],
  },
  {
    id: 'mann-endurance',
    from: 'mann',
    to: 'endurance',
    layer: 'physical',
    alsoLayer: 'spacetime',
    label: 'Emergency docking',
    types: ['Mechanical', 'Spatial'],
    carrier: 'Ranger → Endurance',
    summary:
      'Mann’s failed docking tears the ring open. Cooper matches the spinning wreck’s rotation; the camera rolls with the ship until the two circles align.',
    thresholdId: 'mann-docking',
    via: [
      [0.5, -0.34, 0.9],
      [-0.12, -0.28, 0.98],
      [-0.6, -0.08, 0.7],
    ],
  },
  {
    id: 'endurance-gargantua',
    from: 'endurance',
    to: 'gargantua',
    layer: 'physical',
    alsoLayer: 'spacetime',
    label: 'Slingshot around Gargantua',
    types: ['Gravitational', 'Narrative'],
    carrier: 'Endurance',
    summary:
      'Without enough fuel, the crew dives close to Gargantua to steal momentum. Relativity charges its price: another 51 years pass elsewhere.',
    thresholdId: 'gargantua-branch',
    via: [[-0.42, 0.13, 0.55]],
  },
  {
    id: 'gargantua-edmunds',
    from: 'gargantua',
    to: 'edmunds',
    layer: 'physical',
    style: 'branch-brand',
    label: 'Brand & CASE continue to Edmunds',
    types: ['Gravitational', 'Physical', 'Narrative'],
    carrier: 'Endurance (Brand, CASE)',
    summary:
      'Lightened by the release of the Rangers, the Endurance is flung onward by the gravity assist. Brand reaches Edmunds’ Planet. She never enters the Tesseract.',
    thresholdId: 'gargantua-branch',
    via: [
      [0.42, -0.22, 0.6],
      [0.6, -0.44, 0.65],
    ],
  },
  {
    id: 'tesseract-station',
    from: 'tesseract',
    to: 'station',
    layer: 'physical',
    label: 'Ejected, rescued near Saturn',
    types: ['Physical', 'Temporal'],
    carrier: 'Cooper (rescued)',
    summary:
      'The Tesseract collapses and returns Cooper through the wormhole. He is found drifting near Saturn and wakes on Cooper Station, decades later.',
    via: [
      [-0.32, -0.66, 0.6],
      [-0.42, -0.42, 0.75],
      [-0.12, 0.42, 0.98],
      [0.36, 0.56, 0.75],
    ],
  },
  {
    id: 'station-edmunds',
    from: 'station',
    to: 'edmunds',
    layer: 'physical',
    label: 'Leaving to find Brand',
    types: ['Physical', 'Narrative'],
    carrier: 'Ranger (Cooper, TARS)',
    summary: 'The film ends with a departure rather than a homecoming: Cooper takes a Ranger back towards Edmunds’ Planet.',
    via: [
      [0.84, 0.22, 0.45],
      [0.86, -0.22, 0.35],
      [0.52, -0.6, 0.55],
    ],
  },

  // ───────────────────────────── SPACE-TIME ─────────────────────────────
  {
    id: 'axis',
    from: 'bedroom',
    to: 'tesseract',
    layer: 'spacetime',
    alsoLayer: 'information',
    style: 'axis',
    label: 'The axis: gravitational communication',
    types: ['Dimensional', 'Temporal', 'Information'],
    carrier: 'Gravity',
    summary:
      'Not a journey. The bedroom and the Tesseract are the same room seen from two sides of time. Gravity is the only force that crosses between them.',
    thresholdId: 'bedroom-tesseract',
    bidirectional: true,
    via: [
      [0, 0.32, -0.25],
      [0, -0.38, -0.25],
    ],
  },
  {
    id: 'gargantua-tesseract',
    from: 'gargantua',
    to: 'tesseract',
    layer: 'spacetime',
    alsoLayer: 'physical',
    style: 'branch-cooper',
    label: 'Cooper & TARS fall into Gargantua',
    types: ['Gravitational', 'Dimensional', 'Narrative'],
    carrier: 'Ranger (Cooper, TARS)',
    summary:
      'Cooper detaches to lighten the ship and falls past the horizon. The Ranger breaks apart; he ejects and drops into a geometric space: the Tesseract.',
    thresholdId: 'gargantua-branch',
    via: [
      [0.4, -0.34, 0.5],
      [0.66, -0.7, 0.4],
      [0.36, -0.9, 0.45],
    ],
  },
  {
    id: 'miller-gargantua',
    from: 'miller',
    to: 'gargantua',
    layer: 'spacetime',
    label: 'Gravitational time dilation',
    types: ['Temporal', 'Gravitational'],
    carrier: 'Gravity well',
    summary:
      'Miller’s orbit sits deep in Gargantua’s gravity well. The closer to the mass, the slower time runs relative to distant observers.',
    thresholdId: 'miller-mann',
    via: [[0.56, 0.13, 0.4]],
  },
  {
    id: 'wormhole-gargantua',
    from: 'wormhole',
    to: 'gargantua',
    layer: 'spacetime',
    label: 'Folded distance',
    types: ['Topological'],
    carrier: 'Curved space',
    summary:
      'The wormhole connects two distant regions — Saturn’s orbit and the Gargantua system — removing the distance between them.',
    thresholdId: 'endurance-miller',
    via: [[-0.44, -0.16, 0.35]],
  },

  // ───────────────────────────── INFORMATION ─────────────────────────────
  {
    id: 'farm-bedroom',
    from: 'farm',
    to: 'bedroom',
    layer: 'information',
    label: 'The “ghost”: dust and fallen books',
    types: ['Information', 'Gravitational'],
    carrier: 'Dust, gravity anomaly',
    summary:
      'During a dust storm the bedroom window is left open; dust settles in parallel bands on the floor. Cooper reads them as binary.',
    thresholdId: 'farm-nasa',
    bend: 0.12,
  },
  {
    id: 'bedroom-nasa',
    from: 'bedroom',
    to: 'nasa',
    layer: 'information',
    label: 'Binary coordinates',
    types: ['Information'],
    carrier: 'Coordinates in dust',
    summary: 'A message without a sender points to a place without a sign: the hidden NASA facility.',
    thresholdId: 'farm-nasa',
    bend: -0.18,
  },
  {
    id: 'earth-messages',
    from: 'farm',
    to: 'endurance',
    layer: 'information',
    alsoLayer: 'spacetime',
    label: '23 years of messages',
    types: ['Information', 'Temporal'],
    carrier: 'Video transmissions',
    summary:
      'Messages from Earth accumulate on the Endurance while the crew is on Miller’s Planet. Cooper watches his children grow up in minutes: an editing of time.',
    thresholdId: 'miller-mann',
    via: [
      [-0.9, 0.5, 0.1],
      [-1.02, 0.18, 0.0],
    ],
  },
  {
    id: 'bedroom-station',
    from: 'bedroom',
    to: 'station',
    layer: 'information',
    label: 'The watch → the gravity solution',
    types: ['Information', 'Temporal'],
    carrier: 'Quantum data in the watch',
    summary:
      'Murph returns to her room and understands the ticking second hand. The data solves the gravity problem; humanity leaves Earth in cylindrical habitats.',
    thresholdId: 'information-loop',
    bend: 0.2,
  },
];

export const CONNECTION_MAP: Record<string, AtlasConnection> = Object.fromEntries(CONNECTIONS.map((c) => [c.id, c]));

export function connectionsOf(node: NodeId): AtlasConnection[] {
  return CONNECTIONS.filter((c) => c.from === node || c.to === node);
}

export function isConnectionVisible(c: AtlasConnection, layers: Record<Layer, boolean>): boolean {
  return layers[c.layer] || (c.alsoLayer ? layers[c.alsoLayer] : false);
}

/** Small architectural glyphs placed along routes (as in the reference image). */
export const ROUTE_GLYPHS: RouteGlyph[] = [
  { connectionId: 'farm-nasa', icon: 'truck', t: 0.42, offset: [0, -16] },
  { connectionId: 'gargantua-edmunds', icon: 'ranger', t: 0.62, caption: 'Brand goes to Edmunds’ Planet', offset: [-34, 4] },
  {
    connectionId: 'gargantua-tesseract',
    icon: 'ranger',
    t: 0.56,
    caption: 'Cooper goes to the Tesseract through Gargantua',
    offset: [70, 40],
  },
];

export const LAYER_META: Record<Layer, { name: string; description: string }> = {
  physical: { name: 'Physical Journey', description: 'Walking, driving, launch, spacecraft and landers.' },
  spacetime: { name: 'Space-Time', description: 'Wormhole, gravity, time dilation, dimensions.' },
  information: { name: 'Information', description: 'Dust, books, watch, transmissions, solutions.' },
};
