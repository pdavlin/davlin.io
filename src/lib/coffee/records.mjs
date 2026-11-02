/**
 * `io.davlin.coffee.shot` records -> the page's `CoffeeShotsPayload` (Plane ATPROTO S-05).
 *
 * Records omit null fields (`lexicons/README.md`, "Null handling"); a missing field
 * becomes `null` here, so the page sees the same shape the coffee service used to serve.
 * Plain ESM so `scripts/fetch-coffee-data.mjs` can import it without type stripping.
 *
 * @module src/lib/coffee/records
 */

export const SHOT_COLLECTION = 'io.davlin.coffee.shot';

/**
 * @param {unknown} value
 * @returns {string | null}
 */
const optionalString = (value) => (typeof value === 'string' ? value : null);

/**
 * Maps one record value to a `CoffeeShot`, or null when required fields are missing.
 *
 * @param {Record<string, unknown>} value - The record value.
 * @returns {import('./types').CoffeeShot | null}
 */
export function shotFromRecord(value) {
  if (
    typeof value.shotId !== 'string' ||
    typeof value.startTime !== 'string' ||
    typeof value.decaf !== 'boolean'
  ) {
    return null;
  }
  return {
    id: value.shotId,
    startTime: value.startTime,
    profileTitle: optionalString(value.profileTitle),
    barista: optionalString(value.barista),
    beanBrand: optionalString(value.beanBrand),
    beanType: optionalString(value.beanType),
    roastLevel: optionalString(value.roastLevel),
    coffeeBag: optionalString(value.coffeeBag),
    decaf: value.decaf,
  };
}

/**
 * Builds the payload from record values, oldest shot first (the order the service used).
 *
 * @param {Record<string, unknown>[]} values
 * @param {string} generatedAt - ISO 8601 UTC.
 * @returns {{ payload: import('./types').CoffeeShotsPayload, skipped: number }}
 */
export function payloadFromRecords(values, generatedAt) {
  /** @type {import('./types').CoffeeShot[]} */
  const shots = [];
  let skipped = 0;
  for (const value of values) {
    const shot = shotFromRecord(value);
    if (shot) shots.push(shot);
    else skipped += 1;
  }
  shots.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return {
    payload: { generatedAt, latestShotAt: shots.at(-1)?.startTime ?? null, shots },
    skipped,
  };
}
