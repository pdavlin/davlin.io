/**
 * Build-time OG image generation for project detail pages.
 *
 * Projects are hand-written .astro pages (no content collection), so unlike
 * films the slugs are enumerated by hand in src/lib/og/projects.ts — adding a
 * project page is one line there. The page route wins anyway (static beats
 * dynamic), and this endpoint only ever serves /projects/<slug>/og.png.
 * Endpoint pattern copied from src/pages/films/[slug]/og.png.ts.
 */
import type { APIRoute } from 'astro';
import { loadOgFont, renderProjectCard } from '../../../lib/og/card';
import { PROJECT_DETAILS } from '../../../lib/og/projects';

export function getStaticPaths() {
  return PROJECT_DETAILS.map((project) => ({
    params: { slug: project.slug },
    props: { project },
  }));
}

const font = await loadOgFont();

export const GET: APIRoute = async ({ props }) => {
  const { project } = props;
  const png = await renderProjectCard(project, font);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
