import type { AtlasNode, NodeId } from './types';

/**
 * WORLD MAP NODES
 * Positions follow the composition of the reference image (not astronomical coordinates):
 *  - centre: Gargantua
 *  - upper region: Murph's Bedroom, Cooper's Farm, NASA
 *  - left: Endurance, Saturn, Wormhole
 *  - right: Miller's Planet, Mann's Planet
 *  - lower right: Edmunds' Planet and the two branching trajectories
 *  - bottom: Tesseract
 * The vertical axis Murph's Bedroom ↔ Tesseract is preserved at x = 0.
 */
export const NODES: AtlasNode[] = [
  {
    id: 'bedroom',
    name: "Murph's Bedroom",
    icon: 'bedroom',
    category: 'Terrestrial',
    position: [0, 0.73],
    depth: 0.55,
    marker: 'card',
    label: { size: 'lg', side: 'right' },
    tagline: 'A room that receives messages from its own future.',
    description:
      'A child’s bedroom in the farmhouse. Books fall from the shelf, dust settles into lines and a watch ticks irregularly. Murph calls it a ghost; it is a signal sent from inside the Tesseract.',
    analysis:
      'The most ordinary space in the film becomes its most connected one. The bookshelf works as a membrane: a piece of furniture that turns into an interface between dimensions. The same room exists in several time states at once.',
    spaceType: 'Domestic interior · threshold wall',
    scale: '≈ 4 × 4 m room',
    production: 'Built as a physical interior set for the farmhouse.',
    timeNote: 'Visited by Murph as a child and as an adult; observed by Cooper from outside time.',
    thresholds: ['bedroom-tesseract', 'farm-nasa', 'information-loop'],
    hasScene: true,
  },
  {
    id: 'farm',
    name: "Cooper's Farm",
    icon: 'farm',
    category: 'Terrestrial',
    position: [-0.63, 0.75],
    depth: 0.25,
    marker: 'ring',
    label: { size: 'sm', side: 'right' },
    tagline: 'A dust-choked landscape on the edge of collapse.',
    description:
      'A corn farm under recurring dust storms. Agriculture is the last viable economy; Cooper, a former pilot, is now a farmer. The farm is where the first anomaly appears and where the journey leaves from.',
    analysis:
      'An open horizontal landscape: fields, porch, road, horizon. It is the baseline of human scale against which every later space is measured, and the only place the film returns to across decades.',
    spaceType: 'Agricultural landscape · farmhouse',
    scale: '≈ 1 km fields',
    production: 'Filmed in a planted cornfield with a purpose-built farmhouse.',
    thresholds: ['farm-nasa'],
    hasScene: true,
  },
  {
    id: 'nasa',
    name: 'NASA Secret Facility',
    icon: 'nasa',
    category: 'Terrestrial',
    position: [-0.33, 0.585],
    depth: 0.6,
    marker: 'ring',
    label: { size: 'sm', side: 'bottom' },
    tagline: 'A hidden institution beneath an ordinary landscape.',
    description:
      'Coordinates in the dust lead Cooper and Murph to a fenced, hidden compound: what remains of NASA, operating in secret. Professor Brand reveals the Lazarus missions and the plan to leave Earth.',
    analysis:
      'An architecture of concealment. A blank fence and a blast door open onto deep technical interiors, the launch vehicle and a centrifuge-like station under construction. It works as the hinge between domestic and cosmic scale.',
    spaceType: 'Concealed institutional complex',
    scale: 'Corridors to launch silo',
    production: 'Interior sets and industrial locations.',
    thresholds: ['farm-nasa', 'earth-endurance'],
    hasScene: true,
  },
  {
    id: 'endurance',
    name: 'Endurance',
    icon: 'endurance',
    category: 'Spacecraft',
    position: [-0.88, -0.01],
    depth: 0.3,
    marker: 'card',
    label: { size: 'lg', at: [-1.15, -0.07] },
    tagline: 'A rotating ring of twelve modules: the mission’s portable architecture.',
    description:
      'The mothership: a ring of modules that rotates to produce artificial gravity. It carries the crew through the wormhole, waits while they visit the planets, and survives a near-catastrophic docking.',
    analysis:
      'A circular plan with no front or back. Rotation turns the ring into a gravitational floor; docking turns geometry into survival. The Endurance is the hub of the physical network: almost every route passes through it.',
    spaceType: 'Rotating spacecraft · centrifugal architecture',
    scale: 'Ring of 12 modules',
    production: 'Practical spacecraft models and full-size interior sets.',
    timeNote: 'Romilly ages ~23 years on board while the landing party spends hours on Miller’s Planet.',
    thresholds: ['earth-endurance', 'endurance-miller', 'miller-mann', 'mann-docking', 'gargantua-branch'],
    hasScene: true,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    icon: 'saturn',
    category: 'Cosmic threshold',
    position: [-0.56, -0.24],
    depth: 0.6,
    marker: 'ring',
    label: { size: 'sm', side: 'right' },
    tagline: 'Two years of travel to reach the edge of the known.',
    description:
      'After a roughly two-year voyage, the Endurance reaches Saturn, where the wormhole has appeared near its orbit. Saturn is the last familiar landmark before leaving the solar system.',
    analysis:
      'An enormous object rendered small: the ship is a speck against the rings. The scene sets a cosmic scale reference immediately before the topology of space is broken.',
    spaceType: 'Planetary landmark · scale reference',
    scale: 'Rings ≈ 280,000 km',
    production: 'Visual effects with practical miniatures.',
    thresholds: ['endurance-miller'],
    hasScene: true,
  },
  {
    id: 'wormhole',
    name: 'Wormhole',
    icon: 'wormhole',
    category: 'Cosmic threshold',
    position: [-0.82, -0.33],
    depth: 0.35,
    marker: 'ring',
    label: { size: 'lg', side: 'left' },
    tagline: 'A spherical door that folds two regions of space together.',
    description:
      'A sphere that reflects a distant galaxy. Entering it connects Saturn’s neighbourhood to a remote system containing Gargantua and its planets. It is not the black hole: it is a shortcut.',
    analysis:
      'A threshold without a frame. The doorway is a sphere, seen from every side at once. Topologically it removes distance; cinematically it is a passage of distortion and turbulence.',
    spaceType: 'Topological passage',
    scale: 'Throat ≈ 2 km (stated in film)',
    production: 'Visual effects developed with scientific consultation.',
    thresholds: ['endurance-miller'],
    hasScene: true,
  },
  {
    id: 'miller',
    name: "Miller's Planet",
    icon: 'miller',
    category: 'Planetary',
    position: [0.9, 0.0],
    depth: 0.3,
    marker: 'card',
    label: { size: 'lg', at: [1.12, -0.09] },
    tagline: 'One hour here is seven years elsewhere.',
    description:
      'A shallow ocean world orbiting close to Gargantua. Mountains on the horizon turn out to be waves. The team loses Doyle and over two decades of Earth time during a brief landing.',
    analysis:
      'A horizontal plane without landmarks, interrupted by vertical walls of water. Space looks infinite while time becomes dense and expensive: the scene converts distance into duration.',
    spaceType: 'Ocean surface · temporal hazard',
    scale: 'Waves ≈ 1.2 km high',
    production: 'Filmed on location in shallow water with large practical props.',
    timeNote: '≈ 1 hour = 7 years (relative to distant observers) — gravitational time dilation.',
    thresholds: ['endurance-miller', 'miller-mann'],
    hasScene: true,
  },
  {
    id: 'mann',
    name: "Mann's Planet",
    icon: 'mann',
    category: 'Planetary',
    position: [0.77, -0.425],
    depth: 0.35,
    marker: 'card',
    label: { size: 'sm', side: 'right' },
    tagline: 'A frozen world and a false promise.',
    description:
      'An icy planet with frozen clouds and ammonia atmosphere. Dr Mann has falsified his data to be rescued. His betrayal ends in an explosion at the Endurance’s docking port.',
    analysis:
      'Layered ice, suspended cloud decks and isolated shelters. The landscape is vertical and unstable; the architecture is a survival pod. The planet stages deception as a spatial problem.',
    spaceType: 'Frozen terrain · isolation shelter',
    scale: 'Cloud decks and ice fields',
    production: 'Filmed on location on a glacier landscape.',
    thresholds: ['miller-mann', 'mann-docking'],
    hasScene: true,
  },
  {
    id: 'gargantua',
    name: 'Gargantua',
    icon: 'gargantua',
    category: 'Cosmic threshold',
    position: [0, -0.04],
    depth: 0,
    marker: 'core',
    label: { size: 'lg', at: [0.31, -0.3] },
    tagline: 'The gravitational centre that bends light, orbits and time.',
    description:
      'A rapidly spinning supermassive black hole. Its gravity slows time on Miller’s Planet, provides the slingshot that sends Brand to Edmunds, and swallows Cooper and TARS.',
    analysis:
      'Gargantua is the organising centre of the atlas: not a place anyone stays, but the field that shapes every trajectory around it. Its lensed accretion disk wraps over and under the shadow, turning a flat disk into a ring of light.',
    spaceType: 'Gravitational field · event horizon',
    scale: '≈ 100 million solar masses (in film)',
    production: 'Rendered with physically based ray tracing of curved light paths.',
    timeNote: 'Proximity to Gargantua defines the time dilation on Miller’s Planet.',
    thresholds: ['gargantua-branch'],
    hasScene: true,
  },
  {
    id: 'edmunds',
    name: "Edmunds' Planet",
    icon: 'edmunds',
    category: 'Planetary',
    position: [0.29, -0.64],
    depth: 0.6,
    marker: 'card',
    label: { size: 'sm', side: 'right' },
    tagline: 'A rocky, habitable world — the future colony.',
    description:
      'The third candidate world. Brand arrives with CASE after the Gargantua slingshot and finds Edmunds’ grave and breathable conditions. She begins Plan B alone.',
    analysis:
      'A dry, rocky terrain with a single camp under construction. It is the end of one trajectory and the beginning of a settlement — a site rather than a scene.',
    spaceType: 'Rocky terrain · settlement site',
    scale: 'Camp and horizon',
    production: 'Location landscape and set dressing.',
    thresholds: ['gargantua-branch'],
    hasScene: true,
  },
  {
    id: 'tesseract',
    name: 'Tesseract',
    icon: 'tesseract',
    category: 'Dimensional',
    position: [0, -0.76],
    depth: 0.55,
    marker: 'card',
    label: { size: 'lg', at: [0, -1.1] },
    tagline: 'Murph’s bedroom, repeated through time as navigable space.',
    description:
      'Built inside Gargantua by future beings, the Tesseract presents Murph’s bedroom as an infinite lattice of moments. Cooper pushes books, draws lines in dust and encodes data into the watch.',
    analysis:
      'Time rendered as architecture: each moment of the room becomes a corridor that can be walked along. Repetition, extrusion and section replace the cut. The physical route ends; the informational route begins.',
    spaceType: 'Five-dimensional lattice · time as space',
    scale: 'Infinite repetition of a 4 m room',
    production: 'Built as a large practical set with projected imagery.',
    timeNote: 'All moments of the bedroom are simultaneously accessible.',
    thresholds: ['bedroom-tesseract', 'gargantua-branch', 'information-loop'],
    hasScene: true,
  },
  {
    id: 'station',
    name: 'Cooper Station',
    icon: 'station',
    category: 'Spacecraft',
    position: [0.66, 0.55],
    depth: 0.4,
    marker: 'ring',
    label: { size: 'sm', side: 'right' },
    tagline: 'A cylindrical world where the horizon curves overhead.',
    description:
      'A space habitat near Saturn made possible by Murph’s solution to the gravity equation. Cooper wakes here, meets the elderly Murph, and leaves to find Brand.',
    analysis:
      'The inverted landscape: fields and houses curve up and over the viewer. The farm returns as a rotating cylinder — terrestrial architecture rebuilt by gravity.',
    spaceType: 'Rotating cylindrical habitat',
    scale: 'Kilometre-scale cylinder',
    production: 'Set extension with visual effects.',
    timeNote: 'Decades after launch, Cooper is barely older; Murph is elderly.',
    thresholds: ['information-loop'],
    hasScene: true,
  },
];

export const NODE_MAP: Record<NodeId, AtlasNode> = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<
  NodeId,
  AtlasNode
>;

export function getNode(id: NodeId): AtlasNode {
  return NODE_MAP[id];
}
