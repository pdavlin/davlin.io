import { describe, it, expect } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  filterShots,
  formatLocalStamp,
  getTopMonths,
  processDailyData,
  processMonthlyData,
  processTimeOfDayData,
} from '../../src/lib/coffee/aggregate';
import { isCoffeeShotsPayload } from '../../src/lib/coffee/validate.mjs';
import type { CoffeeShot } from '../../src/lib/coffee/types';

function shot(overrides: Partial<CoffeeShot> & Pick<CoffeeShot, 'startTime'>): CoffeeShot {
  return {
    id: overrides.startTime,
    profileTitle: 'Extractamundo Dos!',
    barista: 'pdav',
    beanBrand: null,
    beanType: null,
    roastLevel: null,
    coffeeBag: null,
    decaf: false,
    ...overrides,
  };
}

describe('filterShots', () => {
  it('drops guest barista shots and keeps blanks', () => {
    const shots = [
      shot({ startTime: '2026-01-01T12:00:00Z', barista: 'Matt McCrary' }),
      shot({ startTime: '2026-01-01T13:00:00Z', barista: null }),
      shot({ startTime: '2026-01-01T14:00:00Z' }),
    ];
    expect(filterShots(shots)).toHaveLength(2);
  });
});

describe('processMonthlyData', () => {
  it('buckets by Chicago-local month and splits pourover', () => {
    const shots = [
      // 2026-01-31 23:30 CST == 2026-02-01 05:30 UTC: belongs to January locally
      shot({ startTime: '2026-02-01T05:30:00Z' }),
      shot({ startTime: '2026-02-10T15:00:00Z' }),
      shot({ startTime: '2026-02-11T15:00:00Z', profileTitle: 'NextLevel Pulsar' }),
      shot({ startTime: '2025-12-05T15:00:00Z' }),
    ];
    const result = processMonthlyData(shots);
    expect(result.labels).toEqual(['Dec 2025', 'Jan 2026', 'Feb 2026']);
    expect(result.data.regular).toEqual([1, 1, 1]);
    expect(result.data.pourover).toEqual([0, 0, 1]);
    expect(result.totals).toEqual([1, 1, 2]);
  });

  it('returns empty series for no shots', () => {
    expect(processMonthlyData([])).toEqual({
      labels: [],
      data: { regular: [], pourover: [] },
      totals: [],
    });
  });
});

describe('processDailyData', () => {
  const today = Temporal.PlainDate.from('2026-03-10');

  it('keeps a continuous window and classifies decaf', () => {
    const shots = [
      shot({ startTime: '2026-03-10T14:00:00Z' }),
      shot({ startTime: '2026-03-10T15:00:00Z', decaf: true }),
      shot({ startTime: '2026-03-09T15:00:00Z', profileTitle: 'NextLevel Pulsar' }),
      shot({ startTime: '2026-01-01T15:00:00Z' }), // outside window
    ];
    const result = processDailyData(shots, today, 3);
    expect(result.labels).toEqual(['03/08', '03/09', '03/10']);
    expect(result.data.regular).toEqual([0, 0, 1]);
    expect(result.data.decaf).toEqual([0, 0, 1]);
    expect(result.data.pourover).toEqual([0, 1, 0]);
  });

  it('returns empty series for no shots', () => {
    expect(processDailyData([], today, 3).labels).toEqual([]);
  });
});

describe('processTimeOfDayData', () => {
  it('buckets by Chicago hour with 24 labels', () => {
    // 14:00 UTC in March (CDT, -5) is 9am local
    const result = processTimeOfDayData([shot({ startTime: '2026-03-10T14:00:00Z' })]);
    expect(result.labels).toHaveLength(24);
    expect(result.labels[9]).toBe('9am');
    expect(result.fullLabels[11]).toBe('11am-12pm');
    expect(result.fullLabels[23]).toBe('11pm-12am');
    expect(result.data[9]).toBe(1);
    expect(result.data.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('getTopMonths', () => {
  it('ranks by count and takes three', () => {
    const top = getTopMonths(['A', 'B', 'C', 'D'], [3, 9, 1, 5]);
    expect(top.map((m) => m.month)).toEqual(['B', 'D', 'A']);
  });
});

describe('formatLocalStamp', () => {
  it('formats in Chicago time with zone label', () => {
    expect(formatLocalStamp('2026-03-10T14:05:00Z')).toBe('2026-03-10 9:05 AM CDT');
    expect(formatLocalStamp('2026-01-10T14:05:00Z')).toBe('2026-01-10 8:05 AM CST');
    expect(formatLocalStamp(null)).toBeNull();
    expect(formatLocalStamp('nope')).toBeNull();
  });
});

describe('isCoffeeShotsPayload', () => {
  it('accepts the documented shape and rejects others', () => {
    expect(
      isCoffeeShotsPayload({
        generatedAt: '2026-03-10T14:05:00Z',
        latestShotAt: null,
        shots: [shot({ startTime: '2026-03-10T14:00:00Z' })],
      })
    ).toBe(true);
    expect(isCoffeeShotsPayload({ shots: [{}] })).toBe(false);
    expect(isCoffeeShotsPayload([])).toBe(false);
  });
});
