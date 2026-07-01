import React from 'react';

/*
 * Twin-predictions leaderboard — static, server-rendered (reveal-on only).
 *
 * Rendered by `twin-predictions.astro` WITHOUT a `client:*` directive, so Astro emits it as
 * plain HTML and ships ZERO client JavaScript for it — there is no island chunk in the
 * bundle at all, reveal-on or reveal-off. Expand/collapse uses native <details>/<summary>,
 * which needs no hydration. Because it ships no logic, it cannot leak a secret by
 * construction, and it never references AIRTABLE_API_KEY.
 *
 * It is only rendered when `twin-predictions-leaderboard.json` exists (the reveal-on build
 * wrote it). It receives the already-scored, PUBLIC leaderboard rows as a prop — never the
 * babies' names or the raw actuals.
 *
 * Theme: reuses the Dashboard's tokens and helper classes (pd-style-content-box, mono,
 * serif, kick, tnum) so the two views render as one cohesive page. The `.pdroot` variable
 * block is duplicated here (identical values) so the leaderboard is self-contained.
 *
 * Props:
 *   data — LeaderboardRow[] (see src/lib/twin-predictions/score.mjs for the shape).
 */

/* ---------- fonts ---------- */
const MONO = "'Berkeley Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const SERIF = "'Merriweather', Georgia, 'Times New Roman', serif";

/* ---------- base16 (Atelier Plateau) — concrete hex, matching Dashboard ---------- */
const HEX = {
  green: '#4b8b8b', // base0b — accent
  cyan: '#5485b6', // base0c
  magenta: '#bd5187', // base0f
};
const GIRL = HEX.magenta;
const BOY = HEX.cyan;
const ACCENT = HEX.green;

/** Human labels + per-baby tint for the per-dimension breakdown rows. */
const DIMENSION_META = [
  { key: 'date', label: 'birthday', unit: 'd', color: 'var(--foreground-color)' },
  { key: 'girlWt', label: 'girl weight', unit: 'oz', color: GIRL },
  { key: 'boyWt', label: 'boy weight', unit: 'oz', color: BOY },
  { key: 'girlLen', label: 'girl length', unit: '″', color: GIRL },
  { key: 'boyLen', label: 'boy length', unit: '″', color: BOY },
];

/** The three tie-breaker bonus fields, for the matched-bonus indicators. */
const BONUS_META = [
  { key: 'first', label: 'first' },
  { key: 'faint', label: 'faint' },
  { key: 'yell', label: 'yell' },
];

/**
 * Rounds a raw distance for display without trailing-zero noise.
 *
 * @param {number} value - A raw absolute distance.
 * @returns {string} The value rounded to at most one decimal place.
 */
const fmtDistance = (value) => String(Math.round(value * 10) / 10);

