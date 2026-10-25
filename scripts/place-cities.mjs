/* Spreads the city coins on the map so none overlap, and picks a label side for each.
 * Each coin stays close to its true place (a pin marks the real spot, a stem joins them).
 * Reads and rewrites the `off` and `label` fields of src/hub/cities.json. Run after adding or moving a city:
 *
 *   node scripts/place-cities.mjs
 *
 * Units are "cqw": percent of the map width (the map is 2567 x 1100, so its height is 42.85 cqw).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = JSON.parse(await readFile(join(ROOT, 'src/hub/map-bounds.json'), 'utf8'));
const file = join(ROOT, 'src/hub/cities.json');
const cities = JSON.parse(await readFile(file, 'utf8'));

const MAP_H = 100 / (2567 / 1100);
const true_ = cities.map((c) => ({
  x: ((c.lon - B.lon0) / (B.lon1 - B.lon0)) * 100,
  y: (((B.lat1 - c.lat) / (B.lat1 - B.lat0)) * 100 * MAP_H) / 100,
}));

const COIN_R = 1.75; // coin radius
const MIN_D = 5.4; // minimum distance between coin centres
const PIN_CLEAR = 3.0; // a coin keeps this far from every other city's pin
const MAX_OFF = 8.5;

// start every coin a little away from its pin, pushed away from the crowd around it
const pos = true_.map((p, i) => {
  let fx = 0, fy = 0;
  true_.forEach((q, j) => {
    if (i === j) return;
    const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1;
    if (d < 12) { fx += dx / d / d; fy += dy / d / d; }
  });
  const l = Math.hypot(fx, fy) || 1;
  return { x: p.x + (fx / l) * 3 || p.x + 3, y: p.y + (fy / l) * 3 || p.y };
});

for (let it = 0; it < 600; it++) {
  const move = pos.map(() => ({ x: 0, y: 0 }));
  pos.forEach((a, i) => {
    pos.forEach((b, j) => {
      if (i === j) return;
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 0.01;
      if (d < MIN_D) { const k = (MIN_D - d) / 2; move[i].x += (dx / d) * k; move[i].y += (dy / d) * k; }
    });
    true_.forEach((p, j) => {
      if (i === j) return;
      const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy) || 0.01;
      if (d < PIN_CLEAR) { const k = PIN_CLEAR - d; move[i].x += (dx / d) * k; move[i].y += (dy / d) * k; }
    });
    // stay near the true place
    const ox = a.x - true_[i].x, oy = a.y - true_[i].y, od = Math.hypot(ox, oy);
    if (od > MAX_OFF) { move[i].x -= (ox / od) * (od - MAX_OFF); move[i].y -= (oy / od) * (od - MAX_OFF); }
    else if (od > 0.1) { move[i].x -= ox * 0.01; move[i].y -= oy * 0.01; }
  });
  pos.forEach((a, i) => {
    a.x = Math.min(97, Math.max(3, a.x + move[i].x * 0.5));
    a.y = Math.min(MAP_H - 3, Math.max(3, a.y + move[i].y * 0.5));
  });
}

// label rectangles (cqw): width follows the name length, height ~2.4
const labelRect = (c, p, side) => {
  const w = c.name.length * 0.78 + 1.6;
  const h = 2.5;
  const gap = 0.5;
  if (side === 'bottom') return { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y + COIN_R + gap, y1: p.y + COIN_R + gap + h };
  if (side === 'top') return { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - COIN_R - gap - h, y1: p.y - COIN_R - gap };
  if (side === 'left') return { x0: p.x - COIN_R - gap - w, x1: p.x - COIN_R - gap, y0: p.y - h / 2, y1: p.y + h / 2 };
  return { x0: p.x + COIN_R + gap, x1: p.x + COIN_R + gap + w, y0: p.y - h / 2, y1: p.y + h / 2 };
};
const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const circleRect = (p, r) => ({ x0: p.x - r, x1: p.x + r, y0: p.y - r, y1: p.y + r });

const chosen = new Array(cities.length).fill(null);
const order = cities.map((_, i) => i).sort((a, b) => {
  const crowd = (i) => pos.filter((q, j) => j !== i && Math.hypot(q.x - pos[i].x, q.y - pos[i].y) < 11).length;
  return crowd(b) - crowd(a);
});
for (const i of order) {
  let best = 'bottom', bestScore = Infinity;
  for (const side of ['bottom', 'top', 'right', 'left']) {
    const r = labelRect(cities[i], pos[i], side);
    let s = 0;
    pos.forEach((q, j) => {
      if (j !== i) s += overlap(r, circleRect(q, COIN_R)) * 6 + overlap(r, circleRect(true_[j], 0.5)) * 6;
      if (j !== i && chosen[j]) s += overlap(r, labelRect(cities[j], pos[j], chosen[j])) * 6;
    });
    s += overlap(r, circleRect(true_[i], 0.6)) * 4;
    if (r.x0 < 1 || r.x1 > 99) s += 40; // keep labels on the map
    if (r.y1 > MAP_H - 0.5) s += 40;
    if (side !== 'bottom') s += 0.15; // slight preference for bottom
    if (s < bestScore) { bestScore = s; best = side; }
  }
  chosen[i] = best;
}

const out = cities.map((c, i) => ({
  ...c,
  label: chosen[i],
  off: [Math.round((pos[i].x - true_[i].x) * 10) / 10, Math.round((pos[i].y - true_[i].y) * 10) / 10],
}));
await writeFile(file, '[\n' + out.map((c) => '  ' + JSON.stringify(c)).join(',\n') + '\n]\n');

let minD = 99, pair = '';
pos.forEach((a, i) => pos.forEach((b, j) => { if (j > i) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < minD) { minD = d; pair = `${cities[i].id}-${cities[j].id}`; } } }));
console.log(`min coin distance ${minD.toFixed(2)} cqw (${pair}); coin diameter ${(COIN_R * 2).toFixed(2)}`);
out.forEach((c) => console.log(c.id.padEnd(12), 'off', c.off.join(', ').padEnd(12), 'label', c.label));
