// Prove the fix on REAL rendered PNGs: the accent-colored rating row must
// contain 5 DISJOINT asterisk clusters (4 solid + 1 dim, or 5 solid).
// Background: an earlier check passed on "ink exists" while glyphs overlapped
// into a blob — Patrick's screenshot exposed it. This one requires separation.
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

function starClusters(file, isAccent) {
  const { w, h, data } = decodePng(readFileSync(file));
  // find the 50px y-band with the most accent ink (the rating row);
  // skip y<200: the solid top bar (y<30) and blue masthead text live up there
  const yHits = {};
  for (let y = 200; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isAccent(data[i], data[i + 1], data[i + 2]))
        yHits[Math.floor(y / 50) * 50] = (yHits[Math.floor(y / 50) * 50] ?? 0) + 1;
    }
  const band = Number(Object.entries(yHits).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0);
  // cluster inked columns within that band
  const colInk = new Array(w).fill(0);
  for (let y = band; y < Math.min(band + 50, h); y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isAccent(data[i], data[i + 1], data[i + 2])) colInk[x]++;
    }
  const clusters = [];
  let start = -1, last = -1;
  for (let x = 0; x < w; x++) {
    if (colInk[x] > 0) {
      if (start === -1) start = x;
      last = x;
    } else if (start !== -1 && x - last > 6) {
      clusters.push([start, last]);
      start = -1;
    }
  }
  if (start !== -1) clusters.push([start, last]);
  const widths = clusters.map(([a, b]) => b - a + 1);
  const pitch = clusters.slice(1).map(([a], i) => a - clusters[i][0]);
  console.log(
    file.split('/').pop().padEnd(32),
    `band y=${band}: ${clusters.length} clusters`,
    `widths=${JSON.stringify(widths)}`,
    `pitch=${JSON.stringify(pitch)}`,
  );
  return clusters;
}

// accent predicates — must match BOTH solid and dimmed (opacity-blended) ink
// solid blue #5485b6 = (84,133,182); dim 50% on cream ≈ (164,184,209)
const isRust = (r, g, b) => r > 130 && r > b + 40 && g > 50 && g < 130;
const isBlue = (r, g, b) => b - r >= 25 && b - g >= 15 && b > 170;

console.log('--- variant A rating rows (expect 5 star clusters, even pitch, similar widths) ---');
starClusters('out/a-annihilation-2018.png', isRust);
starClusters('out/a-but-i-m-a-cheerleader-1999.png', isBlue);
starClusters('out/a-the-shining-1980.png', isRust);