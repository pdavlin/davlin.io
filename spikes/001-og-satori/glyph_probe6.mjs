// Decisive: total ink in the 5th-glyph region (x 120-150) as a function of dim.
import { readFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');
const el = (type, style = {}, children = '') => ({ type, props: { style, children } });
const span = (style, text) => el('span', style, text);

const starsRow = (n, size, color, dim) =>
  el('div', { display: 'flex', alignItems: 'baseline' }, [
    span({ fontSize: size, color, letterSpacing: 8 }, '*'.repeat(n)),
    n < 5 ? span({ fontSize: size, color, letterSpacing: 8, opacity: dim }, '*'.repeat(5 - n)) : '',
  ]);

async function tailInk(dim) {
  const svg = await satori(starsRow(4, 40, '#b45a3c', dim), {
    width: 800, height: 120,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: 800 }, background: '#f4ecec' }).render();
  const px = img.pixels, w = img.width, h = img.height;
  let sum = 0;
  for (let x = 120; x < Math.min(155, w); x++)
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      sum += Math.abs(px[i] - 0xf4) + Math.abs(px[i + 1] - 0xec) + Math.abs(px[i + 2] - 0xec);
    }
  return sum;
}

for (const dim of [0, 0.3, 0.45, 0.6, 1]) {
  console.log(`dim=${dim}: tail ink = ${await tailInk(dim)}`);
}