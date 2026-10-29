/**
 * Core data model for the atlas.
 * Narrative data lives in /src/data and is completely separate from rendering.
 * Edit nodes / connections / thresholds there without touching any 3D code.
 */

export type NodeId =
  | 'farm'
  | 'bedroom'
  | 'nasa'
  | 'endurance'
  | 'saturn'
  | 'wormhole'
  | 'miller'
  | 'mann'
  | 'gargantua'
  | 'edmunds'
  | 'tesseract'
  | 'station';

export type IconId =
  | 'farm'
  | 'bedroom'
  | 'nasa'
  | 'endurance'
  | 'saturn'
  | 'wormhole'
  | 'miller'
  | 'mann'
  | 'gargantua'
  | 'edmunds'
  | 'tesseract'
  | 'station'
  | 'ranger'
  | 'truck'
  | 'watch';

/** Scene category used for grouping and colour-free classification. */
export type NodeCategory = 'Terrestrial' | 'Spacecraft' | 'Cosmic threshold' | 'Planetary' | 'Dimensional';

/** The three visual layers of the map. */
export type Layer = 'physical' | 'spacetime' | 'information';

/** Analytical threshold classification. */
export type ThresholdType =
  | 'Physical'
  | 'Information'
  | 'Dimensional'
  | 'Temporal'
  | 'Topological'
  | 'Scale'
  | 'Mechanical'
  | 'Spatial'
  | 'Gravitational'
  | 'Narrative';

export type ThresholdId =
  | 'farm-nasa'
  | 'bedroom-tesseract'
  | 'earth-endurance'
  | 'endurance-miller'
  | 'miller-mann'
  | 'mann-docking'
  | 'gargantua-branch'
  | 'information-loop';

/** Normalised composition coordinates: x right, y up; 1 = sphere radius. */
export type Vec2 = [number, number];
/** Normalised composition coordinates with optional depth (z toward the viewer, 1 = sphere radius). */
export type Vec3 = [number, number, number];

export interface NodeLabel {
  /** Visual weight of the label chip — mirrors the two label sizes of the reference image. */
  size: 'lg' | 'sm';
  /** Side of the marker the label sits on (ignored when `at` is provided). */
  side?: 'right' | 'left' | 'top' | 'bottom';
  /** Optional independent anchor for the label in composition coordinates. */
  at?: Vec2;
}

export interface AtlasNode {
  id: NodeId;
  name: string;
  icon: IconId;
  category: NodeCategory;
  /** Composition position on the World Map (x, y in sphere radii). */
  position: Vec2;
  /** 0 = on the silhouette plane, 1 = on the front surface of the sphere. */
  depth: number;
  /** 'card' = framed architectural icon (reference style), 'ring' = hollow orbital marker + small icon, 'core' = Gargantua. */
  marker: 'card' | 'ring' | 'core';
  label: NodeLabel;
  /** One line shown in the hover tooltip. */
  tagline: string;
  /** Short narrative description (shown only after selection). */
  description: string;
  /** Architectural / spatial reading of the location. */
  analysis: string;
  /** Typology of the environment, used in the panel and in Analysis mode. */
  spaceType: string;
  /** Characteristic scale of the space. */
  scale: string;
  /** How the space was made for the film — kept deliberately general. */
  production: string;
  /** Optional temporal note (time dilation, multiple time states…). */
  timeNote?: string;
  /** Thresholds that start, end or pass through this node. */
  thresholds: ThresholdId[];
  /** Whether a dedicated scene environment exists for this node. */
  hasScene: boolean;
}

export interface AtlasConnection {
  id: string;
  from: NodeId;
  to: NodeId;
  layer: Layer;
  /** Secondary layer: the connection stays visible if either layer is on. */
  alsoLayer?: Layer;
  /** Special rendering treatment. */
  style?: 'axis' | 'branch-cooper' | 'branch-brand';
  label: string;
  types: ThresholdType[];
  /** Short cinematic explanation. */
  summary: string;
  /** What moves along the connection (vehicle, signal, …). */
  carrier: string;
  thresholdId?: ThresholdId;
  /** Optional intermediate control points (composition coordinates, z = depth 0..1). */
  via?: Vec3[];
  /** Bow of the curve when no `via` is given (fraction of chord length). */
  bend?: number;
  bidirectional?: boolean;
}

export interface ThresholdBeat {
  /** Normalised start time 0..1 within the sequence. */
  at: number;
  title: string;
  caption: string;
}

export interface Threshold {
  id: ThresholdId;
  code: string;
  title: string;
  /** Ordered nodes the threshold passes through. */
  route: NodeId[];
  types: ThresholdType[];
  /** Cinematic techniques used to visualise the passage. */
  techniques: string[];
  /** Seconds at normal speed. */
  duration: number;
  summary: string;
  beats: ThresholdBeat[];
  /** Sound bridge character for the optional synthesised sound. */
  sound: 'drone' | 'ticks' | 'mechanical' | 'wind' | 'pulse' | 'rumble';
}

export interface RouteGlyph {
  connectionId: string;
  icon: IconId;
  /** Position along the curve 0..1 */
  t: number;
  caption?: string;
  /** Pixel offset of the glyph from the curve point. */
  offset?: [number, number];
}

export type JourneyStep =
  | { kind: 'node'; node: NodeId; title: string; caption: string }
  | { kind: 'threshold'; threshold: ThresholdId; reverse?: boolean; title: string; caption: string };
