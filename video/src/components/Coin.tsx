import { Img, staticFile } from "remotion";
import { FONT_DISPLAY } from "./util";

type Props = {
  /** Diameter in pixels. */
  size: number;
  /** Rotation about the vertical axis in degrees: 0 shows the front, 180 the back. */
  rotateY: number;
  front: string;
  back: string;
  /** The two letters stamped on either side of the front motif (Ε Φ for Efes). */
  letters?: [string, string];
};

/** The city’s coin: two faces, turned in 3D. The letters are set in type over the Higgsfield coin art, as in the game. */
export const Coin: React.FC<Props> = ({ size, rotateY, front, back, letters }) => {
  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.55))",
  };
  const letter: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    translate: "-50% -48%",
    fontFamily: FONT_DISPLAY,
    fontWeight: 700,
    fontSize: size * 0.2,
    color: "#7a4d12",
    textShadow: "0 2px 0 rgba(255,236,170,0.75), 0 -1px 0 rgba(80,40,0,0.5)",
    lineHeight: 1,
  };
  return (
    <div style={{ width: size, height: size, perspective: size * 3 }}>
      <div style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", rotate: `y ${rotateY}deg` }}>
        <div style={face}>
          <Img src={staticFile(front)} style={{ width: "100%", height: "100%" }} />
          {letters ? <span style={{ ...letter, left: "19%" }}>{letters[0]}</span> : null}
          {letters ? <span style={{ ...letter, left: "81%" }}>{letters[1]}</span> : null}
        </div>
        <div style={{ ...face, rotate: "y 180deg" }}>
          <Img src={staticFile(back)} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
};
