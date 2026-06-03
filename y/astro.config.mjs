// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx'; // Para Markdown
import react from '@astrojs/react';

export default defineConfig({
  integrations: [mdx(), react()],
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
});
