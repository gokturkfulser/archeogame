/* Renders the film's sounds to WAV files with the same recipe as the game's synthesized sounds (src/engine/audio.ts):
   plucked chimes with a soft room, a coin click, a whoosh, curtain swish and the night ambience. Run once:
   node scripts/make-audio.mjs   → public/audio/*.wav */
import fs from 'node:fs';

const SR = 44100;
const out = new URL('../public/audio/', import.meta.url);
fs.mkdirSync(out, { recursive: true });

let seed = 7;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

/** One-pole filters, applied sample by sample. */
const lowpass = (x, f0, f1) => {
  const y = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    const f = f0 * Math.pow(f1 / f0, i / x.length);
    const a = 1 - Math.exp((-2 * Math.PI * f) / SR);
    s += a * (x[i] - s);
    y[i] = s;
  }
  return y;
};
const highpass = (x, f) => {
  const lp = lowpass(x, f, f);
  return x.map((v, i) => v - lp[i]);
};

/** Schroeder reverb: four combs and two all-passes, a small warm room. */
function reverb(x, wet = 0.4, tail = 1.2) {
  const n = x.length + Math.ceil(tail * SR);
  const y = new Float32Array(n);
  const delays = [1557, 1617, 1491, 1422].map((d) => d + 40);
  for (const d of delays) {
    const b = new Float32Array(d);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const input = i < x.length ? x[i] : 0;
      const o = b[p];
      b[p] = input + o * 0.8;
      p = (p + 1) % d;
      y[i] += o * 0.25;
    }
  }
  for (const d of [225, 556]) {
    const b = new Float32Array(d);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const o = b[p];
      const v = y[i] + o * 0.5;
      b[p] = v;
      y[i] = o - v * 0.5;
      p = (p + 1) % d;
    }
  }
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++) res[i] = (i < x.length ? x[i] : 0) + y[i] * wet;
  return res;
}

function pluck(f, vol = 0.35, sec = 1.9) {
  const x = buf(sec);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));
    const sine = 0.28 * Math.sin(2 * Math.PI * f * 2.005 * t);
    const env = t < 0.008 ? t / 0.008 : Math.exp(-(t - 0.008) * 2.6);
    x[i] = (tri + sine) * env * vol;
  }
  return lowpass(x, 3400, 650);
}

function mix(parts, sec) {
  const y = buf(sec);
  for (const [x, at] of parts) {
    const o = Math.floor(at * SR);
    for (let i = 0; i < x.length && o + i < y.length; i++) y[o + i] += x[i];
  }
  return y;
}

function noise(sec) {
  const x = buf(sec);
  for (let i = 0; i < x.length; i++) x[i] = rnd() * 2;
  return x;
}

function write(name, x, peak = 0.9) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m > 0 ? peak / m : 1;
  const data = Buffer.alloc(44 + x.length * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + x.length * 4, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(x.length * 4, 40);
  for (let i = 0; i < x.length; i++) {
    const v = Math.max(-1, Math.min(1, x[i] * g)) * 32767;
    data.writeInt16LE(v, 44 + i * 4);
    data.writeInt16LE(v, 46 + i * 4);
  }
  fs.writeFileSync(new URL(name, out), data);
  console.log(name, (x.length / SR).toFixed(1) + 's');
}

// chimes, one per coin piece: a rising pentatonic line
[392, 493.88, 587.33, 783.99, 987.77].forEach((f, i) => write(`chime-${i}.wav`, reverb(pluck(f, 0.4), 0.55, 1.6)));

// the four chimes together with a high shimmer: the coin pieces clicking into one
write(
  'click.wav',
  reverb(
    mix(
      [
        [pluck(587.33, 0.3), 0],
        [pluck(739.99, 0.3), 0.04],
        [pluck(880, 0.3), 0.08],
        [pluck(1174.66, 0.3), 0.12],
        [(() => { const n = highpass(noise(0.06), 3000); return n.map((v, i) => v * Math.exp(-i / SR / 0.012) * 0.5); })(), 0],
      ],
      2.2,
    ),
    0.5,
    1.4,
  ),
);

// the coin turning: two soft bell tones
write('spin.wav', reverb(mix([[pluck(1318.51, 0.22, 1.6), 0], [pluck(1760, 0.18, 1.4), 0.5]], 2.2), 0.5, 1.4));

// a whoosh: band-passed noise rising
{
  const n = noise(1.3);
  const bp = lowpass(highpass(n, 250), 400, 3000);
  write('whoosh.wav', bp.map((v, i) => { const t = i / SR; return v * Math.sin(Math.PI * Math.min(1, t / 1.2)) ** 2; }));
}

// the coin landing on the map: a soft thud and a bright bell
write(
  'land.wav',
  reverb(
    mix(
      [
        [(() => { const x = buf(0.4); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * (180 - 60 * t) * t) * Math.exp(-t * 14) * 0.8; } return x; })(), 0],
        [pluck(1174.66, 0.3, 1.8), 0.06],
        [pluck(1567.98, 0.2, 1.6), 0.2],
      ],
      2.4,
    ),
    0.5,
    1.4,
  ),
);

// the curtain: a low swish of cloth, then a soft cadence for the next act’s name
{
  const n = lowpass(noise(1.4), 1800, 500);
  const sw = n.map((v, i) => { const t = i / SR; return v * Math.sin(Math.PI * Math.min(1, t / 1.3)) ** 1.5 * 0.9; });
  write('curtain.wav', sw);
  write('next.wav', reverb(mix([[pluck(293.66, 0.3, 2.2), 0], [pluck(440, 0.28, 2.2), 0.18], [pluck(587.33, 0.28, 2.4), 0.36]], 3.2), 0.6, 2));
}

// the night ambience: a low drone on D with a slow swell of filtered noise
{
  const sec = 27;
  const x = buf(sec);
  const wind = lowpass(noise(sec), 520, 520);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.11 * t);
    const drone = Math.sin(2 * Math.PI * 73.42 * t) * 0.5 + Math.sin(2 * Math.PI * 110.13 * t) * 0.18 + Math.sin(2 * Math.PI * 146.84 * t) * 0.08;
    x[i] = drone * 0.22 + wind[i] * 0.55 * swell;
  }
  const fade = Math.floor(SR * 1.5);
  for (let i = 0; i < fade; i++) {
    x[i] *= i / fade;
    x[x.length - 1 - i] *= i / fade;
  }
  write('ambience.wav', x, 0.35);
}
