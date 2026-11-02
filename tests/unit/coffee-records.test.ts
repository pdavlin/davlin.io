import { describe, it, expect } from 'vitest';
import { payloadFromRecords, shotFromRecord } from '../../src/lib/coffee/records.mjs';
import { isCoffeeShotsPayload } from '../../src/lib/coffee/validate.mjs';

function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    $type: 'io.davlin.coffee.shot',
    shotId: '669eae76-7104-4eb7-9d1e-725353bae7b7',
    startTime: '2021-02-27T02:26:34.000Z',
    profileTitle: 'Extractamundo Dos!',
    decaf: false,
    createdAt: '2026-11-02T15:53:24.141Z',
    ...overrides,
  };
}

describe('shotFromRecord', () => {
  it('maps omitted optional fields to null and drops record-only fields', () => {
    expect(shotFromRecord(record())).toEqual({
      id: '669eae76-7104-4eb7-9d1e-725353bae7b7',
      startTime: '2021-02-27T02:26:34.000Z',
      profileTitle: 'Extractamundo Dos!',
      barista: null,
      beanBrand: null,
      beanType: null,
      roastLevel: null,
      coffeeBag: null,
      decaf: false,
    });
  });

  it('rejects records missing a required field', () => {
    expect(shotFromRecord(record({ shotId: undefined }))).toBeNull();
    expect(shotFromRecord(record({ startTime: 42 }))).toBeNull();
    expect(shotFromRecord(record({ decaf: 'no' }))).toBeNull();
  });
});

describe('payloadFromRecords', () => {
  it('sorts oldest first, sets latestShotAt, and counts skipped records', () => {
    const { payload, skipped } = payloadFromRecords(
      [
        record({ shotId: 'b', startTime: '2026-11-02T15:10:40.000Z' }),
        record({ shotId: 'bad', decaf: undefined }),
        record({ shotId: 'a', startTime: '2021-02-27T02:26:34.000Z' }),
      ],
      '2026-11-02T20:00:00.000Z'
    );
    expect(payload.shots.map((s) => s.id)).toEqual(['a', 'b']);
    expect(payload.latestShotAt).toBe('2026-11-02T15:10:40.000Z');
    expect(skipped).toBe(1);
    expect(isCoffeeShotsPayload(payload)).toBe(true);
  });

  it('returns a null latestShotAt for no records', () => {
    expect(payloadFromRecords([], '2026-11-02T20:00:00.000Z').payload.latestShotAt).toBeNull();
  });
});
