/**
 * Spike 001 — Satori OG image generation for davlin.io film reviews.
 *
 * Renders 1200x630 OG cards with Satori (object trees -> SVG) and rasterizes
 * with @resvg/resvg-js. Uses the site's real Berkeley Mono WOFF and the
 * palette from src/styles/theme.css.
 *
 * Three variants:
 *   A "editorial" — light theme, huge title, accent rule
 *   B "terminal"  — dark theme, mono-first aesthetic
 *   C "poster"    — per-film accent background (hashed from slug)
 *
 * Usage: node render.mjs                    (sample films, all variants)
 *        node render.mjs --variant a --match shining
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');

// --- site design tokens (from src/styles/theme.css) ---
const T = {
  base00: '#1b1818', base01: '#292424', base02: '#585050', base03: '#655d5d',
  base04: '#7e7777', base05: '#8a8585', base06: '#e7dfdf', base07: '#f4ecec',
  teal: '#4b8b8b', red: '#ca4949', orange: '#b45a3c', yellow: '#a06e3b',
  blue: '#5485b6', purple: '#7272ca', magenta: '#8464c4', pink: '#bd5187',
};
const ACCENTS = [T.red, T.orange, T.yellow, T.teal, T.blue, T.purple, T.magenta, T.pink];
const SITE = 'PATRICK DAVLIN';
const SECTION = 'FILM REVIEWS';
const W = 1200, H = 630;

// --- satori element helpers (props-nested shape) ---
const el = (type, style = {}, children = '') => ({ type, props: { style, children } });
const span = (style, text) => el('span', style, text);

// --- data ---
const FILMS_DIR = join(REPO, 'src/content/notes/films');
const films = readdirSync(FILMS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const { data } = matter(readFileSync(join(FILMS_DIR, f), 'utf8'));
    return { slug: f.replace(/\.md$/, ''), ...data };
  });

const hashAccent = (s) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

// --- day-rotation accent (mirrors the site's DocumentHead.astro script: ---
// days = ['8','9','a','b','c','d','e','f']; day = calendar day; hex = days[day % 8])
// Review date = watchedDate, falling back to added (same as the film page detail row).
const dayOfMonth = (f) => {
  const d = f.watchedDate ?? f.added;
  if (!d) return null;
  if (d instanceof Date) return d.getUTCDate();
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Number(m[3]) : null;
};
const dayAccent = (f) => {
  const day = dayOfMonth(f);
  // site default when the rotation script can't run: --base_0b (teal)
  return day == null ? ACCENTS[3] : ACCENTS[day % 8];
};

// --- shared pieces ---
// Rating row: one cell PER STAR, spaced by flex gap, no letter-spacing.
// (satori quirk found via Patrick's screenshot: letterSpacing isn't included
// in a span's measured width, so sibling spans' glyphs overlap — per-cell
// spans + gap are immune: flex items are positioned by exact glyph advance.)
// Ratings are fractional (x.5 common in the data). Berkeley Mono has NO ½ or
// ★ glyphs (cmap-checked), so a half star = dim full '*' base + solid '*'
// overlay with its right half masked by a background-colored rect. Net: left
// half solid, right half dim — a legible "half-filled" glyph (a bg-masked
// solid alone reads as a floating fragment at feed scale).
const starsRow = (n, size, color, bgColor, dim = 0.5) => {
  const cellW = Math.round(size * 0.62);
  const full = Math.floor(n);
  const halfIdx = n % 1 >= 0.5 ? full : -1; // the slot after the full stars
  return el('div', { display: 'flex', gap: 8, alignItems: 'flex-start' },
    Array.from({ length: 5 }, (_, i) => {
      let kids;
      if (i === halfIdx) {
        // layers, bottom→top: solid glyph, bg-mask (kills solid's right half),
        // dim glyph on TOP — its left half lands on the solid ink (~solid),
        // its right half sits over bg (dim). Net: left solid / right dim.
        kids = [
          span({ position: 'absolute', left: 0, top: 0, fontSize: size, lineHeight: 1, color }, '*'),
          el('div', { position: 'absolute', display: 'flex', left: '50%', top: 0, width: '50%', height: '100%', backgroundColor: bgColor }, ''),
          span({ position: 'absolute', left: 0, top: 0, fontSize: size, lineHeight: 1, color, opacity: dim }, '*'),
        ];
      } else if (i < full) {
        kids = [span({ fontSize: size, lineHeight: 1, color }, '*')];
      } else {
        kids = [span({ fontSize: size, lineHeight: 1, color, opacity: dim }, '*')];
      }
      return el('div', { position: 'relative', display: 'flex', width: cellW, height: size }, kids);
    }));
};
const titleSize = (t) => (t.length > 42 ? 60 : t.length > 24 ? 84 : 104);
const masthead = (color, accent) =>
  el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
    span({ fontSize: 24, color, letterSpacing: 6 }, SITE),
    span({ fontSize: 24, color: accent, letterSpacing: 6 }, SECTION),
  ]);
const pad = {
  display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
  padding: 64, justifyContent: 'space-between',
};

// --- variant A: light editorial (CHOSEN design — Patrick 2026-09-10) ---
// Footer uses variant B's filepath treatment (~/films/<slug>) instead of the URL.
function variantA(f, accent) {
  return el('div', { ...pad, backgroundColor: T.base07, borderTop: `16px solid ${accent}` }, [
    masthead(T.base02, accent),
    el('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
      span({ fontSize: titleSize(f.title), color: T.base01, lineHeight: 1.15 }, f.title),
      el('div', { display: 'flex', alignItems: 'baseline', gap: 28 }, [
        span({ fontSize: 40, color: T.base03 }, String(f.filmYear)),
        starsRow(f.rating, 40, accent, T.base07),
      ]),
    ]),
    span({ fontSize: 24, color: T.base04 }, `~/films/${f.slug}`),
  ]);
}

// --- variant B: dark terminal ---
function variantB(f, accent) {
  return el('div', { ...pad, backgroundColor: T.base00, border: `4px solid ${T.base01}` }, [
    el('div', { display: 'flex', gap: 16, alignItems: 'center' }, [
      span({ fontSize: 26, color: T.red }, '●'),
      span({ fontSize: 26, color: T.yellow }, '●'),
      span({ fontSize: 26, color: T.teal }, '●'),
      span({ fontSize: 24, color: T.base04, marginLeft: 12 }, `~/films/${f.slug}`),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', gap: 22 }, [
      span({ fontSize: 30, color: T.base05 }, `$ review --title "${f.title}"`),
      span({ fontSize: titleSize(f.title), color: T.base07, lineHeight: 1.15 }, f.title),
    ]),
    el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, [
      starsRow(f.rating, 36, accent, T.base00),
      span({ fontSize: 30, color: T.base04 }, String(f.filmYear)),
    ]),
  ]);
}

// --- variant C: accent poster (whole card in the film's hashed accent) ---
function variantC(f, accent) {
  return el('div', { ...pad, backgroundColor: accent }, [
    masthead(T.base06, T.base07),
    el('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
      span({ fontSize: titleSize(f.title), color: T.base07, lineHeight: 1.15 }, f.title),
      span({ fontSize: 36, color: T.base06, letterSpacing: 10 }, String(f.filmYear)),
    ]),
    el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, [
      starsRow(f.rating, 44, T.base07, accent),
      span({ fontSize: 22, color: T.base06 }, 'davlin.io'),
    ]),
  ]);
}

const VARIANTS = { a: variantA, b: variantB, c: variantC };

// --- render pipeline ---
const font = readFileSync(join(REPO, 'public/fonts/BerkeleyMono-Regular.woff'));

async function renderCard(film, variant) {
  const accent = dayAccent(film);
  const svg = await satori(VARIANTS[variant](film, accent), {
    width: W, height: H,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

// --- CLI ---
const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const variantFilter = argOf('--variant', null)?.toLowerCase();
const match = argOf('--match', null)?.toLowerCase();

const SAMPLE = ['the-shining-1980', 'but-i-m-a-cheerleader-1999', 'annihilation-2018'];
let chosen;
if (args.includes('--one-per-rating')) {
  // one real film per distinct rating (alphabetical first), ascending
  const byRating = new Map();
  for (const f of films.slice().sort((x, y) => x.slug.localeCompare(y.slug))) {
    const r = Number(f.rating);
    if (Number.isFinite(r) && !byRating.has(r)) byRating.set(r, f);
  }
  chosen = [...byRating.entries()].sort((a, b) => a[0] - b[0]).map(([r, f]) => {
    console.log(`rating ${r}: ${f.slug}`);
    return f;
  });
} else {
  chosen = films
    .filter((f) => (match ? f.slug.includes(match) : SAMPLE.includes(f.slug)))
    .slice(0, 8);
}

const outDir = join(__dirname, 'out');
mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const variants = variantFilter ? [variantFilter] : Object.keys(VARIANTS);
for (const v of variants) {
  for (const f of chosen) {
    const png = await renderCard(f, v);
    const path = join(outDir, `${v}-${f.slug}.png`);
    writeFileSync(path, png);
    console.log(`wrote ${path} (${(png.length / 1024).toFixed(0)} KB)`);
  }
}
console.log(`done: ${variants.length * chosen.length} cards in ${Date.now() - t0}ms`);