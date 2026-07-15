import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { noteSchema } from './lib/content-schema';

const notesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: noteSchema,
});

export const collections = {
  notes: notesCollection,
};
