import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { fmtOz } from '../../lib/twin-predictions/normalize.mjs';

/*
 * Twin-predictions dashboard — React island.
 *
 * Phase 1 refactor: this component used to own a hardcoded `RAW` array plus an inline
 * `normalize()`. Both moved to `src/lib/twin-predictions/normalize.mjs` and run at
 * build time. The component now receives already-normalized ballots as a prop, so the
 * island ships zero data-loading logic and cannot reference any secret. All chart,
 * theme, and render logic below is preserved unchanged.
 *
 * Props:
 *   ballots — Ballot[] (see src/lib/twin-predictions/normalize.mjs for the shape).
 */

/* ---------- fonts ---------- */
const MONO = "'Berkeley Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const SERIF = "'Merriweather', Georgia, 'Times New Roman', serif";

/* ---------- base16 (Atelier Plateau) — concrete hex for charts ---------- */
const HEX = {
  ink: '#1b1818', // base00
  paper: '#f4ecec', // base07
  line: '#655d5d', // base03
  faint: '#7e7777', // base04
  neutral: '#8a8585', // base05
  red: '#ca4949', // base08
  green: '#4b8b8b', // base0b — accent
  cyan: '#5485b6', // base0c
  magenta: '#bd5187', // base0f
};
const GIRL = HEX.magenta;
const BOY = HEX.cyan;
const ACCENT = HEX.green;

/* ---------- consensus helpers (kept in the component) ---------- */
const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const mode = (arr) => {
  const c = {};
  let best = arr[0],
    n = 0;
  for (const v of arr) {
    c[v] = (c[v] || 0) + 1;
    if (c[v] > n) {
      n = c[v];
      best = v;
    }
  }
  return { value: best, count: n };
};

