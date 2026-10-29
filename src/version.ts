/**
 * Revision history. Each revision is kept as its own private preview page so earlier
 * versions stay reviewable; the in-app version badge and the Revisions page read this list.
 */
export interface Revision {
  id: string;
  date: string;
  title: string;
  url: string;
  notes: string[];
}

/** Private page that lists every revision. */
export const REVISIONS_URL = 'https://claude.ai/artifact/1qXKYVF8pUWoBZ9azihLx6';

export const REVISIONS: Revision[] = [
  {
    id: 'v0.6',
    date: '2026-10-28',
    title: 'Add your own music',
    url: 'https://claude.ai/artifact/C5YVncYaT7yANSJVPT2PiZ',
    notes: [
      'The top-right music button is back to the v0.4 behaviour: “Add music” lets you choose your own track once; after that it is a Music on / off switch.',
      'The chosen file stays in your browser and is remembered on this page. Music fades in on the first click and dips under the FX sounds; key M toggles it.',
      'Everything else as in v0.5 (no version label on the homepage). The original ambient score is removed.',
    ],
  },
  {
    id: 'v0.5',
    date: '2026-10-28',
    title: 'Sound switch',
    url: 'https://claude.ai/artifact/9b1bGLCVLGcMSUx1ZUXerX',
    notes: [
      'The version label is removed from the homepage (the version now shows only in the browser tab and on this page).',
      '“Add music” is replaced by a plain Sound on / off switch — no file to choose. The choice is remembered.',
      'Cornfield Chase plays automatically in the local project and in the standalone file interstellar-v0.5-with-music.html (music built in, opens offline).',
      'This hosted page does not carry the commercial recording; here the switch plays an original ambient score generated in the browser.',
    ],
  },
  {
    id: 'v0.4',
    date: '2026-10-28',
    title: 'Background music',
    url: 'https://claude.ai/artifact/U7tGqvFBsNJvT1v7eWmZJJ',
    notes: [
      'Background music (“Cornfield Chase”) with a Music on/off switch: in the top bar, in the cinema controls and in the threshold player. Keyboard: M.',
      'The choice is remembered. Music fades in on the first click (browsers block sound before that) and dips while the sound effects play.',
      'In the local project the track plays from public/audio/cornfield-chase.mp3 (git-ignored). On this hosted preview the track is not uploaded: press “Add music” once and choose your copy — it stays in your browser.',
      'The synthesised sound-effects switch is now labelled FX.',
    ],
  },
  {
    id: 'v0.3',
    date: '2026-10-28',
    title: 'The watch',
    url: 'https://claude.ai/artifact/7JeXykKpg6nzqQMEoAZ3nR',
    notes: [
      'Chapter 12 · The Watch: the glowing sphere is replaced by a modelled wristwatch (steel case, dial, hands, crown, leather strap).',
      'The watch story is animated in 3D: gravity pulses across time, the second hand holds for long and short intervals, dots and dashes ring the dial and decode letter by letter, the code becomes quantum data, and the data becomes the habitat solution.',
      'Chapter 1 uses the same watch, keeping normal time.',
      'Version badge and Revisions page added.',
    ],
  },
  {
    id: 'v0.2',
    date: '2026-10-28',
    title: 'Cinematic journey',
    url: 'https://claude.ai/artifact/33wSkTG2TjSMJhxTwFbzdH',
    notes: [
      'Homepage entry “Begin the journey · Chapter 01 · Murph’s Room”.',
      '14 chapters rendered as lit 3D scenes with 13 unique threshold transitions.',
      'Sci-fi HUD: telemetry, subtitles, chapter ticks, minimap, free look.',
    ],
  },
  {
    id: 'v0.1',
    date: '2026-10-28',
    title: 'Line style',
    url: 'https://claude.ai/artifact/LYCpFevn1rMfJkZJ4LB76C',
    notes: ['Spherical World Map, line-drawing thresholds and scenes, Guided Journey, Analysis mode.'],
  },
];

export const CURRENT = REVISIONS[0];
