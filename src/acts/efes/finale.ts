/* The end of Act 1: Melissa’s closing lines, then the act-ending film (rendered with Remotion from /video, the shared template
   with the Efes coin), and on to the map, where the coin lands (G6). */
import { say } from '../../engine/dialogue';
import { markDone } from '../../engine/progress';
import { playFilm } from '../../engine/cinematic/play-film';
import { assetUrl } from '../../engine/url';
import { TEXT } from './text';

export async function finale() {
  markDone('efes');
  await say(TEXT.finale);
  await playFilm({
    webm: assetUrl('efes/ending.webm'),
    mp4: assetUrl('efes/ending.mp4'),
    poster: assetUrl('efes/ending-poster.webp'),
  });
  location.href = '/';
}
