import { describe, it, expect } from 'vitest';
import { score, SCORING } from '../../src/lib/twin-predictions/score.mjs';

/** Normalized-ballot shape (mirrors `src/lib/twin-predictions/normalize.mjs`'s `Ballot`). */
interface ScoreBallot {
  id: number;
  name: string;
  date: string;
  girlOz: number;
  boyOz: number;
  girlLen: number;
  boyLen: number;
  first: 'girl' | 'boy' | null;
  faint: boolean;
  yell: boolean;
}

/** Actuals shape passed to `score` (date already ISO; weights as lb + oz components). */
interface ScoreActuals {
  date: string;
  girl_wt_lb: number;
  girl_wt_oz: number;
  boy_wt_lb: number;
  boy_wt_oz: number;
  girl_len_in: number;
  boy_len_in: number;
  born_first: string;
  dad_faints: string;
  mom_yells: string;
}

/** Minimal normalized-ballot factory; override per test. */
function ballot(overrides: Partial<ScoreBallot> = {}): ScoreBallot {
  return {
    id: 1,
    name: 'Guest',
    date: '2026-09-11',
    girlOz: 96, // 6 lb 0 oz
    boyOz: 116, // 7 lb 4 oz
    girlLen: 19,
    boyLen: 20,
    first: 'girl',
    faint: false,
    yell: true,
    ...overrides,
  };
}

/** Actuals matching the default ballot exactly (date already ISO, weights as lb+oz). */
function actuals(overrides: Partial<ScoreActuals> = {}): ScoreActuals {
  return {
    date: '2026-09-11',
    girl_wt_lb: 6,
    girl_wt_oz: 0,
    boy_wt_lb: 7,
    boy_wt_oz: 4,
    girl_len_in: 19,
    boy_len_in: 20,
    born_first: 'G',
    dad_faints: 'N',
    mom_yells: 'Y',
    ...overrides,
  };
}

describe('score', () => {
  it('gives an exact-match guess distance 0 and rank 1', () => {
    const exact = ballot({ id: 1, name: 'Exact' });
    const off = ballot({
      id: 2,
      name: 'Off',
      date: '2026-09-20',
      girlOz: 120,
      boyOz: 140,
      girlLen: 22,
      boyLen: 24,
    });

    const board = score([exact, off], actuals());

    expect(board[0].name).toBe('Exact');
    expect(board[0].rank).toBe(1);
    expect(board[0].distance).toBe(0);
    expect(board[1].rank).toBe(2);
    expect(board[1].distance).toBeGreaterThan(0);
  });

  it('breaks an equal-distance tie by higher bonus', () => {
    // Symmetric guesses: each is the max distance in every dimension, so both normalize
    // to the same total distance. The bonus (exact-match fields) must decide.
    const high = ballot({
      id: 1,
      name: 'HighBonus',
      girlOz: 86, // 10 oz under
      first: 'girl', // matches actual G  -> bonus
      faint: false, // matches actual N  -> bonus
      yell: true, // matches actual Y  -> bonus
    });
    const low = ballot({
      id: 2,
      name: 'LowBonus',
      girlOz: 106, // 10 oz over -> same |distance|
      first: 'boy', // wrong
      faint: true, // wrong
      yell: false, // wrong
    });

    const board = score([high, low], actuals());

    expect(board[0].distance).toBeCloseTo(board[1].distance);
    expect(board[0].name).toBe('HighBonus');
    expect(board[0].bonus).toBeGreaterThan(board[1].bonus);
  });

  it('produces no NaN when every guess in a dimension is identical (divide-by-zero guard)', () => {
    // All three ballots share the exact actual values -> every dimension max distance 0.
    const board = score([ballot({ id: 1 }), ballot({ id: 2 }), ballot({ id: 3 })], actuals());

    for (const row of board) {
      expect(Number.isNaN(row.distance)).toBe(false);
      expect(row.distance).toBe(0);
    }
  });

  it('does not throw on a null born_first and awards it no bonus', () => {
    const noPick = ballot({ id: 1, name: 'NoPick', first: null });

    expect(() => score([noPick], actuals())).not.toThrow();

    const [row] = score([noPick], actuals());
    expect(row.matched.first).toBe(false);
    // faint (N) and yell (Y) still match the default ballot -> bonus of 2, not 3.
    expect(row.bonus).toBe(SCORING.bonuses.faint + SCORING.bonuses.yell);
  });

  it('reorders the ranking when weights.date changes (configurability)', () => {
    // P is close on date, far on girl weight; Q is the reverse. R sets the dimension maxes.
    const p = ballot({ id: 1, name: 'P', date: '2026-09-11', girlOz: 130 }); // date dist 1, girlWt 30
    const q = ballot({ id: 2, name: 'Q', date: '2026-09-16', girlOz: 110 }); // date dist 6, girlWt 10
    const r = ballot({ id: 3, name: 'R', date: '2026-09-18', girlOz: 140 }); // date dist 8, girlWt 40
    const act = actuals({ girl_wt_lb: 6, girl_wt_oz: 4, boy_wt_lb: 7, boy_wt_oz: 4 }); // girlOz 100
    // Align the non-varying dimensions so only date + girlWt drive the result.
    const align = { boyOz: 116, girlLen: 19, boyLen: 20 };
    const ballots = [
      { ...p, ...align },
      { ...q, ...align },
      { ...r, ...align },
    ];

    const defaultBoard = score(ballots, act); // weights.date = 1
    const dateLightBoard = score(ballots, act, {
      ...SCORING,
      weights: { ...SCORING.weights, date: 0.1 },
    });

    // With equal date weight, P (closer overall) wins; deweighting date flips it to Q.
    expect(defaultBoard[0].name).toBe('P');
    expect(dateLightBoard[0].name).toBe('Q');
  });
});
