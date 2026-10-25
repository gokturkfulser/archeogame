/* G4: from the study to the map, without a page load. Deniz puts the book in her satchel, the camera pushes into the old
   wall map, and the wall map unfolds pop-up style into the game’s paper map; the coins pop onto it and a dotted path
   is drawn from the house in Selçuk to Efes. Runs on the opening page, which mounts the hub on top of the room. */
import { H, W, lamp, par, stage } from '../core';
import { chime, pluck, tok, whoosh } from '../audio';
import { deniz } from '../deniz';
import { assetUrl } from '../url';
import { Cine, startCine } from './index';
import { coverTarget } from './book-discovery';

/** The wall map on the backdrop, as fractions of the backdrop picture (2389×1024). */
const WALL_MAP = { x0: 0.546, x1: 0.763, y0: 0.064, y1: 0.457 };
const WALL_ASPECT = 2389 / 1024;
/** How high the satchel sits, as a fraction of Deniz’s height. */
const BAG_Y = 0.7;
/** Selçuk lies a little east of the ancient city; the house is nudged so the path is long enough to see (map-width percent). */
const HOUSE = { dx: 2.7, dy: 0.1 };

/** Where the wall map is on screen (client pixels), replicating how the backdrop is covered. */
function wallMapRect() {
  const { Mx, My, s, ox, oy } = stage;
  const o = par(0.02);
  const vw = W + 2 * Mx;
  const vh = H + 2 * My;
  const iw = 1000 * WALL_ASPECT;
  const ih = 1000;
  const k = Math.max(vw / iw, vh / ih);
  const w = iw * k;
  const h = ih * k;
  const left = W / 2 - w / 2 + o.x;
  const top = H / 2 - h / 2 + o.y;
  const x0 = left + w * WALL_MAP.x0;
  const x1 = left + w * WALL_MAP.x1;
  const y0 = top + h * WALL_MAP.y0;
  const y1 = top + h * WALL_MAP.y1;
  return {
    left: ox + x0 * s,
    top: oy + y0 * s,
    width: (x1 - x0) * s,
    height: (y1 - y0) * s,
    wx: (x0 + x1) / 2,
    wy: (y0 + y1) / 2,
  };
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, css: Partial<CSSStyleDeclaration> = {}) => {
  const e = document.createElement(tag);
  e.className = cls;
  Object.assign(e.style, css);
  return e;
};

