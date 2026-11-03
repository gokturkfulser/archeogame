/* Play-through of the Sardes act so far (scene 1, Paktolos Çayı) with screenshots, once per viewport project.
   Uses the DEV-only `window.__game` hook to read the scene’s state and to convert world to screen coordinates. */
import { expect, Page, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */

async function readDialogue(page: Page, { first = 20_000 } = {}) {
  await page.locator('#dialog').waitFor({ state: 'visible', timeout: first });
  for (let guard = 0; guard < 60; guard++) {
    if (await page.locator('#dialog').isVisible()) {
      await page.locator('#next').click();
      await page.waitForTimeout(40);
    } else {
      await page.waitForTimeout(250);
      if (!(await page.locator('#dialog').isVisible())) return;
    }
  }
  throw new Error('dialogue never ended');
}

/** Keeps the light on a drifting flake until `until` is true; flakes move, so the pointer follows. */
async function chaseFlakes(page: Page, goal: number, shot?: (n: string) => Promise<unknown>) {
  const deadline = Date.now() + 150_000;
  let shotFlash = false;
  while (Date.now() < deadline) {
    // the short remarks after the first and third catch wait for a click, like any dialogue
    if (await page.locator('#dialog').isVisible()) {
      await page.locator('#next').click();
      await page.waitForTimeout(60);
      continue;
    }
    const st = await page.evaluate(() => {
      const g = (window as any).__game;
      const s = g.scene();
      const f = s.flakes
        .filter((q: any) => q.wait < 0 && q.fly <= 0 && q.x > 70 && q.x < 1530)
        .sort((a: any, b: any) => Math.abs(a.x - g.lamp.x) - Math.abs(b.x - g.lamp.x))[0];
      return { caught: s.caught, f: f ? { ...g.toClient(f.x, f.y + Math.sin(f.bob) * 4), level: f.level, meter: f.meter } : null };
    });
    if (st.caught >= goal) return;
    if (st.f) {
      await page.mouse.move(st.f.x, st.f.y);
      if (shot && !shotFlash && st.f.level > 0.6) {
        shotFlash = true;
        await shot('02-flake-flash');
      }
    }
    await page.waitForTimeout(40);
  }
  throw new Error('could not catch the flakes in time');
}

test('Paktolos: catch seven flakes, Alyat appears, the card gives the first coin piece', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the game is made for big screens; phones are not tested for Sardes');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
  });
  const shot = (name: string) => page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/s-${name}.png` });

  await page.goto('/sardes/');
  await page.waitForFunction(() => (window as any).__game);
  await page.evaluate(() => document.fonts.ready);
  await shot('00-title');
  await page.click('#start');

  await readDialogue(page);
  await expect(page.locator('#goal')).toBeVisible();
  await shot('01-start');
  // light on empty water catches nothing
  const sky = await page.evaluate(() => (window as any).__game.toClient(800, 150));
  await page.mouse.move(sky.x, sky.y);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).__game.scene().caught)).toBe(0);

  await chaseFlakes(page, 3, shot);
  await page.waitForTimeout(600);
  await shot('03-three');
  await chaseFlakes(page, 7);
  // “Yedi altın pul!”, the debut (instant under reduced motion), then Alyat and Deniz talk
  await page.locator('#dialog').waitFor({ state: 'visible', timeout: 20_000 });
  let shotLion = false;
  for (let guard = 0; guard < 80 && !(await page.locator('#card').isVisible()); guard++) {
    if (!shotLion && (await page.evaluate(() => (window as any).__game.lion.on && (window as any).__game.lion.a > 0.95))) {
      shotLion = true;
      await shot('04-alyat');
    }
    if (await page.locator('#dialog').isVisible()) await page.locator('#next').click();
    await page.waitForTimeout(60);
  }
  expect(shotLion).toBe(true);
  await page.locator('#card').waitFor({ state: 'visible', timeout: 15_000 });
  await shot('05-card');
  await expect(page.locator('#cardTitle')).toHaveText('Paktolos Çayı');
  expect(await page.locator('#cardFacts p').count()).toBe(3);
  await page.locator('#cardGo').click();
  expect(errors).toEqual([]);
});

test.describe('debut with full motion', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the flakes swirl into Alyat', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'one viewport is enough for the frames');
    const shot = (name: string) => page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/s-${name}.png` });
    await page.goto('/sardes/');
    await page.waitForFunction(() => (window as any).__game);
    await page.click('#start');
    await readDialogue(page);
    await page.mouse.move(500, 600);
    // skip the puzzle: pretend all seven were caught
    await page.evaluate(() => {
      const s = (window as any).__game.scene();
      s.caught = 7;
      s.done();
    });
    await page.waitForTimeout(900);
    await readDialogue(page, { first: 5000 }); // the “seven” lines
    for (const [name, at] of [['10-vortex-a', 0.25], ['11-vortex-b', 0.7], ['12-flash', 0.99]] as const) {
      await page.waitForFunction((v) => (window as any).__game.scene().vortex >= v, at, { timeout: 15_000 });
      await shot(name);
    }
    await page.waitForFunction(() => (window as any).__game.lion.a > 0.5, null, { timeout: 8000 });
    await shot('13-lion-in');
  });
});
