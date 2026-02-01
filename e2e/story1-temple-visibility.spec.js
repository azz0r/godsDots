import { test, expect } from '@playwright/test';

test.describe('Story 1: Temple Rendering Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console messages for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('TempleSystem') || text.includes('GameInitializer') || text.includes('temple')) {
        console.log(`BROWSER: ${text}`);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for game initialization
  });

  test('should spawn 2 temples with correct properties', async ({ page }) => {
    const templeData = await page.evaluate(() => {
      const game = window.phaserGame;
      if (!game) return { error: 'No game instance' };

      const scene = game.scene.scenes[0];
      if (!scene) return { error: 'No scene' };

      return {
        templeSystemExists: !!scene.templeSystem,
        templeCount: scene.templeSystem?.temples?.length || 0,
        temples: scene.templeSystem?.temples?.map(t => ({
          id: t.id,
          playerId: t.playerId,
          position: t.position,
          playerColor: t.playerColor,
          level: t.level
        })) || []
      };
    });

    console.log('Temple Data:', JSON.stringify(templeData, null, 2));

    expect(templeData.templeSystemExists).toBe(true);
    expect(templeData.templeCount).toBe(2);
    expect(templeData.temples).toHaveLength(2);

    // Verify human player temple (blue)
    const humanTemple = templeData.temples.find(t => t.playerId === 'player_human');
    expect(humanTemple).toBeDefined();
    expect(humanTemple.playerColor).toBe(0x4169E1); // Blue

    // Verify AI player temple (orange)
    const aiTemple = templeData.temples.find(t => t.playerId === 'player_ai_1');
    expect(aiTemple).toBeDefined();
    expect(aiTemple.playerColor).toBe(0xFF4500); // Orange
  });

  test('should have temple graphics object with correct depth', async ({ page }) => {
    const graphicsData = await page.evaluate(() => {
      const game = window.phaserGame;
      const scene = game.scene.scenes[0];

      if (!scene.templeSystem) return { error: 'No temple system' };

      const graphics = scene.templeSystem.templesGraphics;

      return {
        exists: !!graphics,
        depth: graphics?.depth,
        visible: graphics?.visible,
        active: graphics?.active,
        displayListLength: scene.children?.list?.length || 0
      };
    });

    console.log('Graphics Data:', JSON.stringify(graphicsData, null, 2));

    expect(graphicsData.exists).toBe(true);
    expect(graphicsData.depth).toBe(50); // Between terrain (0) and villagers (100)
    expect(graphicsData.visible).toBe(true);
    expect(graphicsData.active).toBe(true);
  });

  test('should place temples within camera view on spawn', async ({ page }) => {
    const viewData = await page.evaluate(() => {
      const game = window.phaserGame;
      const scene = game.scene.scenes[0];
      const camera = scene.cameras.main;
      const TILE_SIZE = 4;

      const temples = scene.templeSystem.temples.map(t => ({
        id: t.id,
        tilePos: t.position,
        pixelPos: {
          x: t.position.x * TILE_SIZE,
          y: t.position.y * TILE_SIZE
        }
      }));

      const cameraView = {
        left: camera.scrollX,
        right: camera.scrollX + camera.width,
        top: camera.scrollY,
        bottom: camera.scrollY + camera.height,
        centerX: camera.scrollX + camera.width / 2,
        centerY: camera.scrollY + camera.height / 2,
        zoom: camera.zoom
      };

      const inView = temples.map(temple => {
        const inX = temple.pixelPos.x >= cameraView.left && temple.pixelPos.x <= cameraView.right;
        const inY = temple.pixelPos.y >= cameraView.top && temple.pixelPos.y <= cameraView.bottom;
        return {
          ...temple,
          inView: inX && inY,
          distanceFromCenter: Math.sqrt(
            Math.pow(temple.pixelPos.x - cameraView.centerX, 2) +
            Math.pow(temple.pixelPos.y - cameraView.centerY, 2)
          )
        };
      });

      return {
        camera: cameraView,
        temples: inView
      };
    });

    console.log('View Data:', JSON.stringify(viewData, null, 2));

    // At least one temple should be in camera view
    const templesInView = viewData.temples.filter(t => t.inView);
    expect(templesInView.length).toBeGreaterThan(0);
  });

  test('should render temples each frame', async ({ page }) => {
    // Wait for a few frames to ensure rendering happens
    await page.waitForTimeout(1000);

    const renderData = await page.evaluate(() => {
      const game = window.phaserGame;
      const scene = game.scene.scenes[0];
      const templeSystem = scene.templeSystem;

      // Manually trigger render to ensure it happens
      templeSystem.renderTemples();

      // Check if graphics object has drawn data
      const graphics = templeSystem.templesGraphics;

      return {
        templeCount: templeSystem.temples.length,
        graphicsExists: !!graphics,
        // Phaser Graphics objects have internal path data
        hasData: graphics && graphics._displayOriginX !== undefined
      };
    });

    console.log('Render Data:', JSON.stringify(renderData, null, 2));

    expect(renderData.templeCount).toBe(2);
    expect(renderData.graphicsExists).toBe(true);
  });

  test('should pan camera to human temple location', async ({ page }) => {
    // Get human temple position
    const templePos = await page.evaluate(() => {
      const game = window.phaserGame;
      const scene = game.scene.scenes[0];
      const humanTemple = scene.templeSystem.temples.find(t => t.playerId === 'player_human');
      const TILE_SIZE = 4;

      return {
        tile: humanTemple.position,
        pixel: {
          x: humanTemple.position.x * TILE_SIZE + TILE_SIZE / 2,
          y: humanTemple.position.y * TILE_SIZE + TILE_SIZE / 2
        }
      };
    });

    console.log('Human temple position:', templePos);

    // Pan camera to temple
    await page.evaluate((pos) => {
      const game = window.phaserGame;
      const scene = game.scene.scenes[0];
      const camera = scene.cameras.main;

      // Center camera on temple
      camera.centerOn(pos.pixel.x, pos.pixel.y);
      camera.setZoom(2); // Zoom in to see it better
    }, templePos);

    await page.waitForTimeout(500);

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/temple-visibility.png',
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 720
      }
    });

    // Verify camera is centered on temple
    const cameraData = await page.evaluate((pos) => {
      const game = window.phaserGame;
      const scene = game.scene.scenes[0];
      const camera = scene.cameras.main;

      const centerX = camera.scrollX + camera.width / 2;
      const centerY = camera.scrollY + camera.height / 2;

      return {
        cameraCenter: { x: centerX, y: centerY },
        templePixel: pos.pixel,
        distanceFromCenter: Math.sqrt(
          Math.pow(centerX - pos.pixel.x, 2) +
          Math.pow(centerY - pos.pixel.y, 2)
        )
      };
    }, templePos);

    console.log('Camera Data:', cameraData);

    // Camera should be very close to temple (within 10 pixels)
    expect(cameraData.distanceFromCenter).toBeLessThan(10);
  });
});