/** Step 1: the closed book shrinks into Deniz’s satchel. */
async function bookIntoSatchel(c: Cine, ground: number, height: number) {
  const t = coverTarget();
  const h = (t.w * 554) / 480;
  const book = el('div', 'cine-book', { left: t.x - t.w / 2 + 'px', top: t.y - h / 2 + 'px', width: t.w + 'px', height: h + 'px' });
  const img = document.createElement('img');
  img.src = assetUrl('book/closed.webp');
  img.alt = '';
  book.append(img);
  document.body.append(book);
  c.onEnd(() => book.remove());
  const bx = stage.ox + (deniz.x - 24) * stage.s;
  const by = stage.oy + (ground - height * BAG_Y) * stage.s;
  if (!c.skipped) whoosh();
  await c.anim(
    book,
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${(bx - t.x) * 0.4}px,${(by - t.y) * 0.4 - h * 0.25}px) scale(.55) rotate(-6deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${bx - t.x}px,${by - t.y}px) scale(.08) rotate(4deg)`, opacity: 0 },
    ],
    { duration: 1100, easing: 'cubic-bezier(.5,0,.4,1)' },
  );
  if (!c.skipped) tok(300, 0.2);
  book.remove();
  await c.sleep(350);
}

/** `ground` and `height` are the floor line and Deniz’s height in the study (world units). */
export async function roomToMap(ground: number, height: number): Promise<void> {
  const c = startCine();
  const hud = document.querySelector<HTMLElement>('.hud');
  if (hud) hud.style.opacity = '0';
  const rect = wallMapRect();

  // 1. the book goes into the satchel
  await bookIntoSatchel(c, ground, height);

  // the flashlight swings to the wall map and lights it
  lamp.lock = { x: rect.wx, y: rect.wy };
  await c.sleep(700);

  // 2. the map is built on top of the room, hidden, so it can unfold from the wall
  const { mountHub } = await import('../../hub/mount');
  const host = el('div', 'cine-hub');
  document.body.append(host);
  const hub = mountHub(host);
  history.replaceState(null, '', '/');
  const root = hub.root;
  root.style.perspective = '1800px';
  const cities = [...root.querySelectorAll<HTMLElement>('.city')];
  const chrome = [root.querySelector<HTMLElement>('.hub-title'), root.querySelector<HTMLElement>('#bookBtn'), root.querySelector<HTMLElement>('#reset')].filter(
    (e): e is HTMLElement => !!e,
  );
  for (const e of [...cities, ...chrome]) e.style.opacity = '0';
  root.style.opacity = '0';
  root.style.visibility = 'visible';

  // 3. camera push into the wall map while the map unfolds out of it
  const cv = stage.cv;
  const k = Math.min(innerWidth / rect.width, innerHeight / rect.height) * 0.75;
  cv.style.transformOrigin = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
  const push = c.anim(cv, [{ transform: 'scale(1)' }, { transform: `scale(${k})` }], { duration: 2000, easing: 'cubic-bezier(.55,0,.3,1)' });
  const wrap = hub.wrap;
  const wr = wrap.getBoundingClientRect();
  // the wall map has grown by k when the unfolding starts; the push is centred on it, so its centre has not moved
  const sc = (rect.width * k) / wr.width;
  const dx = rect.left + rect.width / 2 - (wr.left + wr.width / 2);
  const dy = rect.top + rect.height / 2 - (wr.top + wr.height / 2);
  wrap.style.transformOrigin = '50% 100%';
  await push;
  await c.sleep(250);
  if (!c.skipped) {
    whoosh();
    pluck(392, 0.1, 0.1, 0.7);
  }
  void c.anim(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 1500, easing: 'ease-in' });
  await c.anim(
    wrap,
    [
      { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${sc}) rotateX(80deg)`, opacity: 0.0 },
      { transform: `translate(-50%,-50%) translate(${dx * 0.4}px,${dy * 0.4}px) scale(${sc + (1 - sc) * 0.55}) rotateX(40deg)`, opacity: 1, offset: 0.45 },
      { transform: 'translate(-50%,-50%) translate(0,0) scale(1.015) rotateX(-4deg)', opacity: 1, offset: 0.85 },
      { transform: 'translate(-50%,-50%)', opacity: 1 },
    ],
    { duration: 1900, easing: 'cubic-bezier(.3,.1,.2,1)' },
  );
  // the room is no longer needed: stop painting it
  cv.getAnimations().forEach((a) => a.cancel());
  cv.style.visibility = 'hidden';
  lamp.lock = null;
  root.style.perspective = '';
  wrap.style.transformOrigin = '';
  await c.sleep(250);

  // 4. title, then the coins pop onto the map one by one (Efes is saved for the end)
  for (const e of chrome) void c.anim(e, [{ opacity: 0 }, { opacity: 1 }], 600);
  const rest = cities.filter((e) => e.dataset.city !== 'efes');
  for (let i = 0; i < rest.length; i++) {
    const e = rest[i];
    e.style.opacity = '1';
    if (!c.skipped) pluck([523.25, 587.33, 659.25, 783.99, 880][i % 5], 0, 0.06, 0.8);
    void c.anim(
      e,
      [
        { scale: '0' },
        { scale: '1.25', offset: 0.65 },
        { scale: '1' },
      ],
      { duration: 380, easing: 'ease-out' },
    );
    await c.sleep(55);
  }
  await c.sleep(450);

  // 5. the house in Selçuk, and a dotted path drawn from it to Efes
  const efes = cities.find((e) => e.dataset.city === 'efes')!;
  const route = routeBetween(wrap, efes);
  if (!c.skipped) pluck(587.33, 0, 0.1, 0.7);
  await c.anim(route.house, [{ scale: '0', opacity: 0 }, { scale: '1.2', opacity: 1, offset: 0.7 }, { scale: '1', opacity: 1 }], { duration: 450, easing: 'ease-out' });
  await c.sleep(150);
  await c.anim(route.mask, [{ strokeDashoffset: route.len + 'px' }, { strokeDashoffset: '0px' }], { duration: 1700, easing: 'ease-in-out' });
  await c.sleep(150);

  // 6. Efes lights up: this is where Deniz goes first
  efes.style.opacity = '1';
  efes.classList.add('pulse');
  if (!c.skipped) chime();
  await c.anim(efes, [{ scale: '0' }, { scale: '1.35', offset: 0.6 }, { scale: '1' }], { duration: 650, easing: 'ease-out' });
  hub.toast('Efes’ten başla. Dedenin notu böyle diyordu.');
  await c.sleep(600);

  if (hud) hud.remove();
  c.end();
}

