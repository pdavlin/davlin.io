/**
 * Build-time ballot ingest for the twin-predictions dashboard.
 *
 * Mirrors `scripts/fetch-coffee-data.js`: reads credentials from the environment,
 * fetches the data, and writes a static JSON artifact into `src/data/` that the Astro
 * page imports at build time. The React island never fetches at runtime, so the
 * Airtable API key (inlined into client JS by `astro.config.mjs`'s `vite.define`)
 * never has a path to leak — this script is the ONLY place the key is read.
 *
 * Two source modes:
 *  - LIVE: when `AIRTABLE_API_KEY` is set, fetch the ballots table via the `airtable`
 *    npm client (the same client `fetch-coffee-data.js` uses).
 *  - OFFLINE: when the key is unset, read the corrected seed CSV
 *    (`scripts/twin-predictions.seed.csv`). This keeps the build working without
 *    network access or secrets (CI, local, first-run).
 *
 * BOTH modes run the same `validateBallots` gate before normalizing, so a
 * column-shifted / malformed row fails the build loudly in either source.
 *
 * Usage:
 *   AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... node scripts/fetch-ballots.mjs   # live
 *   node scripts/fetch-ballots.mjs                                             # offline
 *
 * @module scripts/fetch-ballots
 */

import Airtable from 'airtable';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, parseBirthDate } from '../src/lib/twin-predictions/normalize.mjs';
import { validateBallots } from '../src/lib/twin-predictions/validate.mjs';
import { fetchActualsIfRevealed } from './fetch-actuals.mjs';
import { score } from '../src/lib/twin-predictions/score.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default Airtable table name; override with `AIRTABLE_BALLOTS_TABLE`. */
const DEFAULT_TABLE = 'Ballots';

/** Header columns expected in the seed CSV, in order. */
const CSV_HEADER = [
  'ballot_id',
  'guest_name',
  'birth_date',
  'girl_wt_lb',
  'girl_wt_oz',
  'boy_wt_lb',
  'boy_wt_oz',
  'girl_len_in',
  'boy_len_in',
  'born_first',
  'dad_faints',
  'mom_yells',
];

/**
 * Parses one CSV line into fields, honoring double-quoted segments so a quoted comma
 * would not split a field. The seed data has no embedded commas, but this keeps the
 * parser correct if a future name needs quoting.
 *
 * @param {string} line - A single CSV row.
 * @returns {string[]} The parsed field values.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((value) => value.trim());
}

/**
 * Reads and parses the offline seed CSV into raw ballot objects keyed by header name.
 *
 * @returns {Record<string, string>[]} Raw ballot rows.
 */
function readSeedCsv() {
  const csvPath = join(__dirname, 'twin-predictions.seed.csv');
  const text = readFileSync(csvPath, 'utf8');
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const [, ...dataLines] = lines; // discard the header row; we use the known schema

  return dataLines.map((line) => {
    const values = parseCsvLine(line);
    /** @type {Record<string, string>} */
    const row = {};
    for (const [index, key] of CSV_HEADER.entries()) {
      row[key] = values[index] ?? '';
    }
    return row;
  });
}

/**
 * Fetches the ballots table from Airtable via the `airtable` client.
 *
 * @param {string} apiKey - Airtable API key (build env only).
 * @param {string} baseId - Airtable base id.
 * @param {string} table - Table name to read.
 * @returns {Promise<Record<string, unknown>[]>} Raw ballot field objects.
 */
async function fetchFromAirtable(apiKey, baseId, table) {
  const base = new Airtable({ apiKey }).base(baseId);
  const records = await base(table).select().all();
  return records.map((record) => ({ ...record.fields }));
}

/**
 * Loads raw ballots from whichever source is configured (Airtable or seed CSV).
 *
 * @returns {Promise<{ rows: Record<string, unknown>[], source: string }>}
 */
