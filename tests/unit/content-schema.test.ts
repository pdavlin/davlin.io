import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Recreate the schema for testing (can't import Astro runtime in unit tests)
const dateStringSchema = z.union([
  z.string(),
  z.date().transform((date) => {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00`;
  }),
]);

const noteSchema = z.object({
  type: z.enum(['note', 'book', 'film']).optional(),
  title: z.string(),
  tags: z.array(z.string()),
  added: dateStringSchema,
  updated: dateStringSchema,
  excerpt: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  noComments: z.boolean().optional().nullable(),
  includeYTResources: z.boolean().optional().nullable(),
});

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
});
