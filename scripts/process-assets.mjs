/* Turns the Higgsfield originals in assets-src/ into the small WebP files the game loads from public/assets/.
 *
 *   node scripts/process-assets.mjs            process everything
 *   node scripts/process-assets.mjs deniz      only jobs whose name starts with "deniz"
 *   node scripts/process-assets.mjs --probe    print the bounding boxes of the parts found in the sheets
 *
 * Puppet sheets are split into pieces (connected regions of the alpha channel), each piece is trimmed, cleaned of the
 * soft glow halo, resized and written with its pivot points to <out>/parts.json. Pivots are given in the coordinates of a
 * 2000 px wide preview of the sheet, as read off the image, and converted here.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets-src');
const OUT = join(ROOT, 'public', 'assets');

/* ---------- pixel helpers ---------- */
async function loadRGBA(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Removes the soft halo: alpha below `lo` becomes 0, above `hi` becomes 255, in between ramps. */
function cleanAlpha(img, lo = 100, hi = 200) {
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i];
    d[i] = a <= lo ? 0 : a >= hi ? 255 : Math.round(((a - lo) * 255) / (hi - lo));
  }
}

/** Connected pieces of the alpha mask. Nearby bits (closer than `gap` px) belong to the same piece. */
function findPieces(img, gap = 10, minArea = 4000) {
  const { data, w, h } = img;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  // dilate horizontally then vertically (box) to merge near bits
  const tmp = new Uint8Array(w * h);
  const grown = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    for (let x = 0; x < w; x++) {
      if (solid[y * w + x]) last = x;
      if (x - last <= gap) tmp[y * w + x] = 1;
    }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) {
      if (solid[y * w + x]) last = x;
      if (last - x <= gap) tmp[y * w + x] = 1;
    }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) {
      if (tmp[y * w + x]) last = y;
      if (y - last <= gap) grown[y * w + x] = 1;
    }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) last = y;
      if (last - y <= gap) grown[y * w + x] = 1;
    }
  }
  const label = new Int32Array(w * h);
  const pieces = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!grown[s] || label[s]) continue;
    const id = pieces.length + 1;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0, sx = 0, sy = 0;
    stack.push(s);
    label[s] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      if (solid[p]) {
        area++;
        sx += x;
        sy += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (x > 0 && grown[p - 1] && !label[p - 1]) (label[p - 1] = id), stack.push(p - 1);
      if (x < w - 1 && grown[p + 1] && !label[p + 1]) (label[p + 1] = id), stack.push(p + 1);
      if (y > 0 && grown[p - w] && !label[p - w]) (label[p - w] = id), stack.push(p - w);
      if (y < h - 1 && grown[p + w] && !label[p + w]) (label[p + w] = id), stack.push(p + w);
    }
    pieces.push({ id, area, minX, minY, maxX, maxY, cx: sx / Math.max(1, area), cy: sy / Math.max(1, area) });
  }
  return { label, pieces: pieces.filter((p) => p.area >= minArea) };
}

/** Crops one piece out of the sheet (other pieces masked out), trims it, scales it and returns a sharp pipeline + geometry. */
async function cutPiece(img, label, piece, scale, pad = 6) {
  const { data, w, h } = img;
  const x0 = Math.max(0, piece.minX - pad);
  const y0 = Math.max(0, piece.minY - pad);
  const x1 = Math.min(w - 1, piece.maxX + pad);
  const y1 = Math.min(h - 1, piece.maxY + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sp = (y + y0) * w + (x + x0);
      const dp = (y * cw + x) * 4;
      if (label[sp] === piece.id) {
        out[dp] = data[sp * 4];
        out[dp + 1] = data[sp * 4 + 1];
        out[dp + 2] = data[sp * 4 + 2];
        out[dp + 3] = data[sp * 4 + 3];
      }
    }
  }
  const tw = Math.max(2, Math.round(cw * scale));
  const th = Math.max(2, Math.round(ch * scale));
  const buf = await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(tw, th, { kernel: 'lanczos3' })
    .webp({ quality: 88, alphaQuality: 92, effort: 5 })
    .toBuffer();
  return { buf, w: tw, h: th, ox: x0, oy: y0, scale };
}

const PREVIEW = 2688 / 2000; // preview px -> sheet px for the 2688-wide sheets

/** Converts a point read off the 2000 px preview into exported-piece pixel coordinates. */
function pt(piece, cut, [px, py]) {
  return [Math.round((px * PREVIEW - cut.ox) * cut.scale), Math.round((py * PREVIEW - cut.oy) * cut.scale)];
}

