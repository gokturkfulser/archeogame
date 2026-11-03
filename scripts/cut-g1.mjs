/* Cuts the opening film's puppets (assets-src/baslangic/dede-C-cut.png, already transparent, and animals-1..3.png on plain white) out of
   their background: flood fill from the border through near-white pixels, so white inside an outline (the moustache)
   stays. The three animal sheets are then split into their five animals at the empty columns between them.
   Writes transparent WebP to video/public/img/g1/. Run: node scripts/cut-g1.mjs */
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = 'assets-src/baslangic/';
const OUT = 'video/public/img/g1/';
fs.mkdirSync(OUT, { recursive: true });

const SHEETS = [
  ['animals-1.png', ['ari', 'geyik', 'tilki', 'leopar', 'at']],
  ['animals-2.png', ['baykus', 'guvercin', 'yilan', 'aslan', 'kartal']],
  ['animals-3.png', ['pegasus', 'kerberos', 'caretta', 'esek', 'yunus']],
];

async function cutOut(file, holes = false) {
  const { data, info } = await sharp(SRC + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bgLike = (i) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return Math.min(r, g, b) > 200 && Math.max(r, g, b) - Math.min(r, g, b) < 45;
  };
  // brighter and flatter than `bgLike`: only this counts as a hole (the moustache and highlights are creamier)
  const pureWhite = (i) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return Math.min(r, g, b) > 244 && Math.max(r, g, b) - Math.min(r, g, b) < 14;
  };
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const i = y * w + x;
    if (!bg[i] && bgLike(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) (push(x, 0), push(x, h - 1));
  for (let y = 0; y < h; y++) (push(0, y), push(w - 1, y));
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  if (holes) {
    // enclosed white areas of some size (the loop of the snake) are holes too; small ones are highlights in the art
    const seen = new Uint8Array(w * h);
    for (let s0 = 0; s0 < w * h; s0++) {
      if (bg[s0] || seen[s0] || !pureWhite(s0)) continue;
      const cells = [s0];
      seen[s0] = 1;
      for (let q = 0; q < cells.length; q++) {
        const i = cells[q];
        const x = i % w, y = (i / w) | 0;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (!bg[j] && !seen[j] && pureWhite(j)) (seen[j] = 1, cells.push(j));
        }
      }
      if (cells.length > 1500) for (const i of cells) bg[i] = 1;
    }
  }
  // soften the cut edge a little: foreground pixels touching the background get partial alpha
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) data[i * 4 + 3] = 0;
      else if (x > 0 && bg[i - 1] || x < w - 1 && bg[i + 1] || y > 0 && bg[i - w] || y < h - 1 && bg[i + w]) data[i * 4 + 3] = 170;
    }
  return { data, w, h, bg };
}

const save = (data, w, h, box, name, maxH) =>
  sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract(box)
    .resize({ height: maxH, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 95 })
    .toFile(OUT + name + '.webp');

// the grandfather: his white hair is lost by the local flood fill (it is white like the background), so the cut-out
// comes from Higgsfield's remove_background (assets-src/baslangic/dede-C-cut.png); here it is only trimmed and sized
{
  const info = await sharp(SRC + 'dede-C-cut.png').trim().resize({ height: 1100, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 95 }).toFile(OUT + 'dede.webp');
  console.log('dede', info.width, info.height);
}

// the animals: connected pieces of the cut-out, tiny bits (antennae, tongue) joined to the nearest big piece
for (const [file, names] of SHEETS) {
  const { data, w, h, bg } = await cutOut(file, true);
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (bg[s0] || label[s0] >= 0) continue;
    const id = comps.length;
    const c = { x0: w, x1: 0, y0: h, y1: 0, area: 0 };
    const st = [s0];
    label[s0] = id;
    while (st.length) {
      const i = st.pop();
      const x = i % w, y = (i / w) | 0;
      c.area++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (!bg[j] && label[j] < 0) (label[j] = id, st.push(j));
        }
    }
    comps.push(c);
  }
  const big = comps.map((c, id) => ({ ...c, id })).filter((c) => c.area > 6000).sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
  if (big.length !== names.length) console.warn(file, 'expected', names.length, 'animals, found', big.length);
  const owner = new Map(big.map((b) => [b.id, b.id]));
  const groups = new Map(big.map((b) => [b.id, { ...b }]));
  comps.forEach((c, id) => {
    if (owner.has(id) || c.area < 30) return;
    let best = null, bd = 1e9;
    for (const b of big) {
      const dx = Math.max(b.x0 - c.x1, c.x0 - b.x1, 0), dy = Math.max(b.y0 - c.y1, c.y0 - b.y1, 0);
      const d = Math.hypot(dx, dy);
      if (d < bd) (bd = d, best = b);
    }
    if (best && bd < 90) {
      owner.set(id, best.id);
      const g = groups.get(best.id);
      g.x0 = Math.min(g.x0, c.x0); g.x1 = Math.max(g.x1, c.x1); g.y0 = Math.min(g.y0, c.y0); g.y1 = Math.max(g.y1, c.y1);
    }
  });
  // keep only each animal's own pieces
  for (let i = 0; i < w * h; i++) {
    const l = label[i];
    if (l < 0) continue;
    if (!owner.has(l)) data[i * 4 + 3] = 0;
  }
  for (let k = 0; k < Math.min(big.length, names.length); k++) {
    const g = groups.get(big[k].id);
    // pixels of the neighbouring animals inside this box are hidden
    const copy = Buffer.from(data);
    for (let y = g.y0; y <= g.y1; y++)
      for (let x = g.x0; x <= g.x1; x++) {
        const l = label[y * w + x];
        if (l >= 0 && owner.get(l) !== big[k].id) copy[(y * w + x) * 4 + 3] = 0;
      }
    const info = await save(copy, w, h, { left: g.x0, top: g.y0, width: g.x1 - g.x0 + 1, height: g.y1 - g.y0 + 1 }, names[k], 640);
    console.log(names[k], info.width, info.height);
  }
}
