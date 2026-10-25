import { loadFont as loadAlegreya } from "@remotion/google-fonts/Alegreya";
import { loadFont as loadMarcellus } from "@remotion/google-fonts/Marcellus";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Burst, PaperGrain, Sparks } from "../components/Light";
import { God, Olive, Ruler, Tablet } from "../components/Treaty";
import { easeInOut, easeOut, FONT_DISPLAY, FONT_TEXT, lerp, PAL, prog } from "../components/util";

loadMarcellus();
loadAlegreya("italic", { weights: ["400"], subsets: ["latin", "latin-ext"] });

export const kadesSchema = z.object({
  /** The caption under the scene (history, hedged). */
  title: z.string(),
  caption: z.string(),
  backdrop: z.object({ sky: z.string(), mid: z.string(), fg: z.string() }),
});
export type KadesProps = z.infer<typeof kadesSchema>;

/* The film, in frames at 30 fps (7 s): 0–22 fades in on Yazılıkaya · 14–72 the two rulers walk in from the edges ·
   72–92 they stop and the light between them grows · 92–134 the silver tablets change hands (a chime for each) ·
   132 a burst of light · 134–186 the twelve witness gods appear along the rock one by one and olive branches grow
   round the tablets · 150 the caption · 192–210 fades out. */
const WALK = [14, 72];
const MEET = 78;
const SWAP = [92, 134];
const BURST = 132;
const GODS = 136;
const OLIVE = [140, 186];
const END = [192, 210];

