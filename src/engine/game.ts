/* The runtime: resize, render loop, scene switching and the title screen. */
import { H, W, clamp, lamp, stage, view, wait } from './core';
import { audioInit, ambient, initMuteButton } from './audio';
import { dot } from './paper';
import { Layer, buildLayers, drawCover, drawLayer, freeLayers, loadImage, prefetch } from './layers';
import { drawBeam } from './flashlight';
import { bee, drawBee, updateBee, useMelissaImages } from './melissa';
import { celebrate, debug as denizDebug, deniz, denizScaleFor, drawDeniz, placeDeniz, updateDeniz, useImageSkin } from './deniz';
import { drawStag, drawStagGlow, placeStag, stag, updateStag, useKurundaImages } from './kurunta';
import { bindGoalButtons, clearGoal } from './dialogue';
import { closeCurtain, openCurtain } from './hud';
import { initInput } from './input';
import type { Scene } from './scene';

let scenes: Scene[] = [];
let scene: Scene | null = null;
let backImg: HTMLImageElement | null = null;
let actName = '';

export const currentScene = () => scene;
const layersOf = (sc: Scene) => sc.layers as Layer[];
/** Deniz is scaled so she stands about 280 world units tall (override per scene with `denizHeight`). */
const denizScale = (sc: Scene) => denizScaleFor(sc.denizHeight ?? 280);

/* ---------- layout ---------- */
function buildAll() {
  const sc = scene;
  if (!sc) return;
  void buildLayers(layersOf(sc));
  if (sc.backImage) {
    loadImage(sc.backImage)
      .then((img) => {
        if (scene === sc) backImg = img;
      })
      .catch(() => {
        /* keep the code-drawn backdrop */
      });
  }
}

function resize() {
  const st = stage;
  st.dpr = Math.min(window.devicePixelRatio || 1, 2);
  st.cw = innerWidth;
  st.ch = innerHeight;
  st.cv.width = Math.round(st.cw * st.dpr);
  st.cv.height = Math.round(st.ch * st.dpr);
  st.cv.style.width = st.cw + 'px';
  st.cv.style.height = st.ch + 'px';
  st.s = Math.min(st.cw / W, st.ch / H);
  st.ox = (st.cw - W * st.s) / 2;
  st.oy = (st.ch - H * st.s) / 2;
  st.Mx = Math.ceil(Math.max(0, (st.cw / st.s - W) / 2) + 50);
  st.My = Math.ceil(Math.max(0, (st.ch / st.s - H) / 2) + 50);
  st.q = Math.min(st.s * Math.min(st.dpr, 1.5), 2);
  const px = (W + 2 * st.Mx) * (H + 2 * st.My) * st.q * st.q;
  if (px > 6.5e6) st.q *= Math.sqrt(6.5e6 / px);
  if (scene) {
    freeLayers(layersOf(scene));
    buildAll();
  }
  placeHotspots();
}

function placeHotspots() {
  const box = document.getElementById('hotspots') as HTMLElement;
  box.innerHTML = '';
  if (!scene || !scene.hotspots) return;
  const { ox, oy, s } = stage;
  for (const h of scene.hotspots()) {
    const b = document.createElement('button');
    b.className = 'hs';
    b.setAttribute('aria-label', h.label);
    Object.assign(b.style, { left: ox + h.x * s + 'px', top: oy + h.y * s + 'px', width: h.w * s + 'px', height: h.h * s + 'px' });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      h.act();
    });
    box.append(b);
  }
}

