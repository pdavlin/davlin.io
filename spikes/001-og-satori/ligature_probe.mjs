// Ligature probe: does '**' ligate at letterSpacing 0 vs 8?
import { readFileSync } from 'node:fs';
import satori from 'satori';

const font = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');
const span = (text, ls) => ({
  type: 'span',
  props: { style: { fontSize: 40, color: '#ca4949', letterSpacing: ls }, children: text },
});

async function probe(text, ls) {
  const svg = await satori(span(text, ls), {
    width: 800, height: 120,
    fonts: [{ name: 'BerkeleyMono', data: font, weight: 400, style: 'normal' }],
  });
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  const mCount = (d.match(/M/g) ?? []).length;
  console.log(`"${text}" ls=${ls}: ${mCount} glyph subpaths`);
}

await probe('**', 0);
await probe('**', 8);
await probe('****', 8);
await probe('···', 8);
await probe('···', 0);