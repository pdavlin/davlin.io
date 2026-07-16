import { z } from 'astro/zod';
import { Temporal } from '@js-temporal/polyfill';

// Lives outside content.config.ts so tests can import the real schema: content.config.ts
// pulls in `astro:content`, a virtual module that only exists inside the Astro runtime.
// Everything here resolves under plain Node, so the schema the site builds with is the
// schema the tests exercise.

/**
 * Frontmatter dates arrive either as a `YYYY-MM-DD HH:mm` string or, when the YAML parser
 * recognises a bare date, as a `Date`. Normalise the latter to the former, in UTC so the
 * builder's local timezone can't shift the day.
 */
export const dateStringSchema = z.union([
  z.string(),
  z.date().transform((date) => {
    const instant = Temporal.Instant.fromEpochMilliseconds(date.getTime());
    const utcDate = instant.toZonedDateTimeISO('UTC');
    const year = String(utcDate.year);
    const month = String(utcDate.month).padStart(2, '0');
    const day = String(utcDate.day).padStart(2, '0');
    return `${year}-${month}-${day} 00:00`;
  }),
]);

export const noteSchema = z.object({
  type: z.enum(['note', 'book', 'film']).optional(),
  title: z.string(),
  tags: z.array(z.string()),
  added: dateStringSchema,
  updated: dateStringSchema,
  excerpt: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  noComments: z.boolean().optional().nullable(),
  includeYTResources: z.boolean().optional().nullable(),
  filmYear: z.number().optional().nullable(),
  letterboxdUrl: z.url().optional().nullable(),
  watchedDate: dateStringSchema.optional().nullable(),
  isRewatch: z.boolean().optional().nullable(),
  tmdbId: z.string().optional().nullable(),
  letterboxdGuid: z.string().optional().nullable(),
  source: z.enum(['letterboxd', 'manual']).optional(),
});
