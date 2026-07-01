/**
 * Build-time, reveal-gated ingest of the single `actuals` row for twin-predictions.
 *
 * This is the security gate for Phase 2. The babies' real stats (and names) live in a
 * separate Airtable `actuals` table. They must never reach the client before the owner
 * chooses to reveal them. The guarantee here is structural, not cosmetic: the gate is on
 * the FETCH, not the render. When `REVEAL !== "true"`, this function returns `null`
 * immediately, before any network call or file read — so there is no actuals data
 * anywhere in the build to leak into the bundle.
 *
 * Two source modes (mirroring `scripts/fetch-ballots.mjs`):
 *  - LIVE: when `AIRTABLE_API_KEY` is set, fetch the single actuals row via the
 *    `airtable` npm client. The build fails loudly if the table does not contain exactly
 *    one row, to prevent a half-revealed or ambiguous deploy.
 *  - OFFLINE: when the key is unset, read the committed sample fixture
 *    (`data/twin-predictions-actuals.sample.csv`). This lets the reveal path be verified
 *    locally and in CI without secrets or network access.
 *
 * The caller (`scripts/fetch-ballots.mjs`) is responsible for normalizing the returned
 * raw fields into the shape `score()` expects and for writing the leaderboard artifact.
 *
 * Usage:
 *   REVEAL=true AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... node scripts/fetch-ballots.mjs   # live reveal
 *   REVEAL=true node scripts/fetch-ballots.mjs                                              # offline reveal (fixture)
 *
 * @module scripts/fetch-actuals
 */

import Airtable from 'airtable';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default Airtable table name for the actuals row; override with `AIRTABLE_ACTUALS_TABLE`. */
const DEFAULT_TABLE = 'Actuals';

/** Path to the offline reveal fixture, relative to this script. */
const SAMPLE_CSV_PATH = join(__dirname, '..', 'data', 'twin-predictions-actuals.sample.csv');

/**
 * @typedef {Object} RawActuals
 * @property {string} birth_date - Real birth date (`M/D/YY` in CSV, ISO from Airtable).
 * @property {number|string} girl_wt_lb - Girl weight, pounds component.
 * @property {number|string} girl_wt_oz - Girl weight, ounces component.
 * @property {number|string} boy_wt_lb - Boy weight, pounds component.
 * @property {number|string} boy_wt_oz - Boy weight, ounces component.
 * @property {number|string} girl_len_in - Girl length in inches.
 * @property {number|string} boy_len_in - Boy length in inches.
 * @property {string} born_first - `"G"` or `"B"`.
 * @property {string} dad_faints - `"Y"` or `"N"`.
 * @property {string} mom_yells - `"Y"` or `"N"`.
 * @property {string} [girl_name] - Secret pre-reveal; never written to client assets.
 * @property {string} [boy_name] - Secret pre-reveal; never written to client assets.
 */

/**
 * Parses one CSV line into fields, honoring double-quoted segments so a quoted comma
 * (e.g. inside a name) does not split a field.
 *
 * @param {string} line - A single CSV row.
 * @returns {string[]} The parsed, trimmed field values.
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
 * Reads the offline sample fixture and returns its single row as a keyed object.
 *
 * @returns {RawActuals} The parsed actuals row.
 * @throws {Error} When the fixture does not contain exactly one data row.
 */
function readSampleCsv() {
  const text = readFileSync(SAMPLE_CSV_PATH, 'utf8');
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const [headerLine, ...dataLines] = lines;

  if (dataLines.length !== 1) {
    throw new Error(
      `Expected exactly 1 actuals row in ${SAMPLE_CSV_PATH}, got ${dataLines.length}.`
    );
  }

  const header = parseCsvLine(headerLine);
  const values = parseCsvLine(dataLines[0]);
  /** @type {Record<string, string>} */
  const row = {};
  for (const [index, key] of header.entries()) {
    row[key] = values[index] ?? '';
  }
  return /** @type {RawActuals} */ (row);
}

/**
 * Fetches the single actuals row from Airtable via the `airtable` client.
 *
 * @param {string} apiKey - Airtable API key (build env only).
 * @param {string} baseId - Airtable base id.
 * @param {string} table - Actuals table name.
 * @returns {Promise<RawActuals>} The single row's raw fields.
 * @throws {Error} When the table does not contain exactly one row.
 */
async function fetchFromAirtable(apiKey, baseId, table) {
  const base = new Airtable({ apiKey }).base(baseId);
  const records = await base(table).select().all();

  if (records.length !== 1) {
    throw new Error(
      `Expected exactly 1 actuals row in Airtable table "${table}", got ${records.length}. ` +
        'Refusing to build a half-revealed or ambiguous leaderboard.'
    );
  }

  return /** @type {RawActuals} */ ({ ...records[0].fields });
}

/**
 * Returns the actuals row ONLY when the reveal flag is on; otherwise `null`.
 *
 * This early `null` return is the Phase 2 security guarantee: with reveal off, no actuals
 * are fetched, parsed, or returned, so nothing secret can exist in the build to leak.
 *
 * @returns {Promise<RawActuals | null>} Raw actuals fields, or `null` when reveal is off.
 * @throws {Error} When reveal is on but the source is misconfigured or not a single row.
 *
 * @example
 * // reveal off (default): no fetch, no data
 * process.env.REVEAL = undefined;
 * await fetchActualsIfRevealed(); // -> null
 *
 * @example
 * // reveal on, offline: reads the sample fixture
 * process.env.REVEAL = 'true';
 * await fetchActualsIfRevealed(); // -> { birth_date: '9/11/26', ... }
 */
export async function fetchActualsIfRevealed() {
  if (process.env.REVEAL !== 'true') return null; // <-- the security gate

  const apiKey = process.env.AIRTABLE_API_KEY;
  // Twin-predictions lives in its own base; fall back to the shared base id.
  const baseId = process.env.AIRTABLE_TWIN_BASE_ID || process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_ACTUALS_TABLE || DEFAULT_TABLE;

  if (apiKey) {
    if (!baseId) {
      throw new Error(
        'REVEAL=true with AIRTABLE_API_KEY set but no base id found. Set AIRTABLE_TWIN_BASE_ID (or AIRTABLE_BASE_ID), or unset the key to reveal from the offline sample fixture.'
      );
    }
    return fetchFromAirtable(apiKey, baseId, table);
  }

  return readSampleCsv();
}
