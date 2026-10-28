import type * as THREE from 'three';
import type { NodeId, ThresholdId } from '../data/types';

export type SceneKey =
  | 'bedroom'
  | 'farm'
  | 'nasa'
  | 'endurance'
  | 'saturn'
  | 'wormhole'
  | 'miller'
  | 'mann'
  | 'gargantua'
  | 'tesseract'
  | 'station'
  | 'edmunds';

export interface SceneCtx {
  renderer: THREE.WebGLRenderer;
  quality: 'high' | 'low';
  width: number;
  height: number;
}

export interface SceneAnchor {
  at: THREE.Vector3;
  label: string;
}

/** A live cinematic scene. `k` is the chapter progress (0..1) that drives the scripted camera. */
export interface SceneInstance {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Exposure for the final tone curve. */
  exposure: number;
  /** Optional bloom override. */
  bloom?: { strength: number; radius: number; threshold: number };
  /** Orbit target for free-look mode. */
  focus: THREE.Vector3;
  /** Optional labelled points of interest (free-look annotations). */
  anchors?: SceneAnchor[];
  update(t: number, dt: number, k: number, free: boolean): void;
  /** Optional off-screen work before the main render (e.g. half-resolution ray marching). */
  preRender?(renderer: THREE.WebGLRenderer): void;
  resize?(width: number, height: number): void;
  dispose(): void;
}

export type SceneBuilder = (ctx: SceneCtx, variant?: string) => SceneInstance;

export type TransitionKind =
  | 'dust'
  | 'sweep'
  | 'ascent'
  | 'timelapse'
  | 'lens'
  | 'tunnel'
  | 'stutter'
  | 'roll'
  | 'swirl'
  | 'horizon'
  | 'lattice'
  | 'signal'
  | 'departure';

export interface Chapter {
  id: string;
  scene: SceneKey;
  variant?: string;
  node: NodeId;
  title: string;
  /** HUD location line. */
  place: string;
  /** Camera language used in the scene. */
  view: string;
  /** Seconds at normal speed. */
  duration: number;
  captions: { at: number; text: string }[];
  telemetry: { earth: string; mission: string; note?: string };
  /** How this chapter is entered from the previous one. */
  enter?: { kind: TransitionKind; label: string; threshold?: ThresholdId; duration: number };
  sound: 'drone' | 'ticks' | 'mechanical' | 'wind' | 'pulse' | 'rumble';
}
