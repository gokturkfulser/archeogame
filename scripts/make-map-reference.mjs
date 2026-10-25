/* Renders the silhouette of Türkiye (Natural Earth 50 m) with the hub’s projection, to be used as the shape reference
 * when generating the painted map with Higgsfield. Writes assets-src/hub/map-reference.png (21:9).
 * Also writes assets-src/hub/map-check.png: the reference with every city marked, to verify the projection.
 *
 *   node scripts/make-map-reference.mjs
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = JSON.parse(await readFile(join(ROOT, 'src/hub/map-bounds.json'), 'utf8'));
const region = JSON.parse(await readFile(join(ROOT, 'assets-src/hub/region.json'), 'utf8'));
const cities = JSON.parse(await readFile(join(ROOT, 'src/hub/cities.json'), 'utf8'));

const W = 2688;
const H = 1152;
const px = (lon, lat) => [((lon - B.lon0) / (B.lon1 - B.lon0)) * W, ((B.lat1 - lat) / (B.lat1 - B.lat0)) * H];

function pathOf(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let d = '';
  for (const poly of polys) {
    for (const ring of poly) {
      d += ring.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon, lat)[0].toFixed(1)} ${px(lon, lat)[1].toFixed(1)}`).join('') + 'Z';
    }
  }
  return d;
}

const land = (fill) => region.filter((r) => r.name === 'Turkey').map((r) => `<path d="${pathOf(r.geometry)}" fill="${fill}"/>`).join('');
const others = region.filter((r) => r.name !== 'Turkey').map((r) => `<path d="${pathOf(r.geometry)}" fill="#59607f"/>`).join('');
const svg = (extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#101a4a"/>${others}${land('#f4ead0')}${extra}</svg>`;

await sharp(Buffer.from(svg())).png().toFile(join(ROOT, 'assets-src/hub/map-reference.png'));

const marks = cities
  .map((c) => {
    const [x, y] = px(c.lon, c.lat);
    return `<circle cx="${x}" cy="${y}" r="9" fill="#ff2d55" stroke="#fff" stroke-width="3"/><text x="${x + 14}" y="${y + 6}" font-size="26" font-family="Georgia" fill="#111">${c.name}</text>`;
  })
  .join('');
await sharp(Buffer.from(svg(marks))).png().toFile(join(ROOT, 'assets-src/hub/map-check.png'));
await writeFile(join(ROOT, 'assets-src/hub/map-reference.txt'), `bounds ${JSON.stringify(B)}\n`);
console.log('wrote map-reference.png and map-check.png');