/** An SVG laid over the map: a house icon near Efes and a dotted path (revealed through a mask) leading to the coin. */
function routeBetween(wrap: HTMLElement, efes: HTMLElement) {
  const NS = 'http://www.w3.org/2000/svg';
  const MW = 2567;
  const MH = 1100;
  const px = (parseFloat(efes.style.left) / 100) * MW;
  const py = (parseFloat(efes.style.top) / 100) * MH;
  const cw = MW / 100;
  const hx = px + HOUSE.dx * cw;
  const hy = py + HOUSE.dy * cw;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${MW} ${MH}`);
  svg.setAttribute('class', 'route');
  svg.setAttribute('aria-hidden', 'true');
  const d = `M ${hx} ${hy} C ${hx - 0.4 * cw} ${hy + 2.4 * cw}, ${px + 1.2 * cw} ${py + 2.6 * cw}, ${px + 0.2 * cw} ${py + 0.5 * cw}`;
  const defs = document.createElementNS(NS, 'defs');
  const mask = document.createElementNS(NS, 'mask');
  mask.id = 'routeMask';
  const mp = document.createElementNS(NS, 'path');
  mp.setAttribute('d', d);
  mp.setAttribute('fill', 'none');
  mp.setAttribute('stroke', '#fff');
  mp.setAttribute('stroke-width', '30');
  mp.setAttribute('stroke-linecap', 'round');
  mask.append(mp);
  defs.append(mask);
  const dots = document.createElementNS(NS, 'path');
  dots.setAttribute('d', d);
  dots.setAttribute('fill', 'none');
  dots.setAttribute('stroke', '#f3c56a');
  dots.setAttribute('stroke-width', '15');
  dots.setAttribute('stroke-linecap', 'round');
  dots.setAttribute('stroke-dasharray', '0.1 30');
  dots.setAttribute('mask', 'url(#routeMask)');
  svg.append(defs, dots);
  wrap.append(svg);
  const len = mp.getTotalLength();
  mp.style.strokeDasharray = String(len);
  mp.style.strokeDashoffset = String(len);
  const house = el('div', 'house', { left: (hx / MW) * 100 + '%', top: (hy / MH) * 100 + '%' });
  house.setAttribute('aria-hidden', 'true');
  house.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M3 12 12 4l9 8" fill="none" stroke="#2a1830" stroke-width="2.4" stroke-linejoin="round"/><path d="M5.5 11v9h13v-9L12 5.6z" fill="#f2dfb8" stroke="#2a1830" stroke-width="1.6" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="6" fill="#a8322a"/></svg>';
  house.style.opacity = '0';
  wrap.append(house);
  return { house, mask: mp, len };
}
