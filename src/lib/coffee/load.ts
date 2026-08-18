/**
 * Build-time loader for the coffee payload.
 *
 * `scripts/fetch-coffee-data.mjs` writes `src/data/coffee.json` during `pnpm build`.
 * That file is a gitignored artifact, so `astro check`, `astro dev`, and unit tests may
 * run without it. This loader reads the artifact when present and valid, and falls back
 * to the committed `src/data/coffee.seed.json` otherwise.
 */
import { existsSync, readFileSync } from 'node:fs';
import seed from '../../data/coffee.seed.json';
import type { CoffeeShotsPayload } from './types';
import { isCoffeeShotsPayload } from './validate.mjs';

const ARTIFACT = new URL('../../data/coffee.json', import.meta.url);

export function loadCoffeePayload(): CoffeeShotsPayload {
  if (existsSync(ARTIFACT)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(ARTIFACT, 'utf8'));
      if (isCoffeeShotsPayload(parsed)) return parsed;
      console.warn('src/data/coffee.json is not a CoffeeShotsPayload; using the seed snapshot');
    } catch (error) {
      console.warn(`src/data/coffee.json unreadable (${String(error)}); using the seed snapshot`);
    }
  }
  return seed;
}
