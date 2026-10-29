import { useSyncExternalStore } from 'react';
import { AmbientScore } from './score';

/**
 * BACKGROUND MUSIC — one looping track behind the whole site, with fades and a remembered on/off switch.
 *
 * Source, in order:
 *  1. a track embedded in a standalone copy of the site (window.__ATLAS_MUSIC_B64__);
 *  2. `public/audio/cornfield-chase.mp3` in the local project (the owner's own copy; git-ignored);
 *  3. an original ambient score synthesised in the browser (used on hosted previews).
 * Browsers block audio until the first click or key press, so playback starts on the first interaction.
 */

const BUNDLED_URL = './audio/cornfield-chase.mp3';
const PREF_KEY = 'interstellar.music.enabled';
const VOLUME = 0.55;
const DUCKED = 0.28;

export type MusicSource = 'checking' | 'track' | 'score';

export interface MusicState {
  /** The visitor's preference (persisted). */
  enabled: boolean;
  /** Audible right now. */
  playing: boolean;
  /** Enabled, waiting for the first interaction (autoplay policy). */
  waiting: boolean;
  source: MusicSource;
  /** What is playing, for the tooltip. */
  title: string;
}

declare global {
  interface Window {
    __ATLAS_MUSIC_B64__?: string;
    __ATLAS_MUSIC_TITLE__?: string;
  }
}

function readPref(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

function writePref(v: boolean) {
  try {
    localStorage.setItem(PREF_KEY, v ? '1' : '0');
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
}

interface Track {
  start(): Promise<boolean>;
  stop(): void;
  setVolume(v: number): void;
}

function audioTrack(url: string): Track {
  const a = new Audio();
  a.loop = true;
  a.preload = 'auto';
  a.volume = 0;
  a.src = url;
  return {
    async start() {
      try {
        await a.play();
        return true;
      } catch {
        return false;
      }
    },
    stop: () => a.pause(),
    setVolume: (v) => {
      a.volume = Math.max(0, Math.min(1, v));
    },
  };
}

function embeddedUrl(): string | null {
  const b64 = typeof window !== 'undefined' ? window.__ATLAS_MUSIC_B64__ : undefined;
  if (!b64) return null;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  } catch {
    return null;
  }
}

class MusicPlayer {
  private track: Track | null = null;
  private listeners = new Set<() => void>();
  private raf = 0;
  private vol = 0;
  private ducked = false;
  private initialised = false;
  state: MusicState = { enabled: readPref(), playing: false, waiting: false, source: 'checking', title: '' };

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  async init() {
    if (this.initialised || typeof window === 'undefined') return;
    this.initialised = true;
    const gesture = (e: Event) => {
      if ((e.target as Element | null)?.closest?.('[data-music-toggle]')) return;
      if (this.state.enabled && !this.state.playing) void this.play();
    };
    window.addEventListener('pointerdown', gesture, { capture: true });
    window.addEventListener('keydown', gesture, { capture: true });

    let url = embeddedUrl();
    let title = window.__ATLAS_MUSIC_TITLE__ ?? 'Cornfield Chase · Hans Zimmer';
    if (!url) {
      try {
        const res = await fetch(BUNDLED_URL, { method: 'HEAD' });
        const type = res.headers.get('content-type') ?? '';
        if (res.ok && !type.includes('text/html')) url = BUNDLED_URL;
      } catch {
        /* not available */
      }
    }
    if (url) {
      this.track = audioTrack(url);
      this.set({ source: 'track', title });
    } else {
      title = 'Ambient score · original';
      this.track = new AmbientScore();
      this.set({ source: 'score', title });
    }
    if (this.state.enabled) void this.play();
  }

  private target() {
    return this.ducked ? DUCKED : VOLUME;
  }

  private fadeTo(v: number, ms: number, done?: () => void) {
    const t = this.track;
    if (!t) return;
    cancelAnimationFrame(this.raf);
    const from = this.vol;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      this.vol = from + (v - from) * (k * k * (3 - 2 * k));
      t.setVolume(this.vol);
      if (k < 1) this.raf = requestAnimationFrame(step);
      else done?.();
    };
    this.raf = requestAnimationFrame(step);
  }

  private async play() {
    const t = this.track;
    if (!t) return;
    const ok = await t.start();
    if (!this.state.enabled) {
      t.stop();
      return;
    }
    if (!ok) {
      this.set({ waiting: true, playing: false });
      return;
    }
    this.set({ playing: true, waiting: false });
    this.fadeTo(this.target(), 2200);
  }

  private pause() {
    this.set({ playing: false, waiting: false });
    this.fadeTo(0, 700, () => {
      if (!this.state.enabled) this.track?.stop();
    });
  }

  /** The sound switch. */
  toggle() {
    const enabled = !this.state.enabled;
    writePref(enabled);
    this.set({ enabled });
    if (enabled) void this.play();
    else this.pause();
  }

  /** Lower the music while the synthesised sound effects play. */
  setDuck(on: boolean) {
    if (this.ducked === on) return;
    this.ducked = on;
    if (this.state.playing) this.fadeTo(this.target(), 900);
  }
}

export const music = new MusicPlayer();

export function useMusic(): MusicState {
  return useSyncExternalStore(music.subscribe, () => music.state, () => music.state);
}
