/* G6: back on the map after an act. The screen opens from the dark still zoomed on the city, the camera pulls back, the
   new coin drops onto its place, the city lights up, and the old book opens on that city’s page where the wax seal
   cracks. Runs when the map is shown for a finished city whose return has not been played yet. */
import { chime, pluck, tok, whoosh } from '../audio';
import type { BookOptions } from '../book';
import { assetUrl } from '../url';
import { startCine } from './index';

export interface MapReturn {
  li: HTMLElement;
  wrap: HTMLElement;
  root: HTMLElement;
  id: string;
  /** Spread of the old book that holds this city. */
  spread: number;
  /** Lights the city up in the map (done state and counter). */
  reveal: () => void;
  openBook: (o: BookOptions) => Promise<void>;
  finished: () => void;
}

const el = (cls: string, css: Partial<CSSStyleDeclaration> = {}) => {
  const e = document.createElement('div');
  e.className = cls;
  Object.assign(e.style, css);
  return e;
};

export async function mapReturn(o: MapReturn): Promise<void> {
  const { li, wrap, root, id } = o;
  const btn = li.querySelector<HTMLElement>('button')!;
  const c = startCine();
  const parts: HTMLElement[] = [];
  c.onEnd(() => parts.forEach((p) => p.remove()));
  const vw = innerWidth;
  const vh = innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;

  // dark to begin with, as the act left it
  const veil = el('g5-veil', { opacity: '1' });
  document.body.append(veil);
  parts.push(veil);
  const chrome = [...root.querySelectorAll<HTMLElement>('.hub-title,#bookBtn,#reset')];
  for (const e of chrome) e.style.opacity = '0';
  btn.style.visibility = 'hidden';

  // 1. still zoomed on the city, the camera pulls back to the whole map
  const pin = { x: parseFloat(li.style.left), y: parseFloat(li.style.top) };
  const wr = wrap.getBoundingClientRect();
  const px0 = wr.left + (wr.width * pin.x) / 100;
  const py0 = wr.top + (wr.height * pin.y) / 100;
  wrap.style.transformOrigin = `${pin.x}% ${pin.y}%`;
  void c.anim(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: 1000, easing: 'ease-out' });
  await c.anim(
    wrap,
    [
      { transform: `translate(-50%,-50%) translate(${cx - px0}px,${cy - py0}px) scale(5.5)` },
      { transform: 'translate(-50%,-50%) translate(0,0) scale(1)' },
    ],
    { duration: 2000, easing: 'cubic-bezier(.45,0,.25,1)' },
  );
  wrap.getAnimations().forEach((a) => a.cancel());
  wrap.style.transformOrigin = '';
  veil.remove();
  for (const e of chrome) void c.anim(e, [{ opacity: 0 }, { opacity: 1 }], 600);
  await c.sleep(400);

  // 2. the coin drops onto its place
  const r = btn.getBoundingClientRect();
  const D = r.width;
  const tx = r.left + r.width / 2;
  const ty = r.top + r.height / 2;
  const coin = el('g6-coin', { width: D + 'px', height: D + 'px', left: tx - D / 2 + 'px', top: ty - D / 2 + 'px' });
  coin.innerHTML = `<img src="${assetUrl(`book/plate-${id}.webp`)}" alt="" draggable="false">`;
  document.body.append(coin);
  parts.push(coin);
  if (!c.skipped) whoosh();
  await c.anim(
    coin,
    [
      { transform: `translate(${vw * 0.04}px,${-(ty + D * 3)}px) scale(3.4) rotate(-28deg)`, opacity: 0 },
      { transform: 'translate(0,0) scale(1.35) rotate(7deg)', opacity: 1, offset: 0.72 },
      { transform: 'translate(0,0) scale(.9) rotate(-2deg)', offset: 0.84 },
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
    ],
    { duration: 1100, easing: 'cubic-bezier(.5,0,.8,.6)' },
  );
  // 3. it lands: a thud, a ring of light, and the city lights up
  if (!c.skipped) {
    tok(300, 0.3);
    chime();
    pluck(1318.51, 0.2, 0.08, 0.9);
  }
  o.reveal();
  btn.style.visibility = '';
  coin.remove();
  const bloom = el('g6-bloom', { left: tx + 'px', top: ty + 'px' });
  document.body.append(bloom);
  parts.push(bloom);
  void c.anim(
    bloom,
    [
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.3 },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(1.7)' },
    ],
    { duration: 2000, easing: 'ease-out' },
  );
  for (let i = 0; i < 2; i++) {
    const ring = el('g6-ring', { left: tx + 'px', top: ty + 'px', width: D * 1.1 + 'px', height: D * 1.1 + 'px' });
    document.body.append(ring);
    parts.push(ring);
    void c.anim(
      ring,
      [
        { opacity: 0.9, transform: 'translate(-50%,-50%) scale(.8)' },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(3.2)' },
      ],
      { duration: 1100, delay: i * 260, easing: 'ease-out' },
    );
  }
  const count = root.querySelector<HTMLElement>('#count');
  if (count) void c.anim(count, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 700, delay: 200 });
  await c.sleep(1900);

  // 4. the old book opens on the city’s page and its seal cracks
  const book = root.querySelector<HTMLElement>('#bookBtn');
  if (book && !c.skipped) await c.anim(book, [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px) rotate(-4deg)', offset: 0.4 }, { transform: 'translateY(0)' }], 700);
  c.end();
  await o.openBook({ start: o.spread, crack: id });
  o.finished();
}
