import { loadFont as loadAlegreya } from "@remotion/google-fonts/Alegreya";
import { loadFont as loadMarcellus } from "@remotion/google-fonts/Marcellus";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Coin } from "../components/Coin";
import { Curtains } from "../components/Curtains";
import { Beam, Burst, NightPaper, PaperGrain, Sparks } from "../components/Light";
import { Melissa } from "../components/Melissa";
import { easeIn, easeInOut, easeOut, FONT_DISPLAY, FONT_TEXT, lerp, PAL, prog } from "../components/util";
import type { ActEndingProps } from "./schema";

loadMarcellus();
loadAlegreya("normal", { weights: ["400", "500"], subsets: ["latin", "latin-ext"] });
loadAlegreya("italic", { weights: ["400"], subsets: ["latin", "latin-ext"] });

/* The film, in frames at 30 fps (25 s):
   0–30 curtains open · 40–255 the four pieces rise from their scenes one by one · 255–291 they gather · 291 they click into one
   coin · 296–404 it spins once, front to back to front · 405–575 Deniz holds it in her flashlight while Melissa circles
   it · 565–665 it flies onto the paper map and settles on the city, which lights up · 655–695 curtains close · 690–750 the
   next act’s name. */
const PIECE_AT = [40, 94, 148, 202];
const RELEASE = 16;
const FLY = 46;
const GATHER = [255, 291];
const CLICK = 291;
const SPIN = [296, 404];
const DENIZ_IN = 405;
const MAP_IN = 565;
const LAND = 625;
const CURTAIN = [655, 695];
const NAME = [690, 725];

const MAP_W = 2567;
const MAP_H = 1100;
const DENIZ_W = 318;
const DENIZ_H = 1005;
const LENS = { x: 186, y: 10 };

