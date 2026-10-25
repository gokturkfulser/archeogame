/* In-engine cinematics: input locked, gentle letterbox, scripted DOM/canvas moves, skippable with "Geç", a tap or Enter.
   Under prefers-reduced-motion a cinematic jumps straight to its end state (the key frame). */
import './cinematic.css';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Cine {
  readonly skipped: boolean;
  /** Resolves after `ms`, or immediately once skipped. */
  sleep(ms: number): Promise<void>;
  /** Web Animations helper: resolves when done, finishes at once when skipped. The end state is kept. */
  anim(el: Element, keyframes: Keyframe[], opts: number | KeyframeAnimationOptions): Promise<void>;
  /** Runs `fn(t)` for t = 0..1 over `ms` (every frame); when skipped it is called once with 1. */
  tween(ms: number, fn: (t: number) => void): Promise<void>;
  /** Registers something to clean up when the cinematic ends. */
  onEnd(fn: () => void): void;
  /** Removes the letterbox, lock and button. */
  end(): void;
}

interface Options {
  letterbox?: boolean;
  /** Label for the skip button (default "Geç"). */
  skipLabel?: string;
}

export function startCine(o: Options = {}): Cine {
  const els: HTMLElement[] = [];
  const cleanups: (() => void)[] = [];
  const running = new Set<Animation>();
  const waiting = new Set<() => void>();
  let skipped = RM;
  let ended = false;

  const lock = document.createElement('div');
  lock.className = 'cine-lock';
  els.push(lock);
  if (o.letterbox !== false) {
    for (const k of ['t', 'b']) {
      const bar = document.createElement('div');
      bar.className = 'cine-bar ' + k;
      els.push(bar);
      document.body.append(bar);
      requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('on')));
    }
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cine-skip';
  btn.textContent = o.skipLabel ?? 'Geç';
  els.push(btn);

  const skip = () => {
    if (skipped) return;
    skipped = true;
    for (const a of running) a.finish();
    for (const r of [...waiting]) r();
  };
  lock.addEventListener('click', skip);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    skip();
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      skip();
    }
  };
  document.addEventListener('keydown', onKey, true);
  document.body.prepend(lock);
  document.body.append(btn);
  if (!RM) btn.focus({ preventScroll: true });

  return {
    get skipped() {
      return skipped;
    },
    sleep(ms) {
      if (skipped) return Promise.resolve();
      return new Promise<void>((res) => {
        const done = () => {
          clearTimeout(t);
          waiting.delete(done);
          res();
        };
        const t = setTimeout(done, ms);
        waiting.add(done);
      });
    },
    anim(el, keyframes, opts) {
      const a = el.animate(keyframes, typeof opts === 'number' ? { duration: opts, fill: 'both' } : { fill: 'both', ...opts });
      if (skipped) a.finish();
      else running.add(a);
      return a.finished.then(
        () => {
          running.delete(a);
        },
        () => {
          running.delete(a);
        },
      );
    },
    tween(ms, fn) {
      if (skipped) {
        fn(1);
        return Promise.resolve();
      }
      return new Promise<void>((res) => {
        const t0 = performance.now();
        let raf = 0;
        const done = () => {
          cancelAnimationFrame(raf);
          waiting.delete(done);
          fn(1);
          res();
        };
        waiting.add(done);
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / ms);
          if (t >= 1) return done();
          fn(t);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });
    },
    onEnd(fn) {
      cleanups.push(fn);
    },
    end() {
      if (ended) return;
      ended = true;
      document.removeEventListener('keydown', onKey, true);
      for (const f of cleanups) f();
      for (const a of running) a.cancel();
      for (const e of els) {
        if (e.classList.contains('cine-bar')) {
          e.classList.remove('on');
          setTimeout(() => e.remove(), 800);
        } else e.remove();
      }
    },
  };
}

/** Dust motes swirling around a moving centre, drawn on their own full-screen canvas. Returns a stop function. */
export function dustSwirl(center: () => { x: number; y: number }, opts: { count?: number; radius?: number } = {}): () => void {
  const cv = document.createElement('canvas');
  cv.className = 'cine-fx';
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(innerWidth * dpr);
  cv.height = Math.round(innerHeight * dpr);
  document.body.append(cv);
  const g = cv.getContext('2d')!;
  const N = opts.count ?? 46;
  const R = opts.radius ?? 90;
  const ps = Array.from({ length: N }, (_, i) => ({
    a: (i / N) * Math.PI * 2 * 3.1,
    r: (0.25 + ((i * 0.618) % 1) * 0.9) * R,
    w: (0.6 + ((i * 0.37) % 1)) * (i % 2 ? 1 : -0.7),
    y: ((i * 0.29) % 1) - 0.5,
    s: 0.8 + ((i * 0.53) % 1) * 1.8,
  }));
  let raf = 0;
  const t0 = performance.now();
  let alive = true;
  const frame = (now: number) => {
    if (!alive) return;
    const t = (now - t0) / 1000;
    const c = center();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalCompositeOperation = 'lighter';
    const fade = Math.min(1, t / 0.5);
    for (const p of ps) {
      const a = p.a + t * p.w * 1.3;
      const rr = p.r * (0.7 + 0.3 * Math.sin(t * 0.9 + p.a));
      const x = c.x + Math.cos(a) * rr;
      const y = c.y + Math.sin(a) * rr * 0.42 + (p.y + Math.sin(t * 0.7 + p.a) * 0.2) * R * 0.9;
      g.globalAlpha = (0.35 + 0.35 * Math.sin(t * 2 + p.a * 3)) * fade;
      g.fillStyle = 'rgba(255,232,170,1)';
      g.beginPath();
      g.arc(x, y, p.s, 0, Math.PI * 2);
      g.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    cv.width = cv.height = 0;
    cv.remove();
  };
}
