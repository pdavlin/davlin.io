// Final rating-row verifier. Anchors on geometry, not position: after
// clustering the rating band, find the LAST 5 clusters that form an even-pitch
// run (pitch 25-45px, widths 8-20) — that's the star row regardless of what
// the year digits merged into. Then classify: full (uniform dark), half
// (left≫right), dim (uniform light).
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

const CASES = [
  ['0.5', 'a-fantastic-four-2015.png'],
  ['1', 'a-ant-man-and-the-wasp-quantumania-2023.png'],
  ['1.5', 'a-a-house-of-dynamite-2025.png'],
  ['2', 'a-28-weeks-later-2007.png'],
  ['2.5', 'a-a-minecraft-movie-2025.png'],
  ['3', 'a-13-going-on-30-2004.png'],
  ['3.5', 'a-a-real-pain-2024.png'],
  ['4', 'a-28-years-later-2025.png'],
  ['4.5', 'a-2001-a-space-odyssey-1968.png'],
  ['5', 'a-best-in-show-2000.png'],
];
const BG = [0xf4, 0xec, 0xec];
let failures = 0;

for (const [rating, file] of CASES) {
  const { w, h, data } = decodePng(readFileSync(`out/${file}`));
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
  const rband = bands.length >= 3 ? bands[bands.length - 2] : null;
  if (!rband) { console.log('✗', rating, 'band not found'); failures++; continue; }

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

  // geometric anchor: last 5 clusters with even pitch 25-45 and widths 8-20
  const stars = (() => {
    for (let i = clusters.length - 5; i >= 0; i--) {
      const five = clusters.slice(i, i + 5);
      const widths = five.map(([a, b]) => b - a + 1);
      const pitch = five.slice(1).map(([a], k) => a - five[k][0]);
      if (widths.every((wd) => wd >= 8 && wd <= 20) &&
          pitch.every((p) => p >= 25 && p <= 45)) return five;
    }
    return clusters.slice(-5);
  })();

  const info = stars.map(([a, b]) => {
    const mid = Math.floor((a + b) / 2);
    let l = 0, ln = 0, r = 0, rn = 0;
    for (let x = a; x <= mid; x++) { l += colMax[x]; ln++; }
    for (let x = mid + 1; x <= b; x++) { r += colMax[x]; rn++; }
    return { a, b, width: b - a + 1, leftI: l / ln, rightI: r / rn };
  });
  const maxI = Math.max(...info.map((s) => Math.max(s.leftI, s.rightI)));
  const r = Number(rating);
  const full = Math.floor(r);
  const hasHalf = r % 1 >= 0.5;
  const got = info.map((s) => {
    if (s.leftI > 0.8 * maxI && s.rightI < 0.65 * maxI) return 'half';
    if (Math.min(s.leftI, s.rightI) < 0.7 * maxI) return 'dim';
    return 'full';
  });
  const expected = Array.from({ length: 5 }, (_, i) =>
    i < full ? 'full' : i === full && hasHalf ? 'half' : 'dim');
  const ok = JSON.stringify(expected) === JSON.stringify(got);
  if (!ok) failures++;
  console.log(
    (ok ? '✓' : '✗'), `rating ${rating}`.padEnd(5), file.split('/').pop(),
    info.map((s) => `${s.width}w/${Math.round(s.leftI)}L/${Math.round(s.rightI)}R`).join(' '),
    '→', got.join(','), ok ? '' : ` want ${expected.join(',')}`,
  );
}
console.log(failures === 0 ? '\nALL 10 RATINGS CORRECT' : `\n${failures} FAILURES`);