export const ActEnding: React.FC<ActEndingProps> = (p) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;
  const u = Math.min(W, H) / 1080;

  /* ---- layout ---- */
  const cardW = (portrait ? 470 : 390) * u;
  const cardH = (portrait ? 230 : 190) * u;
  const card = (i: number) =>
    portrait
      ? { x: W / 2 + ((i % 2) - 0.5) * 500 * u, y: H - 560 * u + Math.floor(i / 2) * 330 * u }
      : { x: W / 2 + (i - 1.5) * 430 * u, y: H - 175 * u };
  const pieceSize = (portrait ? 200 : 220) * u;
  const slot = (i: number) => (portrait ? { x: W / 2 + (i - 1.5) * 250 * u, y: H * 0.27 } : { x: W / 2 + (i - 1.5) * 300 * u, y: H * 0.34 });
  const centre = { x: W / 2, y: H * (portrait ? 0.4 : 0.45) };
  const coinSize = (portrait ? 700 : 560) * u;

  /* Deniz and the lens of her flashlight */
  const denizH = (portrait ? 960 : 820) * u;
  const dsc = denizH / DENIZ_H;
  const denizLeft = W * (portrait ? 0.14 : 0.2);
  const denizTop = H - denizH + 20 * u;
  const lens = { x: denizLeft + LENS.x * dsc, y: denizTop + LENS.y * dsc };
  const heldCoin = { x: lens.x + (portrait ? 330 : 380) * u, y: lens.y + (portrait ? 330 : 190) * u, size: (portrait ? 400 : 330) * u };
  const beamAngle = (Math.atan2(heldCoin.y - lens.y, heldCoin.x - lens.x) * 180) / Math.PI;

  /* map view: the whole map at first, then drifting towards the city */
  const efes = { x: (p.mapX / 100) * MAP_W, y: (p.mapY / 100) * MAP_H };
  const mapK = prog(frame, MAP_IN, 665, easeInOut);
  const mapS0 = portrait ? 1.1 : W / MAP_W;
  const mapS = lerp(mapS0, mapS0 * (portrait ? 1.5 : 1.55), mapK);
  const halfW = W / 2 / mapS;
  const halfH = H / 2 / mapS;
  /* keep the picture over the screen where the map is big enough to cover it (no blank paper beyond its edge) */
  const keep = (v: number, half: number, size: number) => (half * 2 >= size ? size / 2 : Math.max(half, Math.min(size - half, v)));
  const viewC = {
    x: keep(lerp(MAP_W / 2, efes.x, portrait ? 1 : 0.85 * mapK), halfW, MAP_W),
    y: keep(lerp(MAP_H / 2, efes.y, portrait ? 1 : 0.85 * mapK), halfH, MAP_H),
  };
  const toScreen = (x: number, y: number) => ({ x: W / 2 + (x - viewC.x) * mapS, y: H / 2 + (y - viewC.y) * mapS });
  const cityOnScreen = toScreen(efes.x, efes.y);
  const mapCoin = 120 * u * (portrait ? 1.1 : 1);

  /* ---- coin: where it is and how it is turned ---- */
  const gather = prog(frame, GATHER[0], GATHER[1], easeIn);
  const coinBirth = interpolate(frame, [CLICK, CLICK + 18, CLICK + 30], [0.6, 1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const spinA = prog(frame, SPIN[0], SPIN[0] + 42, easeInOut);
  const spinB = prog(frame, SPIN[1] - 38, SPIN[1], easeInOut);
  const rotate = 180 * spinA + 180 * spinB;
  const toDeniz = prog(frame, DENIZ_IN + 12, DENIZ_IN + 60, easeInOut);
  const flight = prog(frame, MAP_IN + 14, LAND, easeInOut);
  let coinX: number;
  let coinY: number;
  let coinD: number;
  if (frame < MAP_IN + 14) {
    coinX = lerp(centre.x, heldCoin.x, toDeniz);
    coinY = lerp(centre.y, heldCoin.y, toDeniz) + Math.sin(frame / 16) * 8 * u * toDeniz;
    coinD = lerp(coinSize, heldCoin.size, toDeniz);
  } else {
    const a = { x: heldCoin.x, y: heldCoin.y + Math.sin(frame / 16) * 8 * u };
    const arc = Math.sin(Math.PI * flight) * 260 * u;
    coinX = lerp(a.x, cityOnScreen.x, flight);
    coinY = lerp(a.y, cityOnScreen.y, flight) - arc;
    coinD = lerp(heldCoin.size, mapCoin, flight) * (frame >= LAND ? interpolate(frame, [LAND, LAND + 6, LAND + 14, LAND + 22], [1.0, 1.25, 0.94, 1], { extrapolateRight: "clamp" }) : 1);
  }
  const flightSpin = frame >= MAP_IN + 14 ? 360 * flight : 0;
  const coinVisible = frame >= CLICK;
  const coinOpacity = frame > CURTAIN[0] ? 1 : 1;

  /* ---- the backdrops ---- */
  const denizOp = interpolate(frame, [DENIZ_IN, DENIZ_IN + 30, MAP_IN, MAP_IN + 24], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mapOp = prog(frame, MAP_IN, MAP_IN + 30);
  const nightOp = 1 - prog(frame, DENIZ_IN, DENIZ_IN + 30);
  const denizIn = prog(frame, DENIZ_IN + 4, DENIZ_IN + 40, easeOut);
  const denizOut = prog(frame, MAP_IN, MAP_IN + 22, easeIn);
  const beamAmt = interpolate(frame, [DENIZ_IN + 30, DENIZ_IN + 55, MAP_IN + 8, MAP_IN + 30], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  /* Melissa circles the coin */
  const beeStart = DENIZ_IN + 20;
  const orbitT = frame - (beeStart + 30);
  const orbitA = (orbitT / 140) * Math.PI * 4;
  const beeIn = prog(frame, beeStart, beeStart + 30, easeOut);
  const orbitCx = heldCoin.x;
  const orbitCy = heldCoin.y - 30 * u;
  const beeOrbitX = orbitCx + Math.cos(orbitA) * 270 * u;
  const beeOrbitY = orbitCy + Math.sin(orbitA) * 105 * u;
  const beeX = lerp(-120 * u, beeOrbitX, beeIn);
  const beeY = lerp(-100 * u, beeOrbitY, beeIn);
  const beeFace: 1 | -1 = -Math.sin(orbitA) >= 0 ? 1 : -1;
  const beeFront = Math.sin(orbitA) > 0;
  const beeOut = frame >= MAP_IN + 6 ? Math.max(0, 1 - prog(frame, MAP_IN + 6, MAP_IN + 30)) : 1;
  const beeVisible = p.guide === "melissa" && frame >= beeStart && beeOut > 0;

  /* Kurunta walks in beside Deniz, antlers glowing, and leaves with her */
  const stagH = (portrait ? 480 : 780) * u;
  const stagW = (stagH * 722) / 856;
  const stagIn = prog(frame, DENIZ_IN + 22, DENIZ_IN + 64, easeOut);
  const stagOut = prog(frame, MAP_IN, MAP_IN + 22, easeIn);
  const stagLeft = W * (portrait ? 0.78 : 0.76) - stagW / 2 + (1 - stagIn) * 460 * u + stagOut * 460 * u;
  const stagTop = H - stagH + 14 * u + Math.sin(frame / 22) * 3 * u;
  const stagAmt = stagIn * (1 - stagOut);

  const curtainClosed = prog(frame, CURTAIN[0], CURTAIN[1], easeInOut);
  const curtainOpen = 1 - prog(frame, 0, 30, easeInOut);
  const curtains = Math.max(curtainClosed, curtainOpen);
  const nameReveal = prog(frame, NAME[0], NAME[1], easeOut);

  const piecesGone = frame >= CLICK;
  const cardsOp = 1 - prog(frame, GATHER[0], GATHER[1]);
  const mapScreenFor = (x: number, y: number) => toScreen(x, y);
  void mapScreenFor;

  return (
    <AbsoluteFill style={{ background: PAL.night, overflow: "hidden" }}>
      {/* sound: ambience under everything, then a chime for each piece, the click, the turn, the whoosh, the landing */}
      <Audio src={staticFile("audio/ambience.wav")} volume={0.55} loop />
      <Sequence from={0} durationInFrames={50}>
        <Audio src={staticFile("audio/curtain.wav")} volume={0.5} />
      </Sequence>
      {p.pieces.map((pc, i) => (
        <Sequence key={pc.id} from={PIECE_AT[i] + RELEASE} durationInFrames={110}>
          <Audio src={staticFile(`audio/chime-${pc.note}.wav`)} volume={0.8} />
        </Sequence>
      ))}
      <Sequence from={CLICK} durationInFrames={110}>
        <Audio src={staticFile("audio/click.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={SPIN[0] + 2} durationInFrames={110}>
        <Audio src={staticFile("audio/spin.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={MAP_IN + 6} durationInFrames={45}>
        <Audio src={staticFile("audio/whoosh.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={LAND} durationInFrames={120}>
        <Audio src={staticFile("audio/land.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={CURTAIN[0]} durationInFrames={50}>
        <Audio src={staticFile("audio/curtain.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={NAME[0] + 2} durationInFrames={60}>
        <Audio src={staticFile("audio/next.wav")} volume={0.8} />
      </Sequence>

      {/* night paper (the pieces and the coin) */}
      <AbsoluteFill style={{ opacity: Math.max(nightOp, 1 - mapOp > 0 ? nightOp : 0) }}>
        <NightPaper glow={p.glow} />
      </AbsoluteFill>

      {/* Deniz’s night: the same backdrop the library scene uses */}
      <AbsoluteFill style={{ opacity: denizOp }}>
        {[p.backdrop.sky, p.backdrop.mid, p.backdrop.fg].map((src, i) => (
          <Img
            key={src}
            src={staticFile(src)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: portrait ? "44% 50%" : "50% 50%",
              translate: `${(frame - DENIZ_IN) * (0.04 + i * 0.07)}px 0`,
              scale: "1.04",
            }}
          />
        ))}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,6,30,0.45), rgba(8,6,30,0.15) 50%, rgba(8,6,30,0.5))" }} />
      </AbsoluteFill>

      {/* the paper map */}
      <AbsoluteFill style={{ opacity: mapOp, background: `radial-gradient(ellipse at 50% 40%, #1d2a78 0, #121a55 55%, ${PAL.night} 100%)` }}>
        <Img
          src={staticFile("img/map.webp")}
          style={{
            position: "absolute",
            left: W / 2 - viewC.x * mapS,
            top: H / 2 - viewC.y * mapS,
            width: MAP_W * mapS,
            height: MAP_H * mapS,
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          }}
        />
        {/* the city’s light: a bloom on the map when the coin lands */}
        <Burst x={cityOnScreen.x} y={cityOnScreen.y} size={240 * u} amount={frame >= LAND ? Math.max(0, 1 - prog(frame, LAND, LAND + 70)) : 0} rays={0} />
        <Burst x={cityOnScreen.x} y={cityOnScreen.y} size={150 * u} amount={frame >= LAND ? 0.45 + 0.1 * Math.sin(frame / 10) : 0} rays={0} />
        {frame >= LAND ? (
          <div
            style={{
              position: "absolute",
              left: cityOnScreen.x - mapCoin * 0.5 - 14 * u,
              top: cityOnScreen.y - mapCoin * 0.5 - 14 * u,
              width: mapCoin + 28 * u,
              height: mapCoin + 28 * u,
              borderRadius: "50%",
              border: `${3 * u}px solid ${PAL.gold}`,
              opacity: Math.max(0, 1 - prog(frame, LAND, LAND + 36)),
              scale: String(1 + prog(frame, LAND, LAND + 36, easeOut) * 2.2),
            }}
          />
        ) : null}
        {frame >= LAND + 8 ? (
          <div
            style={{
              position: "absolute",
              left: cityOnScreen.x,
              top: cityOnScreen.y + mapCoin * 0.62,
              translate: "-50% 0",
              opacity: prog(frame, LAND + 8, LAND + 24),
              padding: `${2 * u}px ${18 * u}px ${6 * u}px`,
              background: PAL.paper,
              color: "#2a1830",
              fontFamily: FONT_DISPLAY,
              fontSize: 40 * u,
              borderRadius: 4 * u,
              boxShadow: `0 4px 14px rgba(0,0,0,0.45), inset 0 0 0 ${3 * u}px #e2c58e`,
            }}
          >
            {p.city}
          </div>
        ) : null}
        <Sparks x={cityOnScreen.x} y={cityOnScreen.y} radius={160 * u} opacity={frame >= LAND ? Math.max(0, 1 - prog(frame, LAND + 20, LAND + 70)) : 0} />
      </AbsoluteFill>

      {/* the four scenes, and the pieces rising out of them */}
      {p.pieces.map((pc, i) => {
        const c = card(i);
        const appear = prog(frame, PIECE_AT[i], PIECE_AT[i] + 20, easeOut);
        const glow = interpolate(frame, [PIECE_AT[i] + RELEASE - 6, PIECE_AT[i] + RELEASE, PIECE_AT[i] + RELEASE + 26], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={`card-${pc.id}`} style={{ opacity: appear * cardsOp, translate: `0 ${(1 - appear) * 70 * u}px` }}>
            <div
              style={{
                position: "absolute",
                left: c.x - cardW / 2,
                top: c.y - cardH / 2,
                width: cardW,
                height: cardH,
                overflow: "hidden",
                borderRadius: 6 * u,
                boxShadow: `0 14px 30px rgba(0,0,0,0.5), 0 0 0 ${4 * u}px ${PAL.gold}, 0 0 ${60 * glow}px ${PAL.gold}`,
              }}
            >
              <Img src={staticFile(pc.sceneImage)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 70%" }} />
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 30%, rgba(255,230,160,${0.55 * glow}), transparent 60%)` }} />
            </div>
            <div
              style={{
                position: "absolute",
                left: c.x - cardW / 2,
                top: c.y + cardH / 2 + 8 * u,
                width: cardW,
                textAlign: "center",
                fontFamily: FONT_TEXT,
                fontStyle: "italic",
                fontSize: 34 * u,
                color: PAL.paper,
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              {pc.scene}
            </div>
          </div>
        );
      })}
      {!piecesGone
        ? p.pieces.map((pc, i) => {
            const c = card(i);
            const s = slot(i);
            const t = prog(frame, PIECE_AT[i] + RELEASE, PIECE_AT[i] + RELEASE + FLY, easeOut);
            if (t <= 0) return null;
            const bob = Math.sin(frame / 12 + i * 1.7) * 7 * u * t;
            const fromY = c.y - cardH * 0.3;
            let x = lerp(c.x, s.x, t);
            let y = lerp(fromY, s.y, t) - Math.sin(Math.PI * t) * 150 * u + bob;
            let k = lerp(0.35, 1, t);
            if (gather > 0) {
              x = lerp(x, centre.x, gather);
              y = lerp(y, centre.y, gather);
              k *= lerp(1, 0.78, gather);
            }
            const pulse = 0.65 + 0.35 * Math.sin(frame / 7 + i);
            return (
              <div key={`pc-${pc.id}`} style={{ position: "absolute", left: x - pieceSize / 2, top: y - pieceSize / 2, width: pieceSize, height: pieceSize, scale: String(k), rotate: `${(1 - t) * -25 + Math.sin(frame / 20 + i) * 3}deg` }}>
                <div style={{ position: "absolute", inset: -pieceSize * 0.35, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,226,150,0.55), rgba(255,200,100,0) 65%)", opacity: pulse * Math.min(1, t * 2) }} />
                <Img src={staticFile(pc.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.5))" }} />
                {pc.letters ? (
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: pieceSize * 0.34, color: "#7a4d12", textShadow: "0 2px 0 rgba(255,236,170,0.8)" }}>{pc.letters}</div>
                ) : null}
              </div>
            );
          })
        : null}

      {/* the click: the pieces become one coin */}
      <Burst x={centre.x} y={centre.y} size={coinSize * 0.8} amount={interpolate(frame, [CLICK - 2, CLICK + 4, CLICK + 40], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} rays={18} />
      {frame >= CLICK && frame < CLICK + 34 ? (
        <div style={{ position: "absolute", left: centre.x - coinSize / 2, top: centre.y - coinSize / 2, width: coinSize, height: coinSize, borderRadius: "50%", border: `${5 * u}px solid ${PAL.gold}`, opacity: 1 - prog(frame, CLICK, CLICK + 34), scale: String(0.8 + prog(frame, CLICK, CLICK + 34, easeOut) * 0.9) }} />
      ) : null}

      {/* Deniz, with the beam of her flashlight lighting the coin */}
      <div style={{ position: "absolute", left: denizLeft, top: denizTop, width: DENIZ_W * dsc, height: DENIZ_H * dsc, opacity: denizIn * (1 - denizOut), translate: `${(1 - denizIn) * -260 * u - denizOut * 320 * u}px 0`, filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.4))" }}>
        <Img src={staticFile("img/deniz-cheer.webp")} style={{ width: "100%", height: "100%" }} />
      </div>
      <Beam x={lens.x} y={lens.y} angle={beamAngle} length={900 * u} spread={13} amount={beamAmt * denizIn} />
      <div style={{ position: "absolute", left: lens.x - 34 * u, top: lens.y - 34 * u, width: 68 * u, height: 68 * u, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,250,225,0.95), rgba(255,226,160,0.4) 45%, rgba(255,200,110,0) 70%)", opacity: beamAmt * denizIn, mixBlendMode: "screen" }} />

      {p.guide === "kurunta" && stagAmt > 0.001 ? (
        <>
          <div style={{ position: "absolute", left: stagLeft + stagW * 0.4 - 260 * u, top: stagTop - 120 * u, width: 520 * u, height: 520 * u, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,214,120,0.5), rgba(255,190,90,0) 65%)", opacity: stagAmt * (0.75 + 0.25 * Math.sin(frame / 9)), mixBlendMode: "screen" }} />
          <div style={{ position: "absolute", left: stagLeft, top: stagTop, width: stagW, height: stagH, opacity: stagIn * (1 - stagOut), filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.45))" }}>
            <Img src={staticFile("img/kurunta.webp")} style={{ width: "100%", height: "100%" }} />
          </div>
        </>
      ) : null}

      {/* Melissa behind the coin on the far half of her loop */}
      {beeVisible && !beeFront ? (
        <div style={{ position: "absolute", left: beeX, top: beeY, opacity: beeOut }}>
          <Melissa height={170 * u} face={beeFace} tilt={Math.sin(orbitA) * 6} />
        </div>
      ) : null}

      {/* the coin itself */}
      {coinVisible ? (
        <div
          style={{
            position: "absolute",
            left: coinX - coinD / 2,
            top: coinY - coinD / 2,
            scale: String(frame < CLICK + 30 ? coinBirth : 1),
            opacity: coinOpacity,
          }}
        >
          <Coin size={coinD} rotateY={rotate + flightSpin} front={p.front} back={p.back} letters={p.frontLetters} />
        </div>
      ) : null}
      {coinVisible && frame >= DENIZ_IN + 40 && frame < MAP_IN + 40 ? <Sparks x={coinX} y={coinY} radius={coinD * 0.75} opacity={beamAmt} /> : null}

      {/* Melissa in front of the coin on the near half */}
      {beeVisible && beeFront ? (
        <div style={{ position: "absolute", left: beeX, top: beeY, opacity: beeOut }}>
          <Melissa height={170 * u} face={beeFace} tilt={Math.sin(orbitA) * 6} />
        </div>
      ) : null}

      {/* the coin’s name while it turns */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: centre.y + coinSize / 2 + 60 * u,
          textAlign: "center",
          fontFamily: FONT_DISPLAY,
          fontSize: 86 * u,
          color: "#fff1d6",
          textShadow: "0 4px 22px rgba(0,0,0,0.8)",
          opacity: prog(frame, 330, 352) * (1 - prog(frame, DENIZ_IN, DENIZ_IN + 18)),
        }}
      >
        {p.coinTitle}
      </div>

      <PaperGrain />
      <Curtains closed={curtains} color={p.curtain} kicker={p.nextNumber} title={p.nextName} reveal={nameReveal} />
    </AbsoluteFill>
  );
};
