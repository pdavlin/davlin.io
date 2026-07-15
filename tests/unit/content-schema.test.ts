import { describe, it, expect } from 'vitest';
import { dateStringSchema, noteSchema } from '../../src/lib/content-schema';

describe('dateStringSchema', () => {
  it('accepts valid date string', () => {
    const result = dateStringSchema.safeParse('2026-01-08 14:30');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('2026-01-08 14:30');
    }
  });

  it('transforms Date object to string', () => {
    const result = dateStringSchema.safeParse(new Date('2026-01-08T14:30:00'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('2026-01-08 00:00');
    }
  });

  it('rejects invalid string format gracefully', () => {
    // Strings are passed through as-is
    const result = dateStringSchema.safeParse('not-a-date');
    expect(result.success).toBe(true);
  });
});

describe('noteSchema', () => {
  it('validates complete note object', () => {
    const validNote = {
      type: 'note' as const,
      title: 'Test Post',
      tags: ['test', 'example'],
      added: '2026-01-08 14:30',
      updated: '2026-01-08 14:30',
      excerpt: 'A test excerpt',
      rating: 4.5,
    };

    const result = noteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('validates note with minimum fields', () => {
    const minimalNote = {
      title: 'Minimal Post',
      tags: [],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
    };

    const result = noteSchema.safeParse(minimalNote);
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const invalidNote = {
      tags: ['test'],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
    };

    const result = noteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('rejects invalid type enum', () => {
    const invalidNote = {
      type: 'invalid',
      title: 'Test',
      tags: [],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
    };

    const result = noteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('accepts null for optional nullable fields', () => {
    const noteWithNulls = {
      title: 'Test',
      tags: [],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
      excerpt: null,
      rating: null,
    };

    const result = noteSchema.safeParse(noteWithNulls);
    expect(result.success).toBe(true);
  });

  it('accepts film type', () => {
    const filmNote = {
      type: 'film' as const,
      title: 'Test Film',
      tags: ['film'],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
      rating: 4,
    };

    const result = noteSchema.safeParse(filmNote);
    expect(result.success).toBe(true);
  });

  // The fields below are what the letterboxd importer actually writes. They were absent
  // from this file's previous hand-copied schema, so nothing checked them.
  it('validates a full letterboxd-imported film', () => {
    const result = noteSchema.safeParse({
      type: 'film' as const,
      title: 'Shattered Glass',
      tags: ['film'],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
      filmYear: 2003,
      letterboxdUrl: 'https://letterboxd.com/pdav/film/shattered-glass/',
      watchedDate: '2026-01-07 00:00',
      isRewatch: false,
      tmdbId: '12345',
      letterboxdGuid: 'letterboxd-review-123',
      source: 'letterboxd' as const,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed letterboxdUrl', () => {
    const result = noteSchema.safeParse({
      title: 'Test',
      tags: [],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
      letterboxdUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown source', () => {
    const result = noteSchema.safeParse({
      title: 'Test',
      tags: [],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
      source: 'imdb',
    });
    expect(result.success).toBe(false);
  });

  it('coerces a Date in watchedDate to a UTC date string', () => {
    const result = noteSchema.safeParse({
      title: 'Test',
      tags: [],
      added: '2026-01-08 00:00',
      updated: '2026-01-08 00:00',
      watchedDate: new Date('2026-01-07T23:30:00Z'),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.watchedDate).toBe('2026-01-07 00:00');
  });
});
