/* Başlangıç: Dedemin çalışma odası. Sweep the flashlight to find the old book hiding on the desk, open it, then go to the map. */
import { Ctx, rv, stage, withPar } from '../../../engine/core';
import { chime } from '../../../engine/audio';
import { openBook } from '../../../engine/book';
import { clearGoal, dialogOpen, say, setGoal } from '../../../engine/dialogue';
import { closeCurtain } from '../../../engine/hud';
import { LayerSpec, loadImage } from '../../../engine/layers';
import { skyFill } from '../../../engine/paper';
import { markBookFound } from '../../../engine/progress';
import type { Hotspot, Scene } from '../../../engine/scene';
import { bookSpreads } from '../../../story/book-content';
import { TEXT } from '../text';

/** Where the book lies on the desk (world units, in the desk layer’s parallax). */
const BX = 1130;
const BY = 382;
const BOOK_W = 128;

export class Calisma implements Scene {
  id = 'calisma';
  num = TEXT.num;
  name = TEXT.name;
  dark = 0.55;
  lamp0: [number, number] = [520, 520];
  ground = 862;
  /** Taller than the desk (its top is about 400 units above the floor). */
  denizHeight = 520;
  backImage = 'baslangic/wall.webp';
  ambience = { base: 55, noiseFreq: 300, noiseVol: 0.03, noiseLfo: 0.07, crickets: true };

  private found = false;
  private solve: (() => void) | null = null;
  private t0 = 0;
  private book: HTMLImageElement | null = null;

  back = (g: Ctx) => {
    skyFill(g, [
      [0, '#0c1033'],
      [1, '#1a1636'],
    ]);
  };

  layers: LayerSpec[] = [
    { d: 0.45, image: 'baslangic/mid.webp' },
    { d: 0.88, image: 'baslangic/fg.webp', shA: 0.5 },
  ];

  /** The book is only visible where the flashlight shines; a faint glint hints at it after a while. */
  after = (i: number, g: Ctx) => {
    if (i !== 0 || !this.book) return;
    const a = this.found ? 1 : rv(BX, BY, 210);
    const hintGlint = this.found ? 0 : Math.min(1, (stage.T - this.t0) / 25) * 0.55;
    withPar(g, 0.45, () => {
      if (a > 0.01) {
        const h = (BOOK_W * this.book!.naturalHeight) / this.book!.naturalWidth;
        g.save();
        g.globalAlpha = a;
        g.translate(BX, BY);
        g.rotate(-0.1);
        g.imageSmoothingQuality = 'high';
        g.drawImage(this.book!, -BOOK_W / 2, -h / 2, BOOK_W, h);
        g.restore();
      }
      const glint = Math.max(a * 0.9, hintGlint) * (0.65 + 0.35 * Math.sin(stage.T * 3.2));
      if (glint > 0.02) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(BX, BY, 2, BX, BY, 46);
        gr.addColorStop(0, `rgba(255,226,150,${glint})`);
        gr.addColorStop(1, 'rgba(255,200,100,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.arc(BX, BY, 46, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    });
  };

  hotspots = (): Hotspot[] => [
    {
      x: BX - 100,
      y: BY - 100,
      w: 200,
      h: 190,
      label: TEXT.spot,
      act: () => {
        if (this.found || dialogOpen()) return;
        if (rv(BX, BY, 210) > 0.3) {
          this.found = true;
          this.solve?.();
        } else void say(TEXT.tooDark);
      },
    },
  ];

  hint = () => void say(TEXT.hint);

  async enter() {
    this.found = false;
    this.t0 = stage.T;
    loadImage('book/closed.webp').then((img) => (this.book = img)).catch(() => {});
    await say(TEXT.intro);
    setGoal(TEXT.goal);
    const auto = setTimeout(() => {
      if (!this.found && !dialogOpen()) this.hint();
    }, 30000);
    await new Promise<void>((r) => (this.solve = r));
    clearTimeout(auto);
    clearGoal();
    chime();
    await say(TEXT.found);
    // the book opens: Deniz reads her grandfather’s note and the first page
    await openBook(bookSpreads({ book: true, done: [] }));
    markBookFound();
    await say(TEXT.afterBook);
    await closeCurtain();
    location.href = '/';
  }
}
