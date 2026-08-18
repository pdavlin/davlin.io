/**
 * Build-time coffee ingest for the coffee page.
 *
 * Mirrors `scripts/fetch-ballots.mjs`: fetches data at build time and writes a static
 * JSON artifact into `src/data/` that the Astro page imports. The page never fetches
 * at runtime, so the site stays fully static.
 *
 * Source: the coffee service on exe.dev (`COFFEE_DATA_URL`, default
 * `https://pd-coffee.exe.xyz/api/coffee/shots.json`). That service syncs shots from the
 * visualizer.coffee API and POSTs a Netlify build hook when new shots land, which is
 * what re-runs this script.
 *
 * Two outcomes:
 *  - LIVE: the endpoint answered with a valid payload -> `src/data/coffee.json`.
 *  - FALLBACK: network error, timeout, non-2xx, or invalid shape -> copy the committed
 *    `src/data/coffee.seed.json` and print a warning. Coffee data never fails a build.
 *
 * Usage:
 *   node scripts/fetch-coffee-data.mjs
 *   COFFEE_DATA_URL=http://localhost:8080/api/coffee/shots.json node scripts/fetch-coffee-data.mjs
 *   COFFEE_DATA_URL= node scripts/fetch-coffee-data.mjs   # empty string forces the seed
 *
 * @module scripts/fetch-coffee-data
 */

import { copyFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCoffeeShotsPayload } from '../src/lib/coffee/validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_URL = 'https://pd-coffee.exe.xyz/api/coffee/shots.json';
const TIMEOUT_MS = 10_000;

const dataDir = join(__dirname, '..', 'src', 'data');
const outputPath = join(dataDir, 'coffee.json');
const seedPath = join(dataDir, 'coffee.seed.json');

/**
 * Fetches and validates the shots payload from the coffee service.
 *
 * @param {string} url - Endpoint returning `CoffeeShotsPayload` JSON.
 * @returns {Promise<import('../src/lib/coffee/types.ts').CoffeeShotsPayload>}
 */
async function fetchPayload(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const body = await response.json();
    if (!isCoffeeShotsPayload(body)) {
      throw new Error('response did not match CoffeeShotsPayload');
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const url = process.env.COFFEE_DATA_URL ?? DEFAULT_URL;

  if (url === '') {
    copyFileSync(seedPath, outputPath);
    console.log('COFFEE_DATA_URL is empty; wrote src/data/coffee.json from the seed snapshot');
    return;
  }

  try {
    const payload = await fetchPayload(url);
    writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
    console.log(
      `Fetched ${payload.shots.length} coffee shots from ${url} (latest ${payload.latestShotAt ?? 'none'})`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `WARNING: coffee fetch failed (${message}); falling back to src/data/coffee.seed.json`
    );
    copyFileSync(seedPath, outputPath);
  }
}

main();
