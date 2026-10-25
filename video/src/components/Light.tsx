import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { PAL } from "./util";

/** Deep indigo paper with a faint warm glow and a scatter of slowly twinkling stars. */
export const NightPaper: React.FC<{ glow?: string; stars?: number }> = ({ glow = PAL.gold, stars = 70 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, #24307f 0%, #17143a 55%, ${PAL.night} 100%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${glow}22, transparent 60%)` }} />
      {Array.from({ length: stars }, (_, i) => {
        const x = random(`sx${i}`) * 100;
        const y = random(`sy${i}`) * 100;
        const s = 2 + random(`ss${i}`) * 4;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame / 14 + random(`sp${i}`) * 6.28));
        return <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: s, height: s, borderRadius: "50%", background: PAL.paper, opacity: tw * 0.7 }} />;
      })}
    </AbsoluteFill>
  );
};

/** Paper fibre over the whole frame: fine noise, multiplied in, so flat colour reads as paper. */
export const PaperGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.14 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity }}>
    <svg width="100%" height="100%">
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

/** A burst of warm light: a soft disc and thin rays. */
export const Burst: React.FC<{ x: number; y: number; size: number; amount: number; rays?: number }> = ({ x, y, size, amount, rays = 14 }) => {
  if (amount <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, opacity: amount, mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          width: size * 2,
          height: size * 2,
          left: -size,
          top: -size,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,240,190,0.95), rgba(255,205,100,0.4) 38%, rgba(255,200,100,0) 68%)",
        }}
      />
      {Array.from({ length: rays }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: -2,
            width: size * (1.1 + (i % 3) * 0.25),
            height: 4,
            transformOrigin: "0 50%",
            rotate: `${(i / rays) * 360 + 8}deg`,
            background: "linear-gradient(90deg, rgba(255,236,170,0.9), transparent)",
          }}
        />
      ))}
    </div>
  );
};

/** Small drifting sparks around a point. */
export const Sparks: React.FC<{ x: number; y: number; radius: number; count?: number; opacity?: number }> = ({ x, y, radius, count = 22, opacity = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, opacity, mixBlendMode: "screen" }}>
      {Array.from({ length: count }, (_, i) => {
        const a = random(`ka${i}`) * 6.28 + frame / (40 + random(`kb${i}`) * 40);
        const r = radius * (0.35 + random(`kr${i}`) * 0.75);
        const s = 3 + random(`ks${i}`) * 5;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame / 9 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: Math.cos(a) * r - s / 2,
              top: Math.sin(a) * r * 0.7 - s / 2 - ((frame * (0.4 + random(`kv${i}`))) % 40),
              width: s,
              height: s,
              borderRadius: "50%",
              background: "radial-gradient(circle, #fff6d0, rgba(255,214,120,0.7) 50%, rgba(255,214,120,0))",
              opacity: tw,
            }}
          />
        );
      })}
    </div>
  );
};

/** Deniz’s flashlight: a soft cone from the lens with punched-hole glints, as in the lightbox look. */
export const Beam: React.FC<{ x: number; y: number; angle: number; length: number; spread: number; amount: number }> = ({ x, y, angle, length, spread, amount }) => {
  const frame = useCurrentFrame();
  if (amount <= 0.001) return null;
  const half = (spread * Math.PI) / 180;
  const pts = [
    [0, 0],
    [Math.cos(-half) * length, Math.sin(-half) * length],
    [Math.cos(half) * length, Math.sin(half) * length],
  ];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, rotate: `${angle}deg`, opacity: amount, mixBlendMode: "screen" }}>
      <svg width={length * 1.2} height={length} viewBox={`0 ${-length / 2} ${length * 1.2} ${length}`} style={{ position: "absolute", left: 0, top: -length / 2, overflow: "visible" }}>
        <defs>
          <linearGradient id="beamG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff4cd" stopOpacity="0.95" />
            <stop offset="0.6" stopColor="#ffdc9b" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffc86e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[1, 0.78, 0.56, 0.36].map((k, i) => (
          <polygon key={i} points={pts.map(([px, py]) => `${px},${py * k}`).join(" ")} fill="url(#beamG)" opacity={0.42} />
        ))}
        {Array.from({ length: 16 }, (_, i) => {
          const t = ((i * 0.173 + frame / 140) % 1) * 0.95;
          const lat = Math.sin(i * 12.98) * Math.tan(half) * length * t * 0.8;
          return <circle key={i} cx={length * t} cy={lat} r={2 + (i % 3)} fill="#fff1c8" opacity={0.8 * Math.sin(Math.PI * t)} />;
        })}
      </svg>
    </div>
  );
};