export const KadesTreaty: React.FC<KadesProps> = (p) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;
  const u = Math.min(W, H) / 1080;
  const s = (portrait ? 2.5 : 2.3) * u;

  const cx = W / 2;
  const base = H * (portrait ? 0.78 : 0.8);
  const reach = 63 * s; // hand to body
  const gap = (portrait ? 190 : 200) * u; // each ruler stands this far from the middle
  const walk = prog(frame, WALK[0], WALK[1], easeOut);
  const lx = lerp(-200 * u, cx - gap, walk);
  const rx = lerp(W + 200 * u, cx + gap, walk);
  const sway = (k: number) => Math.sin(frame / 9 + k) * 4 * u * (1 - prog(frame, WALK[1], WALK[1] + 10));
  const bob = (k: number) => (walk < 0.999 ? Math.abs(Math.sin(frame / 4 + k)) * 9 * u : 0);

  const handY = base - 118 * s;
  const sw = prog(frame, SWAP[0], SWAP[1], easeInOut);
  const lhx = lx + reach;
  const rhx = rx - reach;
  const arc = Math.sin(Math.PI * sw) * 70 * u;

  const lightK = prog(frame, 60, 100) * (0.65 + 0.35 * prog(frame, SWAP[0], SWAP[1]));
  const fade = Math.min(prog(frame, 0, 22), 1 - prog(frame, END[0], END[1]));
  const godSize = (portrait ? 1.35 : 1.5) * u;
  const godPos = (i: number) => {
    const n = 12;
    if (portrait) {
      const row = Math.floor(i / 6);
      return { x: W * (0.12 + 0.15 * (i % 6)), y: H * (0.2 + row * 0.1) };
    }
    return { x: W * (0.1 + (0.8 * i) / (n - 1)), y: H * 0.22 };
  };

  return (
    <AbsoluteFill style={{ background: PAL.night, overflow: "hidden" }}>
      <Audio src={staticFile("audio/ambience.wav")} volume={0.5} loop />
      <Sequence from={WALK[0]} durationInFrames={50}>
        <Audio src={staticFile("audio/whoosh.wav")} volume={0.35} />
      </Sequence>
      <Sequence from={MEET} durationInFrames={100}>
        <Audio src={staticFile("audio/chime-0.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={SWAP[0] + 8} durationInFrames={100}>
        <Audio src={staticFile("audio/chime-1.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={SWAP[1] - 6} durationInFrames={100}>
        <Audio src={staticFile("audio/chime-2.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={BURST} durationInFrames={90}>
        <Audio src={staticFile("audio/land.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={GODS + 4} durationInFrames={80}>
        <Audio src={staticFile("audio/chime-3.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={OLIVE[0] + 20} durationInFrames={80}>
        <Audio src={staticFile("audio/chime-4.wav")} volume={0.6} />
      </Sequence>

      <AbsoluteFill style={{ opacity: fade }}>
        {[p.backdrop.sky, p.backdrop.mid, p.backdrop.fg].map((src, i) => (
          <Img
            key={src}
            src={staticFile(src)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: portrait ? "50% 50%" : "50% 50%", translate: `${(frame - 100) * (0.05 + i * 0.08)}px 0`, scale: "1.05" }}
          />
        ))}
        {/* the night closes in on the stage so the figures glow */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,6,30,0.62), rgba(8,6,30,0.3) 50%, rgba(8,6,30,0.65))" }} />

        {/* the warmth between the two rulers */}
        <div style={{ position: "absolute", left: cx - 520 * u, top: handY - 460 * u, width: 1040 * u, height: 920 * u, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,214,130,0.6), rgba(255,170,80,0) 65%)", opacity: lightK, mixBlendMode: "screen" }} />

        {/* the twelve witness gods */}
        {Array.from({ length: 12 }, (_, i) => {
          const g = godPos(i);
          return <God key={i} x={g.x} y={g.y} s={godSize} amount={prog(frame, GODS + i * 3.2, GODS + i * 3.2 + 14, easeOut)} />;
        })}

        {/* olive branches of peace, one from each side, meeting over the tablets */}
        <Olive x0={cx - 330 * u} y0={handY + 330 * u} x1={cx - 20 * u} y1={handY - 260 * u} bend={-170 * u} amount={prog(frame, OLIVE[0], OLIVE[1], easeOut)} s={u} />
        <Olive x0={cx + 330 * u} y0={handY + 330 * u} x1={cx + 20 * u} y1={handY - 260 * u} bend={170 * u} amount={prog(frame, OLIVE[0] + 4, OLIVE[1] + 4, easeOut)} s={u} />

        {/* the rulers: Hattušili (Hittite) from the left, Ramesses (Egyptian) from the right */}
        <Ruler x={lx + sway(0)} y={base - bob(0)} s={s} face={1} kind="hatti" />
        <Ruler x={rx + sway(2)} y={base - bob(1.7)} s={s} face={-1} kind="misir" />

        {/* the silver tablets change hands */}
        {frame >= MEET ? (
          <>
            <Tablet x={lerp(lhx, rhx, sw)} y={handY - arc} s={1.9 * u} rotate={sw * 8} />
            <Tablet x={lerp(rhx, lhx, sw)} y={handY - arc} s={1.9 * u} rotate={-sw * 8} />
          </>
        ) : null}

        <Burst x={cx} y={handY} size={300 * u} amount={interpolate(frame, [BURST - 2, BURST + 4, BURST + 40], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} rays={16} />
        <Sparks x={cx} y={handY - 40 * u} radius={300 * u} opacity={interpolate(frame, [BURST, BURST + 14, END[0]], [0, 1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />

        {/* caption */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: (portrait ? 150 : 56) * u,
            textAlign: "center",
            opacity: prog(frame, 150, 168),
            translate: `0 ${(1 - prog(frame, 150, 168, easeOut)) * 14}px`,
            textShadow: "0 3px 16px rgba(0,0,0,0.9)",
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 54 * u, color: "#fff1d6" }}>{p.title}</div>
          <div style={{ fontFamily: FONT_TEXT, fontStyle: "italic", fontSize: 34 * u, color: PAL.gold, marginTop: 6 * u }}>{p.caption}</div>
        </div>
      </AbsoluteFill>
      <PaperGrain />
    </AbsoluteFill>
  );
};
