# 001-og-satori — Satori OG image generation for davlin.io

**Question:** Can we generate on-brand 1200×630 OG cards for film reviews at build time with Satori, using the site's own Berkeley Mono WOFF and theme.css palette?

## Approach
- `satori@0.33.4` (JSX-object trees → SVG) + `@resvg/resvg-js` (SVG → PNG)
- Font: `public/fonts/BerkeleyMono-Regular.woff` loaded directly — WOFF is natively supported by Satori (WOFF2 is not; this is usually the blocker for reusing site fonts, and here it just works)
- Data: real frontmatter from `src/content/notes/films/*.md` via gray-matter
- Three variants: A light editorial / B dark terminal / C accent poster (accent hashed from slug across the 8-color accent set)

## Results
- 9 cards (3 films × 3 variants) in 2.4s — ~270ms/card; trivially CI-viable at 246 films
- Visual check (all three variants, `The Shining`): no clipped text, no missing glyphs, no overlaps, palette faithful
- File sizes 22–32 KB per card — negligible

## Gotchas found (would have burned the real build)
1. **Satori object syntax is React-shaped**: `{ type, props: { style, children } }` — NOT `{ type, style, children }`. Fails with `Cannot read properties of undefined (reading 'children')` if you guess the flat shape.
2. Every container needs `display: 'flex'` explicitly.
3. `--variant`/`--match` CLI exists on render.mjs for quick single-card iteration.

## Verdict: VALIDATED

### Follow-up: day-rotation accent (requested by Patrick)
Accent now comes from the site's day-rotation script (DocumentHead.astro:
`days=['8'..'f'][dayOfMonth % 8]` over base_08–base_0f) instead of slug
hashing — review date = `watchedDate ?? added`, same field the film page
shows. Semantics note for the real build: the live site rotates by the
VISITOR's current day (client-side JS), while OG cards freeze the accent at
the review's watch day — deterministic per review, stable in share caches.
If "publish day" should mean `added`/`updated` instead of `watchedDate`,
it's a one-line swap in `dayOfMonth()`.

### Follow-up: rating glyphs — satori overlap quirk (Patrick caught it, twice)
First attempt used `*` + `·` filler in one string; a lone middot at 40px is a
~2px speck — invisible (Annihilation 4/5 read as just `****`). Switched to a
dimmed `*` for empty slots — STILL wrong: Patrick's screenshot showed
Cheerleader's 2 blue dim stars overlapping into one ligature-looking blob,
and Annihilation's dim 5th star hiding UNDER the 4th filled one (earlier
pixel check showed last cluster spanning [99,140] — actually two glyphs
stacked, misread as "faint but present").

ROOT CAUSE: satori does not include trailing letterSpacing in a span's
measured width, so a following sibling span starts before the previous
span's last glyph ends — adjacent-span glyphs overlap. NOT a font ligature.

FIX (robust): one span PER GLYPH, spacing via flex `gap: 8`, zero
letter-spacing — flex items are positioned by exact glyph advance, immune to
the quirk. starsRow() = 5 spans, filled or `opacity: 0.5`.

VERIFIED on real PNGs (cluster_check.mjs): accent-colored ink in the rating
band clusters into exactly 5 groups, widths 16-18px, even 32px pitch — no
merging. Vision at crop: "five distinct asterisks, none overlap, right three
fainter" ✓. Lesson: 'ink exists' is not 'glyphs separated' — cluster
analysis or a human eyeball both required; also, vision full-card passes
miss sub-threshold elements (dim glyphs, 2px dots) — crop tight when
verifying faint artifacts.

### Follow-up: half stars, v2 — left-solid/right-dim (final)
v1 (bg-masked solid alone) verified by pixels but read ambiguously at feed
scale: a lone left-half asterisk reads as a floating fragment. Final form:
dim full '*' base + solid '*' + bg-mask + ANOTHER dim '*' on top — net left
half solid, right half dim, full glyph width. Layering matters: cell is
flex-ROW so glyph layers must be position:absolute at left:0/top:0; mask sits
BELOW the top dim glyph. ratings are fractional in the data (x.5 ≈ 35% of 246
films; Berkeley Mono lacks ★ and ½ — cmap-parsed the WOFF).

Verified two ways:
- rating_sweep_check.mjs (geometry-anchored: finds the even-pitch 5-cluster
  run, classifies via left/right intensity split): ALL 10 RATINGS CORRECT —
  0.5 → 5.0, one real film each. Half cells read e.g. 301L/165R; dims are
  uniform L/R; fulls uniform high.
- vision at correct crop (locate_stars.mjs prints exact band/clusters —
  earlier "no split" reads were crops aimed at the title line): "left half
  solid dark brown, right half clearly lighter — exactly a half-filled star."
Gotchas for the production build: (1) classifier lesson — width alone can't
classify dim (full-size, low opacity) vs half (narrow, dark); check BOTH
width and intensity, and anchor on cluster geometry because year digits can
merge into the cluster list (Fantastic Four's "2015" 5 merged). (2) thresholds
on blended colors need slack — 0.55 vs 0.65 of max flipped 3 cells; real gap
is wide (half≈0.55, dim≈0.40) but pick thresholds from measured distributions.

### What worked
- Whole pipeline (font load → satori → resvg → PNG) with zero native-build friction; resvg ships prebuilt binaries
- Berkeley Mono WOFF renders perfectly at display sizes (slashed zero reads great in year/URL strings)
- Accent hashing gives every film a distinct identity without artwork

### What didn't
- exe.dev `new` via non-interactive SSH — couldn't script VM creation; gallery served locally instead (hosting still trivial: any static dir + Caddy on a VM, or Netlify preview)

### Recommendation for the real build (DAVLIN-1/2/3)
- Productionize as Astro static PNG endpoints (`getStaticPaths` per film/blog/project), one shared template + three presets
- Prereq for the build: move/keep font as WOFF, wire `og:image` in DocumentHead.astro to `/og/<path>.png`
- Pick variant(s) first: A is the safe default; C scales best across 246 films; B is the most "on brand" for a mono site