/* The list at the end of an act: every city, with a tick on the ones whose coin is found. */
import cities from '../hub/cities.json';
import { loadProgress } from './progress';

export function fillNextActs(ul: HTMLElement) {
  const done = loadProgress().done;
  ul.innerHTML = '';
  let marked = false;
  for (const c of cities) {
    const li = document.createElement('li');
    const found = done.includes(c.id);
    li.textContent = (found ? '✓ ' : '') + c.name;
    if (found) li.className = 'done';
    else if (!marked && c.playable) {
      li.className = 'next';
      marked = true;
    }
    ul.append(li);
  }
}