/* ---------- render ---------- */
function render(sc: Scene) {
  const g = stage.ctx;
  const { dpr, s, ox, oy, Mx, My } = stage;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  if (backImg) {
    drawCover(g, backImg);
    sc.backFx?.(g);
  } else sc.back(g);
  sc.afterBack?.(g);

  const layers = layersOf(sc);
  const light = sc.solvedLamp || lamp;
  const dAfter = sc.denizAfter ?? layers.length - 2;
  if (dAfter < 0) {
    drawStag(g, sc.ground);
    drawDeniz(g, sc.ground, denizScale(sc));
  }
  layers.forEach((L, i) => {
    drawLayer(g, L, light);
    sc.after?.(i, g);
    if (i === dAfter) {
      drawStag(g, sc.ground);
      drawDeniz(g, sc.ground, denizScale(sc));
    }
  });

  const dk = sc.dark;
  if (dk > 0) {
    const gr = g.createRadialGradient(lamp.x, lamp.y, 40, lamp.x, lamp.y, 560);
    gr.addColorStop(0, 'rgba(10,8,32,0)');
    gr.addColorStop(0.35, `rgba(10,8,32,${dk * 0.25})`);
    gr.addColorStop(1, `rgba(10,8,32,${dk})`);
    g.fillStyle = gr;
    g.fillRect(-Mx - 80, -My - 80, W + 2 * Mx + 160, H + 2 * My + 160);
  }
  drawStagGlow(g, sc.ground);
  g.globalCompositeOperation = 'screen';
  {
    const gr = g.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, 270);
    gr.addColorStop(0, 'rgba(255,190,110,.34)');
    gr.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = gr;
    dot(g, lamp.x, lamp.y, 270);
  }
  g.globalCompositeOperation = 'source-over';
  sc.fx?.(g);
  if (bee.on) drawBee(g, bee.x, bee.y, bee.sc, bee.face);
  drawBeam(g);
}

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stage.T += dt;
  if (lamp.lock) {
    lamp.x += (lamp.lock.x - lamp.x) * Math.min(1, dt * 3);
    lamp.y += (lamp.lock.y - lamp.y) * Math.min(1, dt * 3);
  } else {
    const k = 1 - Math.pow(0.0004, dt);
    lamp.x += (lamp.tx - lamp.x) * k;
    lamp.y += (lamp.ty - lamp.y) * k;
  }
  view.px += (clamp((lamp.x - W / 2) / (W / 2), -1, 1) - view.px) * Math.min(1, dt * 2.5);
  view.py += (clamp((lamp.y - H / 2) / (H / 2), -1, 1) - view.py) * Math.min(1, dt * 2.5);
  if (scene) {
    updateDeniz(dt);
    updateBee(dt);
    updateStag(dt);
    scene.update?.(dt);
    render(scene);
  }
  requestAnimationFrame(loop);
}

/* ---------- scenes ---------- */
function setScene(i: number) {
  if (scene) {
    scene.exit?.();
    freeLayers(layersOf(scene));
  }
  backImg = null;
  scene = scenes[i];
  buildAll();
  lamp.x = lamp.tx = scene.lamp0[0];
  lamp.y = lamp.ty = scene.lamp0[1];
  lamp.lock = null;
  placeDeniz();
  placeHotspots();
  if (stag.on) placeStag();
  if (bee.on) {
    bee.x = lamp.x + 120;
    bee.y = lamp.y - 120;
  }
  (document.getElementById('where') as HTMLElement).textContent = actName + ', ' + scene.name;
  ambient(scene.ambience);
  const next = scenes[i + 1];
  if (next) prefetch([...(next.assets ?? []), ...(next.backImage ? [next.backImage] : [])]);
}

/** Curtain closes, the next scene is set, the curtain opens and the scene starts. */
export async function go(i: number) {
  clearGoal();
  await closeCurtain();
  setScene(i);
  await wait(200);
  const sc = scene!;
  await openCurtain(sc.num, sc.name);
  void sc.enter();
}

/** Re-lays out hotspots after a puzzle changes them. */
export { placeHotspots };

export function boot(list: Scene[], act: string, guide: 'melissa' | 'kurunta' = 'melissa') {
  scenes = list;
  useImageSkin();
  if (guide === 'kurunta') useKurundaImages();
  else useMelissaImages();
  actName = act;
  let rz = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = window.setTimeout(resize, 120);
  });
  resize();
  setScene(0);
  initInput(currentScene);
  initMuteButton(document.getElementById('sound') as HTMLElement);
  bindGoalButtons(
    () => scene?.hint(),
    () => scene?.replay?.(),
  );
  requestAnimationFrame(loop);

  (document.getElementById('start') as HTMLButtonElement).addEventListener('click', async () => {
    audioInit();
    ambient(scene!.ambience);
    const title = document.getElementById('title') as HTMLElement;
    title.classList.add('gone');
    setTimeout(() => (title.hidden = true), 700);
    await openCurtain(scene!.num, scene!.name);
    void scene!.enter();
  });

  if (import.meta.env.DEV) {
    // Test and debugging hook; stripped from production builds.
    (window as unknown as Record<string, unknown>).__game = {
      scene: () => scene,
      go,
      stag,
      lamp,
      deniz,
      celebrate,
      denizDebug,
      rebuildLayers: () => buildLayers(layersOf(scene!)),
      toClient: (x: number, y: number) => ({ x: stage.ox + x * stage.s, y: stage.oy + y * stage.s }),
    };
  }
}
