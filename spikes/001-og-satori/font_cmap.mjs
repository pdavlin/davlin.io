// Parse Berkeley Mono WOFF cmap: which of our candidate glyphs exist?
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const buf = readFileSync('/home/pdavlin/Development/davlin.io/public/fonts/BerkeleyMono-Regular.woff');

// --- minimal WOFF -> TTF tables ---
const numTables = buf.readUInt16BE(12);
let off = 44;
const tables = {};
for (let i = 0; i < numTables; i++) {
  const tag = buf.toString('ascii', off, off + 4);
  const offset = buf.readUInt32BE(off + 4);
  const compLength = buf.readUInt32BE(off + 8);
  const origLength = buf.readUInt32BE(off + 12);
  const raw = buf.subarray(offset, offset + compLength);
  tables[tag] = compLength === origLength ? raw : inflateSync(raw);
  off += 20;
}

// --- parse cmap (format 4 + 12) ---
const cmap = tables.cmap;
const nTables = cmap.readUInt16BE(2);
let best = null;
for (let i = 0; i < nTables; i++) {
  const platform = cmap.readUInt16BE(4 + i * 8);
  const encoding = cmap.readUInt16BE(6 + i * 8);
  const subOff = cmap.readUInt32BE(8 + i * 8);
  const format = cmap.readUInt16BE(subOff);
  if (format === 4 || format === 12) best = { platform, encoding, subOff, format };
}
const so = best.subOff;
const format = best.format;
const map = {};
if (format === 4) {
  const segCountX2 = cmap.readUInt16BE(so + 6);
  const segCount = segCountX2 / 2;
  const endBase = so + 14;
  const startBase = endBase + segCountX2 + 2;
  for (let seg = 0; seg < segCount; seg++) {
    const end = cmap.readUInt16BE(endBase + seg * 2);
    const start = cmap.readUInt16BE(startBase + seg * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      // glyph id resolution via delta/range omitted — presence is what we need
      map[c] = true;
    }
  }
} else {
  const nGroups = cmap.readUInt32BE(so + 12);
  for (let g = 0; g < nGroups; g++) {
    const s = cmap.readUInt32BE(so + 16 + g * 12);
    const e = cmap.readUInt32BE(so + 20 + g * 12);
    for (let c = s; c <= e; c++) map[c] = true;
  }
}

const candidates = {
  'asterisk *': 0x2a,
  'white star ★': 0x2605,
  '½ U+00BD': 0xbd,
  'black medium small square ▪': 0x25aa,
  'black right half circle ◗': 0x25d7,
  'lower half block ▄': 0x2584,
  'left half block ▌': 0x258c,
  'black square ■': 0x25a0,
  'middle dot ·': 0xb7,
  'bullet •': 0x2022,
  'fraction slash ⁄': 0x2044,
  '⅟ U+215F': 0x215f,
  '4 digits 0-9': 0x30,
};
console.log('cmap entries:', Object.keys(map).length);
for (const [name, cp] of Object.entries(candidates)) {
  console.log(map[cp] ? '  ✓' : '  ✗', name);
}