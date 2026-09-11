// Verify starsRow emits the dimmed 5th asterisk: subpath count + opacity attr.
import { readFileSync } from 'node:fs';
import satori from 'satori';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');
const el = (type, style = {}, children = '') => ({ type, props: { style, children } });
const span = (style, text) => el('span', style, text);

const starsRow = (n, size, color, dim = 0.3) =>
  el('div', { display: 'flex', alignItems: 'baseline' }, [
    span({ fontSize: size, color, letterSpacing: 8 }, '*'.repeat(n)),
    n < 5 ? span({ fontSize: size, color, letterSpacing: 8, opacity: dim }, '*'.repeat(5 - n)) : '',
  ]);

const svg = await satori(starsRow(4, 40, '#b45a3c'), {
  width: 800, height: 120,
  fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
});

const mCount = ([...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ').match(/M/g) ?? []).length;
console.log('subpaths:', mCount, '(expect 5)');
console.log('has fill-opacity:', /fill-opacity/.test(svg));
console.log('opacity attrs:', [...svg.matchAll(/(fill-)?opacity="[^"]*"/g)].map((m) => m[0]));