async function writeOut(rel, buf) {
  const file = join(OUT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
  console.log('  wrote', rel, Math.round(buf.length / 1024) + ' KB');
}


/** Erases everything but the white shirt, the brown bag and the strap (with their dark outlines) from a torso piece below `fromY` (rig px). */
function stripTrousers(img, label, piece, S, fromY) {
  const { data, w } = img;
  const y0 = Math.max(0, piece.minY - 6);
  const keep = new Uint8Array(img.w * img.h);
  const seed = [];
  const inPiece = (p) => label[p] === piece.id && data[p * 4 + 3] >= 128;
  const lumOf = (p) => 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
  for (let y = piece.minY; y <= piece.maxY; y++) {
    for (let x = piece.minX; x <= piece.maxX; x++) {
      const p = y * w + x;
      if (!inPiece(p)) continue;
      const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
      if ((y - y0) * S <= fromY) keep[p] = 1;
      else if (g / Math.max(1, r) < 0.66 && r > 85) (keep[p] = 1), seed.push(p); // bag and strap cloth
      else if (b > 140) (keep[p] = 1), seed.push(p); // shirt cloth
    }
  }
  // flecks in the trouser weave can pass for bag colour: only large connected areas of cloth count
  const isSeed = new Uint8Array(img.w * img.h);
  for (const p of seed) isSeed[p] = 1;
  const seen = new Uint8Array(img.w * img.h);
  const good = [];
  for (const s0 of seed) {
    if (seen[s0]) continue;
    const comp = [s0];
    seen[s0] = 1;
    for (let i = 0; i < comp.length; i++) {
      const p = comp[i];
      for (const q of [p - 1, p + 1, p - w, p + w]) if (isSeed[q] && !seen[q]) (seen[q] = 1), comp.push(q);
    }
    if (comp.length > 600) good.push(...comp);
    else for (const p of comp) if ((Math.floor(p / w) - y0) * S > fromY) keep[p] = 0;
  }
  seed.length = 0;
  seed.push(...good);
  // the dark knife-cut outline right next to kept cloth stays; the old trousers' pocket and seam lines do not
  let front = seed;
  for (let pass = 0; pass < 5 && front.length; pass++) {
    const next = [];
    for (const p of front) {
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (keep[q] || !inPiece(q) || lumOf(q) > 115) continue;
        keep[q] = 1;
        next.push(q);
      }
    }
    front = next;
  }
  for (let y = piece.minY; y <= piece.maxY; y++) for (let x = piece.minX; x <= piece.maxX; x++) {
    const p = y * w + x;
    if (label[p] === piece.id && (!keep[p] || (y - y0) * S > fromY + 62)) data[p * 4 + 3] = 0; // nothing hangs below the bag
  }
}

/* ---------- jobs ---------- */
const JOBS = [];

/** Deniz side-view rig parts (approved side-profile reference): head, torso with pelvis, near and far arm and leg pieces.
 * Every piece has its brass rivet at its pivot. Points are read off 1100 px wide previews of the two sheets. */
