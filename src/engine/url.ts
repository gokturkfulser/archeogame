/* URL helper with no DOM side effects, so pages without the game canvas (the hub) can use it. */

/** URL of a processed asset under public/assets/. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}
