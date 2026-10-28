import { useSyncExternalStore } from 'react';

/**
 * BACKGROUND MUSIC
 * Plays one looping track behind the whole site, with a fade in/out and a persistent on/off preference.
 *
 * Source, in order:
 *  1. `public/audio/cornfield-chase.mp3` in the local project (the owner's own copy; git-ignored);
 *  2. a file the visitor chose earlier with the music button, kept in this browser (IndexedDB);
 *  3. nothing yet — the music button then asks for a file.
 * Browsers block audio until the first click or key press, so playback starts on the first interaction.
 */

export const MUSIC_TITLE = 'Cornfield Chase';
export const MUSIC_ARTIST = 'Hans Zimmer';
const BUNDLED_URL = './audio/cornfield-chase.mp3';
const PREF_KEY = 'interstellar.music.enabled';
const DB = 'interstellar-atlas';
const STORE = 'music';
const VOLUME = 0.55;
const DUCKED = 0.28;

export type MusicSource = 'checking' | 'bundled' | 'browser' | 'none';

export interface MusicState {
  /** The visitor's preference (persisted). */
  enabled: boolean;
  /** Actually audible right now. */
  playing: boolean;
  /** Enabled but waiting for the first interaction (autoplay policy). */
  waiting: boolean;
  source: MusicSource;
  fileName: string | null;
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
    /* storage unavailable: preference lasts for this visit only */
  }
}

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE);
      open.onerror = () => resolve(undefined);
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      };
    } catch {
      resolve(undefined);
    }
  });
}

class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private listeners = new Set<() => void>();
  private raf = 0;
  private ducked = false;
  private initialised = false;
  state: MusicState = { enabled: readPref(), playing: false, waiting: false, source: 'checking', fileName: null };

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Locate a source and arm playback on the first user gesture. Safe to call more than once. */
  async init() {
    if (this.initialised || typeof window === 'undefined') return;
    this.initialised = true;
    const gesture = (e: Event) => {
      // The music button handles its own clicks.
      if ((e.target as Element | null)?.closest?.('[data-music-toggle]')) return;
      if (this.state.enabled && this.state.waiting) void this.play();
    };
    window.addEventListener('pointerdown', gesture, { capture: true });
    window.addEventListener('keydown', gesture, { capture: true });

    let src: MusicSource = 'none';
    let url: string | null = null;
    let fileName: string | null = null;
    try {
      const res = await fetch(BUNDLED_URL, { method: 'HEAD' });
      const type = res.headers.get('content-type') ?? '';
      if (res.ok && !type.includes('text/html')) {
        src = 'bundled';
        url = BUNDLED_URL;
      }
    } catch {
      /* not bundled */
    }
    if (src === 'none') {
      const saved = await idb<{ blob: Blob; name: string }>('readonly', (s) => s.get('track'));
      if (saved?.blob) {
        src = 'browser';
        url = this.objectUrl = URL.createObjectURL(saved.blob);
        fileName = saved.name;
      }
    }
    this.set({ source: src, fileName });
    if (url) {
      this.attach(url);
      if (this.state.enabled) void this.play();
    }
  }

  private attach(url: string) {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = 0;
      this.audio.addEventListener('pause', () => this.set({ playing: false }));
      this.audio.addEventListener('playing', () => this.set({ playing: true, waiting: false }));
    }
    this.audio.src = url;
  }

  private target() {
    return this.ducked ? DUCKED : VOLUME;
  }

  private fadeTo(v: number, ms: number, done?: () => void) {
    const a = this.audio;
    if (!a) return;
    cancelAnimationFrame(this.raf);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (v - from) * (k * k * (3 - 2 * k))));
      if (k < 1) this.raf = requestAnimationFrame(step);
      else done?.();
    };
    this.raf = requestAnimationFrame(step);
  }

  private async play() {
    const a = this.audio;
    if (!a) return;
    try {
      await a.play();
      if (!this.state.enabled) {
        a.pause();
        return;
      }
      this.set({ playing: true, waiting: false });
      this.fadeTo(this.target(), 2200);
    } catch {
      // Autoplay blocked: start on the next click or key press.
      this.set({ waiting: true, playing: false });
    }
  }

  private pause() {
    const a = this.audio;
    this.set({ waiting: false, playing: false });
    if (!a || a.paused) return;
    this.fadeTo(0, 700, () => {
      if (!this.state.enabled) a.pause();
    });
  }

  /** The music button. Opens a file picker if there is nothing to play yet. */
  toggle() {
    if (this.state.source === 'none') {
      this.chooseFile();
      return;
    }
    const enabled = !this.state.enabled;
    writePref(enabled);
    this.set({ enabled });
    if (enabled) void this.play();
    else this.pause();
  }

  /** Let the visitor pick an audio file; it stays in this browser only. */
  chooseFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.mp3,.m4a,.ogg,.wav';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void idb('readwrite', (s) => s.put({ blob: file, name: file.name }, 'track'));
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = URL.createObjectURL(file);
      this.attach(this.objectUrl);
      writePref(true);
      this.set({ source: 'browser', fileName: file.name, enabled: true });
      void this.play();
    };
    input.click();
  }

  /** Lower the music while the synthesised sound effects are playing. */
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