JOBS.push({
  name: 'deniz-side-rig',
  async run({ probe }) {
    const S = 0.156;
    const load = async (f) => {
      const img = await loadRGBA(join(SRC, f));
      cleanAlpha(img, 120, 220);
      const { label, pieces } = findPieces(img, 12, 8000);
      return { img, label, pieces, K: img.w / 1100 };
    };
    const one = await load('characters/side-parts-1.png');
    const two = await load('characters/side-parts-2.png');
    if (probe) return console.log(one.pieces.length, two.pieces.length);
    if (one.pieces.length !== 6 || two.pieces.length !== 4) throw new Error(`expected 6+4 pieces, found ${one.pieces.length}+${two.pieces.length}`);
    const top = one.pieces.filter((p) => p.cy < one.img.h * 0.62).sort((a, b) => a.cx - b.cx);
    const bottom = one.pieces.filter((p) => p.cy >= one.img.h * 0.62).sort((a, b) => a.cx - b.cx);
    const legs = two.pieces.sort((a, b) => a.cx - b.cx);
    const jobs = [
      [one, top[0], 'head', { pivot: [175, 240], eye: [214, 133] }],
      [one, top[1], 'torso', { pivot: [412, 505], neck: [398, 120], shoulder: [343, 126] }],
      [one, top[2], 'upperArm', { pivot: [608, 153], tip: [645, 326] }],
      [one, top[3], 'upperArmBack', { pivot: [880, 153], tip: [916, 330] }],
      [one, bottom[0], 'foreArmLight', { pivot: [562, 485], lens: [815, 480], grip: [740, 500] }],
      [one, bottom[1], 'foreArmFree', { pivot: [862, 486], tip: [1065, 485] }],
      [two, legs[0], 'thigh', { pivot: [162, 83], tip: [165, 395] }],
      [two, legs[1], 'shin', { pivot: [362, 116], tip: [390, 490], sole: [400, 578] }],
      [two, legs[2], 'thighBack', { pivot: [682, 88], tip: [690, 395] }],
      [two, legs[3], 'shinBack', { pivot: [916, 112], tip: [945, 490], sole: [950, 578] }],
    ];
    // the torso art carries the old trouser top: keep the shirt, strap and bag, erase the khaki (the pelvis piece replaces it)
    stripTrousers(one.img, one.label, top[1], S, 76);
    const parts = {};
    for (const [sheet, piece, key, pts] of jobs) {
      const cut = await cutPiece(sheet.img, sheet.label, piece, S);
      await writeOut(`characters/deniz/side/${key}.webp`, cut.buf);
      const entry = { file: `characters/deniz/side/${key}.webp`, w: cut.w, h: cut.h };
      for (const [name, [px, py]] of Object.entries(pts)) entry[name] = [Math.round((px * sheet.K - cut.ox) * cut.scale * 10) / 10, Math.round((py * sheet.K - cut.oy) * cut.scale * 10) / 10];
      parts[key] = entry;
    }
    await writeOut('characters/deniz/side/parts.json', Buffer.from(JSON.stringify(parts, null, 1)));
  },
});

/** Pelvis, thighs and lower legs (second pass of the side rig): a separate trouser top with seat and waistband, thighs with
 * round tops that tuck under it, tapered lower legs with rolled cuffs. Runs after deniz-side-rig and replaces its leg entries. */
