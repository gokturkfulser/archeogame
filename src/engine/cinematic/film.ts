/* What every act lists in its cinematics.ts: one entry per film, with the beat it covers, how long it runs, which tool
   builds it (Remotion for non-interactive films, in-engine for anything that continues from or reacts to play) and the
   assets it needs. */
export interface Film {
  id: string;
  type: 'opening' | 'debut' | 'beat' | 'ending';
  /** What happens in it, one line. */
  beat: string;
  /** Length in seconds, as a range or a target. */
  seconds: [number, number];
  tool: 'engine' | 'remotion';
  /** Source files or art the film uses. */
  assets: string[];
  status: 'planned' | 'built';
}
