import { Easing, interpolate } from "remotion";

export const easeInOut = Easing.bezier(0.45, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.5, 0, 0.9, 0.4);

/** 0..1 progress of `frame` between two frames, clamped, with an optional easing. */
export const prog = (frame: number, from: number, to: number, easing: (t: number) => number = (t) => t) =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Palette of the game: deep indigo night, lapis, İznik turquoise, madder red, saffron, warm gold. */
export const PAL = {
  night: "#0b0a2a",
  indigo: "#17143a",
  lapis: "#26357a",
  turquoise: "#1e8c88",
  madder: "#a8322a",
  madderDeep: "#6e1712",
  saffron: "#e9a93b",
  gold: "#f3c56a",
  paper: "#f2dfb8",
};

export const FONT_DISPLAY = "Marcellus, 'Palatino Linotype', Georgia, serif";
export const FONT_TEXT = "Alegreya, 'Palatino Linotype', Georgia, serif";
