/* Plays a rendered film (made in /video with Remotion) full screen: skippable with "Geç", a tap or Enter, muted with the
   game’s mute button, and under prefers-reduced-motion a key frame is shown instead of the moving picture. */
import './cinematic.css';
import { duck, soundOn } from '../audio';

/** Reduced motion shows a key frame instead of the film. `localStorage.setItem('ppa.motion', 'on')` overrides it (for testing). */
const RM = (() => {
  let forced = false;
  try {
    forced = localStorage.getItem('ppa.motion') === 'on';
  } catch {
    /* storage blocked */
  }
  return matchMedia('(prefers-reduced-motion: reduce)').matches && !forced;
})();

export interface FilmSource {
  webm: string;
  mp4: string;
  /** A key frame of the film: shown while it loads and instead of it under reduced motion. */
  poster: string;
}

export function playFilm(src: FilmSource): Promise<void> {
  console.info('[film] reduced motion:', RM, '(the film is replaced by a key frame when this is true)');
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.className = 'film-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Perde sonu filmi');
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'cine-skip film-skip';
    skip.textContent = 'Geç';

    let video: HTMLVideoElement | null = null;
    let done = false;
    // the Enter that closed the last line of dialogue must not skip the film: input counts only after a moment
    const armedAt = performance.now() + 3000;
    const finish = (force = false) => {
      if (done || (!force && performance.now() < armedAt)) return;
      done = true;
      document.removeEventListener('keydown', onKey, true);
      video?.pause();
      duck(false);
      box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => {
        box.remove();
        resolve();
      };
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish();
      }
    };
    document.addEventListener('keydown', onKey, true);
    skip.onclick = (e) => {
      e.stopPropagation();
      finish();
    };
    box.onclick = () => finish();

    duck(true);
    if (RM) {
      const img = document.createElement('img');
      img.className = 'film-video';
      img.src = src.poster;
      img.alt = '';
      box.append(img, skip);
      document.body.append(box);
      skip.focus({ preventScroll: true });
      setTimeout(() => finish(true), 4500);
      return;
    }
    video = document.createElement('video');
    video.className = 'film-video';
    video.poster = src.poster;
    video.playsInline = true;
    video.muted = !soundOn();
    video.preload = 'auto';
    for (const [url, type] of [
      [src.webm, 'video/webm; codecs="vp9, vorbis"'],
      [src.mp4, 'video/mp4'],
    ]) {
      const s = document.createElement('source');
      s.src = url;
      s.type = type;
      video.append(s);
    }
    video.onended = () => finish(true);
    let triedMp4 = false;
    video.onerror = () => {
      console.warn('[film] could not play', video?.error);
      // a WebM that loads but cannot be decoded on this machine: fall back to the MP4
      if (!triedMp4 && video && /\.webm/.test(video.currentSrc)) {
        triedMp4 = true;
        video.src = src.mp4;
        void video.play().catch(() => finish(true));
        return;
      }
      finish(true);
    };
    box.append(video, skip);
    document.body.append(box);
    box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    void video.play().catch(() => {
      // autoplay with sound refused: try again muted rather than showing nothing
      video!.muted = true;
      void video!.play().catch(() => finish(true));
    });
    skip.focus({ preventScroll: true });
  });
}
