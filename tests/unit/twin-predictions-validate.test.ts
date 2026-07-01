import { describe, it, expect } from 'vitest';
import { validateBallots } from '../../src/lib/twin-predictions/validate.mjs';

/** Minimal valid raw row factory; override fields per test. */
function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    ballot_id: 1,
    guest_name: 'Test Guest',
    birth_date: '9/11/26',
    girl_wt_lb: 5,
    girl_wt_oz: 9,
    boy_wt_lb: 7,
    boy_wt_oz: 4,
    girl_len_in: 19,
    boy_len_in: 20.5,
    born_first: 'G',
    dad_faints: 'Y',
    mom_yells: 'N',
    ...overrides,
  };
}

describe('validateBallots', () => {
  it('accepts a valid row and returns it for chaining', () => {
    const rows = [rawRow()];
    expect(validateBallots(rows)).toBe(rows);
  });

  it('accepts G, B, and blank born_first', () => {
    expect(() => validateBallots([rawRow({ born_first: 'G' })])).not.toThrow();
    expect(() => validateBallots([rawRow({ born_first: 'B' })])).not.toThrow();
    expect(() => validateBallots([rawRow({ born_first: '' })])).not.toThrow();
    expect(() => validateBallots([rawRow({ born_first: undefined })])).not.toThrow();
  });

  it('rejects born_first="N" (the row 29 column-shift class)', () => {
    expect(() => validateBallots([rawRow({ ballot_id: 29, born_first: 'N' })])).toThrow(
      /ballot 29: born_first="N"/
    );
  });

  it('rejects born_first="Y" (the row 31 column-shift class)', () => {
    expect(() => validateBallots([rawRow({ ballot_id: 31, born_first: 'Y' })])).toThrow(
      /ballot 31: born_first="Y"/
    );
  });

  it('rejects a missing numeric weight field, naming the field', () => {
    expect(() => validateBallots([rawRow({ ballot_id: 7, girl_wt_oz: '' })])).toThrow(
      /ballot 7: girl_wt_oz missing\/non-numeric/
    );
  });

  it('rejects a non-numeric length field', () => {
    expect(() => validateBallots([rawRow({ boy_len_in: 'tall' })])).toThrow(
      /boy_len_in missing\/non-numeric/
    );
  });

  it('rejects a missing guest name', () => {
    expect(() => validateBallots([rawRow({ guest_name: '' })])).toThrow(/missing guest_name/);
  });

  it('rejects a missing birth date', () => {
    expect(() => validateBallots([rawRow({ birth_date: '' })])).toThrow(/missing birth_date/);
  });

  it('reports every offending ballot in one throw', () => {
    let message = '';
    try {
      validateBallots([
        rawRow({ ballot_id: 29, born_first: 'N' }),
        rawRow({ ballot_id: 31, born_first: 'Y' }),
      ]);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('ballot 29');
    expect(message).toContain('ballot 31');
  });
});
