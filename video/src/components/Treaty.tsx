import type { ReactNode } from "react";

/* The figures of the Kadesh film: the two rulers as glowing shadow puppets (ported from the Yazılıkaya scene in
   src/acts/hattusa/scenes/yazili.ts), the silver tablets, the witness gods and the olive branches of peace. All in the
   puppet look: navy hide, gold outline, punched gold dots. Coordinates are local: (0,0) is the feet, y grows downward. */

const NAVY = "#1b1646";
const GOLD = "rgba(255,214,140,0.92)";

const Dots: React.FC<{ y: number; x0: number; x1: number; step: number; r?: number }> = ({ y, x0, x1, step, r = 2.2 }) => (
  <>
    {Array.from({ length: Math.floor((x1 - x0) / step) + 1 }, (_, i) => (
      <circle key={i} cx={x0 + i * step} cy={y} r={r} fill={GOLD} />
    ))}
  </>
);

const hide = { fill: NAVY, stroke: GOLD, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Drawn at (x, y) = the ruler’s feet, `s` times the scene size, facing right (face 1) or left (-1). */
export const Ruler: React.FC<{ x: number; y: number; s: number; face: 1 | -1; kind: "hatti" | "misir"; glow?: number }> = ({ x, y, s, face, kind, glow = 1 }) => {
  const hy = kind === "hatti" ? -182 : -176;
  const fringe: string[] = [];
  for (let dx = 48; dx > -48; dx -= 12) fringe.push(`L${dx - 6} 11 L${dx - 12} 0`);
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: x, top: y, overflow: "visible", filter: `drop-shadow(0 0 ${14 * glow}px rgba(255,200,110,${0.7 * glow}))` }}>
      <g transform={`scale(${face * s} ${s})`}>
        {kind === "hatti" ? (
          <>
            <path d={`M-30 -150 L30 -150 L48 0 ${fringe.join(" ")} Z`} {...hide} />
            {[-20, -62, -104].map((by) => (
              <line key={by} x1={-36} y1={by} x2={36 + (by + 150) * 0.08} y2={by} stroke={GOLD} strokeWidth={3} />
            ))}
            <Dots y={-41} x0={-34} x1={34} step={11} />
            <Dots y={-83} x0={-30} x1={30} step={11} />
            <path d="M-36 -150 Q0 -178 36 -150 Q32 -118 0 -114 Q-32 -118 -36 -150 Z" {...hide} fill="#2b2470" />
            <path d="M-44 0 L-44 -118 M-45 -118 A9 9 0 1 1 -29 -112" fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M-26 -100 L26 -100 L36 -36 L-36 -36 Z" {...hide} />
            {[-20, -8, 4, 16].map((px) => (
              <line key={px} x1={px} y1={-98} x2={px * 1.3} y2={-38} stroke={GOLD} strokeWidth={1.6} />
            ))}
            <path d="M-24 -100 L-30 -152 L30 -152 L24 -100 Z" {...hide} />
            <path d="M-30 -152 A30 20 0 0 0 30 -152" fill="none" stroke={GOLD} strokeWidth={7} />
            <Dots y={-128} x0={-22} x1={22} step={11} />
            <path d="M-12 -36 L-12 -6 M14 -36 L16 -6" stroke={NAVY} strokeWidth={15} strokeLinecap="round" />
            <path d="M-22 0 L0 0 M8 0 L30 0" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
            <path d="M-44 0 L-44 -120 Q-44 -136 -30 -134" fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
          </>
        )}
        <path d="M20 -138 L62 -122" stroke={NAVY} strokeWidth={13} strokeLinecap="round" />
        <circle cx={66} cy={-122} r={7} fill={NAVY} stroke={GOLD} strokeWidth={2.5} />
        <circle cx={0} cy={hy} r={22} {...hide} />
        <path d={`M19 ${hy - 4} L33 ${hy + 6} L19 ${hy + 8} Z`} {...hide} />
        <circle cx={9} cy={hy - 3} r={2.6} fill={GOLD} />
        {kind === "hatti" ? (
          <>
            <path d="M-17 -196 L-8 -262 L12 -266 L18 -196 Z" {...hide} />
            <path d="M14 -236 Q38 -244 30 -268" fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
            <Dots y={-214} x0={-8} x1={10} step={9} />
          </>
        ) : (
          <>
            <path d="M-18 -190 L-12 -224 L16 -224 L20 -190 Z" {...hide} fill="#b83a2a" strokeWidth={3} />
            <path d="M-10 -224 L-6 -288 Q2 -300 10 -288 L14 -224 Z" {...hide} fill="#ece6f6" />
          </>
        )}
      </g>
    </svg>
  );
};

