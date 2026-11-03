import { loadFont as loadMarcellus } from "@remotion/google-fonts/Marcellus";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Beam, Burst, PaperGrain, Sparks } from "../components/Light";
import { easeIn, easeInOut, easeOut, lerp, PAL, prog } from "../components/util";

loadMarcellus();

export const openingSchema = z.object({
  /** Where each of the fifteen animals ends up on the paper map, in percent of the map picture. */
  animals: z
    .array(z.object({ id: z.string(), image: z.string(), plate: z.string(), w: z.number(), h: z.number(), mapX: z.number(), mapY: z.number() }))
    .length(15),
});
export type OpeningProps = z.infer<typeof openingSchema>;

/* G1, “Dedenin Gölge Oyunu” (24 s at 30 fps):
   0–24 the lamp lights a Karagöz screen in the dark study · 90–130 the grandfather, a paper-cut figure, slides in · 160–200
   he leans over the old book and opens it, light climbs out · 200–344 the fifteen animals leap out one by one and settle
   on the screen · 330–380 he slips away · 385–425 the screen becomes the paper map · 396–492 each animal flies to its
   city and turns into its coin with a chime · 540 all coins glow, rain starts · 575–605 lightning in the window with
   thunder · 596–622 the lamp flickers · 622 the power cuts · 632 dark · 662 a click: Deniz’s flashlight comes on and lights
   the room, which is where the prologue begins. */
const ENTER = [90, 130];
const BOOK_OPEN = 185;
const LAUNCH = 200;
const GAP = 7;
const FLY1 = 46;
const MAP_REVEAL = [385, 425];
const TO_CITY = 396;
const CITY_GAP = 4;
const CITY_FLY = 40;
const STORM = [540, 720];
const FLASHES: [number, number, number][] = [
  [575, 12, 1],
  [591, 8, 0.55],
  [604, 18, 1],
];
const FLICKER = [596, 622];
const POWER = 622;
const SWITCH = 662;

const MAP_W = 2567;
const MAP_H = 1100;
const DEDE_ASPECT = 821 / 1100;
const BOOK_AT = { x: 0.68, y: 0.44 }; // the raised cover of the book on his lap, in his own picture

