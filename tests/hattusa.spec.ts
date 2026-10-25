/* Play-through of Act 2 (Hattuşa): raking-light reliefs, the dark tunnel, the broken tablets and the twelve gods, then the finale.
   Runs once per viewport project. Uses the DEV-only `window.__game` hook to read puzzle state and convert world to screen coordinates. */
import { expect, Page, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */

async function readDialogue(page: Page, { first = 25_000 } = {}) {
  await page.locator('#dialog').waitFor({ state: 'visible', timeout: first });
  for (let guard = 0; guard < 60; guard++) {
    if (await page.locator('#dialog').isVisible()) {
      await page.locator('#next').click();
      await page.waitForTimeout(40);
    } else {
      await page.waitForTimeout(300);
      if (!(await page.locator('#dialog').isVisible())) return;
    }
  }
  throw new Error('dialogue never ended');
}

/** Clicks through dialogue until `target` shows up (the fact card or the final overlay), however many lines come first. */
async function readUntil(page: Page, target: string, timeout = 60_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.locator(target).isVisible()) return;
    if (await page.locator('#dialog').isVisible()) await page.locator('#next').click();
    await page.waitForTimeout(60);
  }
  throw new Error('never reached ' + target);
}

async function moveLampTo(page: Page, x: number, y: number) {
  const c = await page.evaluate((p) => (window as any).__game.toClient(p.x, p.y), { x, y });
  await page.mouse.move(c.x, c.y, { steps: 6 });
  await page.waitForFunction(([wx, wy]) => {
    const l = (window as any).__game.lamp;
    return Math.hypot(l.x - wx, l.y - wy) < 25;
  }, [x, y]);
}

const sceneState = (page: Page, key: string) => page.evaluate((k) => (window as any).__game.scene()[k], key);

test('plays through Hattuşa: reliefs, tunnel, tablets, gods, finale', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
  });
  const shot = (name: string) => page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/h-${name}.png` });

  await page.goto('/hattusa/');
  await page.waitForFunction(() => (window as any).__game);
  await page.evaluate(() => document.fonts.ready);
  await shot('00-title');
  await page.click('#start');

  /* ---- I. Aslanlı Kapı: four worn reliefs read in raking light ---- */
  await readDialogue(page);
  await expect(page.locator('#goal')).toBeVisible();
  await shot('01-kapi-start');
  // light right on top of a slab washes the carving out: it must not count as read
  await moveLampTo(page, 257, 647);
  await page.waitForTimeout(1500);
  expect((await sceneState(page, 'read'))[1]).toBe(false); // a neighbouring slab may well be read from here, this one not
  const panels = [
    [72, 647, 192], // light to the right of the slab
    [257, 647, 377],
    [1343, 647, 1223], // light to the left of the slab
    [1527, 647, 1407],
  ];
  for (let k = 0; k < 4; k++) {
    await moveLampTo(page, panels[k][2], panels[k][1]);
    await page.waitForFunction((i) => (window as any).__game.scene().read[i], k, { timeout: 8000 });
    if (k === 1) await shot('02-kapi-read');
    await readDialogue(page); // Deniz names what she sees
  }
  await readUntil(page, '#card'); // the gate opens, Kurunta appears and introduces himself
  await shot('03-kapi-card');
  await page.locator('#cardGo').click();

  /* ---- II. Yerkapı Tüneli: read the plaque, light the signs in its order ---- */
  await readDialogue(page);
  await expect(page.locator('#goal')).toBeVisible();
  await shot('04-tunel-start');
  const signs: Record<string, [number, number]> = {
    gunes: [135, 410],
    dag: [175, 650],
    geyik: [365, 480],
    aslan: [1285, 510],
    kus: [1445, 640],
  };
  // trying a sign before reading the plaque lights nothing
  await moveLampTo(page, signs.gunes[0], signs.gunes[1]);
  await page.waitForTimeout(1400);
  expect(await sceneState(page, 'next')).toBe(0);
  await readDialogue(page, { first: 4000 }); // the gentle "read the plaque first" nudge
  await moveLampTo(page, 800, 200);
  await page.waitForTimeout(1500);
  await shot('05-tunel-plaque');
  const order = ['kus', 'gunes', 'aslan', 'dag', 'geyik'];
  for (let k = 0; k < order.length; k++) {
    const [sx, sy] = signs[order[k]];
    await moveLampTo(page, sx, sy);
    await page.waitForFunction((n) => (window as any).__game.scene().next > n, k, { timeout: 8000 });
  }
  await shot('06-tunel-solved');
  await readUntil(page, '#card');
  await page.locator('#cardGo').click();

  /* ---- III. Kil Tablet Arşivi: mend three tablets, then write a name ---- */
  await readDialogue(page);
  await expect(page.locator('#goal')).toBeVisible();
  await shot('07-arsiv-start');
  // a fragment with the wrong edge must not fit
  await page.getByRole('button', { name: 'Kil parça 1' }).click();
  await page.getByRole('button', { name: 'Kırık tablet 1' }).click();
  expect(await sceneState(page, 'mended')).toEqual([false, false, false]);
  await readDialogue(page);
  const fits: [number, number][] = [
    [4, 1], // fragment 4 (edge 0) -> tablet 1
    [2, 2], // fragment 2 (edge 1) -> tablet 2
    [6, 3], // fragment 6 (edge 2) -> tablet 3
  ];
  for (const [f, t] of fits) {
    await page.getByRole('button', { name: `Kil parça ${f}` }).click();
    await page.getByRole('button', { name: `Kırık tablet ${t}` }).click();
    await page.waitForFunction((i) => (window as any).__game.scene().mended[i - 1], t, { timeout: 4000 });
  }
  await shot('08-arsiv-mended');
  await readDialogue(page);
  for (let k = 1; k <= 5; k++) {
    await page.getByRole('button', { name: `Kil noktası ${k}` }).click();
    await page.waitForTimeout(120);
  }
  await shot('09-arsiv-signed');
  await readUntil(page, '#card');
  await page.locator('#cardGo').click();

  /* ---- IV. Yazılıkaya: wake the twelve gods in order ---- */
  await readDialogue(page);
  await expect(page.locator('#goal')).toBeVisible();
  await shot('10-yazili-start');
  // skipping ahead must not light anything out of order
  await moveLampTo(page, 500 + 5 * 58, 520);
  await page.waitForTimeout(800);
  expect(await sceneState(page, 'next')).toBe(0);
  await readDialogue(page, { first: 6000 }).catch(() => undefined); // the "skipped" hint may appear
  for (let k = 0; k < 12; k++) {
    await moveLampTo(page, 500 + k * 58, 520);
    await page.waitForFunction((n) => (window as any).__game.scene().next > n, k, { timeout: 8000 });
  }
  await shot('11-yazili-lit');
  await page.waitForFunction(() => (window as any).__game.scene().reveal > 0.9 || (window as any).__game.scene().treaty > 0, null, { timeout: 40_000 }).catch(() => undefined);
  await readUntil(page, '#card'); // all lit, Kurunta's name, the treaty
  await shot('13-yazili-card');
  await page.locator('#cardGo').click();
  await readUntil(page, '.film-box'); // finale lines, then the act-ending film
  await expect(page.locator('.film-box')).toBeVisible();
  await shot('14-ending-film');

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('ppa.progress.v1') || 'null'));
  expect(progress.done).toContain('hattusa');
  await page.waitForTimeout(3300); // the film ignores skip input for its first 3 seconds
  await page.keyboard.press('Enter');
  await page.waitForURL('**/', { timeout: 15_000 });
  expect(errors).toEqual([]);
});
