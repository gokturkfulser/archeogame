/* The map page. A new player never sees the map first: the story starts in grandfather’s study. */
import { loadProgress } from '../engine/progress';

if (!loadProgress().book) location.replace('/baslangic/');
else void import('./mount').then(({ mountHub }) => mountHub(document.getElementById('app') as HTMLElement));
