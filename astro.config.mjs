import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import rehypeFootnotes from './src/plugins/rehype-footnotes.ts';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), sitemap()],
  site: 'https://davlin.io',
  env: {
    schema: {
      // Non-secret build flag gating the twin-predictions leaderboard. `server` context
      // keeps it out of client bundles; `astro:env` coerces and validates it, so the
      // page gets a real boolean instead of a hand-parsed string. The actuals/names gate
      // remains the build-time FETCH in scripts/fetch-actuals.mjs, which reads the same
      // REVEAL var from process.env.
      REVEAL: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },
  markdown: {
    // Astro 7 defaults to the Sätteri processor; `unified()` keeps the remark/rehype
    // pipeline this site's footnote plugin is written against.
    processor: unified({ rehypePlugins: [rehypeFootnotes] }),
    shikiConfig: {
      themes: {
        dark: 'github-light',
        light: 'github-dark',
      },
      langs: [],
      wrap: true,
    },
  },
});