export default function Dashboard({ ballots }) {
  const data = ballots;
  const N = data.length;
  const [showTable, setShowTable] = useState(false);

  const girlMed = median(data.map((d) => d.girlOz));
  const boyMed = median(data.map((d) => d.boyOz));
  const girlLenMed = median(data.map((d) => d.girlLen));
  const boyLenMed = median(data.map((d) => d.boyLen));
  const firstGirl = data.filter((d) => d.first === 'girl').length;
  const firstBoy = data.filter((d) => d.first === 'boy').length;
  const firstPicked = firstGirl + firstBoy;
  const faintYes = data.filter((d) => d.faint).length;
  const yellYes = data.filter((d) => d.yell).length;
  const dateMode = mode(data.map((d) => d.mdShort));

  /* mean (rounded) for the tap-to-toggle consensus stat */
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const girlMean = Math.round(avg(data.map((d) => d.girlOz)));
  const boyMean = Math.round(avg(data.map((d) => d.boyOz)));
  const girlLenMean = Math.round(avg(data.map((d) => d.girlLen)) * 10) / 10;
  const boyLenMean = Math.round(avg(data.map((d) => d.boyLen)) * 10) / 10;
  const [stat, setStat] = useState('median'); // "median" | "mean"
  const toggleStat = () => setStat((s) => (s === 'median' ? 'mean' : 'median'));

  const dateDist = useMemo(() => {
    const counts = {};
    for (const d of data) {
      counts[d.date] = (counts[d.date] || 0) + 1;
    }
    const sorted = data.map((d) => d.date).sort();
    const pad = (n) => String(n).padStart(2, '0');
    const cur = new Date(sorted[0] + 'T00:00:00');
    const end = new Date(sorted[sorted.length - 1] + 'T00:00:00');
    const out = [];
    while (cur <= end) {
      const iso = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      out.push({
        date: iso,
        md: `${cur.getMonth() + 1}/${cur.getDate()}`,
        count: counts[iso] || 0,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [data]);

  const weightDist = useMemo(() => {
    const lbs = [];
    for (const d of data) {
      lbs.push(Math.floor(d.girlOz / 16), Math.floor(d.boyOz / 16));
    }
    const lo = Math.min(...lbs),
      hi = Math.max(...lbs);
    const out = [];
    for (let lb = lo; lb <= hi; lb++) {
      out.push({
        bucket: `${lb} lb`,
        girl: data.filter((d) => Math.floor(d.girlOz / 16) === lb).length,
        boy: data.filter((d) => Math.floor(d.boyOz / 16) === lb).length,
      });
    }
    return out;
  }, [data]);

  const lengthDist = useMemo(() => {
    const ins = [];
    for (const d of data) {
      ins.push(Math.floor(d.girlLen), Math.floor(d.boyLen));
    }
    const lo = Math.min(...ins),
      hi = Math.max(...ins);
    const out = [];
    for (let i = lo; i <= hi; i++) {
      out.push({
        bucket: `${i}"`,
        girl: data.filter((d) => Math.floor(d.girlLen) === i).length,
        boy: data.filter((d) => Math.floor(d.boyLen) === i).length,
      });
    }
    return out;
  }, [data]);

  const tip = {
    contentStyle: {
      background: 'var(--background-color)',
      border: 'var(--border-thickness) solid var(--border-color)',
      borderRadius: 0,
      fontSize: 12,
      color: 'var(--foreground-color)',
      fontFamily: MONO,
    },
    labelStyle: { color: 'var(--muted)', fontFamily: MONO, fontSize: 11 },
    cursor: { fill: 'rgba(101,93,93,0.12)' },
  };

  return (
    <div
      className="pdroot"
      style={{
        background: 'var(--background-color)',
        color: 'var(--foreground-color)',
        padding: '40px 0 56px',
        minHeight: '100%',
        fontFamily: MONO,
      }}
    >
      <style>{`
        @import url("https://cdn.cache.lol/type/berkeley-mono/berkeley-mono.css");
        @import url("https://fonts.googleapis.com/css2?family=Maitree&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap");
        .pdroot {
          --base00: hsl(0, 7%, 10%); --base01: hsl(0, 6%, 15%); --base02: hsl(0, 5%, 33%); --base03: hsl(0, 4%, 38%);
          --base04: hsl(0, 3%, 48%); --base05: hsl(0, 2%, 53%); --base06: hsl(0, 15%, 89%); --base07: hsl(0, 25%, 94%);
          --base08: hsl(0, 55%, 54%); --base09: hsl(15, 50%, 47%); --base0a: hsl(30, 46%, 43%); --base0b: hsl(180, 30%, 42%);
          --base0c: hsl(210, 40%, 52%); --base0d: hsl(240, 45%, 62%); --base0e: hsl(260, 45%, 58%); --base0f: hsl(330, 45%, 53%);
          --preferred-accent-color: var(--base0b);
          --preferred-accent-hover-color: color-mix(in oklab, var(--preferred-accent-color) 70%, white);
          --background-color: var(--base07);
          --foreground-color: var(--base00);
          --font-family: "Berkeley Mono";
          --border-radius: 0px;
          --border-thickness: 2px;
          --border-color: var(--base03);
          --accent-border-color: var(--preferred-accent-color);
          --transition-timing: 0.2s ease;
          /* additive semantic helpers (not in main.css) */
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
        button.pd-style-content-box { background: transparent; color: var(--foreground-color); cursor: pointer; }
        .mono { font-family: ${MONO}; }
        .serif { font-family: ${SERIF}; }
        .tnum { font-variant-numeric: tabular-nums; }
        .kick { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--faint); }
        /* card grids collapse to a single column on narrow screens */
        .pd-grid-consensus { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .pd-grid-verdicts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 34px; }
        @media (max-width: 640px) {
          .pd-grid-consensus { grid-template-columns: 1fr; }
          .pd-grid-verdicts { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* header */}
        <header
          style={{
            borderBottom: 'var(--border-thickness) solid var(--border-color)',
            paddingBottom: 22,
            marginBottom: 30,
          }}
        >
          <h1
            className="serif"
            style={{
              fontSize: 40,
              lineHeight: 1.04,
              margin: 0,
              fontWeight: 900,
              letterSpacing: '-0.01em',
            }}
          >
            twin predictions
          </h1>
          <div
            className="mono"
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--muted)',
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <span>
              <Dot c={GIRL} />
              girl
            </span>
            <span>
              <Dot c={BOY} />
              boy
            </span>
            <span style={{ color: 'var(--faint)' }}>due september 2026</span>
          </div>
        </header>

        {/* consensus cards — tap/click to toggle median ⇄ mean */}
        <div className="pd-grid-consensus">
          {[
            {
              who: 'girl',
              c: GIRL,
              wt: stat === 'median' ? girlMed : girlMean,
              len: stat === 'median' ? girlLenMed : girlLenMean,
            },
            {
              who: 'boy',
              c: BOY,
              wt: stat === 'median' ? boyMed : boyMean,
              len: stat === 'median' ? boyLenMed : boyLenMean,
            },
          ].map((b) => (
            <div
              key={b.who}
              className="pd-style-content-box"
              onClick={toggleStat}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleStat();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${b.who} consensus — showing ${stat}, activate to switch`}
              style={{ padding: '18px 20px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 2,
                }}
              >
                <div className="mono" style={{ fontSize: 12, color: b.c, fontWeight: 700 }}>
                  {b.who}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 10, letterSpacing: 0.5 }}
                  aria-hidden="true"
                >
                  <span style={{ color: stat === 'median' ? ACCENT : 'var(--faint)' }}>median</span>
                  <span style={{ color: 'var(--faint)' }}> · </span>
                  <span style={{ color: stat === 'mean' ? ACCENT : 'var(--faint)' }}>mean</span>
                </div>
              </div>
              <div className="kick" style={{ marginBottom: 14 }}>
                consensus guess
              </div>
              <div
                className="mono tnum"
                style={{
                  fontSize: 25,
                  fontWeight: 700,
                  color: 'var(--foreground-color)',
                  whiteSpace: 'nowrap',
                }}
              >
                {fmtOz(b.wt)}
              </div>
              <div className="kick" style={{ marginBottom: 12 }}>
                {stat} weight
              </div>
              <div className="mono tnum" style={{ fontSize: 19, fontWeight: 700 }}>
                {b.len}″
              </div>
              <div className="kick">{stat} length</div>
            </div>
          ))}
        </div>

        {/* verdict strip */}
        <div className="pd-grid-verdicts">
          <Verdict
            label="most-guessed birthday"
            big={dateMode.value}
            sub={`${dateMode.count}/${N} ballots`}
            c={ACCENT}
          />
          <Verdict
            label="will dad faint during delivery?"
            big={faintYes > N - faintYes ? 'yes' : 'no'}
            sub={`${faintYes}/${N} say yes`}
            c={BOY}
          />
          <Verdict
            label="will mom yell at dad during delivery?"
            big={yellYes > N - yellYes ? 'yes' : 'no'}
            sub={`${yellYes}/${N} say yes`}
            c={GIRL}
          />
        </div>

        {/* who's first */}
        <Section
          kicker="born first"
          title="who arrives first?"
          note={`girl leads ${firstGirl}–${firstBoy}${firstPicked < N ? ` · ${N - firstPicked} no pick` : ''}`}
        >
          <div
            style={{
              display: 'flex',
              height: 44,
              border: 'var(--border-thickness) solid var(--border-color)',
            }}
          >
            <Split flex={firstGirl} c={GIRL} label="girl" n={firstGirl} N={firstPicked} />
            <div style={{ width: 2, background: 'var(--border-color)' }} />
            <Split flex={firstBoy} c={BOY} label="boy" n={firstBoy} N={firstPicked} />
          </div>
        </Section>

        {/* birthday distribution */}
        <Section kicker="timeline" title="when will they arrive?" note="aug 15 → sep 20">
          <ResponsiveContainer width="100%" height={244}>
            <BarChart data={dateDist} margin={{ top: 12, right: 14, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="md"
                tick={{ fontSize: 9.5, fill: HEX.faint, fontFamily: MONO }}
                axisLine={{ stroke: HEX.line }}
                tickLine={false}
                interval="equidistantPreserveStart"
                angle={-45}
                textAnchor="end"
                height={50}
                minTickGap={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: HEX.faint, fontFamily: MONO }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...tip}
                formatter={(v) => [`${v} ballot${v === 1 ? '' : 's'}`, 'guesses']}
                labelFormatter={(l) => `birthday: ${l}`}
              />
              <Bar dataKey="count" maxBarSize={16}>
                {dateDist.map((d, i) => (
                  <Cell key={i} fill={d.md === dateMode.value ? ACCENT : HEX.neutral} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* weights */}
        <Section kicker="weight" title="predicted weights" note="by pound">
          <DualHist data={weightDist} tip={tip} />
        </Section>

        {/* lengths */}
        <Section kicker="length" title="predicted lengths" note="by inch">
          <DualHist data={lengthDist} tip={tip} />
        </Section>

        {/* raw table toggle */}
        <div style={{ marginTop: 30 }}>
          <button
            onClick={() => setShowTable((s) => !s)}
            className="pd-style-content-box mono"
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            {showTable ? '− hide' : '+ show'} all {N} ballots
          </button>
          {showTable && (
            <div className="pd-style-content-box" style={{ marginTop: 12, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--subtle)', textAlign: 'left' }}>
                    {[
                      '#',
                      'guest',
                      'birthday',
                      'girl',
                      'boy',
                      'girl len',
                      'boy len',
                      'first',
                      'faint',
                      'yell',
                    ].map((h) => (
                      <th
                        key={h}
                        className="kick"
                        style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: 'var(--muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tnum">
                  {data.map((d) => (
                    <tr key={d.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td className="mono" style={{ padding: '7px 10px', color: 'var(--faint)' }}>
                        {d.id}
                      </td>
                      <td className="mono" style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                        {d.name}
                      </td>
                      <td className="mono" style={{ padding: '7px 10px' }}>
                        {d.mdShort}
                      </td>
                      <td className="mono" style={{ padding: '7px 10px', color: GIRL }}>
                        {fmtOz(d.girlOz)}
                      </td>
                      <td className="mono" style={{ padding: '7px 10px', color: BOY }}>
                        {fmtOz(d.boyOz)}
                      </td>
                      <td className="mono" style={{ padding: '7px 10px' }}>
                        {d.girlLen}″
                      </td>
                      <td className="mono" style={{ padding: '7px 10px' }}>
                        {d.boyLen}″
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '7px 10px',
                          color:
                            d.first === 'girl' ? GIRL : d.first === 'boy' ? BOY : 'var(--faint)',
                        }}
                      >
                        {d.first === 'girl' ? 'G' : d.first === 'boy' ? 'B' : '·'}
                      </td>
                      <td className="mono" style={{ padding: '7px 10px', color: 'var(--muted)' }}>
                        {d.faint ? 'Y' : '·'}
                      </td>
                      <td className="mono" style={{ padding: '7px 10px', color: 'var(--muted)' }}>
                        {d.yell ? 'Y' : '·'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- small components ---------- */
function Dot({ c }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 9,
        height: 9,
        background: c,
        marginRight: 7,
        verticalAlign: 'middle',
      }}
    />
  );
}

function Section({ kicker, title, note, children }) {
  return (
    <div style={{ marginBottom: 30 }}>
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
            {kicker}
          </div>
          <h2 className="serif" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {title}
          </h2>
        </div>
        <span className="mono" style={{ fontSize: 12, color: 'var(--faint)' }}>
          {note}
        </span>
      </div>
      {children}
    </div>
  );
}

function Verdict({ label, big, sub, c }) {
  return (
    <div className="pd-style-content-box" style={{ padding: '14px 16px' }}>
      <div className="kick">{label}</div>
      <div
        className="serif tnum"
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: c || 'var(--foreground-color)',
          margin: '5px 0 3px',
        }}
      >
        {big}
      </div>
      <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
        {sub}
      </div>
    </div>
  );
}

function Split({ flex, c, label, n, N }) {
  if (flex === 0) return null;
  return (
    <div
      style={{
        flex,
        background: c,
        color: '#f4ecec',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 11.5, opacity: 0.92 }}>
        {n} · {Math.round((n / N) * 100)}%
      </span>
    </div>
  );
}

function DualHist({ data, tip }) {
  return (
    <div>
      <div
        className="mono"
        style={{ display: 'flex', gap: 16, marginBottom: 6, fontSize: 12, color: 'var(--muted)' }}
      >
        <span>
          <Dot c={GIRL} />
          girl
        </span>
        <span>
          <Dot c={BOY} />
          boy
        </span>
      </div>
      <ResponsiveContainer width="100%" height={224}>
        <AreaChart data={data} margin={{ top: 12, right: 18, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="fillGirl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GIRL} stopOpacity={0.4} />
              <stop offset="100%" stopColor={GIRL} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillBoy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BOY} stopOpacity={0.4} />
              <stop offset="100%" stopColor={BOY} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 12, fill: HEX.faint, fontFamily: MONO }}
            axisLine={{ stroke: HEX.line }}
            tickLine={false}
            interval="equidistantPreserveStart"
            minTickGap={8}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: HEX.faint, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            {...tip}
            cursor={{ stroke: HEX.faint, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            name="girl"
            type="monotone"
            dataKey="girl"
            stroke={GIRL}
            strokeWidth={2}
            fill="url(#fillGirl)"
            dot={{ r: 2.5, fill: GIRL, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
          <Area
            name="boy"
            type="monotone"
            dataKey="boy"
            stroke={BOY}
            strokeWidth={2}
            fill="url(#fillBoy)"
            dot={{ r: 2.5, fill: BOY, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
