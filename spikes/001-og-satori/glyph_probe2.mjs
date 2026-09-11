// Count rendered glyph subpaths ('M' commands) per string.
import { readFileSync } from 'node:fs';
import satori from 'satori';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');
const span = (text) => ({
  type: 'span',
  props: { style: { fontSize: 40, color: '#ca4949', letterSpacing: 8 }, children: text },
});

async function subpaths(text) {
  const svg = await satori(span(text), {
    width: 800, height: 100,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  const mCount = (d.match(/M/g) ?? []).length;
  return { text, mCount, dLen: d.length };
}

for (const t of ['', '*', '**', '**···', '****', '****·', '·····', '****x']) {
  console.log(JSON.stringify(await subpaths(t)));
}