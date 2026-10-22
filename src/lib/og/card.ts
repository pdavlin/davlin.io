/**
 * OG card renderer for davlin.io.
 *
 * Design locked 2026-09-10 (Patrick): variant A "light editorial" with the
 * variant-B filepath footer — light theme ground, day-rotation accent,
 * oversized title, star rating + year, ~/films/<slug> footer. DAVLIN-2 adds
 * the blog variant: same skeleton, "BLOG" masthead, YYYY-MM-DD date meta row
 * (no rating), ~/blog/<slug> footer.
 *
 * Ported from spikes/001-og-satori (see its README for the full list of
 * satori pitfalls and their workarounds, each hit and verified during the
 * spike: React-shaped element trees, per-glyph spans to dodge the
 * letterSpacing overlap quirk, explicit display on every div incl. absolute
 * overlays, geometric half-stars because Berkeley Mono has no ★/½).
 *
 * DAVLIN-3 adds project cards on the same locked layout, minus the rating
 * row: masthead section reads PROJECTS, the tagline replaces the year+stars
 * row, and the footer is the page path (~/projects for the listing, which
 * has no slug).
 */
import satori from 'satori';
import type { ReactNode } from 'react';
import { Resvg } from '@resvg/resvg-js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Accent set from theme.css (--base_08..0f), in day-rotation order. */
const ACCENTS = [
  '#ca4949',
  '#b45a3c',
  '#a06e3b',
  '#4b8b8b',
  '#5485b6',
  '#7272ca',
  '#8464c4',
  '#bd5187',
];

/** Site palette (theme.css). */
const T = {
  base00: '#1b1818',
  base01: '#292424',
  base02: '#585050',
  base03: '#655d5d',
  base04: '#7e7777',
  base05: '#8a8585',
  base06: '#e7dfdf',
  base07: '#f4ecec',
};

/** Day-rotation accent: days[dayOfMonth % 8] — mirrors the DocumentHead.astro
 * script (days = ['8'..'f'] over base_08..base_0f). Falls back to the site's
 * default accent (--base_0b, teal) when no date is available. */
export function dayAccent(date?: string | Date | null): string {
  if (date instanceof Date) return ACCENTS[date.getUTCDate() % 8];
  const m = typeof date === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(date) : null;
  if (m) return ACCENTS[Number(m[3]) % 8];
  return ACCENTS[3]; // teal — the site's :root default
}

// --- satori element helpers (React-shaped trees: { type, props }) ---
type Style = Record<string, string | number | undefined>;
type Child = OgElement | string | null;
interface OgElement {
  type: string;
  props: { style?: Style; children?: Child | Child[] };
}
const el = (type: string, style: Style = {}, children: Child | Child[] = ''): OgElement => ({
  type,
  props: { style, children },
});
const span = (style: Style, text: string) => el('span', style, text);

/** Rating row: one cell per star, flex gap (never letter-spacing — see spike
 * README). x.5 renders left-solid/right-dim at full glyph width; empty slots
 * are dim. Berkeley Mono has no ★ or ½, so halves are geometric: solid glyph,
 * bg-colored mask over its right half, dim glyph layered on top. */
function starsRow(rating: number, size: number, color: string, bgColor: string): OgElement {
  const cellW = Math.round(size * 0.62);
  const full = Math.floor(rating);
  const halfIdx = rating % 1 >= 0.5 ? full : -1;
  const glyph = (opacity?: number) =>
    span(
      {
        position: 'absolute',
        left: 0,
        top: 0,
        fontSize: size,
        lineHeight: 1,
        color,
        ...(opacity !== undefined ? { opacity } : {}),
      },
      '*'
    );
  return el(
    'div',
    { display: 'flex', gap: 8, alignItems: 'flex-start' },
    Array.from({ length: 5 }, (_, i) => {
      let kids: OgElement[];
      if (i === halfIdx) {
        kids = [
          glyph(),
          el(
            'div',
            {
              position: 'absolute',
              display: 'flex',
              left: '50%',
              top: 0,
              width: '50%',
              height: '100%',
              backgroundColor: bgColor,
            },
            ''
          ),
          glyph(0.5),
        ];
      } else if (i < full) {
        kids = [glyph()];
      } else {
        kids = [glyph(0.5)];
      }
      return el('div', { position: 'relative', display: 'flex', width: cellW, height: size }, kids);
    })
  );
}

const titleSize = (t: string) => (t.length > 42 ? 60 : t.length > 24 ? 84 : 104);

function masthead(accent: string, section = 'FILM REVIEWS'): OgElement {
  return el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
    span({ fontSize: 24, color: T.base02, letterSpacing: 6 }, 'PATRICK DAVLIN'),
    span({ fontSize: 24, color: accent, letterSpacing: 6 }, section),
  ]);
}

const pad = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  padding: 64,
  justifyContent: 'space-between',
};

export interface FilmCardData {
  title: string;
  filmYear: number | string;
  rating: number;
  slug: string;
  /** Review date (watchedDate ?? added) — drives the day-rotation accent. */
  reviewDate: string | Date | null;
}

