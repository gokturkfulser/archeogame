/* G5: choosing a city on the map. The city's coin lifts off the map and spins to show its animal, the animal sets off
   for the city (it flies, runs or glides, as that animal would) while the camera follows it into the map, and the
   screen darkens into the act, whose own title card comes next. Runs on the map; ends by loading the act page. */
import { chime, pluck, whoosh } from '../audio';
import { assetUrl } from '../url';
import { startCine } from './index';

type Gait = 'fly' | 'run' | 'glide' | 'leap';

/** How each guide animal travels. */
const GAIT: Record<string, Gait> = {
  efes: 'fly',
  nemrut: 'fly',
  assos: 'fly',
  afrodisias: 'fly',
  zeugma: 'fly',
  hattusa: 'run',
  gobeklitepe: 'run',
  catalhoyuk: 'run',
  troya: 'run',
  gordion: 'run',
  hierapolis: 'run',
  sardes: 'run',
  bergama: 'glide',
  patara: 'glide',
  phaselis: 'leap',
};

const el = (cls: string, css: Partial<CSSStyleDeclaration> = {}) => {
  const e = document.createElement('div');
  e.className = cls;
  Object.assign(e.style, css);
  return e;
};
const ease = (t: number) => t * t * (3 - 2 * t);

export interface CitySelect {
  li: HTMLElement;
  wrap: HTMLElement;
  root: HTMLElement;
  id: string;
  href: string;
}

let busy = false;