export const OpeningFilm: React.FC<OpeningProps> = ({ animals }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;
  const u = Math.min(W, H) / 1080;

  /* ---- the screen (inside a wooden frame) ---- */
  const S = portrait ? { w: 940, h: 1180, x: (W - 940) / 2, y: H * 0.26 } : { w: 1240, h: 700, x: 300, y: 190 };
  const T = 34 * u;
  const win = portrait ? { x: W * 0.2, y: H * 0.035, w: W * 0.6, h: H * 0.17 } : { x: 1650, y: 120, w: 230, h: 440 };

  /* ---- the lamp behind the screen, and the storm ---- */
  const flicker = 0.93 + 0.07 * Math.sin(frame / 2.3) * Math.sin(frame / 5.1);
  const storm = frame >= FLICKER[0] && frame < POWER ? 0.35 + 0.65 * (random(`f${Math.floor(frame / 2)}`) > 0.45 ? 1 : 0.15) : 1;
  const lamp = (frame >= POWER ? 0 : flicker * storm) * prog(frame, 0, 24) * (frame >= POWER ? 0 : 1);
  const flash = Math.max(0, ...FLASHES.map(([at, dur, k]) => (frame >= at && frame < at + dur ? k * (1 - (frame - at) / dur) ** 1.6 : 0)));
  const flashOn = frame >= FLASHES[0][0] && frame < FLASHES[2][0] + FLASHES[2][1];

  /* ---- the grandfather ---- */
  const dedeH = S.h * (portrait ? 0.58 : 0.8);
  const dedeW = dedeH * DEDE_ASPECT;
  const enter = prog(frame, ENTER[0], ENTER[1], easeOut);
  const leave = prog(frame, 330, 380, easeIn);
  const lean = prog(frame, 160, BOOK_OPEN, easeInOut) * (1 - prog(frame, 215, 260, easeInOut) * 0.7);
  const dedeX = S.x + S.w * 0.04 + lerp(-dedeW - 40 * u, 0, enter) - leave * (dedeW + 80 * u);
  const dedeY = S.y + S.h - dedeH + 4 * u + Math.sin(frame / 18) * 2.5 * u * enter;
  const book = { x: dedeX + dedeW * BOOK_AT.x, y: dedeY + dedeH * BOOK_AT.y };

  /* ---- the map the screen turns into ---- */
  const mapW = S.w;
  const mapH = (mapW * MAP_H) / MAP_W;
  const mapR = { x: S.x, y: S.y + (S.h - mapH) / 2, w: mapW, h: mapH };
  const mapK = prog(frame, MAP_REVEAL[0], MAP_REVEAL[1], easeInOut);
  const city = (a: { mapX: number; mapY: number }) => ({ x: mapR.x + (a.mapX / 100) * mapR.w, y: mapR.y + (a.mapY / 100) * mapR.h });

  /* ---- the animals ---- */
  const hT = (portrait ? 120 : 130) * u;
  const wT = (portrait ? 190 : 185) * u;
  const dims = (a: OpeningProps["animals"][number]) => {
    const k = Math.min(hT / a.h, wT / a.w);
    return { w: a.w * k, h: a.h * k };
  };
  const perch = (i: number) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const jx = (random(`px${i}`) - 0.5) * 0.04;
    const jy = (random(`py${i}`) - 0.5) * 0.05;
    return portrait
      ? { x: S.x + S.w * (0.14 + col * 0.18 + jx), y: S.y + S.h * (0.1 + row * 0.16 + jy) }
      : { x: S.x + S.w * (0.42 + col * 0.105 + (row % 2) * 0.05 + jx), y: S.y + S.h * (0.18 + row * 0.22 + jy) };
  };

  const lit = lamp;
  const sceneDark = Math.max(0, 1 - lit);
  const wallK = 0.26 + 0.1 * lit + flash * 0.5;

  return (
    <AbsoluteFill style={{ background: "#05040f", overflow: "hidden" }}>
      {/* sound */}
      <Audio src={staticFile("audio/ambience.wav")} volume={0.4} loop />
      <Sequence from={14} durationInFrames={40}>
        <Audio src={staticFile("audio/knock.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={ENTER[0]} durationInFrames={50}>
        <Audio src={staticFile("audio/whoosh.wav")} volume={0.3} />
      </Sequence>
      <Sequence from={BOOK_OPEN - 10} durationInFrames={40}>
        <Audio src={staticFile("audio/pages.wav")} volume={0.8} />
      </Sequence>
      {animals.map((a, i) => (
        <Sequence key={`l${i}`} from={LAUNCH + i * GAP} durationInFrames={50}>
          <Audio src={staticFile("audio/whoosh.wav")} volume={0.12} />
        </Sequence>
      ))}
      {animals.map((a, i) => (
        <Sequence key={`c${i}`} from={TO_CITY + i * CITY_GAP + CITY_FLY} durationInFrames={100}>
          <Audio src={staticFile(`audio/chime-${i % 5}.wav`)} volume={0.38} />
        </Sequence>
      ))}
      <Sequence from={STORM[0]} durationInFrames={190}>
        <Audio src={staticFile("audio/rain.wav")} volume={0.45} loop />
      </Sequence>
      <Sequence from={FLASHES[0][0] - 2} durationInFrames={140}>
        <Audio src={staticFile("audio/thunder.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={FLASHES[2][0] - 2} durationInFrames={140}>
        <Audio src={staticFile("audio/thunder.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={POWER - 8} durationInFrames={60}>
        <Audio src={staticFile("audio/powercut.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={SWITCH} durationInFrames={30}>
        <Audio src={staticFile("audio/switch.wav")} volume={0.9} />
      </Sequence>

      {/* the study at night */}
      <AbsoluteFill>
        <Img src={staticFile("img/g1/wall.webp")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `brightness(${wallK}) saturate(0.8)` }} />
      </AbsoluteFill>

      {/* the window, with the storm in it */}
      <div style={{ position: "absolute", left: win.x - 14 * u, top: win.y - 14 * u, width: win.w + 28 * u, height: win.h + 28 * u, background: "#2a180c", borderRadius: 6 * u, boxShadow: `0 0 ${60 * flash}px ${20 * flash}px rgba(190,210,255,${0.6 * flash})` }}>
        <div style={{ position: "absolute", inset: 14 * u, overflow: "hidden", background: `linear-gradient(180deg, rgb(${10 + 200 * flash},${12 + 205 * flash},${40 + 200 * flash}), rgb(${18 + 150 * flash},${22 + 160 * flash},${60 + 160 * flash}))` }}>
          {frame >= STORM[0] ? (
            <div style={{ position: "absolute", inset: -20, opacity: 0.5 * prog(frame, STORM[0], STORM[0] + 30), backgroundImage: "repeating-linear-gradient(100deg, rgba(200,215,255,0.55) 0 1.5px, transparent 1.5px 14px)", backgroundPosition: `${frame * 3}px ${frame * 14}px` }} />
          ) : null}
          {flash > 0.05 ? (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: Math.min(1, flash * 1.6) }}>
              <polyline points={frame >= FLASHES[2][0] ? "70,0 58,26 66,28 48,60 57,62 38,100" : "30,0 40,22 33,25 50,52 42,55 56,100"} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinejoin="round" />
            </svg>
          ) : null}
        </div>
        <div style={{ position: "absolute", left: "50%", top: 14 * u, bottom: 14 * u, width: 10 * u, translate: "-50% 0", background: "#2a180c" }} />
        <div style={{ position: "absolute", top: "50%", left: 14 * u, right: 14 * u, height: 10 * u, translate: "0 -50%", background: "#2a180c" }} />
      </div>

      {/* the lamp behind the screen */}
      <div style={{ position: "absolute", left: S.x - 220 * u, top: S.y - 180 * u, width: S.w + 440 * u, height: S.h + 360 * u, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,196,110,0.5), rgba(255,160,70,0) 62%)", opacity: lit * 0.9, mixBlendMode: "screen" }} />

      {/* the wooden frame and the screen */}
      <div style={{ position: "absolute", left: S.x - T, top: S.y - T, width: S.w + 2 * T, height: S.h + 2 * T, borderRadius: 10 * u, background: "linear-gradient(135deg, #5a3820, #2c170a 55%, #4b2e18)", boxShadow: `0 20px 60px rgba(0,0,0,0.7), inset 0 0 0 ${3 * u}px #8a6030`, opacity: prog(frame, 0, 24) }}>
        <div style={{ position: "absolute", left: T, top: T, width: S.w, height: S.h, overflow: "hidden", borderRadius: 4 * u, background: `radial-gradient(ellipse at 50% 45%, #fff3cf 0, #f4d58c 55%, #d9a950 100%)`, boxShadow: "inset 0 0 90px rgba(120,60,10,0.55)" }}>
          {/* the paper map: the screen turns into it */}
          <div style={{ position: "absolute", left: 0, right: 0, top: (S.h - mapH) / 2, height: mapH, opacity: mapK, scale: String(1 + 0.03 * mapK) }}>
            <Img src={staticFile("img/map.webp")} style={{ width: "100%", height: "100%", boxShadow: "0 0 30px rgba(80,40,0,0.6)" }} />
          </div>

          {/* the grandfather, a paper-cut figure lit from behind */}
          <div style={{ position: "absolute", left: dedeX - S.x, top: dedeY - S.y, width: dedeW, height: dedeH, transformOrigin: "50% 100%", rotate: `${-3 * lean}deg`, opacity: 1 - leave * 0.4, filter: "drop-shadow(0 0 14px rgba(255,190,100,0.55))" }}>
            <Img src={staticFile("img/g1/dede.webp")} style={{ width: "100%", height: "100%" }} />
          </div>

          {/* light climbing out of the book */}
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <Burst x={book.x - S.x} y={book.y - S.y} size={140 * u} amount={interpolate(frame, [BOOK_OPEN, BOOK_OPEN + 10, BOOK_OPEN + 70], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} rays={14} />
            <Sparks x={book.x - S.x} y={book.y - S.y - 40 * u} radius={110 * u} opacity={interpolate(frame, [BOOK_OPEN, BOOK_OPEN + 12, LAUNCH + 90, LAUNCH + 120], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
          </div>

          {/* the fifteen animals, then their coins */}
          {animals.map((a, i) => {
            const d = dims(a);
            const start = LAUNCH + i * GAP;
            const t1 = prog(frame, start, start + FLY1, easeOut);
            if (frame < start) return null;
            const P = perch(i);
            const C = city(a);
            const b = { x: book.x, y: dedeY + dedeH * BOOK_AT.y };
            const arc = (180 + random(`arc${i}`) * 90) * u;
            const toCity = prog(frame, TO_CITY + i * CITY_GAP, TO_CITY + i * CITY_GAP + CITY_FLY, easeInOut);
            let x = lerp(b.x, P.x, t1);
            let y = lerp(b.y, P.y, t1) - Math.sin(Math.PI * t1) * arc;
            let k = lerp(0.2, 1, easeOut(t1));
            if (t1 >= 1) {
              x = P.x + Math.sin(frame / 15 + i * 1.3) * 9 * u;
              y = P.y + Math.cos(frame / 12 + i * 0.9) * 7 * u;
            }
            if (toCity > 0) {
              const x0 = P.x + Math.sin((TO_CITY + i * CITY_GAP) / 15 + i * 1.3) * 9 * u;
              const y0 = P.y + Math.cos((TO_CITY + i * CITY_GAP) / 12 + i * 0.9) * 7 * u;
              x = lerp(x0, C.x, toCity);
              y = lerp(y0, C.y, toCity) - Math.sin(Math.PI * toCity) * 90 * u;
              k = lerp(1, 0.4, toCity);
            }
            const headingRight = (toCity > 0 ? C.x - P.x : P.x - b.x) >= 0 ? 1 : -1;
            const arrived = frame >= TO_CITY + i * CITY_GAP + CITY_FLY;
            const rot = Math.sin(frame / 9 + i) * 6 * (1 - toCity);
            const coinK = arrived ? interpolate(frame - (TO_CITY + i * CITY_GAP + CITY_FLY), [0, 6, 14, 22], [0.3, 1.25, 0.95, 1], { extrapolateRight: "clamp" }) : 0;
            const coinD = (portrait ? 64 : 56) * u;
            const glow = arrived ? Math.max(0, 1 - (frame - (TO_CITY + i * CITY_GAP + CITY_FLY)) / 30) : 0;
            const lampBloom = prog(frame, 520, 545) * (1 - prog(frame, 560, 600)) * 0.7;
            return (
              <div key={a.id}>
                {!arrived ? (
                  <div style={{ position: "absolute", left: x - S.x - d.w / 2, top: y - S.y - d.h / 2, width: d.w, height: d.h, scale: `${headingRight * k} ${k}`, rotate: `${rot}deg`, opacity: 1 - prog(frame, TO_CITY + i * CITY_GAP + CITY_FLY - 8, TO_CITY + i * CITY_GAP + CITY_FLY) * 0.9, filter: "drop-shadow(0 0 10px rgba(255,200,110,0.6))" }}>
                    <Img src={staticFile(a.image)} style={{ width: "100%", height: "100%" }} />
                  </div>
                ) : (
                  <>
                    <div style={{ position: "absolute", left: C.x - S.x - coinD * 1.4, top: C.y - S.y - coinD * 1.4, width: coinD * 2.8, height: coinD * 2.8, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,226,150,0.9), rgba(255,200,100,0) 65%)", opacity: Math.max(glow, lampBloom), mixBlendMode: "screen" }} />
                    <div style={{ position: "absolute", left: C.x - S.x - coinD / 2, top: C.y - S.y - coinD / 2, width: coinD, height: coinD, scale: String(coinK), filter: "drop-shadow(0 4px 8px rgba(60,30,0,0.55))" }}>
                      <Img src={staticFile(a.plate)} style={{ width: "100%", height: "100%" }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* the lamp going out: the screen darkens */}
          <div style={{ position: "absolute", inset: 0, background: "#07050f", opacity: Math.min(0.97, sceneDark * 0.97) }} />
        </div>
      </div>

      {/* lightning lights the whole room for a moment */}
      <AbsoluteFill style={{ background: "rgba(205,220,255,1)", opacity: flashOn ? flash * 0.32 : 0, mixBlendMode: "screen" }} />

      {/* Deniz’s flashlight clicks on in the dark study */}
      {frame >= SWITCH ? (
        <>
          <AbsoluteFill style={{ opacity: 1 }}>
            <Img
              src={staticFile("img/g1/wall.webp")}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "brightness(1.5) saturate(1.1)",
                maskImage: `radial-gradient(ellipse ${W * 0.5 * prog(frame, SWITCH, SWITCH + 40, easeOut)}px ${H * 0.4 * prog(frame, SWITCH, SWITCH + 40, easeOut)}px at ${W * 0.5}px ${H * 0.62}px, #000 25%, transparent 100%)`,
                WebkitMaskImage: `radial-gradient(ellipse ${W * 0.5 * prog(frame, SWITCH, SWITCH + 40, easeOut)}px ${H * 0.4 * prog(frame, SWITCH, SWITCH + 40, easeOut)}px at ${W * 0.5}px ${H * 0.62}px, #000 25%, transparent 100%)`,
              }}
            />
          </AbsoluteFill>
          <Beam x={W * 0.12} y={H * 0.9} angle={-20} length={Math.hypot(W, H) * 0.7} spread={11} amount={prog(frame, SWITCH, SWITCH + 12) * (0.85 + 0.15 * Math.sin(frame / 3))} />
          <div style={{ position: "absolute", left: W * 0.12 - 32 * u, top: H * 0.9 - 32 * u, width: 64 * u, height: 64 * u, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,250,225,0.95), rgba(255,226,160,0.4) 45%, rgba(255,200,110,0) 70%)", opacity: prog(frame, SWITCH, SWITCH + 6), mixBlendMode: "screen" }} />
        </>
      ) : null}

      {/* everything goes black with the lamp */}
      <AbsoluteFill style={{ background: "#020108", opacity: frame >= POWER ? (frame < SWITCH ? 0.96 * prog(frame, POWER, POWER + 6) : 0.96 * (1 - prog(frame, SWITCH, SWITCH + 10) * 0.55)) : 0, pointerEvents: "none" }} />
      <PaperGrain opacity={0.1} />
      <AbsoluteFill style={{ background: "#000", opacity: 1 - prog(frame, 0, 24) }} />
    </AbsoluteFill>
  );
};

void PAL;
