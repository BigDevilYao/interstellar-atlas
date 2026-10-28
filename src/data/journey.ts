import type { JourneyStep } from './types';

/** The guided narrative route through the atlas. */
export const JOURNEY: JourneyStep[] = [
  {
    kind: 'node',
    node: 'farm',
    title: 'I · The farm',
    caption: 'A dust-choked landscape. The baseline of human scale against which every later space is measured.',
  },
  {
    kind: 'node',
    node: 'bedroom',
    title: 'II · The bedroom',
    caption: 'The most ordinary room in the film, and the most connected one. Books fall. Dust settles in lines.',
  },
  { kind: 'threshold', threshold: 'farm-nasa', title: 'III · Following the coordinates', caption: 'Information becomes direction.' },
  { kind: 'threshold', threshold: 'earth-endurance', title: 'IV · Leaving the ground', caption: 'A change of scale rather than of place.' },
  { kind: 'node', node: 'endurance', title: 'V · Endurance', caption: 'A rotating ring of modules — the portable architecture of the mission.' },
  {
    kind: 'threshold',
    threshold: 'endurance-miller',
    title: 'VI · Saturn and the fold',
    caption: 'Transit, landmark, fold and descent.',
  },
  { kind: 'threshold', threshold: 'miller-mann', title: 'VII · The price of time', caption: 'One hour on the ocean, seven years elsewhere.' },
  { kind: 'threshold', threshold: 'mann-docking', title: 'VIII · Docking', caption: 'Geometry as survival.' },
  { kind: 'node', node: 'gargantua', title: 'IX · Gargantua', caption: 'The field that shapes every trajectory around it.' },
  { kind: 'threshold', threshold: 'gargantua-branch', title: 'X · Two trajectories', caption: 'One route falls inward, one is flung outward.' },
  {
    kind: 'threshold',
    threshold: 'bedroom-tesseract',
    reverse: true,
    title: 'XI · The Tesseract',
    caption: 'Seen from inside, the lattice resolves back into the bedroom.',
  },
  {
    kind: 'threshold',
    threshold: 'information-loop',
    title: 'XII · The message',
    caption: 'Gravity carries the data; Murph decodes it; humanity leaves Earth.',
  },
  { kind: 'node', node: 'station', title: 'XIII · Cooper Station', caption: 'The farm returns, curved overhead. Cooper leaves again.' },
];
