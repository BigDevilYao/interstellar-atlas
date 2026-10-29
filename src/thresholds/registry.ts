import type { ThresholdId } from '../data/types';
import { drawBedroomTesseract } from './sequences/bedroomTesseract';
import { drawEarthEndurance } from './sequences/earthEndurance';
import { drawEnduranceMiller } from './sequences/enduranceMiller';
import { drawFarmNasa } from './sequences/farmNasa';
import { drawGargantuaBranch } from './sequences/gargantuaBranch';
import { drawInformationLoop } from './sequences/informationLoop';
import { drawMannDocking } from './sequences/mannDocking';
import { drawMillerMann } from './sequences/millerMann';
import type { SequenceDraw } from './types';

/** Every threshold has its own renderer — no generic fade. */
export const SEQUENCES: Record<ThresholdId, SequenceDraw> = {
  'farm-nasa': drawFarmNasa,
  'bedroom-tesseract': drawBedroomTesseract,
  'earth-endurance': drawEarthEndurance,
  'endurance-miller': drawEnduranceMiller,
  'miller-mann': drawMillerMann,
  'mann-docking': drawMannDocking,
  'gargantua-branch': drawGargantuaBranch,
  'information-loop': drawInformationLoop,
};
