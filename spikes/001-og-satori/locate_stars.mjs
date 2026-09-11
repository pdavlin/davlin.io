// Print exact cluster x-ranges + y-band for a card's rating row, and dump
// left/right mean intensity per glyph — ground truth for crop coordinates.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decodePng(buf) {
  let pos = 8, w, h;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let inPos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[inPos++];
    const line = raw.subarray(inPos, inPos + stride); inPos += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let val = line[x];
      if (filter === 1) val += a;
      else if (filter === 2) val += b;
      else if (filter === 3) val += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val += (pa <= pb && pa <= pc) ? a : (pb <= pc) ? b : c;
      }
      cur[x] = val & 0xff;
    }
  }
  return { w, h, data: out };
}

const BG = [0xf4, 0xec, 0xec];
const file = process.argv[2] ?? 'out/a-2001-a-space-odyssey-1968.png';
const { w, h, data } = decodePng(readFileSync(file));
const dev = (x, y) => {
  const i = (y * w + x) * 4;
  return Math.abs(data[i] - BG[0]) + Math.abs(data[i + 1] - BG[1]) + Math.abs(data[i + 2] - BG[2]);
};
const rowInk = new Array(h).fill(0);
for (let y = 30; y < h; y++)
  for (let x = 0; x < w; x++) if (dev(x, y) > 40) rowInk[y]++;
const bands = [];
let s = -1, e = -1;
for (let y = 30; y < h; y++) {
  if (rowInk[y] > 3) {
    if (s === -1) s = y;
    e = y;
  } else if (s !== -1 && y - e > 12) {
    bands.push([s, e]);
    s = -1;
  }
}
if (s !== -1) bands.push([s, e]);
console.log('bands:', JSON.stringify(bands));
const rband = bands[bands.length - 2];
const colMax = new Array(w).fill(0);
for (let y = rband[0]; y <= rband[1]; y++)
  for (let x = 0; x < w; x++) {
    const d = dev(x, y);
    if (d > 40 && d > colMax[x]) colMax[x] = d;
  }
const clusters = [];
let start = -1, last = -1;
for (let x = 0; x < w; x++) {
  if (colMax[x] > 40) {
    if (start === -1) start = x;
    last = x;
  } else if (start !== -1 && x - last > 6) {
    clusters.push([start, last]);
    start = -1;
  }
}
if (start !== -1) clusters.push([start, last]);
for (const [a, b] of clusters.slice(-6)) {
  const mid = Math.floor((a + b) / 2);
  let l = 0, ln = 0, r = 0, rn = 0;
  for (let x = a; x <= mid; x++) { l += colMax[x]; ln++; }
  for (let x = mid + 1; x <= b; x++) { r += colMax[x]; rn++; }
  console.log(`cluster x=${a}-${b} w=${b - a + 1} left=${Math.round(l / ln)} right=${Math.round(r / rn)}`);
}