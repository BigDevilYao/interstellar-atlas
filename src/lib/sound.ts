import type { Threshold } from '../data/types';

/**
 * Original synthesised sound bridges (Web Audio). No recorded or licensed audio is used.
 * Each threshold has a character: drone, ticks, mechanical, wind, pulse, rumble.
 */
export class SoundBridge {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: number[] = [];

  start(kind: Threshold['sound'], durationSec: number): void {
    this.stop();
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ac = new AC();
    } catch {
      return;
    }
    const ac = this.ac;
    const master = ac.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.16, ac.currentTime + 1.2);
    master.connect(ac.destination);
    this.master = master;

    const drone = (freq: number, gain: number, type: OscillatorType = 'sine') => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g).connect(master);
      o.start();
      this.nodes.push(o, g);
      return o;
    };
    const noise = (gain: number, lowpass: number) => {
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      const g = ac.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(master);
      src.start();
      this.nodes.push(src, f, g);
      return f;
    };
    const click = (freq: number, gain: number, len = 0.03) => {
      if (!this.ac || !this.master) return;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + len);
      o.connect(g).connect(this.master);
      o.start();
      o.stop(ac.currentTime + len + 0.02);
    };

    switch (kind) {
      case 'drone': {
        drone(55, 0.5);
        drone(82.4, 0.25);
        const o = drone(110.3, 0.12, 'triangle');
        o.detune.value = 6;
        break;
      }
      case 'ticks': {
        drone(49, 0.35);
        // ≈1.25 s interval, an original ticking motif for time dilation.
        const id = window.setInterval(() => click(1800, 0.35, 0.025), 1250);
        this.timers.push(id);
        break;
      }
      case 'mechanical': {
        drone(41, 0.4, 'sawtooth');
        noise(0.15, 380);
        const id = window.setInterval(() => click(220 + Math.random() * 80, 0.25, 0.06), 420);
        this.timers.push(id);
        break;
      }
      case 'wind': {
        const f = noise(0.55, 600);
        let t = 0;
        const id = window.setInterval(() => {
          t += 0.1;
          f.frequency.value = 450 + Math.sin(t) * 250;
        }, 100);
        this.timers.push(id);
        break;
      }
      case 'pulse': {
        drone(73.4, 0.35);
        drone(110, 0.15);
        const id = window.setInterval(() => click(660, 0.12, 0.12), 900);
        this.timers.push(id);
        break;
      }
      case 'rumble': {
        noise(0.7, 160);
        drone(36.7, 0.5);
        break;
      }
    }
    // Fade out near the end.
    const end = window.setTimeout(() => this.fade(), Math.max(0, durationSec - 1.5) * 1000);
    this.timers.push(end);
  }

  fade(): void {
    if (this.ac && this.master) {
      this.master.gain.cancelScheduledValues(this.ac.currentTime);
      this.master.gain.linearRampToValueAtTime(0, this.ac.currentTime + 1.2);
    }
  }

  stop(): void {
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    this.nodes.forEach((n) => {
      try {
        (n as OscillatorNode).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    });
    this.nodes = [];
    if (this.ac) {
      this.ac.close().catch(() => undefined);
      this.ac = null;
    }
    this.master = null;
  }

  pause(): void {
    this.ac?.suspend().catch(() => undefined);
  }
  resume(): void {
    this.ac?.resume().catch(() => undefined);
  }
}
