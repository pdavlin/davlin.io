import { describe, it, expect } from 'vitest';
import {
  parsePostDate,
  getMonthName,
  getMonthNameFromString,
  formatDate,
  compareDatesDescending,
} from '../../src/utils/date-utils';

describe('parsePostDate', () => {
  it('parses standard date format', () => {
    const [year, month, day] = parsePostDate('2026-01-08 14:30');
    expect(year).toBe('2026');
    expect(month).toBe('01');
    expect(day).toBe('08');
  });

  it('parses date without time', () => {
    const [year, month, day] = parsePostDate('2026-01-08');
    expect(year).toBe('2026');
    expect(month).toBe('01');
    expect(day).toBe('08');
  });

  it('handles single-digit month and day', () => {
    const [year, month, day] = parsePostDate('2026-1-8 00:00');
    expect(year).toBe('2026');
    expect(month).toBe('1');
    expect(day).toBe('8');
  });
});

describe('getMonthName', () => {
  it('returns January for 1', () => {
    expect(getMonthName(1)).toBe('January');
  });

  it('returns December for 12', () => {
    expect(getMonthName(12)).toBe('December');
  });

  it('throws for invalid month 0', () => {
    expect(() => getMonthName(0)).toThrow('Invalid month number: 0');
  });

  it('throws for invalid month 13', () => {
    expect(() => getMonthName(13)).toThrow('Invalid month number: 13');
  });
});

describe('getMonthNameFromString', () => {
  it('parses zero-padded month', () => {
    expect(getMonthNameFromString('01')).toBe('January');
    expect(getMonthNameFromString('12')).toBe('December');
  });

  it('parses non-padded month', () => {
    expect(getMonthNameFromString('1')).toBe('January');
    expect(getMonthNameFromString('6')).toBe('June');
  });
});

describe('formatDate', () => {
  it('formats date with time', () => {
    expect(formatDate('2026-01-08 14:30')).toBe('January 8, 2026');
  });

  it('formats date without time', () => {
    expect(formatDate('2026-01-08')).toBe('January 8, 2026');
  });

  it('formats leap year date', () => {
    expect(formatDate('2024-02-29 00:00')).toBe('February 29, 2024');
  });

  it('formats end of year', () => {
    expect(formatDate('2026-12-31 23:59')).toBe('December 31, 2026');
  });
});

describe('compareDatesDescending', () => {
  it('returns positive when a < b (puts larger values first)', () => {
    // For descending sort: when b > a, return positive to sort b before a
    expect(compareDatesDescending('2025', '2026')).toBeGreaterThan(0);
  });

  it('returns negative when a > b (puts larger values first)', () => {
    // For descending sort: when a > b, return negative to keep a before b
    expect(compareDatesDescending('2026', '2025')).toBeLessThan(0);
  });

  it('returns zero when equal', () => {
    expect(compareDatesDescending('2026', '2026')).toBe(0);
  });

  it('works with month strings for descending order', () => {
    // 12 should come before 01 in descending order
    expect(compareDatesDescending('01', '12')).toBeGreaterThan(0);
    expect(compareDatesDescending('12', '01')).toBeLessThan(0);
  });
});