/** A silver tablet centred at (x, y), `s` times the scene size. */
export const Tablet: React.FC<{ x: number; y: number; s: number; rotate?: number }> = ({ x, y, s, rotate = 0 }) => (
  <svg width={1} height={1} style={{ position: "absolute", left: x, top: y, overflow: "visible", filter: "drop-shadow(0 0 16px rgba(190,220,255,0.95))" }}>
    <g transform={`rotate(${rotate}) scale(${s})`}>
      <rect x={-22} y={-32} width={44} height={64} rx={5} fill="#dfe6f4" stroke="#fff" strokeWidth={2} />
      {[0, 1, 2, 3, 4].map((r) => (
        <rect key={r} x={-15} y={-22 + r * 11} width={30} height={3} fill="rgba(80,100,140,0.6)" />
      ))}
    </g>
  </svg>
);

/** One of the witness gods: a small walking figure in a pointed cap with a sword, in profile facing right. */
export const God: React.FC<{ x: number; y: number; s: number; amount: number }> = ({ x, y, s, amount }) => {
  if (amount <= 0.001) return null;
  return (
    <svg
      width={1}
      height={1}
      style={{ position: "absolute", left: x, top: y, overflow: "visible", opacity: Math.min(1, amount * 1.4), filter: `drop-shadow(0 0 ${16 * amount}px rgba(255,205,120,${0.9 * amount}))` }}
    >
      <g transform={`translate(0 ${(1 - amount) * 18 * s}) scale(${s * (0.85 + 0.15 * amount)})`}>
        <path d="M-14 -60 L14 -60 L18 0 L-18 0 Z" {...hide} strokeWidth={2.4} />
        <path d="M-17 -34 L17 -34 M-16 -16 L16 -16" stroke={GOLD} strokeWidth={2} />
        <Dots y={-47} x0={-10} x1={10} step={7} r={1.6} />
        <circle cx={0} cy={-76} r={12} {...hide} strokeWidth={2.4} />
        <path d="M-9 -84 L-3 -112 L7 -112 L10 -84 Z" {...hide} strokeWidth={2.4} />
        <path d="M5 -80 L14 -76 L6 -73 Z" {...hide} strokeWidth={2} />
        <circle cx={4} cy={-77} r={1.6} fill="#fff1c8" />
        <path d="M12 -52 L34 -66 M31 -70 L38 -62" stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
      </g>
    </svg>
  );
};

/** An olive branch curving from (x0, y0) up to (x1, y1), growing with `amount`; `mirror` flips it for the other side. */
export const Olive: React.FC<{ x0: number; y0: number; x1: number; y1: number; bend: number; amount: number; s: number; leaves?: number }> = ({ x0, y0, x1, y1, bend, amount, s, leaves = 11 }) => {
  if (amount <= 0.001) return null;
  const cx = (x0 + x1) / 2 + bend;
  const cy = (y0 + y1) / 2;
  const at = (t: number) => ({
    x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
    y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1,
  });
  const tan = (t: number) => Math.atan2(2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx));
  const els: ReactNode[] = [];
  for (let i = 0; i < leaves; i++) {
    const t = (i + 1) / (leaves + 0.5);
    const grown = Math.max(0, Math.min(1, (amount - t * 0.8) / 0.2));
    if (grown <= 0) continue;
    const p = at(t);
    const a = (tan(t) * 180) / Math.PI;
    for (const side of [-1, 1]) {
      els.push(
        <ellipse key={`${i}-${side}`} cx={0} cy={0} rx={30 * s} ry={9 * s} transform={`translate(${p.x} ${p.y}) rotate(${a + side * 52}) translate(${26 * s * grown} 0) scale(${grown})`} fill="#e9c85a" stroke="#fff0b0" strokeWidth={2} opacity={0.95} />,
      );
    }
  }
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: "drop-shadow(0 0 12px rgba(255,214,120,0.8))" }}>
      <path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`} fill="none" stroke="#f3d77a" strokeWidth={6 * s} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - amount} />
      {els}
    </svg>
  );
};
