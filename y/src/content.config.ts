import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const wikiCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/wiki' }),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    date: z.date().optional(),
    summary: z.string(),
    details: z.array(
      z.object({
        heading: z.string(),
        text: z.string(),
      })
    ),
  }),
});

export const collections = {
  wiki: wikiCollection,
};