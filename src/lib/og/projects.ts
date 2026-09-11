/**
 * Hand-enumerated OG card metadata for project pages.
 *
 * Projects are hand-written .astro pages (no content collection), so unlike
 * films (src/pages/films/[slug]/og.png.ts) card data can't come from
 * frontmatter — it lives here, one entry per project DETAIL page that renders
 * through DocumentHead, plus the /projects listing itself (slug ''). Adding a
 * future project page is one line in PROJECT_DETAILS plus the .astro page.
 */
import type { ProjectCardData } from './card';

/** The /projects listing page (src/pages/projects/index.astro). No slug —
 * its card lives at /projects/og.png and the footer reads ~/projects. */
export const PROJECTS_LISTING: ProjectCardData = {
  slug: '',
  name: 'Projects',
  tagline: 'Side projects and experiments',
};

/** Project detail pages (src/pages/projects/<slug>.astro). */
export const PROJECT_DETAILS: ProjectCardData[] = [
  {
    slug: 'twin-predictions',
    name: 'twin predictions',
    tagline: 'Baby shower twin prediction guesses, visualized',
  },
];
