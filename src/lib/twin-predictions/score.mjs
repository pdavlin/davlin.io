/**
 * Twin-predictions closest-guess scoring engine.
 *
 * Runs at BUILD TIME only (inside `scripts/fetch-ballots.mjs`, gated behind the reveal
 * flag). Given the normalized ballots and the single actuals row, it ranks guests by how
 * close their measurable guesses were and returns a static leaderboard the page bakes in.
 *
 * Algorithm — per-dimension min-max normalization (Contract Decision 4):
 *  1. For each of the five numeric dimensions (birth date in days, girl weight oz, boy
 *     weight oz, girl length in, boy length in) compute every guest's absolute distance
 *     from the actual value.
 *  2. Scale each guest's distance by the observed MAX distance in that dimension, landing
 *     every value in `[0, 1]`. Min-max (not z-score) keeps the score bounded, explainable
 *     to guests, and robust for the ~32-row dataset.
 *  3. Weighted-sum the five normalized distances into a single `distance` total. Lowest
 *     total ranks first (closest overall).
 *
 * The three exact-match fields (born_first, faint, yell) award separate BONUS points.
 * Bonuses are tie-breakers only — they never enter the distance sum, so the headline
 * ranking stays a pure "how close were the measurable guesses" number.
 *
 * All weights and bonus values live in {@link SCORING} so the owner can re-tune the
 * ranking without touching logic.
 *
 * @module twin-predictions/score
 */

/**
 * Tunable scoring configuration. Edit the numbers, not the logic, to re-rank.
 *
 * @typedef {Object} ScoringConfig
 * @property {{ date: number, girlWt: number, boyWt: number, girlLen: number, boyLen: number }} weights
 *   Per-dimension multipliers applied to the normalized `[0,1]` distances.
 * @property {{ bornFirst: number, faint: number, yell: number }} bonuses
 *   Points awarded per correct exact-match field; used only as tie-breakers.
 */

/** @type {ScoringConfig} */
export const SCORING = {
  weights: { date: 1, girlWt: 1, boyWt: 1, girlLen: 1, boyLen: 1 },
  bonuses: { bornFirst: 1, faint: 1, yell: 1 },
};

/** The five numeric dimensions, in a fixed order for deterministic iteration. */
const DIMENSIONS = ['date', 'girlWt', 'boyWt', 'girlLen', 'boyLen'];

/**
 * Absolute number of whole days between two ISO `YYYY-MM-DD` dates.
 *
 * @param {string} isoA - First ISO date.
 * @param {string} isoB - Second ISO date.
 * @returns {number} Absolute day distance.
 */
const daysBetween = (isoA, isoB) =>
  Math.abs((new Date(`${isoA}T00:00:00`) - new Date(`${isoB}T00:00:00`)) / 86400000);

/**
 * Median of a numeric array. Used only for the outlier signal below.
 *
 * @param {number[]} nums - Values to summarize.
 * @returns {number} The median (0 for an empty input).
 */
