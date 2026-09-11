// Pixel-level check: is the dimmed 5th asterisk's ink present in the raster?
import { readFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');
const el = (type, style = {}, children = '') => ({ type, props: { style, children } });
const span = (style, text) => el('span', style, text);

const starsRow = (n, size, color, dim = 0.3) =>
  el('div', { display: 'flex', alignItems: 'baseline' }, [
    span({ fontSize: size, color, letterSpacing: 8 }, '*'.repeat(n)),
    n < 5 ? span({ fontSize: size, color, letterSpacing: 8, opacity: dim }, '*'.repeat(5 - n)) : '',
  ]);

async function inkProfile(n, dim) {
  const svg = await satori(starsRow(n, 40, '#b45a3c', dim), {
    width: 800, height: 120,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: 800 } }).render();
  const px = img.pixels; // RGBA
  const w = img.width;
  // scan from right: find rightmost column with any "ink" (pixel differing from bg #ffffff alpha)
  let lastInkX = -1;
  for (let x = w - 1; x >= 0 && lastInkX === -1; x--) {
    for (let y = 0; y < img.height; y++) {
      const i = (y * w + x) * 4;
      // background is transparent/white; ink = alpha > 0 and not near-white
      if (px[i + 3] > 0 && !(px[i] > 240 && px[i + 1] > 240 && px[i + 2] > 240)) {
        lastInkX = x;
        break;
      }
    }
  }
  return { n, dim, lastInkX, width: w };
}

console.log('4 stars, dim 0.3:', JSON.stringify(await inkProfile(4, 0.3)));
console.log('4 stars, dim 1.0:', JSON.stringify(await inkProfile(4, 1.0)));
console.log('5 stars (all filled):', JSON.stringify(await inkProfile(5, 1.0)));
console.log('4 stars, no dim span (n=5 trick):', JSON.stringify(await inkProfile(4, 0.0)));