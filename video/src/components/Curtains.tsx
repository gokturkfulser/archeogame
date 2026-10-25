import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOut, FONT_DISPLAY, FONT_TEXT, PAL, prog } from "./util";

type Props = {
  /** 0 = open, 1 = closed. */
  closed: number;
  color: string;
  /** Text shown on the closed curtain, with its own 0..1 reveal. */
  kicker?: string;
  title?: string;
  reveal?: number;
};

const panel = (side: "l" | "r", color: string, closed: number): React.CSSProperties => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  width: "51%",
  [side === "l" ? "left" : "right"]: 0,
  translate: `${(side === "l" ? -1 : 1) * (1 - closed) * 101}% 0`,
  background: `repeating-linear-gradient(90deg, ${color} 0 3%, #7c2019 6%, #5c140f 8%, ${color} 12%, #c4493e 15%, ${color} 18%)`,
  boxShadow: `inset 0 0 0 6px rgba(243,197,106,0.55), inset 0 0 120px rgba(0,0,0,0.55)`,
});

/** The red stage curtain: it opens at the start of a film and closes at the end, with the next act’s name on it. */
export const Curtains: React.FC<Props> = ({ closed, color, kicker, title, reveal = 0 }) => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const frame = useCurrentFrame();
  void frame;
  if (closed <= 0.001) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={panel("l", color, closed)} />
      <div style={panel("r", color, closed)} />
      {title ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: reveal, scale: String(0.94 + 0.06 * reveal) }}>
          <div style={{ textAlign: "center", textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}>
            <div style={{ fontFamily: FONT_TEXT, fontStyle: "italic", fontSize: 54 * u, color: PAL.gold, letterSpacing: "0.04em" }}>{kicker}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 150 * u, color: "#fff1d6", lineHeight: 1.05, marginTop: 8 * u }}>{title}</div>
            <div style={{ margin: `${26 * u}px auto 0`, width: 360 * u * reveal, height: 3 * u, background: `linear-gradient(90deg, transparent, ${PAL.gold}, transparent)` }} />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export const curtainClosed = (frame: number, from: number, to: number) => prog(frame, from, to, easeInOut);