function filmCard(film: FilmCardData, accent: string): OgElement {
  return el('div', { ...pad, backgroundColor: T.base07, borderTop: `16px solid ${accent}` }, [
    masthead(accent, 'FILM REVIEWS'),
    el('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
      span({ fontSize: titleSize(film.title), color: T.base01, lineHeight: 1.15 }, film.title),
      el('div', { display: 'flex', alignItems: 'baseline', gap: 28 }, [
        span({ fontSize: 40, color: T.base03 }, String(film.filmYear)),
        starsRow(film.rating, 40, accent, T.base07),
      ]),
    ]),
    span({ fontSize: 24, color: T.base04 }, `~/films/${film.slug}`),
  ]);
}

/** Render a film OG card to PNG bytes (1200×630). */
export async function renderFilmCard(film: FilmCardData, fontData: Buffer): Promise<Buffer> {
  const accent = dayAccent(film.reviewDate);
  const tree = filmCard(film, accent) as unknown as ReactNode;
  const svg = await satori(tree, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [{ name: 'BerkeleyMono', data: fontData, weight: 400, style: 'normal' }],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}

export interface BlogCardData {
  title: string;
  slug: string;
  /** Publish date (added) — drives the day-rotation accent and the meta row. */
  postDate: string | Date | null;
}

/** Post date as YYYY-MM-DD. Frontmatter dates arrive via dateStringSchema as
 * 'YYYY-MM-DD HH:mm' (or a Date the schema already flattened); slice the ISO
 * date part, formatting Dates in UTC so the builder's timezone can't shift
 * the day (same rule as the schema + dayAccent). */
function formatPostDate(date: string | Date | null): string {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10); // ISO date part, already UTC
  }
  const m = typeof date === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(date) : null;
  return m ? m[0] : '';
}

function blogCard(post: BlogCardData, accent: string): OgElement {
  return el('div', { ...pad, backgroundColor: T.base07, borderTop: `16px solid ${accent}` }, [
    masthead(accent, 'BLOG'),
    el('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
      span({ fontSize: titleSize(post.title), color: T.base01, lineHeight: 1.15 }, post.title),
      span({ fontSize: 40, color: T.base03 }, formatPostDate(post.postDate)),
    ]),
    span({ fontSize: 24, color: T.base04 }, `~/blog/${post.slug}`),
  ]);
}

/** Render a blog OG card to PNG bytes (1200×630). */
export async function renderBlogCard(post: BlogCardData, fontData: Buffer): Promise<Buffer> {
  const accent = dayAccent(post.postDate);
  const tree = blogCard(post, accent) as unknown as ReactNode;
  const svg = await satori(tree, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [{ name: 'BerkeleyMono', data: fontData, weight: 400, style: 'normal' }],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}

// --- project cards (DAVLIN-3) ---

export interface ProjectCardData {
  /** Page slug under /projects — '' means the /projects listing itself. */
  slug: string;
  /** Card title (the page's display title, sans the " | davlin.io" suffix). */
  name: string;
  /** Tagline — mirrors the page's `description` passed to DocumentHead. */
  tagline: string;
}

/** Filepath footer: ~/projects/<slug>, or bare ~/projects for the listing. */
export function projectFooterPath(slug: string): string {
  return slug ? `~/projects/${slug}` : '~/projects';
}

function projectCard(project: ProjectCardData, accent: string): OgElement {
  return el('div', { ...pad, backgroundColor: T.base07, borderTop: `16px solid ${accent}` }, [
    masthead(accent, 'PROJECTS'),
    el('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
      span({ fontSize: titleSize(project.name), color: T.base01, lineHeight: 1.15 }, project.name),
      span({ fontSize: 34, color: T.base03, lineHeight: 1.3 }, project.tagline),
    ]),
    span({ fontSize: 24, color: T.base04 }, projectFooterPath(project.slug)),
  ]);
}

/**
 * Render a project OG card to PNG bytes (1200×630).
 *
 * Projects have no review date to key the day-rotation accent to, so the
 * accent freezes at BUILD day (new Date() at prerender time) — the same
 * freeze-on-a-day semantic as film cards, which freeze on the watch day:
 * deterministic per build, stable in social-share caches.
 */
export async function renderProjectCard(
  project: ProjectCardData,
  fontData: Buffer,
  date: Date = new Date()
): Promise<Buffer> {
  const accent = dayAccent(date);
  const tree = projectCard(project, accent) as unknown as ReactNode;
  const svg = await satori(tree, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [{ name: 'BerkeleyMono', data: fontData, weight: 400, style: 'normal' }],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}

/** Load the site font for satori. WOFF is supported; WOFF2 is not. */
export async function loadOgFont(): Promise<Buffer> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  // resolve relative to this module: src/lib/og -> ../../../public
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  return fs.readFile(
    path.join(here, '..', '..', '..', 'public', 'fonts', 'BerkeleyMono-Regular.woff')
  );
}
