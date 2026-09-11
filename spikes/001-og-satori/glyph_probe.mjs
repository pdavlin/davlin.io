// Ground-truth check: does satori emit a path for the trailing middot?
import { readFileSync } from 'node:fs';
import satori from 'satori';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');

const span = (text) => ({
  type: 'span',
  props: { style: { fontSize: 40, color: '#ca4949', letterSpacing: 8 }, children: text },
});

async function countPaths(text) {
  const svg = await satori(span(text), {
    width: 800, height: 100,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  const paths = (svg.match(/<path /g) ?? []).length;
  // collect rough x-extent of last path to see if a 5th glyph sits past the 4th
  const xs = [...svg.matchAll(/<path [^>]*d="M ?([\d.]+)/g)].map((m) => Number(m[1]));
  return { text, paths, lastX: xs.length ? Math.max(...xs) : null, svgLen: svg.length };
}

for (const t of ['*', '*·', '**···', '****·', '****', '·']) {
  console.log(JSON.stringify(await countPaths(t)));
}

// does the font even have U+00B7? render ONLY a middot
const only = await countPaths('·');
console.log('middot-only:', JSON.stringify(only));