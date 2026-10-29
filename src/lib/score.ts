/**
 * AMBIENT SCORE — an original generative piece synthesised live with Web Audio.
 * Used as the background music wherever the owner's own track is not available (e.g. hosted previews).
 *
 * Material (original): slow organ chords in D minor — Dm(add9) · B♭maj7 · Gm9 · A7sus4 → A —
 * two bars each at 64 BPM, a soft bass, and a sparse bell arpeggio that enters
 * after four bars and changes register each pass. Long generated reverb. No samples, no recordings.
 */

const BPM = 64;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// MIDI note numbers per chord: pad voices, bass root, arpeggio tones.
const CHORDS: { pad: number[]; bass: number; arp: number[] }[] = [
  { pad: [50, 57, 64, 65], bass: 38, arp: [62, 65, 69, 74, 76] }, // Dm(add9)
  { pad: [46, 57, 62, 65], bass: 34, arp: [62, 65, 69, 70, 74] }, // B♭maj7
  { pad: [43, 58, 62, 69], bass: 31, arp: [62, 65, 67, 69, 74] }, // Gm9
  { pad: [45, 55, 62, 64], bass: 33, arp: [62, 64, 67, 69, 74] }, // A7sus4
  { pad: [50, 57, 62, 65], bass: 38, arp: [62, 65, 69, 72, 74] }, // Dm
  { pad: [46, 53, 62, 67], bass: 34, arp: [62, 65, 67, 70, 74] }, // B♭(add6)
  { pad: [48, 55, 64, 67], bass: 36, arp: [60, 64, 67, 71, 72] }, // Cmaj7
  { pad: [45, 57, 61, 64], bass: 33, arp: [61, 64, 69, 73, 76] }, // A
];
const ARP = [0, 2, 1, 3, 2, 4, 3, 1];

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function impulse(ac: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export class AmbientScore {
  private ac: AudioContext | null = null;
  private out: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer = 0;
  private next = 0;
  private bar = 0;
  private running = false;

  /** Start (or resume). Resolves false if the browser is still blocking audio. */
  async start(): Promise<boolean> {
    try {
      if (!this.ac) this.build();
      const ac = this.ac!;
      await ac.resume();
      if (ac.state !== 'running') return false;
      if (!this.running) {
        this.running = true;
        this.next = ac.currentTime + 0.1;
        this.timer = window.setInterval(() => this.schedule(), 200);
        this.schedule();
      }
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.running = false;
    window.clearInterval(this.timer);
    void this.ac?.suspend();
  }

  setVolume(v: number) {
    if (this.out && this.ac) this.out.gain.setTargetAtTime(v, this.ac.currentTime, 0.04);
  }

  private build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    this.ac = ac;
    const out = ac.createGain();
    out.gain.value = 0;
    out.connect(ac.destination);
    this.out = out;
    // Dry + long reverb.
    const bus = ac.createGain();
    bus.gain.value = 2.6;
    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    bus.connect(tone);
    const dry = ac.createGain();
    dry.gain.value = 0.55;
    const verb = ac.createConvolver();
    verb.buffer = impulse(ac, 5.5, 2.6);
    const wet = ac.createGain();
    wet.gain.value = 0.75;
    tone.connect(dry).connect(out);
    tone.connect(verb).connect(wet).connect(out);
    this.bus = bus;
  }

  private schedule() {
    const ac = this.ac;
    if (!ac || !this.running) return;
    while (this.next < ac.currentTime + 1.2) {
      this.playBar(this.bar, this.next);
      this.next += BAR;
      this.bar++;
    }
  }

  private playBar(bar: number, t: number) {
    const cycle = Math.floor(bar / (CHORDS.length * 2));
    const ci = Math.floor(bar / 2) % CHORDS.length;
    const ch = CHORDS[ci];
    const first = bar % 2 === 0;
    if (first) {
      ch.pad.forEach((m, i) => this.organ(hz(m), t, BAR * 2 + 0.4, 0.075 - i * 0.008));
      this.bassNote(hz(ch.bass), t, BAR * 2);
    }
    // The bell arpeggio enters after four bars and rests on every fourth bar.
    if (bar < 4 || bar % 4 === 3) return;
    const up = cycle % 2 === 0 ? 12 : 0;
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 1 && (bar + i) % 3 === 0) continue; // breathing room
      const m = ch.arp[ARP[i]] + up;
      const vel = 0.075 * (i % 4 === 0 ? 1 : 0.7) * (0.85 + Math.random() * 0.3);
      this.bell(hz(m), t + i * (BEAT / 2) + (Math.random() - 0.5) * 0.012, vel);
    }
  }

  private env(g: GainNode, t: number, a: number, dur: number, r: number, peak: number) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - r));
    g.gain.linearRampToValueAtTime(0, t + dur + r);
  }

  /** Soft pipe-organ voice: a few sine partials with a slow swell and gentle vibrato. */
  private organ(f: number, t: number, dur: number, amp: number) {
    const ac = this.ac!;
    const g = ac.createGain();
    this.env(g, t, 2.2, dur, 2.6, amp);
    g.connect(this.bus!);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 4.6;
    const lfoAmt = ac.createGain();
    lfoAmt.gain.value = f * 0.0018;
    lfo.connect(lfoAmt);
    [
      [1, 1],
      [2, 0.38],
      [3, 0.12],
      [4, 0.08],
    ].forEach(([mult, a]) => {
      const o = ac.createOscillator();
      o.frequency.value = f * mult;
      lfoAmt.connect(o.frequency);
      const pg = ac.createGain();
      pg.gain.value = a;
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + dur + 3);
    });
    lfo.start(t);
    lfo.stop(t + dur + 3);
  }

  private bassNote(f: number, t: number, dur: number) {
    const ac = this.ac!;
    const g = ac.createGain();
    this.env(g, t, 1.5, dur, 2, 0.09);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g).connect(this.bus!);
    o.start(t);
    o.stop(t + dur + 2.5);
  }

  /** Glassy bell: sine + bright partial, exponential decay. */
  private bell(f: number, t: number, amp: number) {
    const ac = this.ac!;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    g.connect(this.bus!);
    [
      [1, 1],
      [2.01, 0.25],
      [3.98, 0.06],
    ].forEach(([mult, a]) => {
      const o = ac.createOscillator();
      o.frequency.value = f * mult;
      const pg = ac.createGain();
      pg.gain.value = a;
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + 2.5);
    });
  }
}
