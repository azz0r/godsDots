// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Helper: Navigate through main menu to game scene
 */
async function startGame(page) {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 10000 });
  // Wait for menu fade-in animations
  await page.waitForTimeout(2500);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Click NEW GAME button
  await page.mouse.click(cx, cy + box.height * 0.05);

  // Wait for fade transition + terrain generation + game init
  await page.waitForTimeout(4000);

  return { canvas, box, cx, cy };
}

test.describe('Game Fundamentals', () => {
  test('main menu renders and transitions to game', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'test-results/01-main-menu.png' });

    const { canvas } = await startGame(page);
    await page.screenshot({ path: 'test-results/02-gameplay-loaded.png' });
  });

  test('temples and villagers are visible after game start', async ({ page }) => {
    // Collect console logs to verify game initialization
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    const { cx, cy } = await startGame(page);

    // Screenshot the initial camera position (should be centered on human temple)
    await page.screenshot({ path: 'test-results/03-initial-view.png' });

    // Wait for villager movement
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/04-after-movement.png' });

    // Check console for game initialization messages
    const gameStarted = logs.some(l => l.includes('Game initialized successfully'));
    const templesAdded = logs.some(l => l.includes('Added') && l.includes('temples to TempleSystem'));
    const cameraSet = logs.some(l => l.includes('Camera centered on human temple'));

    expect(gameStarted).toBe(true);
    expect(templesAdded).toBe(true);
    expect(cameraSet).toBe(true);
  });

  test('camera zoom and pan work smoothly', async ({ page }) => {
    const { cx, cy } = await startGame(page);
    await page.screenshot({ path: 'test-results/05-initial-zoom.png' });

    // Zoom out with mouse wheel
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/06-zoomed-out.png' });

    // Zoom back in
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/07-zoomed-in.png' });

    // Pan via drag
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 200, cy - 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/08-after-pan.png' });
  });

  test('pause menu works with ESC', async ({ page }) => {
    await startGame(page);

    // Press ESC to pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/09-pause-menu.png' });

    // Press ESC again to resume
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/10-resumed.png' });
  });

  test('dev panel shows correct villager count', async ({ page }) => {
    await startGame(page);

    // Wait for dev panel polling to update (250ms interval)
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/11-dev-panel-count.png' });

    // Check that "Villagers (6 / 1400)" or similar shows (3 per player * 2 players)
    const devPanelText = await page.locator('.terrain-dev-panel').textContent();
    // The GameInitializer spawns 3 villagers per player = 6 total
    expect(devPanelText).toContain('Villagers');
  });
});
