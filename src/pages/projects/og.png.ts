/**
 * Build-time OG image for the /projects listing — the site-wide default
 * project card. The listing has no slug, so the footer reads ~/projects and
 * the card lives at /projects/og.png. Single fixed route, prerendered like
 * the film cards (src/pages/films/[slug]/og.png.ts). Data:
 * src/lib/og/projects.ts.
 */
import type { APIRoute } from 'astro';
import { loadOgFont, renderProjectCard } from '../../lib/og/card';
import { PROJECTS_LISTING } from '../../lib/og/projects';

const font = await loadOgFont();

export const GET: APIRoute = async () => {
  const png = await renderProjectCard(PROJECTS_LISTING, font);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
