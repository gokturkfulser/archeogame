/* Play-through of Act 1 (all four scenes and the finale) with screenshots.
   Runs once per viewport project: desktop 1440×810 and phone 844×390.
   Uses the DEV-only `window.__game` hook to read puzzle state and to convert world to screen coordinates. */
import { expect, Page, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Click through every dialogue line. A short grace period catches dialogues that queue up right after one another. */
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

test('plays through Efes: lamp, melody, statues, shadows, finale', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
  });
  const shot = (name: string) => page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/${name}.png` });

  await page.goto('/efes/');
  await page.waitForFunction(() => (window as any).__game);
  await page.evaluate(() => document.fonts.ready);
  await shot('00-title');
  await page.click('#start');

  /* ---- I. Liman Caddesi: reveal the bee carving with the lamp ---- */
  await readDialogue(page);
  await expect(page.locator('#goal')).toBeVisible();
  await shot('01-liman-start');
  await moveLampTo(page, 600, 700); // too far from the carving: touching it must not work yet
  await moveLampTo(page, 1210, 606);
  await shot('02-liman-reveal');
  const deniz = await page.evaluate(() => {
    const d = (window as any).__game.deniz;
    return { x: d.x as number, face: d.face as number };
  });
  expect(deniz.face).toBe(1); // she stands left of the lamp, facing it
  expect(deniz.x).toBeLessThan(1210);
  await page.getByRole('button', { name: 'Kırık sütundaki gizli işaret' }).click();
  await readDialogue(page); // Melissa wakes; Deniz answers
  await expect(page.locator('#card')).toBeVisible();
  await shot('03-liman-card');
  await page.click('#cardGo');

  /* ---- II. Büyük Tiyatro: echo the melody (a wrong answer is replayed once) ---- */
  await readDialogue(page);
  for (const [round, len] of [[0, 4], [1, 5]] as const) {
    await page.waitForFunction((n) => {
      const s = (window as any).__game.scene();
      return s.id === 'tiyatro' && s.currentSeq.length === n && s.input !== null;
    }, len);
    let seq: number[] = await page.evaluate(() => [...(window as any).__game.scene().currentSeq] as number[]);
    if (round === 0) {
      await shot('04-tiyatro-melody');
      await page.keyboard.press(String(((seq[0] + 1) % 5) + 1)); // wrong on purpose
      await expect(page.locator('#dialog')).toContainText('Yankı karıştı');
      await readDialogue(page);
      await page.waitForFunction(() => (window as any).__game.scene().input !== null);
      seq = await page.evaluate(() => [...(window as any).__game.scene().currentSeq] as number[]);
    }
    for (const b of seq) {
      await page.keyboard.press(String(b + 1));
      await page.waitForTimeout(60);
    }
    if (round === 0) await readDialogue(page); // “Harika!”
  }
  await readDialogue(page); // solved: Melissa, then Deniz
  await expect(page.locator('#card')).toBeVisible();
  await shot('05-tiyatro-card');
  await page.click('#cardGo');

  /* ---- III. Celsus Kütüphanesi: statues into the niches (one swap fixes a wrong try) ---- */
  await readDialogue(page);
  await expect(page.locator('#tray')).toBeVisible();
  await moveLampTo(page, 650, 700);
  await shot('06-kutuphane-letters');
  const put = async (statue: number, niche: number) => {
    await page.locator(`.statue[data-i="${statue}"]`).click();
    await page.getByRole('button', { name: `Soldan ${niche + 1}. niş` }).click();
  };
  await put(1, 0);
  await put(0, 1);
  await put(2, 2);
  await put(3, 3); // all filled, first two swapped
  await expect(page.locator('#dialog')).toContainText('yanlış yerde');
  await readDialogue(page);
  await shot('07-kutuphane-wrong');
  await page.getByRole('button', { name: 'Soldan 1. niş' }).click(); // pick the statue up…
  await page.getByRole('button', { name: 'Soldan 2. niş' }).click(); // …and swap
  await readDialogue(page); // solved: Deniz, then Melissa
  await expect(page.locator('#card')).toBeVisible();
  await shot('08-kutuphane-card');
  await page.click('#cardGo');

  /* ---- IV. Artemis Tapınağı: bring the lamp to the east spot ---- */
  await readDialogue(page);
  await shot('09-artemis-start');
  await moveLampTo(page, 900, 450);
  await shot('10-artemis-near');
  await moveLampTo(page, 1245, 205);
  await page.waitForFunction(() => (window as any).__game.scene().solved === true, null, { timeout: 15_000 });
  await page.waitForTimeout(2200); // let the golden light ramp up
  await shot('11-artemis-solved');
  await readDialogue(page);
  await expect(page.locator('#card')).toBeVisible();
  await page.click('#cardGo');

  /* ---- finale: Melissa's closing lines, then the act-ending film, skipped, then the map ---- */
  await readDialogue(page);
  await expect(page.locator('.film-box')).toBeVisible({ timeout: 15_000 });
  await shot('12-ending-film');
  await page.waitForTimeout(3300); // the film ignores skip input for its first 3 seconds
  await page.keyboard.press('Enter');
  await page.waitForURL('**/', { timeout: 15_000 });

  expect(errors).toEqual([]);
});

test('image layers (WebP with alpha) build next to code-drawn layers, with their own depth', async ({ page }, testInfo) => {
  await page.goto('/efes/');
  await page.waitForFunction(() => (window as any).__game);
  await page.click('#start');
  await page.locator('#dialog').waitFor({ state: 'visible', timeout: 20_000 });
  const result = await page.evaluate(async () => {
    const g = (window as any).__game;
    // A WebP with a transparent hole, made in the page.
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 180;
    const x = c.getContext('2d')!;
    x.fillStyle = '#1e8c88';
    x.fillRect(0, 0, 320, 180);
    x.clearRect(110, 40, 100, 100);
    const url = c.toDataURL('image/webp');
    const sc = g.scene();
    const layer: any = { d: 0.7, image: url, rect: [500, 300, 640, 360] };
    const before = sc.layers.length;
    sc.layers.splice(2, 0, layer);
    await g.rebuildLayers();
    return {
      isImage: layer.c instanceof HTMLImageElement,
      hasShadow: !!layer.sh,
      added: sc.layers.length - before,
    };
  });
  expect(result).toEqual({ isImage: true, hasShadow: true, added: 1 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}/image-layer.png` });
});

test('keyboard moves the lamp and Enter advances dialogue', async ({ page }) => {
  await page.goto('/efes/');
  await page.waitForFunction(() => (window as any).__game);
  await page.click('#start');
  await page.locator('#dialog').waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('body').focus();
  const before = await page.evaluate(() => (window as any).__game.lamp.tx as number);
  await page.keyboard.press('Enter'); // advances (focus is not on the button)
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const after = await page.evaluate(() => (window as any).__game.lamp.tx as number);
  expect(after).toBe(before + 60);
});
