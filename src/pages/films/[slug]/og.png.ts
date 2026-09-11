/**
 * Build-time OG image generation for film review pages.
 *
 * Prerendered by Astro's static endpoint machinery: one 1200×630 PNG per
 * film, served at the page's own path + /og.png (e.g. /films/<slug>/og.png) —
 * DocumentHead.astro points og:image there. Design: locked variant-A card
 * (see src/lib/og/card.ts); pitfalls + verification story in
 * spikes/001-og-satori/README.md.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderFilmCard, loadOgFont } from '../../../lib/og/card';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  const films = notes.filter((note) => note.data.type === 'film');
  return films.map((note) => ({
    params: { slug: note.id.replace(/^films\//, '') },
    props: { note },
  }));
}

const font = await loadOgFont();

export const GET: APIRoute = async ({ props }) => {
  const { note } = props;
  const { data } = note;
  const png = await renderFilmCard(
    {
      title: data.title,
      filmYear: data.filmYear,
      rating: Number(data.rating ?? 0),
      slug: note.id.replace(/^films\//, ''),
      reviewDate: (data.watchedDate ?? data.added ?? null) as string | Date | null,
    },
    font
  );
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