JOBS.push({
  name: 'deniz-side-hip-legs',
  async run({ probe }) {
    const S = 0.156;
    const img = await loadRGBA(join(SRC, 'characters/side-hip-legs.png'));
    const { data, w, h } = img;
    // background: flood from the border over everything close to the paper colour
    const bg = [0, 0, 0];
    for (let i = 0; i < 40; i++) for (let c = 0; c < 3; c++) bg[c] += data[(5 + i) * 4 + c] / 40;
    const near = (p) => Math.hypot(data[p * 4] - bg[0], data[p * 4 + 1] - bg[1], data[p * 4 + 2] - bg[2]) < 46;
    const out = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const p = stack.pop();
      if (out[p] || !near(p)) continue;
      out[p] = 1;
      const x = p % w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (p >= w) stack.push(p - w);
      if (p < w * (h - 1)) stack.push(p + w);
    }
    for (let p = 0; p < w * h; p++) data[p * 4 + 3] = out[p] ? 0 : 255;
    // a one pixel feather and a 2 px erosion remove the paper-coloured halo
    for (let pass = 0; pass < 2; pass++) {
      const kill = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (data[p * 4 + 3] && (!data[(p - 1) * 4 + 3] || !data[(p + 1) * 4 + 3] || !data[(p - w) * 4 + 3] || !data[(p + w) * 4 + 3])) kill.push(p);
      }
      for (const p of kill) data[p * 4 + 3] = 0;
    }
    const { label, pieces } = findPieces(img, 6, 20000);
    if (probe || pieces.length !== 5) return console.log(pieces.length, pieces.map((q) => [q.minX, q.minY, q.maxX, q.maxY]));
    pieces.sort((a, b) => a.cx - b.cx);
    const K = 2688 / 2000; // preview px (as read off a 2000 px wide view) to sheet px
    const names = ['pelvis', 'thigh', 'thighBack', 'shin', 'shinBack'];
    const POINTS = {
      thigh: { pivot: [673, 298], tip: [657, 866] },
      thighBack: { pivot: [1004, 298], tip: [987, 866] },
      shin: { pivot: [1363, 288], tip: [1335, 725], sole: [1362, 905] },
      shinBack: { pivot: [1697, 290], tip: [1672, 727], sole: [1700, 905] },
    };
    const file = join(OUT, 'characters/deniz/side/parts.json');
    const parts = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8'));
    for (let i = 0; i < 5; i++) {
      const piece = pieces[i];
      const key = names[i];
      const cut = await cutPiece(img, label, piece, S, 4);
      // the new sheet came out warmer than the torso art: pull it towards the same olive khaki (shoes and socks keep their colour)
      const tint = (b) => sharp(b).modulate({ saturation: 0.78, brightness: 0.93 }).webp({ quality: 88, alphaQuality: 92 });
      if (key === 'shin' || key === 'shinBack') {
        // only the trouser leg: the sock and the shoe below the cuff keep their own colour
        const row = Math.round((POINTS[key].tip[1] * K - cut.oy) * cut.scale);
        const low = await sharp(cut.buf).extract({ left: 0, top: row, width: cut.w, height: cut.h - row }).png().toBuffer();
        const tinted = await tint(cut.buf).png().toBuffer();
        cut.buf = await sharp(tinted).composite([{ input: low, left: 0, top: row }]).webp({ quality: 88, alphaQuality: 92 }).toBuffer();
      } else if (key === 'pelvis') {
        // drop the paper-cut inside of the hem (a dark oval) and fade the open bottom edge, so the thigh shows through it
        const { data, info } = await tint(cut.buf).raw().toBuffer({ resolveWithObject: true });
        const px = new Uint8Array(data);
        const keepH = info.height - 19;
        const fade = 12;
        const ch = info.channels;
        for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
          const i = (y * info.width + x) * ch + 3;
          if (y >= keepH) px[i] = 0;
          else if (y > keepH - fade) px[i] = Math.round(px[i] * ((keepH - y) / fade));
        }
        cut.buf = await sharp(px, { raw: { width: info.width, height: info.height, channels: ch } }).webp({ quality: 88, alphaQuality: 92 }).toBuffer();
      } else cut.buf = await tint(cut.buf).toBuffer();
      await writeOut(`characters/deniz/side/${key}.webp`, cut.buf);
      const entry = { file: `characters/deniz/side/${key}.webp`, w: cut.w, h: cut.h };
      if (key === 'pelvis') {
        // anchor: the middle of the waistband's top edge
        entry.pivot = [Math.round((cut.w / 2) * 10) / 10, 3];
      } else {
        for (const [name, [px, py]] of Object.entries(POINTS[key])) entry[name] = [Math.round((px * K - cut.ox) * cut.scale * 10) / 10, Math.round((py * K - cut.oy) * cut.scale * 10) / 10];
      }
      parts[key] = entry;
    }
    await writeOut('characters/deniz/side/parts.json', Buffer.from(JSON.stringify(parts, null, 1)));
  },
});

/** Melissa puppet parts: body without wings, forewing, hindwing. */
JOBS.push({
  name: 'melissa-parts',
  async run({ probe }) {
    const img = await loadRGBA(join(SRC, 'characters/melissa-parts.png'));
    cleanAlpha(img, 140, 230);
    const { label, pieces } = findPieces(img, 14, 20000);
    if (probe) return console.log(pieces);
    const W = img.w, H = img.h;
    const portrait = pieces.find((p) => p.cy > H * 0.62 && p.cx > W * 0.45);
    const rest = pieces.filter((p) => p !== portrait);
    const body = rest.filter((p) => p.cx < W * 0.45).sort((a, b) => b.area - a.area)[0];
    const wings = rest.filter((p) => p !== body).sort((a, b) => a.cx - b.cx);
    const named = { body, wingF: wings[0], wingH: wings[1] };
    const POINTS = {
      body: { root: [500, 540], center: [480, 560] },
      wingF: { pivot: [1023, 611], tip: [1215, 80] },
      wingH: { pivot: [1523, 708], tip: [1735, 262] },
    };
    const SCALE = 0.3;
    const parts = {};
    for (const [key, piece] of Object.entries(named)) {
      if (!piece) throw new Error('missing piece ' + key);
      const cut = await cutPiece(img, label, piece, SCALE);
      await writeOut(`characters/melissa/${key}.webp`, cut.buf);
      const entry = { file: `characters/melissa/${key}.webp`, w: cut.w, h: cut.h };
      for (const [name, p] of Object.entries(POINTS[key])) entry[name] = pt(piece, cut, p);
      parts[key] = entry;
    }
    await writeOut('characters/melissa/parts.json', Buffer.from(JSON.stringify(parts, null, 1)));
  },
});

