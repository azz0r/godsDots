import { test, expect } from '@playwright/test';

test('capture JavaScript errors', async ({ page }) => {
  const consoleMessages = [];
  const jsErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      console.log(`CONSOLE ERROR: ${text}`);
    }
  });

  page.on('pageerror', error => {
    const errorInfo = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
    jsErrors.push(errorInfo);
    console.log(`\n=== PAGE ERROR ===`);
    console.log(`Name: ${error.name}`);
    console.log(`Message: ${error.message}`);
    console.log(`Stack:\n${error.stack}`);
  });

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('Page loaded successfully');

    await page.waitForTimeout(3000);

    // Check if game initialized
    const gameState = await page.evaluate(() => {
      return {
        hasGame: !!window.phaserGame,
        hasCanvas: !!document.querySelector('canvas'),
        gameScenes: window.phaserGame?.scene?.scenes?.length || 0
      };
    });

    console.log('\n=== Game State ===');
    console.log(JSON.stringify(gameState, null, 2));

  } catch (error) {
    console.log(`\n=== Test Error ===`);
    console.log(error.message);

    if (jsErrors.length > 0) {
      console.log(`\n=== Found ${jsErrors.length} JavaScript Errors ===`);
      jsErrors.forEach((err, i) => {
        console.log(`\nError ${i + 1}:`);
        console.log(`  Name: ${err.name}`);
        console.log(`  Message: ${err.message}`);
      });
    }
  }
});
