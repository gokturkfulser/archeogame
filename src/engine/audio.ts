/* Web Audio, everything synthesized. No audio files. */

export interface Ambience {
  /** Drone root frequency in Hz. */
  base: number;
  /** Low-pass cutoff and level of the wind/sea noise bed, and its slow swell rate. */
  noiseFreq: number;
  noiseVol: number;
  noiseLfo: number;
  /** Tiny high chirps now and then. */
  crickets?: boolean;
}

const A = {
  ctx: null as AudioContext | null,
  on: true,
  master: null as GainNode | null,
  send: null as GainNode | null,
  noise: null as AudioBuffer | null,
  amb: [] as (OscillatorNode | AudioBufferSourceNode)[],
  ambGain: null as GainNode | null,
  crickets: false,
};

function impulse(ac: AudioContext, sec: number, dec: number): AudioBuffer {
  const n = (ac.sampleRate * sec) | 0;
  const b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, dec);
  }
  return b;
}

/** Must be called from a user gesture. */
export function audioInit() {
  if (A.ctx) {
    if (A.ctx.state === 'suspended') void A.ctx.resume();
    return;
  }
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return;
  const ac = (A.ctx = new C());
  const master = (A.master = ac.createGain());
  master.gain.value = A.on ? 0.9 : 0;
  master.connect(ac.destination);
  const rev = ac.createConvolver();
  rev.buffer = impulse(ac, 3.2, 2.3);
  const send = (A.send = ac.createGain());
  send.gain.value = 0.55;
  send.connect(rev);
  rev.connect(master);
  const n = ac.sampleRate * 2;
  const b = ac.createBuffer(1, n, ac.sampleRate);
  const d = b.getChannelData(0);
  let l = 0;
  for (let i = 0; i < n; i++) {
    l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = l * 3.5;
  }
  A.noise = b;
}

export function pluck(f: number, when = 0, vol = 0.35, wet = 0.5, echo = false) {
  if (!A.ctx || !A.master || !A.send) return;
  const ac = A.ctx;
  const t = ac.currentTime + when;
  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  const g2 = ac.createGain();
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  const w = ac.createGain();
  o1.type = 'triangle';
  o1.frequency.value = f;
  o2.type = 'sine';
  o2.frequency.value = f * 2.005;
  g2.gain.value = 0.28;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3400, t);
  lp.frequency.exponentialRampToValueAtTime(650, t + 1.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
  o1.connect(lp);
  o2.connect(g2);
  g2.connect(lp);
  lp.connect(g);
  g.connect(A.master);
  w.gain.value = wet;
  g.connect(w);
  w.connect(A.send);
  o1.start(t);
  o2.start(t);
  o1.stop(t + 1.8);
  o2.stop(t + 1.8);
  if (echo) {
    pluck(f, when + 0.34, vol * 0.32, wet, false);
    pluck(f, when + 0.68, vol * 0.12, wet, false);
  }
}

export function chime() {
  [587.33, 739.99, 880, 1174.66].forEach((f, i) => pluck(f, i * 0.1, 0.2, 0.7));
}

export function chirp() {
  if (!A.ctx || !A.master) return;
  const ac = A.ctx;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(1500, t + 0.08);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g);
  g.connect(A.master);
  o.start(t);
  o.stop(t + 0.14);
}

/** Melissa’s wings. */
export function buzz(dur = 1.3) {
  if (!A.ctx || !A.master) return;
  const ac = A.ctx;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const lfo = ac.createOscillator();
  const lg = ac.createGain();
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(150, t);
  o.frequency.linearRampToValueAtTime(210, t + dur);
  lfo.frequency.value = 28;
  lg.gain.value = 0.04;
  lfo.connect(lg);
  lg.connect(g.gain);
  lp.type = 'lowpass';
  lp.frequency.value = 1300;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp);
  lp.connect(g);
  g.connect(A.master);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

