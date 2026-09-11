// Measure actual asterisk ink in the rating row of the real card PNG.
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// Use the SVG from render.mjs's pipeline indirectly: just rasterize the isolated
// rating row at card-realistic context (cream bg) and measure per-glyph ink.
import satori from 'satori';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');
const el = (type, style = {}, children = '') => ({ type, props: { style, children } });
const span = (style, text) => el('span', style, text);

const starsRow = (n, size, color, dim) =>
  el('div', { display: 'flex', alignItems: 'baseline' }, [
    span({ fontSize: size, color, letterSpacing: 8 }, '*'.repeat(n)),
    n < 5 ? span({ fontSize: size, color, letterSpacing: 8, opacity: dim }, '*'.repeat(5 - n)) : '',
  ]);

function inkColumns(svg, label) {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: 800 }, background: '#f4ecec' }).render();
  const px = img.pixels;
  const w = img.width, h = img.height;
  // column has ink if any pixel differs from bg by >8 in any channel
  const colInk = new Array(w).fill(0);
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      const d = Math.abs(px[i] - 0xf4) + Math.abs(px[i + 1] - 0xec) + Math.abs(px[i + 2] - 0xec);
      if (d > 24) colInk[x]++;
    }
  // find glyph clusters (runs of inked columns separated by gaps >= 8px)
  const clusters = [];
  let start = -1, last = -1;
  for (let x = 0; x < w; x++) {
    if (colInk[x] > 0) {
      if (start === -1) start = x;
      last = x;
    } else if (start !== -1 && x - last >= 8) {
      clusters.push([start, last]);
      start = -1;
    }
  }
  if (start !== -1) clusters.push([start, last]);
  // strongest deviation per cluster (how "dark" the ink is)
  const strength = clusters.map(([a, b]) => {
    let max = 0;
    for (let x = a; x <= b; x++)
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        const d = Math.abs(px[i] - 0xf4) + Math.abs(px[i + 1] - 0xec) + Math.abs(px[i + 2] - 0xec);
        if (d > max) max = d;
      }
    return max;
  });
  console.log(label, JSON.stringify({ clusters: clusters.length, spans: clusters, maxDeviation: strength }));
}

for (const dim of [0.3, 0.45, 0.55, 0.65]) {
  const svg = await satori(starsRow(4, 40, '#b45a3c', dim), {
    width: 800, height: 120,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  inkColumns(svg, `dim=${dim}:`);
}