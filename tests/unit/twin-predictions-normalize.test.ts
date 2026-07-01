import { describe, it, expect } from 'vitest';
import { normalize, parseBirthDate, fmtOz } from '../../src/lib/twin-predictions/normalize.mjs';

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

describe('parseBirthDate', () => {
  it('converts M/D/YY to ISO and a short md label', () => {
    expect(parseBirthDate('9/11/26')).toEqual({ date: '2026-09-11', mdShort: '9/11' });
  });

  it('zero-pads single-digit month and day in the ISO form', () => {
    expect(parseBirthDate('9/5/26')).toEqual({ date: '2026-09-05', mdShort: '9/5' });
  });

  it('passes through an ISO date from Airtable', () => {
    expect(parseBirthDate('2026-08-15')).toEqual({ date: '2026-08-15', mdShort: '8/15' });
  });
});

describe('normalize', () => {
  it('sums lb + oz into total ounces', () => {
    const [b] = normalize([rawRow({ girl_wt_lb: 8, girl_wt_oz: 3 })]);
    expect(b.girlOz).toBe(131);
  });

  it('coerces numeric strings (CSV path) the same as numbers (Airtable path)', () => {
    const [csv] = normalize([rawRow({ girl_wt_lb: '8', girl_wt_oz: '3' })]);
    expect(csv.girlOz).toBe(131);
  });

  it('preserves decimal lengths', () => {
    const [b] = normalize([rawRow({ boy_len_in: 17.5 })]);
    expect(b.boyLen).toBe(17.5);
  });

  it('maps G to girl and B to boy', () => {
    const [girl] = normalize([rawRow({ born_first: 'G' })]);
    const [boy] = normalize([rawRow({ born_first: 'B' })]);
    expect(girl.first).toBe('girl');
    expect(boy.first).toBe('boy');
  });

  it('maps a blank born_first to null (the row 29 / row 31 corrected case)', () => {
    const [empty] = normalize([rawRow({ born_first: '' })]);
    const [missing] = normalize([rawRow({ born_first: undefined })]);
    expect(empty.first).toBeNull();
    expect(missing.first).toBeNull();
  });

  it('coerces Y/N answers to booleans', () => {
    const [b] = normalize([rawRow({ dad_faints: 'Y', mom_yells: 'N' })]);
    expect(b.faint).toBe(true);
    expect(b.yell).toBe(false);
  });

  it('accepts Airtable boolean answers', () => {
    const [b] = normalize([rawRow({ dad_faints: true, mom_yells: false })]);
    expect(b.faint).toBe(true);
    expect(b.yell).toBe(false);
  });

  it('produces the full normalized shape', () => {
    const [b] = normalize([rawRow()]);
    expect(b).toEqual({
      id: 1,
      name: 'Test Guest',
      date: '2026-09-11',
      mdShort: '9/11',
      girlOz: 89,
      boyOz: 116,
      girlLen: 19,
      boyLen: 20.5,
      first: 'girl',
      faint: true,
      yell: false,
    });
  });
});

describe('fmtOz', () => {
  it('formats total ounces as "X lb Y oz"', () => {
    expect(fmtOz(131)).toBe('8 lb 3 oz');
    expect(fmtOz(89)).toBe('5 lb 9 oz');
  });
});
