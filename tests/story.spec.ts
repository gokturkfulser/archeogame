/* The story frame: map hub → opening scene (find the old book) → book → map with Efes open → Efes → coin on the map.
   Runs per viewport project. Uses the DEV-only `window.__game` hook in the acts. */
import { expect, Page, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function readDialogue(page: Page, { first = 20_000 } = {}) {
  await page.locator('#dialog').waitFor({ state: 'visible', timeout: first });
  for (let guard = 0; guard < 40; guard++) {
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

async function moveLampTo(page: Page, x: number, y: number) {
  const c = await page.evaluate((p) => (window as any).__game.toClient(p.x, p.y), { x, y });
  await page.mouse.move(c.x, c.y, { steps: 6 });
  await page.waitForFunction(([wx, wy]) => {
    const l = (window as any).__game.lamp;
    return Math.hypot(l.x - wx, l.y - wy) < 25;
  }, [x, y]);
}

test('fresh visit: the map shows every city, all sealed until the book is found', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#cities .city')).toHaveCount(15);
  await expect(page.locator('#startCard')).toBeVisible();
  await expect(page.locator('#bookBtn')).toBeHidden();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/20-hub-fresh.png` });

  // a sealed city only shows a message
  await page.getByRole('button', { name: /Hierapolis/ }).click();
  await expect(page.locator('#toast')).toContainText('Hierapolis henüz açılmadı');
  // Efes is playable but needs the book first
  await page.getByRole('button', { name: /Efes:/ }).click();
  await expect(page.locator('#toast')).toContainText('Önce eski kitabı bulmalısın');
  expect(page.url()).not.toContain('/efes/');

  // markers sit on the map: Efes on the Aegean coast (left, a bit below the middle), Zeugma far to the right
  const pos = async (id: string) => page.locator(`.city[data-city="${id}"]`).evaluate((el) => ({ x: parseFloat((el as HTMLElement).style.left), y: parseFloat((el as HTMLElement).style.top) }));
  const efes = await pos('efes');
  const zeugma = await pos('zeugma');
  const troya = await pos('troya');
  expect(efes.x).toBeLessThan(25);
  expect(zeugma.x).toBeGreaterThan(55);
  expect(troya.y).toBeLessThan(efes.y); // Troya is north of Efes
});

test('opening scene: find the book with the flashlight, read it, land on the map with Efes open', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
  });
  const shot = (name: string) => page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/${name}.png` });

  await page.goto('/baslangic/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as any).__game);
  await page.evaluate(() => document.fonts.ready);
  await shot('21-prologue-title');
  await page.click('#start');
  await readDialogue(page);
  await shot('22-prologue-dark');

  await moveLampTo(page, 600, 600); // away from the book: touching it must not work
  await moveLampTo(page, 1130, 382);
  await shot('23-prologue-found');
  await page.getByRole('button', { name: 'Masanın üstünde parlayan kitap' }).click();
  await readDialogue(page); // “Bu bir kitap!”

  // the book opens: grandfather’s note, then the Efes page
  await expect(page.locator('.bk-overlay')).toBeVisible();
  await shot('24-book-note');
  await page.getByRole('button', { name: 'Sonraki sayfa' }).click();
  await expect(page.locator('.bk-right h2')).toHaveText('Efes');
  await shot('25-book-efes');
  await page.getByRole('button', { name: 'Sonraki sayfa' }).click();
  await expect(page.locator('.bk-seal').first()).toContainText('mühürlü');
  await shot('26-book-sealed');
  await page.getByRole('button', { name: 'Kitabı kapat' }).click();
  await readDialogue(page); // Deniz sees the bee, then “Haritaya bakma zamanı”

  // back on the map: the book is found, Efes is open
  await page.waitForURL((u) => u.pathname === '/', { timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#startCard')).toBeHidden();
  await expect(page.locator('#bookBtn')).toBeVisible();
  await expect(page.locator('.city.open')).toHaveCount(2); // Efes and Hattuşa are playable
  await page.waitForTimeout(500);
  await shot('27-hub-book-found');

  // the book is also reachable from the map
  await page.locator('#bookBtn').click();
  await expect(page.locator('.bk-overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Kitabı kapat' }).click();

  // Efes opens
  await page.getByRole('button', { name: /Efes:/ }).click();
  await page.waitForURL('**/efes/');
  expect(errors).toEqual([]);
});

test('finishing Efes puts its coin on the map and in the book', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('ppa.progress.v1', JSON.stringify({ book: true, done: ['efes'] })));
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.city.done')).toHaveCount(1);
  await expect(page.locator('#count')).toContainText('1 / 15');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/28-hub-efes-done.png` });
  await page.locator('#bookBtn').click();
  await expect(page.locator('.bk-grid img.lit')).toHaveCount(1);
  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/29-book-progress.png` });
});
