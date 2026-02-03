/* eslint-disable no-undef */
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFromFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    /** @type {Record<string, string>} */
    const env = {};

    for (const line of envContent.split('\n')) {
      if (!line || line.startsWith('#')) continue;

      const [key, value] = line.split('=');
      if (key && value) {
        env[key.trim()] = value.trim();
      }
    }

    return env;
  } catch {
    return {};
  }
}

const envVars = loadEnvFromFile();

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap()],
  site: 'https://davlin.io',
  markdown: {
    shikiConfig: {
      themes: {
        dark: 'github-light',
        light: 'github-dark',
      },
      langs: [],
      wrap: true,
    },
  },
  vite: {
    define: {
      'import.meta.env.AIRTABLE_API_KEY': JSON.stringify(
        envVars.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY
      ),
      'import.meta.env.AIRTABLE_BASE_ID': JSON.stringify(
        envVars.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID
      ),
    },
  },
});
