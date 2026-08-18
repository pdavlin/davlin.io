/**
 * Runtime guards for the coffee payload. Plain ESM (like `twin-predictions/*.mjs`) so
 * the build-time script can import it under any Node version without type stripping.
 *
 * @module src/lib/coffee/validate
 */

/**
 * @param {unknown} value
 * @returns {value is import('./types').CoffeeShot}
 */
export function isCoffeeShot(value) {
  if (typeof value !== 'object' || value === null) return false;
  const v = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof v.id === 'string' && typeof v.startTime === 'string' && typeof v.decaf === 'boolean'
  );
}

/**
 * @param {unknown} value
 * @returns {value is import('./types').CoffeeShotsPayload}
 */
export function isCoffeeShotsPayload(value) {
  if (typeof value !== 'object' || value === null) return false;
  const v = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof v.generatedAt === 'string' &&
    (typeof v.latestShotAt === 'string' || v.latestShotAt === null) &&
    Array.isArray(v.shots) &&
    v.shots.every(isCoffeeShot)
  );
}
