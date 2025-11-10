/**
 * Playwright script to debug camera/terrain alignment issues - Console logs only
 */
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Listen to ALL console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  // Navigate to the game
  console.log('========== LOADING GAME ==========');
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('Page loaded and network idle');
  } catch (e) {
    console.error('Failed to load page:', e.message);
  }

  // Wait longer for game to initialize
  console.log('Waiting for game initialization (10s)...');
  await page.waitForTimeout(10000);

  // Check if game canvas exists
  const canvasExists = await page.locator('canvas').count();
  console.log('Canvas elements found:', canvasExists);

  console.log('\n========== ALL CONSOLE LOGS ==========');
  logs.forEach((log, i) => console.log(`${i + 1}:`, log));

  // Filter for relevant logs
  const mainSceneLogs = logs.filter(log => log.includes('[MainScene]'));
  const cameraLogs = logs.filter(log => log.includes('[CameraControl]'));

  console.log('\n========== MAINSCENE LOGS ==========');
  mainSceneLogs.forEach(log => console.log(log));

  console.log('\n========== CAMERA LOGS ==========');
  cameraLogs.forEach(log => console.log(log));

  await browser.close();
})();
