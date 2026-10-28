import type { Wire } from '../lib/wire3d';

export interface SeqFrame {
  ctx: CanvasRenderingContext2D;
  /** CSS pixel size of the canvas. */
  w: number;
  h: number;
  /** Normalised progress 0..1 (already reversed if the threshold plays backwards). */
  p: number;
  /** Seconds since the sequence started (monotonic, for ambient motion). */
  t: number;
  wire: Wire;
}

export type SequenceDraw = (f: SeqFrame) => void;
