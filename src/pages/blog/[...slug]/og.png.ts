/**
 * Build-time OG image generation for blog post pages.
 *
 * Prerendered by Astro's static endpoint machinery: one 1200×630 PNG per
 * post, served at the page's own path + /og.png (e.g. /blog/<slug>/og.png) —
 * DocumentHead.astro points og:image there. Mirrors the film endpoint
 * (src/pages/films/[slug]/og.png.ts); the [...slug] param matches the blog
 * page route (src/pages/blog/[...slug].astro) so URLs align whether post
 * slugs are flat or nested. Design: locked variant-A card (see
 * src/lib/og/card.ts); pitfalls + verification story in
 * spikes/001-og-satori/README.md.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderBlogCard, loadOgFont } from '../../../lib/og/card';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  const posts = notes.filter((note) => note.data.type !== 'film');
  return posts.map((note) => ({
    params: { slug: note.id },
    props: { note },
  }));
}

const font = await loadOgFont();

export const GET: APIRoute = async ({ props }) => {
  const { note } = props;
  const { data } = note;
  const png = await renderBlogCard(
    {
      title: data.title,
      slug: note.id,
      postDate: data.added,
    },
    font
  );
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
