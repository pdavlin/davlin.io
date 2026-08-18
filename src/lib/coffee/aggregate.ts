/**
 * Build-time aggregation for the coffee page. Pure functions over `CoffeeShot[]`
 * so they can be unit tested without Astro.
 */
import { Temporal } from '@js-temporal/polyfill';
import type { CoffeeShot } from './types';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const TIME_ZONE = 'America/Chicago';

/** Excludes shots pulled by a guest barista so the charts reflect one person. */
export function filterShots(shots: CoffeeShot[]): CoffeeShot[] {
  return shots.filter((shot) => !(shot.barista ?? '').toLowerCase().includes('mccrary'));
}

export function isPourover(shot: CoffeeShot): boolean {
  return shot.profileTitle === 'NextLevel Pulsar';
}

/**
 * Splits an ISO instant into `[year, month, day]` numbers in the local (Chicago)
 * calendar. Returns null for anything that does not parse.
 */
function localDate(startTime: string): Temporal.PlainDate | null {
  try {
    const instant = Temporal.Instant.from(startTime);
    return instant.toZonedDateTimeISO(TIME_ZONE).toPlainDate();
  } catch {
    return null;
  }
}

export interface MonthlySeries {
  labels: string[];
  data: { regular: number[]; pourover: number[] };
  totals: number[];
}

export function processMonthlyData(shots: CoffeeShot[]): MonthlySeries {
  const espressoCounts: Record<string, number> = {};
  const pouroverCounts: Record<string, number> = {};

  for (const shot of filterShots(shots)) {
    const date = localDate(shot.startTime);
    if (!date) continue;
    const key = `${MONTH_NAMES[date.month - 1]} ${String(date.year)}`;
    const bucket = isPourover(shot) ? pouroverCounts : espressoCounts;
    bucket[key] = (bucket[key] ?? 0) + 1;
  }

  const labels = [
    ...new Set([...Object.keys(espressoCounts), ...Object.keys(pouroverCounts)]),
  ].sort((a, b) => {
    const [monthA, yearA] = a.split(' ');
    const [monthB, yearB] = b.split(' ');
    if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
    return MONTH_NAMES.indexOf(monthA) - MONTH_NAMES.indexOf(monthB);
  });

  const regular = labels.map((m) => espressoCounts[m] ?? 0);
  const pourover = labels.map((m) => pouroverCounts[m] ?? 0);

  return {
    labels,
    data: { regular, pourover },
    totals: labels.map((_, i) => regular[i] + pourover[i]),
  };
}

export interface DailySeries {
  labels: string[];
  data: { regular: number[]; decaf: number[]; pourover: number[] };
}

/**
 * Counts drinks per day for the last `days` days ending at `today` (local date).
 * Days with no drinks are kept so the x-axis stays continuous.
 */
export function processDailyData(
  shots: CoffeeShot[],
  today: Temporal.PlainDate = Temporal.Now.plainDateISO(TIME_ZONE),
  days = 60
): DailySeries {
  const filtered = filterShots(shots);
  if (filtered.length === 0) {
    return { labels: [], data: { regular: [], decaf: [], pourover: [] } };
  }

  const allDates: string[] = [];
  const regular: Record<string, number> = {};
  const decaf: Record<string, number> = {};
  const pourover: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const key = today.subtract({ days: i }).toString();
    allDates.push(key);
    regular[key] = 0;
    decaf[key] = 0;
    pourover[key] = 0;
  }

  for (const shot of filtered) {
    const date = localDate(shot.startTime);
    if (!date) continue;
    const key = date.toString();
    if (!(key in regular)) continue;
    if (isPourover(shot)) pourover[key] += 1;
    else if (shot.decaf) decaf[key] += 1;
    else regular[key] += 1;
  }

  return {
    labels: allDates.map((date) => {
      const [, m, d] = date.split('-');
      return `${m}/${d}`;
    }),
    data: {
      regular: allDates.map((d) => regular[d]),
      decaf: allDates.map((d) => decaf[d]),
      pourover: allDates.map((d) => pourover[d]),
    },
  };
}

export interface TimeOfDaySeries {
  labels: string[];
  fullLabels: string[];
  data: number[];
}

export function processTimeOfDayData(shots: CoffeeShot[]): TimeOfDaySeries {
  const filtered = filterShots(shots);
  if (filtered.length === 0) return { labels: [], fullLabels: [], data: [] };

  const hourly = new Array<number>(24).fill(0);
  for (const shot of filtered) {
    try {
      const hour = Temporal.Instant.from(shot.startTime).toZonedDateTimeISO(TIME_ZONE).hour;
      hourly[hour] += 1;
    } catch {
      // skip unparseable instants
    }
  }

  const labels: string[] = [];
  const fullLabels: string[] = [];
  for (let h = 0; h < 24; h++) {
    const startHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const endHour = h + 1 === 12 ? 12 : h + 1 > 12 ? h + 1 - 12 : h + 1;
    const startPeriod = h < 12 ? 'am' : 'pm';
    const endPeriod = h + 1 < 12 || h + 1 === 24 ? 'am' : 'pm';
    const start = `${String(startHour)}${startPeriod}`;
    labels.push(start);
    fullLabels.push(`${start}-${String(endHour)}${endPeriod}`);
  }

  return { labels, fullLabels, data: hourly };
}

export interface MonthRank {
  month: string;
  count: number;
}

export function getTopMonths(labels: string[], totals: number[], take = 3): MonthRank[] {
  return labels
    .map((month, i) => ({ month, count: totals[i] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, take);
}

/**
 * Formats an ISO instant as `YYYY-MM-DD h:mm AM CDT` in Chicago time for the
 * "Last updated" label. Returns null when there is no instant to show.
 */
export function formatLocalStamp(iso: string | null): string | null {
  if (!iso) return null;
  let zoned: Temporal.ZonedDateTime;
  try {
    zoned = Temporal.Instant.from(iso).toZonedDateTimeISO(TIME_ZONE);
  } catch {
    return null;
  }
  const month = String(zoned.month).padStart(2, '0');
  const day = String(zoned.day).padStart(2, '0');
  const minute = String(zoned.minute).padStart(2, '0');
  const ampm = zoned.hour >= 12 ? 'PM' : 'AM';
  const hour12 = zoned.hour % 12 || 12;
  const tz = zoned.offset === '-06:00' ? 'CST' : 'CDT';
  return `${String(zoned.year)}-${month}-${day} ${String(hour12)}:${minute} ${ampm} ${tz}`;
}
