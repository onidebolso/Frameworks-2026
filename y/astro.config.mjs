// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx'; // Para Markdown

export default defineConfig({
  integrations: [mdx()],
});
