/**
 * Twin-predictions ballot normalization.
 *
 * This module is the single source of truth for turning a raw ballot row — as it
 * arrives from either Airtable (live) or the seed CSV (offline build) — into the
 * normalized shape the `<Dashboard>` React island renders.
 *
 * It is intentionally dependency-free and runs at BUILD TIME only (inside
 * `scripts/fetch-ballots.mjs`). The island receives the already-normalized JSON as a
 * prop, so none of this code ships logic that touches secrets.
 *
 * Raw field names (shared by the Airtable `Ballots` table and the seed CSV header):
 *   ballot_id, guest_name, birth_date,
 *   girl_wt_lb, girl_wt_oz, boy_wt_lb, boy_wt_oz,
 *   girl_len_in, boy_len_in,
 *   born_first, dad_faints, mom_yells
 *
 * @module twin-predictions/normalize
 */

/**
 * Zero-pads a number (or numeric string) to two digits.
 *
 * @param {number|string} value - The value to pad, e.g. `9`.
 * @returns {string} The two-digit string, e.g. `"09"`.
 */
const pad = (value) => String(value).padStart(2, '0');

/**
 * @typedef {Object} RawBallot
 * @property {number|string} ballot_id - Stable 1..N id.
 * @property {string} guest_name - The guesser's name (guests are the guessers).
 * @property {string} birth_date - Either `M/D/YY` (CSV) or ISO `YYYY-MM-DD` (Airtable).
 * @property {number|string} girl_wt_lb - Girl weight, pounds component.
 * @property {number|string} girl_wt_oz - Girl weight, ounces component.
 * @property {number|string} boy_wt_lb - Boy weight, pounds component.
 * @property {number|string} boy_wt_oz - Boy weight, ounces component.
 * @property {number|string} girl_len_in - Girl length in inches (decimals allowed).
 * @property {number|string} boy_len_in - Boy length in inches (decimals allowed).
 * @property {string} [born_first] - `"G"`, `"B"`, or blank/undefined for no pick.
 * @property {string|boolean} [dad_faints] - `"Y"`/`"N"` or boolean.
 * @property {string|boolean} [mom_yells] - `"Y"`/`"N"` or boolean.
 */

/**
 * @typedef {Object} Ballot
 * @property {number} id - Stable id.
 * @property {string} name - Guest name.
 * @property {string} date - ISO date, e.g. `"2026-09-11"`.
 * @property {string} mdShort - Short month/day, e.g. `"9/11"`.
 * @property {number} girlOz - Girl weight as total ounces.
 * @property {number} boyOz - Boy weight as total ounces.
 * @property {number} girlLen - Girl length in inches.
 * @property {number} boyLen - Boy length in inches.
 * @property {("girl"|"boy"|null)} first - Who the guest thinks arrives first, or null.
 * @property {boolean} faint - Whether the guest predicts Dad faints.
 * @property {boolean} yell - Whether the guest predicts Mom yells.
 */

/**
 * Parses a ballot birth date that may be entered as `M/D/YY` (the paper-ballot / CSV
 * format) or returned as an ISO `YYYY-MM-DD` string (the Airtable date-field format).
 *
 * @param {string} raw - The raw birth-date value.
 * @returns {{ date: string, mdShort: string }} ISO date plus a short `M/D` label.
 *
 * @example
 * parseBirthDate("9/11/26");    // { date: "2026-09-11", mdShort: "9/11" }
 * parseBirthDate("2026-09-11"); // { date: "2026-09-11", mdShort: "9/11" }
 */
export function parseBirthDate(raw) {
  const value = String(raw).trim();

  // ISO form (Airtable date field): YYYY-MM-DD, optionally with a time suffix.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    const [, year, month, day] = iso;
    return { date: `${year}-${month}-${day}`, mdShort: `${Number(month)}/${Number(day)}` };
  }

  // M/D/YY form (paper ballot / CSV): two-digit year is assumed 20YY.
  const [m, d, y] = value.split('/').map(Number);
  const year = y < 100 ? 2000 + y : y;
  return { date: `${year}-${pad(m)}-${pad(d)}`, mdShort: `${m}/${d}` };
}

/**
 * Maps the raw `born_first` single-select to the rendered enum.
 *
 * @param {string|undefined|null} value - `"G"`, `"B"`, or blank.
 * @returns {("girl"|"boy"|null)} `"girl"`, `"boy"`, or null when no pick was made.
 */
function normalizeFirst(value) {
  if (value === 'G') return 'girl';
  if (value === 'B') return 'boy';
  return null;
}

/**
 * Coerces a yes/no ballot answer (string `"Y"`/`"N"` or Airtable boolean) to a boolean.
 *
 * @param {string|boolean|undefined|null} value - The raw answer.
 * @returns {boolean} True only for `"Y"` or `true`.
 */
function isYes(value) {
  return value === 'Y' || value === true;
}

/**
 * Normalizes raw ballot rows into the shape consumed by `<Dashboard>`.
 *
 * Weight columns (lb + oz) are summed into total ounces; the birth date is converted
 * to ISO; `born_first` becomes `girl`/`boy`/null; yes/no answers become booleans.
 * Numeric fields are coerced with {@link Number} so both string (CSV) and numeric
 * (Airtable) inputs work without branching at the call site.
 *
 * @param {RawBallot[]} rows - Raw ballot rows from Airtable or the seed CSV.
 * @returns {Ballot[]} Normalized ballots.
 */
export function normalize(rows) {
  return rows.map((f) => {
    const { date, mdShort } = parseBirthDate(f.birth_date);
    return {
      id: Number(f.ballot_id),
      name: String(f.guest_name),
      date,
      mdShort,
      girlOz: Number(f.girl_wt_lb) * 16 + Number(f.girl_wt_oz),
      boyOz: Number(f.boy_wt_lb) * 16 + Number(f.boy_wt_oz),
      girlLen: Number(f.girl_len_in),
      boyLen: Number(f.boy_len_in),
      first: normalizeFirst(f.born_first),
      faint: isYes(f.dad_faints),
      yell: isYes(f.mom_yells),
    };
  });
}

/**
 * Formats a total-ounce weight as `"X lb Y oz"` for display.
 *
 * @param {number} oz - Total ounces.
 * @returns {string} Human-readable weight, e.g. `"8 lb 3 oz"`.
 */
export const fmtOz = (oz) => `${Math.floor(oz / 16)} lb ${oz % 16} oz`;
