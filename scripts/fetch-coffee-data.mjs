/**
 * Build-time coffee ingest for the coffee page.
 *
 * Mirrors `scripts/fetch-ballots.mjs`: fetches data at build time and writes a static
 * JSON artifact into `src/data/` that the Astro page imports. The page never fetches
 * at runtime, so the site stays fully static.
 *
 * Source: the `io.davlin.coffee.shot` records in the site's AT Protocol repo
 * (`COFFEE_DID`, default `SITE_DID`), read through the S-03 resolver, which finds the PDS
 * from the DID. The coffee service on exe.dev writes those records from visualizer.coffee
 * and POSTs a Netlify build hook after it publishes, which is what re-runs this script.
 * This script does not call the coffee service.
 *
 * Two outcomes:
 *  - LIVE: the PDS returned at least one valid shot record -> `src/data/coffee.json`.
 *  - FALLBACK: network error, timeout, no valid records, or invalid shape -> copy the
 *    committed `src/data/coffee.seed.json` and print a warning. Coffee data never fails
 *    a build, so check the log line, not the build status, to see which one ran.
 *
 * Usage:
 *   node scripts/fetch-coffee-data.mjs
 *   COFFEE_DID=did:plc:... node scripts/fetch-coffee-data.mjs
 *   COFFEE_DID= node scripts/fetch-coffee-data.mjs   # empty string forces the seed
 *
 * @module scripts/fetch-coffee-data
 */

import { copyFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRecords, resolvePds } from '../src/lib/atproto/resolve.mjs';
import { SITE_DID } from '../src/lib/atproto/site.mjs';
import { SHOT_COLLECTION, payloadFromRecords } from '../src/lib/coffee/records.mjs';
import { isCoffeeShotsPayload } from '../src/lib/coffee/validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dataDir = join(__dirname, '..', 'src', 'data');
const outputPath = join(dataDir, 'coffee.json');
const seedPath = join(dataDir, 'coffee.seed.json');

/**
 * Reads every shot record for the DID and builds the payload.
 *
 * @param {string} did
 * @returns {Promise<{ payload: import('../src/lib/coffee/types.ts').CoffeeShotsPayload, skipped: number }>}
 */
async function fetchPayload(did) {
  const records = await listRecords(did, SHOT_COLLECTION);
  const result = payloadFromRecords(
    records.map((r) => r.value),
    new Date().toISOString()
  );
  if (result.payload.shots.length === 0) {
    throw new Error(`no valid ${SHOT_COLLECTION} records (${records.length} listed)`);
  }
  if (!isCoffeeShotsPayload(result.payload)) {
    throw new Error('records did not map to a CoffeeShotsPayload');
  }
  return result;
}

async function main() {
  const did = process.env.COFFEE_DID ?? SITE_DID;

  if (did === '') {
    copyFileSync(seedPath, outputPath);
    console.log('COFFEE_DID is empty; wrote src/data/coffee.json from the seed snapshot');
    return;
  }

  try {
    const { payload, skipped } = await fetchPayload(did);
    writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
    console.log(
      `Fetched ${payload.shots.length} coffee shots from ${SHOT_COLLECTION} records on ${await resolvePds(did)} (latest ${payload.latestShotAt ?? 'none'}${skipped > 0 ? `, ${skipped} invalid records skipped` : ''})`
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