export function whoosh() {
  if (!A.ctx || !A.master || !A.noise) return;
  const ac = A.ctx;
  const t = ac.currentTime;
  const n = ac.createBufferSource();
  const bp = ac.createBiquadFilter();
  const g = ac.createGain();
  n.buffer = A.noise;
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(250, t);
  bp.frequency.exponentialRampToValueAtTime(1600, t + 1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  n.connect(bp);
  bp.connect(g);
  g.connect(A.master);
  n.start(t);
  n.stop(t + 1.2);
}

/** A short dull tap: clay on clay, a stylus pressed in, a stone settling. */
export function tok(f = 190, vol = 0.3) {
  if (!A.ctx || !A.master || !A.noise) return;
  const ac = A.ctx;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g);
  g.connect(A.master);
  o.start(t);
  o.stop(t + 0.25);
  const n = ac.createBufferSource();
  const lp = ac.createBiquadFilter();
  const ng = ac.createGain();
  n.buffer = A.noise;
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  ng.gain.setValueAtTime(vol * 0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  n.connect(lp);
  lp.connect(ng);
  ng.connect(A.master);
  n.start(t);
  n.stop(t + 0.08);
}

/** Heavy stone grinding, for gates and doors. */
export function rumble(dur = 2.2) {
  if (!A.ctx || !A.master || !A.noise) return;
  const ac = A.ctx;
  const t = ac.currentTime;
  const n = ac.createBufferSource();
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  n.buffer = A.noise;
  n.loop = true;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(140, t);
  lp.frequency.linearRampToValueAtTime(260, t + dur * 0.5);
  lp.frequency.linearRampToValueAtTime(110, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9, t + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(lp);
  lp.connect(g);
  g.connect(A.master);
  n.start(t);
  n.stop(t + dur + 0.1);
}

/** Crossfades to the ambience of a new scene. */
export function ambient(spec: Ambience) {
  A.crickets = !!spec.crickets;
  if (!A.ctx || !A.master || !A.noise) return;
  const ac = A.ctx;
  const now = ac.currentTime;
  if (A.ambGain) {
    const og = A.ambGain;
    og.gain.setTargetAtTime(0, now, 0.5);
    const old = A.amb;
    setTimeout(() => {
      old.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      });
    }, 2500);
  }
  A.amb = [];
  const g = ac.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(1, now + 0.4, 1.5);
  g.connect(A.master);
  A.ambGain = g;
  const base = spec.base;
  (
    [
      [base, 'triangle', 0.032],
      [base * 1.5, 'sine', 0.016],
      [base * 2.003, 'sine', 0.011],
    ] as [number, OscillatorType, number][]
  ).forEach(([f, ty, v], i) => {
    const o = ac.createOscillator();
    const og = ac.createGain();
    const lp = ac.createBiquadFilter();
    o.type = ty;
    o.frequency.value = f;
    og.gain.value = v;
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    o.connect(lp);
    lp.connect(og);
    og.connect(g);
    o.start();
    const l = ac.createOscillator();
    const lg = ac.createGain();
    l.frequency.value = 0.06 + i * 0.05;
    lg.gain.value = v * 0.5;
    l.connect(lg);
    lg.connect(og.gain);
    l.start();
    A.amb.push(o, l);
  });
  const n = ac.createBufferSource();
  n.buffer = A.noise;
  n.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = spec.noiseFreq;
  const ng = ac.createGain();
  ng.gain.value = spec.noiseVol;
  const l = ac.createOscillator();
  const lg = ac.createGain();
  l.frequency.value = spec.noiseLfo;
  lg.gain.value = spec.noiseVol * 0.75;
  l.connect(lg);
  lg.connect(ng.gain);
  n.connect(f);
  f.connect(ng);
  ng.connect(g);
  n.start();
  l.start();
  A.amb.push(n, l);
}

setInterval(() => {
  if (!A.ctx || !A.master || !A.crickets) return;
  const ac = A.ctx;
  for (let i = 0; i < 3; i++) {
    const t = ac.currentTime + i * 0.07 + Math.random() * 0.02;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = 4600 + Math.random() * 200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.012, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g);
    g.connect(A.master);
    o.start(t);
    o.stop(t + 0.05);
  }
}, 1300);