export async function citySelect(o: CitySelect): Promise<void> {
  if (busy) return;
  busy = true;
  const { li, wrap, root, id, href } = o;
  const btn = li.querySelector<HTMLElement>('button')!;
  const c = startCine();
  const vw = innerWidth;
  const vh = innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;
  const veil = el('g5-veil');
  document.body.append(veil);
  const parts: HTMLElement[] = [];
  c.onEnd(() => parts.forEach((p) => p.remove()));

  try {
    const r0 = btn.getBoundingClientRect();
    const D = Math.min(vw, vh) * 0.36;
    // the coin: gold reverse on one side, the animal on the other
    const coin = el('g5-coin', { width: D + 'px', height: D + 'px', left: cx - D / 2 + 'px', top: cy - D / 2 + 'px' });
    coin.innerHTML = `<div class="face front"><img src="${assetUrl(`book/plate-${id}.webp`)}" alt="" draggable="false"></div><div class="face back"><b>✦</b></div>`;
    const halo = el('g5-halo', { width: D * 2.2 + 'px', height: D * 2.2 + 'px', left: cx - D * 1.1 + 'px', top: cy - D * 1.1 + 'px' });
    document.body.append(halo, coin);
    parts.push(coin, halo);
    btn.style.visibility = 'hidden';
    const chrome = [...root.querySelectorAll<HTMLElement>('.hub-title,#bookBtn,#reset,#toast')];
    for (const e of chrome) void c.anim(e, [{ opacity: 1 }, { opacity: 0 }], 450);

    // 1. the coin lifts off the map to the middle of the screen and spins, showing the gold reverse on the way
    const k0 = r0.width / D;
    const dx0 = r0.left + r0.width / 2 - cx;
    const dy0 = r0.top + r0.height / 2 - cy;
    const persp = 'perspective(1100px)';
    if (!c.skipped) whoosh();
    void c.anim(halo, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1500, easing: 'ease-out' });
    await c.anim(
      coin,
      [
        { transform: `translate(${dx0}px,${dy0}px) scale(${k0}) ${persp} rotateY(0deg)` },
        { transform: `translate(${dx0 * 0.3}px,${dy0 * 0.3 - D * 0.2}px) scale(${k0 + (1 - k0) * 0.6}) ${persp} rotateY(360deg)`, offset: 0.55 },
        { transform: `translate(0,0) scale(1) ${persp} rotateY(720deg)` },
      ],
      { duration: 1500, easing: 'cubic-bezier(.4,.05,.2,1)' },
    );
    if (!c.skipped) chime();
    await c.sleep(550);

    // 2. the animal sets off for the city; the camera follows it into the map
    const pin = { x: parseFloat(li.style.left), y: parseFloat(li.style.top) };
    const wr = wrap.getBoundingClientRect();
    const px0 = wr.left + (wr.width * pin.x) / 100;
    const py0 = wr.top + (wr.height * pin.y) / 100;
    const K = 5.5;
    wrap.style.transformOrigin = `${pin.x}% ${pin.y}%`;
    const zoomMs = 2200;
    void c.anim(
      wrap,
      [
        { transform: 'translate(-50%,-50%) translate(0,0) scale(1)' },
        { transform: `translate(-50%,-50%) translate(${cx - px0}px,${cy - py0}px) scale(${K})` },
      ],
      { duration: zoomMs, easing: 'cubic-bezier(.5,0,.25,1)' },
    );
    for (const e of [...root.querySelectorAll<HTMLElement>('#cities .city')]) if (e !== li) void c.anim(e, [{ opacity: 1 }, { opacity: 0.0 }], { duration: 900, delay: 200 });
    void c.anim(halo, [{ opacity: 1 }, { opacity: 0 }], 600);

    const gait = GAIT[id] ?? 'glide';
    const trail = (x: number, y: number) => {
      const s = el('g5-spark', { left: x + 'px', top: y + 'px' });
      document.body.append(s);
      parts.push(s);
      s.animate([{ opacity: 0.9, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: `translate(-50%,${gait === 'fly' ? '-120%' : '60%'}) scale(.2)` }], { duration: 700 }).onfinish = () => s.remove();
    };
    const flightMs = 1900;
    const t0 = performance.now();
    let lastTrail = 0;
    const startScale = 1;
    const spinBack = 0; // the animal stays face-up on its way
    await new Promise<void>((done) => {
      const frame = (now: number) => {
        const t = c.skipped ? 1 : Math.min(1, (now - t0) / flightMs);
        const e = ease(t);
        // target = where the coin of the city is right now (it moves because the camera is zooming)
        const b = btn.getBoundingClientRect();
        const tx = b.left + b.width / 2;
        const ty = b.top + b.height / 2;
        const tScale = b.width / D;
        // a curved route: up and over, then down onto the city
        const mx = cx + (tx - cx) * 0.5;
        const my = Math.min(cy, ty) - D * 0.45;
        const x = (1 - e) * (1 - e) * cx + 2 * (1 - e) * e * mx + e * e * tx;
        let y = (1 - e) * (1 - e) * cy + 2 * (1 - e) * e * my + e * e * ty;
        const fade = Math.sin(Math.PI * Math.min(1, t * 1.05)); // gait is strongest mid-flight
        let rot = 0;
        let sx = 1;
        if (gait === 'fly') {
          y += Math.sin(t * 40) * 9 * fade;
          rot = Math.sin(t * 20) * 7 * fade;
          sx = 1 - 0.07 * Math.abs(Math.sin(t * 40)) * fade;
        } else if (gait === 'run') {
          y -= Math.abs(Math.sin(t * 36)) * 26 * fade;
          rot = Math.sin(t * 36) * 5 * fade;
        } else if (gait === 'leap') {
          y -= Math.abs(Math.sin(t * 17)) * 60 * fade;
          rot = Math.cos(t * 17) * 14 * fade;
        } else {
          y += Math.sin(t * 14) * 14 * fade;
          rot = Math.cos(t * 14) * 6 * fade;
        }
        const sc = startScale + (tScale - startScale) * e;
        coin.style.transform = `translate(${x - cx}px,${y - cy}px) scale(${sc * sx},${sc}) rotate(${rot + spinBack}deg)`;
        if (now - lastTrail > 45 && t < 1 && !c.skipped) {
          lastTrail = now;
          trail(x + (Math.random() - 0.5) * D * sc * 0.4, y + (Math.random() - 0.5) * D * sc * 0.4);
        }
        if (t < 1) requestAnimationFrame(frame);
        else done();
      };
      coin.style.animation = 'none';
      coin.getAnimations().forEach((a) => a.cancel());
      requestAnimationFrame(frame);
    });

    // 3. it lands on the city: a burst of light, then the screen darkens into the act
    const b = btn.getBoundingClientRect();
    if (!c.skipped) {
      chime();
      pluck(1174.66, 0.15, 0.08, 0.9);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const s = el('g5-spark big', { left: b.left + b.width / 2 + 'px', top: b.top + b.height / 2 + 'px' });
      document.body.append(s);
      parts.push(s);
      s.animate(
        [{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(a) * b.width * 1.2}px),calc(-50% + ${Math.sin(a) * b.width * 1.2}px)) scale(.2)` }],
        { duration: 700, easing: 'ease-out' },
      ).onfinish = () => s.remove();
    }
    await c.sleep(300);
    await c.anim(veil, [{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-in' });
  } finally {
    location.href = href;
  }
}
