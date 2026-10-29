import { buildBedroom } from './scenes/bedroom';
import { buildEdmunds } from './scenes/edmunds';
import { buildEndurance } from './scenes/endurance';
import { buildFarm } from './scenes/farm';
import { buildGargantua } from './scenes/gargantua';
import { buildMann } from './scenes/mann';
import { buildMiller } from './scenes/miller';
import { buildNasa } from './scenes/nasa';
import { buildSaturn } from './scenes/saturn';
import { buildStation } from './scenes/station';
import { buildTesseract } from './scenes/tesseract';
import { buildWormhole } from './scenes/wormhole';
import type { SceneBuilder, SceneKey } from './types';

/** Scene builders by key. */
export const SCENE_BUILDERS: Record<SceneKey, SceneBuilder> = {
  bedroom: buildBedroom,
  farm: buildFarm,
  nasa: buildNasa,
  endurance: buildEndurance,
  saturn: buildSaturn,
  wormhole: buildWormhole,
  miller: buildMiller,
  mann: buildMann,
  gargantua: buildGargantua,
  tesseract: buildTesseract,
  station: buildStation,
  edmunds: buildEdmunds,
};