const median = (nums) => {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * @typedef {Object} Ballot
 * @property {number} id - Stable ballot id.
 * @property {string} name - Guest name.
 * @property {string} date - ISO birth-date guess.
 * @property {number} girlOz - Girl weight guess in total ounces.
 * @property {number} boyOz - Boy weight guess in total ounces.
 * @property {number} girlLen - Girl length guess in inches.
 * @property {number} boyLen - Boy length guess in inches.
 * @property {("girl"|"boy"|null)} first - Who arrives first, or null for no pick.
 * @property {boolean} faint - Predicts Dad faints.
 * @property {boolean} yell - Predicts Mom yells.
 */

/**
 * @typedef {Object} Actuals
 * @property {string} date - ISO actual birth date.
 * @property {number|string} girl_wt_lb - Girl weight, pounds component.
 * @property {number|string} girl_wt_oz - Girl weight, ounces component.
 * @property {number|string} boy_wt_lb - Boy weight, pounds component.
 * @property {number|string} boy_wt_oz - Boy weight, ounces component.
 * @property {number|string} girl_len_in - Girl length in inches.
 * @property {number|string} boy_len_in - Boy length in inches.
 * @property {string} born_first - `"G"` or `"B"`.
 * @property {string} dad_faints - `"Y"` or `"N"`.
 * @property {string} mom_yells - `"Y"` or `"N"`.
 */

/**
 * @typedef {Object} LeaderboardRow
 * @property {number} rank - 1-based rank, 1 = closest.
 * @property {number} id - Ballot id.
 * @property {string} name - Guest name.
 * @property {number} distance - Weighted sum of normalized distances; lower = closer.
 * @property {number} bonus - Tie-breaker points from correct exact-match fields.
 * @property {{ first: boolean, faint: boolean, yell: boolean }} matched - Which exact-match
 *   fields the guest got right (drives the leaderboard's bonus indicators).
 * @property {{ date: number, girlWt: number, boyWt: number, girlLen: number, boyLen: number }} breakdown
 *   Raw (un-normalized) absolute distances per dimension, for the expandable detail view.
 */

/**
 * Logs a per-dimension warning when the observed MAX distance dwarfs the median, the
 * signal that a single outlier guess is compressing everyone else's normalized score in
 * that dimension (NFR-2.4; the known case is row 31's boy weight of 12 lb 5 oz). The
 * outlier is accepted by default — this only surfaces it so the owner can decide whether
 * to cap or exclude it by tuning the data or weights.
 *
 * @param {string} dimension - The dimension name, e.g. `"boyWt"`.
 * @param {{ b: Ballot }[]} raw - The per-guest raw entries (each carries `b.name` and the
 *   dimension's absolute distance under `[dimension]`), so the warning can name the guess.
 * @returns {void}
 */
function warnOnOutlier(dimension, raw) {
  const ranked = raw
    .map((r) => ({ name: r.b.name, dist: r[dimension] }))
    .sort((x, y) => y.dist - x.dist);
  const max = ranked[0]?.dist ?? 0;
  const second = ranked[1]?.dist ?? 0;
  const med = median(ranked.map((e) => e.dist));

  // Flag only when a SINGLE guess both dwarfs the median AND stands clearly apart from the
  // next-largest — the case that actually stretches the min-max denominator and compresses
  // everyone else. A plain `max > 3*median` test fired on any naturally wide spread (all
  // five dimensions on this 32-row set), which was noise; the added `max > 1.5*second` gap
  // condition makes the signal specific to a true outlier and names the guess driving it.
  if (med > 0 && max > 3 * med && max > 1.5 * second) {
    globalThis.console.warn(
      `[score] outlier in "${dimension}": ${ranked[0].name}'s guess is ${max} off — ` +
        `${(max / med).toFixed(1)}x the median (${med}) and ${(max / (second || 1)).toFixed(1)}x the next (${second}). ` +
        "It compresses this dimension's normalized range (NFR-2.4); accepted by default."
    );
  }
}

/**
 * Ranks guests by total normalized distance from the actuals (closest first).
 *
 * @param {Ballot[]} ballots - Normalized ballots from {@link module:twin-predictions/normalize}.
 * @param {Actuals} actuals - The actual birth stats (date already ISO).
 * @param {ScoringConfig} [cfg=SCORING] - Weights and bonus values.
 * @returns {LeaderboardRow[]} Ballots ranked closest-first, lowest distance at rank 1.
 *
 * @example
 * const board = score(ballots, { date: '2026-09-11', girl_wt_lb: 6, girl_wt_oz: 0, ... });
 * board[0]; // { rank: 1, name: 'Closest Guest', distance: 0.42, bonus: 2, ... }
 */
export function score(ballots, actuals, cfg = SCORING) {
  // Resolve the actuals into the same units the ballots use.
  const a = {
    date: actuals.date,
    girlOz: Number(actuals.girl_wt_lb) * 16 + Number(actuals.girl_wt_oz),
    boyOz: Number(actuals.boy_wt_lb) * 16 + Number(actuals.boy_wt_oz),
    girlLen: Number(actuals.girl_len_in),
    boyLen: Number(actuals.boy_len_in),
    first: actuals.born_first === 'G' ? 'girl' : 'boy',
    faint: actuals.dad_faints === 'Y',
    yell: actuals.mom_yells === 'Y',
  };

  // Step 1: raw absolute distance per dimension for every guest.
  const raw = ballots.map((b) => ({
    b,
    date: daysBetween(b.date, a.date),
    girlWt: Math.abs(b.girlOz - a.girlOz),
    boyWt: Math.abs(b.boyOz - a.boyOz),
    girlLen: Math.abs(b.girlLen - a.girlLen),
    boyLen: Math.abs(b.boyLen - a.boyLen),
  }));

  // Step 2: max distance per dimension. `|| 1` guards divide-by-zero when every guess in
  // a dimension is identical (max distance 0), keeping the normalized value 0 (not NaN).
  /** @type {Record<string, number>} */
  const maxes = {};
  for (const d of DIMENSIONS) {
    warnOnOutlier(d, raw);
    maxes[d] = Math.max(...raw.map((r) => r[d])) || 1;
  }

  // Step 3: weighted sum of normalized distances + tie-breaker bonus, then rank.
  return (
    raw
      .map((r) => {
        const distance = DIMENSIONS.reduce((sum, d) => sum + cfg.weights[d] * (r[d] / maxes[d]), 0);
        // A null `first` (no born_first pick) simply never equals `a.first`, so it earns no
        // bonus and cannot throw — no special-casing needed.
        const matched = {
          first: r.b.first === a.first,
          faint: r.b.faint === a.faint,
          yell: r.b.yell === a.yell,
        };
        const bonus =
          (matched.first ? cfg.bonuses.bornFirst : 0) +
          (matched.faint ? cfg.bonuses.faint : 0) +
          (matched.yell ? cfg.bonuses.yell : 0);

        return {
          id: r.b.id,
          name: r.b.name,
          distance,
          bonus,
          matched,
          breakdown: {
            date: r.date,
            girlWt: r.girlWt,
            boyWt: r.boyWt,
            girlLen: r.girlLen,
            boyLen: r.boyLen,
          },
        };
      })
      // Lowest distance wins; a higher bonus (more correct exact-matches) breaks ties.
      .sort((x, y) => x.distance - y.distance || y.bonus - x.bonus)
      .map((row, index) => ({ rank: index + 1, ...row }))
  );
}