async function loadRawBallots() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  // Twin-predictions lives in its own base; fall back to the shared base id.
  const baseId = process.env.AIRTABLE_TWIN_BASE_ID || process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_BALLOTS_TABLE || DEFAULT_TABLE;

  if (apiKey) {
    if (!baseId) {
      throw new Error(
        'AIRTABLE_API_KEY is set but no base id found. Set AIRTABLE_TWIN_BASE_ID (or AIRTABLE_BASE_ID) in the build env, or unset the key to build from the offline seed CSV.'
      );
    }
    try {
      const rows = await fetchFromAirtable(apiKey, baseId, table);
      return { rows, source: `Airtable table "${table}"` };
    } catch (error) {
      // Non-fatal: a live-fetch failure (Airtable down, table renamed, token
      // revoked) must not break the whole davlin.io deploy. Fall back to the
      // committed seed CSV and warn loudly instead of throwing.
      console.warn(
        `WARNING: Airtable ballot fetch failed — ${error.message}. Falling back to the committed seed CSV; the predictions page may be stale.`
      );
    }
  }

  return { rows: readSeedCsv(), source: 'offline seed CSV' };
}

async function main() {
  const { rows, source } = await loadRawBallots();

  // Build-time gate: reject malformed rows before they reach the page.
  validateBallots(rows);

  // Sort by ballot id so live (Airtable, unsorted) and offline (seed CSV) builds
  // emit byte-identical JSON and the raw table renders in a stable order.
  const ballots = normalize(rows).sort((a, b) => a.id - b.id);
  const outputPath = join(__dirname, '..', 'src', 'data', 'twin-predictions-ballots.json');
  writeFileSync(outputPath, `${JSON.stringify(ballots, null, 2)}\n`);

  console.log(`Wrote ${ballots.length} ballots from ${source} to ${outputPath}`);

  await buildLeaderboard(ballots);
}

/**
 * Reveal-gated leaderboard step. When `REVEAL=true`, fetch the actuals, score the
 * ballots, and write `src/data/twin-predictions-leaderboard.json`. When reveal is off,
 * write nothing AND delete any stale leaderboard file, so a prior reveal build can never
 * leak actuals-derived data into a subsequent reveal-off build (the FETCH-gating
 * guarantee extends to cleaning up the artifact).
 *
 * The actuals' `birth_date` is normalized to ISO here (via the shared `parseBirthDate`)
 * so `score()` receives the same date shape the ballots use. The babies' names are never
 * referenced — they are not used by scoring and never reach `src/data/`.
 *
 * @param {import('../src/lib/twin-predictions/normalize.mjs').Ballot[]} ballots
 *   The normalized ballots to rank.
 * @returns {Promise<void>}
 */
async function buildLeaderboard(ballots) {
  const leaderboardPath = join(__dirname, '..', 'src', 'data', 'twin-predictions-leaderboard.json');
  const rawActuals = await fetchActualsIfRevealed();

  if (!rawActuals) {
    if (existsSync(leaderboardPath)) {
      rmSync(leaderboardPath);
      console.log('Reveal off: removed stale leaderboard JSON (no actuals shipped).');
    } else {
      console.log('Reveal off: no actuals fetched, no leaderboard written.');
    }
    return;
  }

  const { date } = parseBirthDate(rawActuals.birth_date);
  const actuals = {
    date,
    girl_wt_lb: rawActuals.girl_wt_lb,
    girl_wt_oz: rawActuals.girl_wt_oz,
    boy_wt_lb: rawActuals.boy_wt_lb,
    boy_wt_oz: rawActuals.boy_wt_oz,
    girl_len_in: rawActuals.girl_len_in,
    boy_len_in: rawActuals.boy_len_in,
    born_first: rawActuals.born_first,
    dad_faints: rawActuals.dad_faints,
    mom_yells: rawActuals.mom_yells,
  };

  const leaderboard = score(ballots, actuals);
  writeFileSync(leaderboardPath, `${JSON.stringify(leaderboard, null, 2)}\n`);
  console.log(
    `Reveal on: wrote leaderboard for ${leaderboard.length} guests to ${leaderboardPath}`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