export default function Leaderboard({ data }) {
  const rows = data ?? [];

  if (rows.length === 0) return null;

  return (
    <div
      className="pdroot"
      style={{
        background: 'var(--background-color)',
        color: 'var(--foreground-color)',
        padding: '0 22px 56px',
        fontFamily: MONO,
      }}
    >
      <style>{`
        @import url("https://cdn.cache.lol/type/berkeley-mono/berkeley-mono.css");
        @import url("https://fonts.googleapis.com/css2?family=Maitree&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap");
        .pdroot {
          --base00: hsl(0, 7%, 10%); --base01: hsl(0, 6%, 15%); --base02: hsl(0, 5%, 33%); --base03: hsl(0, 4%, 38%);
          --base04: hsl(0, 3%, 48%); --base05: hsl(0, 2%, 53%); --base06: hsl(0, 15%, 89%); --base07: hsl(0, 25%, 94%);
          --base0b: hsl(180, 30%, 42%);
          --preferred-accent-color: var(--base0b);
          --background-color: var(--base07);
          --foreground-color: var(--base00);
          --border-radius: 0px;
          --border-thickness: 2px;
          --border-color: var(--base03);
          --accent-border-color: var(--preferred-accent-color);
          --transition-timing: 0.2s ease;
          --muted: var(--base02); --faint: var(--base04); --subtle: var(--base06);
        }
        @media (prefers-color-scheme: dark) {
          .pdroot {
            --background-color: var(--base00); --foreground-color: var(--base07);
            --muted: var(--base05); --faint: var(--base04); --subtle: var(--base01);
          }
        }
        .pd-style-content-box {
          margin-top: 0;
          border-radius: var(--border-radius);
          border: var(--border-thickness) solid var(--border-color);
          transition: border-color var(--transition-timing);
          position: relative;
        }
        .pd-style-content-box:hover { border-color: var(--accent-border-color); }
        .mono { font-family: ${MONO}; }
        .serif { font-family: ${SERIF}; }
        .tnum { font-variant-numeric: tabular-nums; }
        .kick { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--faint); }
        /* native <details> expand/collapse — no JS. Hide the default disclosure marker. */
        .tp-rank > summary { list-style: none; cursor: pointer; }
        .tp-rank > summary::-webkit-details-marker { display: none; }
        .tp-caret { display: inline-block; transition: transform var(--transition-timing); color: var(--faint); }
        .tp-rank[open] .tp-caret { transform: rotate(90deg); }
      `}</style>

      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* section header — mirrors Dashboard's <Section> */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 14,
            borderBottom: 'var(--border-thickness) solid var(--border-color)',
            paddingBottom: 8,
          }}
        >
          <div>
            <div className="kick" style={{ marginBottom: 3 }}>
              the results are in
            </div>
            <h2 className="serif" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              closest guesses
            </h2>
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--faint)' }}>
            lower distance = closer · tap a row for detail
          </span>
        </div>

        {/* ranked rows — each a native <details> so expand/collapse needs no JS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((row) => {
            const isWinner = row.rank === 1;
            return (
              <details
                key={row.id}
                className="pd-style-content-box tp-rank"
                style={
                  isWinner
                    ? { borderColor: ACCENT, borderWidth: 'var(--border-thickness)' }
                    : undefined
                }
              >
                {/* summary row — the whole thing is the click/keyboard target */}
                <summary
                  className="mono"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto 1fr auto',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                  }}
                >
                  <span className="tp-caret" aria-hidden="true">
                    ▸
                  </span>

                  {/* rank */}
                  <span
                    className="serif tnum"
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: isWinner ? ACCENT : 'var(--faint)',
                      minWidth: 34,
                    }}
                  >
                    {row.rank}
                  </span>

                  {/* name + bonus indicators */}
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground-color)' }}
                    >
                      {row.name}
                    </span>
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {BONUS_META.map((bonus) => {
                        const hit = row.matched?.[bonus.key];
                        return (
                          <span
                            key={bonus.key}
                            className="kick"
                            style={{
                              color: hit ? ACCENT : 'var(--faint)',
                              opacity: hit ? 1 : 0.45,
                            }}
                          >
                            {hit ? '●' : '○'} {bonus.label}
                          </span>
                        );
                      })}
                    </span>
                  </span>

                  {/* total distance + bonus tally */}
                  <span style={{ textAlign: 'right' }}>
                    <span
                      className="mono tnum"
                      style={{ display: 'block', fontSize: 18, fontWeight: 700 }}
                    >
                      {fmtDistance(row.distance)}
                    </span>
                    <span className="kick">
                      {row.bonus} bonus{row.bonus === 1 ? '' : 'es'}
                    </span>
                  </span>
                </summary>

                {/* per-dimension breakdown (raw absolute distances) */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    padding: '12px 16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 10,
                    background: 'var(--subtle)',
                  }}
                >
                  {DIMENSION_META.map((dim) => (
                    <div key={dim.key}>
                      <div className="kick" style={{ marginBottom: 2 }}>
                        {dim.label}
                      </div>
                      <div
                        className="mono tnum"
                        style={{ fontSize: 14, fontWeight: 700, color: dim.color }}
                      >
                        {fmtDistance(row.breakdown[dim.key])} {dim.unit}
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 400 }}
                        >
                          {' '}
                          off
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
