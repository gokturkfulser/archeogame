/* Lets whatever covers the whole screen (a film, a closed transition) tell the game to stop drawing the stage behind it.
   Counted, so two overlays can hold it at once. No imports: pages without the game canvas (the hub) can use it too. */
let holds = 0;

export const renderPaused = () => holds > 0;

/** Stops the stage being drawn until the matching `resumeRender`. Returns a function that releases this hold once. */
export function pauseRender(): () => void {
  holds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
  };
}
