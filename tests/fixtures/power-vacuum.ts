// Frozen engine fixture (D-44): the September 21 refresh of the retired
// power-vacuum storyline, kept byte-for-byte so structural engine,
// persistence, and import tests do not move with the daily season refresh.
// Public observed data, not team-approved projections; not shipped in the app.
import json from './power-vacuum-2026.json';
import { parseBundle, type Bundle } from '../../src/lib/contracts';

export const POWER_VACUUM_PATH = new URL('./power-vacuum-2026.json', import.meta.url);
export const powerVacuumBundle: Bundle = parseBundle(json);