/** Kurunta (Hattusa guide stag): head with antlers, torso, front leg, hind leg. Points are read off the 2000 px preview. */
JOBS.push({
  name: 'kurunta-parts',
  async run({ probe }) {
    const img = await loadRGBA(join(SRC, 'hattusa/kurunta-parts.png'));
    cleanAlpha(img, 120, 220);
    const { label, pieces } = findPieces(img, 12, 20000);
    if (probe) return console.log(pieces.map((p) => ({ cx: Math.round(p.cx), cy: Math.round(p.cy), w: p.maxX - p.minX, h: p.maxY - p.minY })));
    const H = img.h;
    const top = pieces.filter((p) => p.cy < H * 0.5).sort((a, b) => a.cx - b.cx);
    const bottom = pieces.filter((p) => p.cy >= H * 0.5).sort((a, b) => a.cx - b.cx);
    if (top.length !== 2 || bottom.length !== 2) throw new Error(`expected 2+2 pieces, found ${top.length}+${bottom.length}`);
    const named = { head: top[0], torso: top[1], legF: bottom[0], legH: bottom[1] };
    const POINTS = {
      head: { pivot: [492, 688] },
      torso: { pivot: [1500, 450], hipJ: [1247, 405], shoulderJ: [1730, 418], neck: [1795, 150] },
      legF: { pivot: [732, 668], foot: [750, 1085] },
      legH: { pivot: [1442, 668], foot: [1500, 1095] },
    };
    const SCALE = 0.3;
    const parts = {};
    for (const [key, piece] of Object.entries(named)) {
      const cut = await cutPiece(img, label, piece, SCALE);
      await writeOut(`characters/kurunta/${key}.webp`, cut.buf);
      const entry = { file: `characters/kurunta/${key}.webp`, w: cut.w, h: cut.h };
      for (const [name, p] of Object.entries(POINTS[key])) entry[name] = pt(piece, cut, p);
      parts[key] = entry;
      if (key === 'legF' || key === 'legH') {
        // the far legs are the same pieces, a little darker
        const dark = await sharp(cut.buf).modulate({ brightness: 0.72, saturation: 0.9 }).webp({ quality: 88, alphaQuality: 92 }).toBuffer();
        await writeOut(`characters/kurunta/${key}Back.webp`, dark);
        parts[key + 'Back'] = { ...entry, file: `characters/kurunta/${key}Back.webp` };
      }
    }
    await writeOut('characters/kurunta/parts.json', Buffer.from(JSON.stringify(parts, null, 1)));
  },
});

/** Single transparent sprite: clean, trim, resize to `width`. */
function sprite(name, srcRel, outRel, width, opts = {}) {
  JOBS.push({
    name,
    async run() {
      const file = join(SRC, srcRel);
      if (!existsSync(file)) return console.log('  skipped (missing)', srcRel);
      const img = await loadRGBA(file);
      cleanAlpha(img, opts.lo ?? 100, opts.hi ?? 200);
      const raw = sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } });
      const trimmed = await raw.trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
      const buf = await sharp(trimmed.data).resize({ width, kernel: 'lanczos3' }).webp({ quality: 88, alphaQuality: 92, effort: 5 }).toBuffer();
      await writeOut(outRel, buf);
      const meta = await sharp(buf).metadata();
      console.log('  size', meta.width, 'x', meta.height, 'trimmed from', trimmed.info.width, 'x', trimmed.info.height);
      if (opts.anchors) {
        // anchors are read off a preview of the source image; opts.preview = source px per preview px
        const k = width / trimmed.info.width;
        const out = { w: meta.width, h: meta.height };
        for (const [name, [px, py]] of Object.entries(opts.anchors)) {
          out[name] = [Math.round((px * opts.preview + trimmed.info.trimOffsetLeft) * k), Math.round((py * opts.preview + trimmed.info.trimOffsetTop) * k)];
        }
        await writeOut(outRel.replace('.webp', '.json'), Buffer.from(JSON.stringify(out, null, 1)));
      }
    },
  });
}

/** Full-frame layer: resize to a height, WebP (alpha kept). */
function layer(name, srcRel, outRel, height, opts = {}) {
  JOBS.push({
    name,
    async run() {
      const file = join(SRC, srcRel);
      if (!existsSync(file)) return console.log('  skipped (missing)', srcRel);
      let pipe = sharp(file).ensureAlpha();
      if (opts.clean || opts.erase) {
        const img = await loadRGBA(file);
        if (opts.clean) cleanAlpha(img, opts.clean[0], opts.clean[1]);
        // opts.erase: rectangles [x0, y0, x1, y1] as fractions of the image, made fully transparent
        for (const [x0, y0, x1, y1] of opts.erase ?? []) {
          for (let y = Math.floor(y0 * img.h); y < Math.ceil(y1 * img.h); y++) {
            for (let x = Math.floor(x0 * img.w); x < Math.ceil(x1 * img.w); x++) img.data[(y * img.w + x) * 4 + 3] = 0;
          }
        }
        pipe = sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } });
      }
      const buf = await pipe.resize({ height, kernel: 'lanczos3' }).webp({ quality: opts.q ?? 82, alphaQuality: 90, effort: 5 }).toBuffer();
      await writeOut(outRel, buf);
    },
  });
}

