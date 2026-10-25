import { Img, staticFile, useCurrentFrame } from "remotion";

/* Melissa from her cut-out parts: body plus two wings that beat about the rivet at the shoulder (same rig as src/engine/melissa.ts). */
const BODY = { w: 267, h: 425, root: [131, 209], center: [122, 217] };
const FORE = { w: 162, h: 251, pivot: [18, 234], tip: [95, 20] };
const HIND = { w: 125, h: 209, pivot: [16, 194], tip: [102, 14] };
const up = (p: { pivot: number[]; tip: number[] }) => -Math.PI / 2 - Math.atan2(p.tip[1] - p.pivot[1], p.tip[0] - p.pivot[0]);

type Props = {
  /** Height of the bee in pixels. */
  height: number;
  /** 1 faces right, -1 faces left. */
  face?: 1 | -1;
  tilt?: number;
};

export const Melissa: React.FC<Props> = ({ height, face = 1, tilt = 0 }) => {
  const frame = useCurrentFrame();
  const S = height / BODY.h;
  const flap = Math.sin(frame * 1.9);
  const root = [BODY.root[0] - BODY.center[0], BODY.root[1] - BODY.center[1]];
  const wing = (src: string, p: typeof FORE, angle: number) => (
    <div
      style={{
        position: "absolute",
        left: root[0],
        top: root[1],
        width: 0,
        height: 0,
        rotate: `${angle + up(p)}rad`,
      }}
    >
      <Img src={staticFile(src)} style={{ position: "absolute", left: -p.pivot[0], top: -p.pivot[1], width: p.w, height: p.h }} />
    </div>
  );
  return (
    <div style={{ width: 0, height: 0, scale: `${face * S} ${S}`, rotate: `${tilt}deg` }}>
      {wing("img/melissa-wingH.webp", HIND, -0.95 + flap * 0.28)}
      {wing("img/melissa-wingF.webp", FORE, -0.55 + flap * 0.38)}
      <Img src={staticFile("img/melissa-body.webp")} style={{ position: "absolute", left: -BODY.center[0], top: -BODY.center[1], width: BODY.w, height: BODY.h }} />
    </div>
  );
};
