import { z, defineCollection } from 'astro:content';
import { Temporal } from '@js-temporal/polyfill';

const dateStringSchema = z.union([
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

const note = z.object({
  type: z.enum(['note', 'book', 'film']).optional(),
  title: z.string(),
  tags: z.array(z.string()),
  added: dateStringSchema,
  updated: dateStringSchema,
  excerpt: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  noComments: z.boolean().optional().nullable(),
  includeYTResources: z.boolean().optional().nullable(),
  // Film-specific fields
  filmYear: z.number().optional().nullable(),
  letterboxdUrl: z.string().url().optional().nullable(),
  watchedDate: dateStringSchema.optional().nullable(),
  isRewatch: z.boolean().optional().nullable(),
  tmdbId: z.string().optional().nullable(),
  letterboxdGuid: z.string().optional().nullable(),
  source: z.enum(['letterboxd', 'manual']).optional(),
});

const notesCollection = defineCollection({
  schema: note,
});

const comment = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.number(),
  html: z.string(),
  createdBy: z.object({
    fullName: z.string(),
  }),
});

const commentsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    comments: z.array(comment),
  }),
});

// 3. Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  notes: notesCollection,
  comments: commentsCollection,
};