/** Filtered noise burst: the building block for paper, leather and wax sounds. */
function noiseHit(when: number, type: BiquadFilterType, f0: number, f1: number, q: number, vol: number, dur: number) {
  if (!A.ctx || !A.master || !A.noise) return;
  const ac = A.ctx;
  const t = ac.currentTime + when;
  const n = ac.createBufferSource();
  const flt = ac.createBiquadFilter();
  const g = ac.createGain();
  n.buffer = A.noise;
  flt.type = type;
  flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t);
  flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(flt);
  flt.connect(g);
  g.connect(A.master);
  n.start(t);
  n.stop(t + dur + 0.05);
}

/** A page turning: a dry swish with a soft curl at the end. */
export function pageTurn() {
  noiseHit(0, 'bandpass', 1800, 4200, 0.7, 0.3, 0.42);
  noiseHit(0.34, 'highpass', 3000, 6000, 0.5, 0.1, 0.18);
}

/** Cut-paper layers sliding over the stage (`closing`) or away from it: two swishes, the second a beat behind. */
export function paperSlide(closing: boolean) {
  const [a, b] = closing ? [700, 2600] : [2400, 600];
  noiseHit(0, 'bandpass', a, b, 0.8, 0.26, 0.55);
  noiseHit(0.08, 'bandpass', a * 0.7, b * 0.7, 0.8, 0.18, 0.5);
}

/** The scene title screen settling into place: a soft wooden knock. */
export function woodKnock() {
  tok(150, 0.26);
}

/** The clasp of the book: a small metal click, then the strap letting go. */
export function claspClick() {
  pluck(1760, 0, 0.12, 0.3);
  tok(900, 0.22);
  noiseHit(0.08, 'bandpass', 700, 300, 1.2, 0.18, 0.16);
}

/** The cover of the book opening: leather and old paper creaking. */
export function coverCreak() {
  noiseHit(0, 'bandpass', 380, 760, 2.2, 0.16, 0.9);
  noiseHit(0.5, 'bandpass', 2200, 900, 0.8, 0.14, 0.45);
}

/** A little glint: one soft high note, higher for each coin in the ring. */
export function glint(i: number) {
  const scale = [1174.66, 1318.51, 1479.98, 1567.98, 1760, 1975.53];
  pluck(scale[i % scale.length] * (i >= scale.length ? 2 : 1), 0, 0.09, 0.8);
}

/** Wax cracking: a dry snap and a few brittle ticks. */
export function waxCrack() {
  noiseHit(0, 'highpass', 2500, 5000, 0.6, 0.35, 0.07);
  tok(260, 0.25);
  noiseHit(0.09, 'bandpass', 3200, 1800, 3, 0.12, 0.1);
  noiseHit(0.17, 'bandpass', 2600, 1500, 3, 0.1, 0.08);
}

/** A quill scratching: very short, quiet, for the grandfather's letter. */
export function scratch() {
  noiseHit(0, 'bandpass', 2600 + Math.random() * 900, 1800, 1.5, 0.05, 0.09);
}

/** Whether sound is switched on (the mute button). */
export const soundOn = () => A.on;

/** Quiets the game’s own sound while a film with its own soundtrack plays. */
export function duck(on: boolean) {
  if (A.ctx && A.master) A.master.gain.setTargetAtTime(on ? 0 : A.on ? 0.9 : 0, A.ctx.currentTime, 0.15);
}

/** Wires the always-visible mute button. */
export function initMuteButton(btn: HTMLElement) {
  btn.onclick = () => {
    A.on = !A.on;
    btn.setAttribute('aria-pressed', String(A.on));
    btn.setAttribute('aria-label', A.on ? 'Sesi kapat' : 'Sesi aç');
    btn.querySelectorAll<SVGElement>('.w1,.w2').forEach((p) => (p.style.opacity = A.on ? '1' : '0.15'));
    if (A.ctx && A.master) A.master.gain.setTargetAtTime(A.on ? 0.9 : 0, A.ctx.currentTime, 0.1);
  };
}
