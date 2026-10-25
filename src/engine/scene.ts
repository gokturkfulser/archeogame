import type { Ctx } from './core';
import type { Ambience } from './audio';
import type { LayerSpec } from './layers';

/** A tappable region in world coordinates, mirrored as a real <button> for keyboard and screen-reader use. */
export interface Hotspot {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  act: () => void;
}

/**
 * One scene of an act. The engine draws, in order: backdrop → `afterBack` → layers (each followed by `after(i)`;
 * Deniz is drawn right after layer `denizAfter`) → darkness around the lamp → `fx` → Melissa → the lamp.
 */
export interface Scene {
  id: string;
  /** Shown on the curtain, e.g. “Birinci sahne”. */
  num: string;
  name: string;
  /** 0..1 darkness outside the lamp’s glow. */
  dark: number;
  lamp0: [number, number];
  /** Where the beam eases to when the curtain opens (until the player moves it): near the puzzle, never on its answer. */
  focus?: [number, number];
  /** y of the ground line Deniz walks on. */
  ground: number;
  /** How tall Deniz stands in this scene, in world units (default 280). */
  denizHeight?: number;
  /** Index of the layer after which Deniz is drawn. Default: just before the last (foreground) layer. */
  denizAfter?: number;
  ambience: Ambience;
  /** Image paths to warm up while the previous scene is still playing. */
  assets?: string[];

  /** Code-drawn backdrop (sky, stars, moon), drawn every frame. */
  back: (g: Ctx) => void;
  /** Optional painted backdrop (path under public/assets/); when loaded it replaces `back`, and `backFx` is drawn on top. */
  backImage?: string;
  backFx?: (g: Ctx) => void;
  afterBack?: (g: Ctx) => void;
  layers: LayerSpec[];
  after?: (i: number, g: Ctx) => void;
  fx?: (g: Ctx) => void;

  update?: (dt: number) => void;
  /** Where the light falls from when a puzzle has locked it (shadow direction). */
  solvedLamp?: { x: number; y: number } | null;
  hotspots?: () => Hotspot[];
  onClick?: (x: number, y: number) => void;
  onKey?: (e: KeyboardEvent) => void;
  hint: () => void;
  /** Set by puzzles that can replay something (the theatre melody). */
  replay?: (() => void) | null;
  enter: () => Promise<void>;
  exit?: () => void;
}
