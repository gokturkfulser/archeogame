/* The end of Act 2: Kurunta’s closing lines, then the act-ending film (rendered with Remotion from /video, the shared
   template with the Hattuşa coin: lion, sun, clay tablet, god; the reverse shows the Kadesh handshake), and on to the
   map, where the coin lands (G6). */
import { say } from '../../engine/dialogue';
import { markDone } from '../../engine/progress';
import { playFilm } from '../../engine/cinematic/play-film';
import { assetUrl } from '../../engine/url';
import { TEXT } from './text';

export async function finale() {
  markDone('hattusa');
  await say(TEXT.finale);
  await playFilm({
    webm: assetUrl('hattusa/ending.webm'),
    mp4: assetUrl('hattusa/ending.mp4'),
    poster: assetUrl('hattusa/ending-poster.webp'),
  });
  location.href = '/';
}
