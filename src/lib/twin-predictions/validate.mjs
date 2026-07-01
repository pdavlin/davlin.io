/**
 * Twin-predictions ballot validation.
 *
 * Runs as a BUILD-TIME gate inside `scripts/fetch-ballots.mjs`, before normalization.
 * A malformed row fails the build loudly instead of silently rendering a shifted or
 * corrupt ballot.
 *
 * The headline rule is `born_first ∈ {G, B, blank}`. The seed data had a column-shift
 * class of bug (ballots 29 & 31) where a `dad_faints`/`mom_yells` value landed in the
 * `born_first` column, producing `"N"`/`"Y"`. Airtable's single-select makes that
 * structurally impossible at entry; this check is cheap defense-in-depth against any
 * future free-text re-import or CSV edit.
 *
 * @module twin-predictions/validate
 */

/** Numeric ballot fields that must be present and parseable. */
const NUMERIC_FIELDS = [
  'girl_wt_lb',
  'girl_wt_oz',
  'boy_wt_lb',
  'boy_wt_oz',
  'girl_len_in',
  'boy_len_in',
];

/** The only values `born_first` may hold. Anything else signals a column shift. */
const VALID_BORN_FIRST = ['G', 'B', ''];

/**
 * Resolves a human-friendly label for a row so validation errors name the offender.
 *
 * @param {Record<string, unknown>} row - The raw ballot row.
 * @returns {string} The ballot id, the guest name, or `"(unknown)"`.
 */
function labelFor(row) {
  if (row.ballot_id !== undefined && row.ballot_id !== null && row.ballot_id !== '') {
    return String(row.ballot_id);
  }
  if (row.guest_name) return String(row.guest_name);
  return '(unknown)';
}

/**
 * Validates raw ballot rows, throwing with a per-ballot breakdown on any violation.
 *
 * Rejects:
 *  - `born_first` not in {G, B, blank} (the column-shift tell, e.g. `"N"`/`"Y"`),
 *  - missing or non-numeric weight / length fields,
 *  - missing guest name or birth date.
 *
 * @param {Record<string, unknown>[]} rows - Raw ballot rows (Airtable fields or CSV).
 * @throws {Error} When one or more rows are invalid; the message names every offender.
 * @returns {Record<string, unknown>[]} The same `rows`, for convenient chaining.
 *
 * @example
 * validateBallots([{ ballot_id: 29, born_first: "N", ... }]);
 * // throws: Ballot validation failed:
 * //   ballot 29: born_first="N" (expected G/B/blank — likely a column shift)
 */
export function validateBallots(rows) {
  const errors = [];

  for (const row of rows) {
    const label = labelFor(row);
    const bornFirst = row.born_first;

    if (
      bornFirst !== undefined &&
      bornFirst !== null &&
      !VALID_BORN_FIRST.includes(String(bornFirst).trim())
    ) {
      errors.push(
        `ballot ${label}: born_first="${bornFirst}" (expected G/B/blank — likely a column shift)`
      );
    }

    for (const field of NUMERIC_FIELDS) {
      const value = row[field];
      const blank = value === undefined || value === null || String(value).trim() === '';
      if (blank || !Number.isFinite(Number(value))) {
        errors.push(`ballot ${label}: ${field} missing/non-numeric (got "${value}")`);
      }
    }

    if (!row.guest_name || String(row.guest_name).trim() === '') {
      errors.push(`ballot ${label}: missing guest_name`);
    }
    if (!row.birth_date || String(row.birth_date).trim() === '') {
      errors.push(`ballot ${label}: missing birth_date`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Ballot validation failed:\n${errors.join('\n')}`);
  }

  return rows;
}