sprite('flashlight', 'characters/flashlight.png', 'characters/flashlight.webp', 300);
for (const mood of ['neutral', 'happy', 'surprised', 'thinking']) sprite('portrait-deniz-' + mood, `characters/portrait-deniz-${mood}.png`, `characters/portrait-deniz-${mood}.webp`, 384);
sprite('portrait-melissa', 'characters/portrait-melissa.png', 'characters/portrait-melissa.webp', 384);
for (const c of ['bee', 'stag', 'palm', 'blank', 'reverse']) sprite('coin-' + c, `efes/coin-${c}.png`, `efes/coin-${c}.webp`, 256);

for (const s of ['liman', 'tiyatro', 'kutuphane', 'artemis']) {
  layer(`${s}-sky`, `efes/${s}-sky.png`, `efes/${s}-sky.webp`, 1024, { q: 80 });
  for (const l of ['far', 'mid', 'fg']) {
    // the library’s far layer painted a tiny library that would peek out beside the code-drawn facade
    const erase = s === 'kutuphane' && l === 'far' ? [[0.255, 0.26, 0.425, 0.575]] : undefined;
    layer(`${s}-${l}`, `efes/${s}-${l}.png`, `efes/${s}-${l}.webp`, 1024, { clean: [60, 180], erase });
  }
}
layer('title', 'efes/title.png', 'efes/title.webp', 1080, { q: 84 });

/* ---------- Hattusa (act 2) ---------- */
for (const c of ['aslan', 'gunes', 'kil', 'tanri', 'reverse']) sprite('hattusa-coin-' + c, `hattusa/coin-${c}.png`, `hattusa/coin-${c}.webp`, 256);
for (const s of ['kapi', 'tunel', 'arsiv', 'yazili']) {
  if (s === 'kapi' || s === 'yazili') layer(`hattusa-${s}-sky`, `hattusa/${s}-sky.png`, `hattusa/${s}-sky.webp`, 1024, { q: 80 });
  for (const l of ['far', 'mid', 'fg']) {
    layer(`hattusa-${s}-${l}`, `hattusa/${s}-${l}.png`, `hattusa/${s}-${l}.webp`, 1024, { clean: [60, 180], q: l === 'far' && (s === 'tunel' || s === 'arsiv') ? 82 : undefined });
  }
}
layer('hattusa-title', 'hattusa/title.png', 'hattusa/title.webp', 1080, { q: 84 });


/* ---------- hub (map), book and the opening scene ---------- */
layer('hub-map', 'hub/map-dusk.png', 'hub/map.webp', 1100, { q: 80 });
sprite('book-closed', 'hub/book-closed.png', 'book/closed.webp', 480);
sprite('book-open', 'hub/book-open.png', 'book/open.webp', 1500);
for (const id of ['efes', 'hattusa', 'gobeklitepe', 'catalhoyuk', 'troya', 'assos', 'afrodisias', 'bergama', 'sardes', 'nemrut', 'zeugma', 'hierapolis', 'patara', 'gordion', 'phaselis']) {
  sprite('book-plate-' + id, `book/plate-${id}.png`, `book/plate-${id}.webp`, 360);
}
layer('baslangic-wall', 'baslangic/room-wall.png', 'baslangic/wall.webp', 1024, { q: 80 });
layer('baslangic-mid', 'baslangic/room-mid.png', 'baslangic/mid.webp', 1024, { clean: [60, 180] });
layer('baslangic-fg', 'baslangic/room-fg.png', 'baslangic/fg.webp', 1024, { clean: [60, 180] });

/* ---------- main ---------- */
const args = process.argv.slice(2);
const probe = args.includes('--probe');
const only = args.find((a) => !a.startsWith('--'));
for (const job of JOBS) {
  if (only && !job.name.startsWith(only)) continue;
  console.log(job.name);
  await job.run({ probe });
}
