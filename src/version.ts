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
