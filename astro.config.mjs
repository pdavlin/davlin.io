import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [sitemap()],
  site: "https://davlin.io",
  markdown: {
    shikiConfig: {
      themes: {
        dark: "github-light",
        light: "github-dark",
      },
      langs: [],
      // Enable word wrap to prevent horizontal scrolling
      wrap: true,
    },
  },
});
