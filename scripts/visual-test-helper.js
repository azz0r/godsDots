#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VisualTestHelper {
  constructor() {
    this.screenshotDir = path.join(__dirname, '..', 'e2e', 'screenshots');
    this.diffDir = path.join(__dirname, '..', 'e2e', 'screenshots-diff');
  }

  async ensureDirectories() {
    await fs.mkdir(this.screenshotDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  async updateBaselines() {
    console.log('📸 Updating visual test baselines...');
    
    try {
      execSync('npm run test:visual:update', { stdio: 'inherit' });
      console.log('✅ Baselines updated successfully!');
    } catch (error) {
      console.error('❌ Failed to update baselines:', error.message);
      process.exit(1);
    }
  }

  async runComparison() {
    console.log('🔍 Running visual comparison tests...');
    
    try {
      execSync('npm run test:visual', { stdio: 'inherit' });
      console.log('✅ All visual tests passed!');
    } catch (error) {
      console.log('❌ Visual differences detected!');
      await this.generateDiffReport();
    }
  }

  async generateDiffReport() {
    console.log('📊 Generating visual diff report...');
    
    const diffHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Visual Test Differences</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 40px;
    }
    .diff-section {
      background: white;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .diff-section h2 {
      color: #dc3545;
      margin-bottom: 20px;
    }
    .image-comparison {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    .image-container {
      text-align: center;
    }
    .image-container h3 {
      color: #495057;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .image-container img {
      width: 100%;
      height: auto;
      border: 2px solid #dee2e6;
      border-radius: 8px;
    }
    .expected {
      border-color: #28a745;
    }
    .actual {
      border-color: #dc3545;
    }
    .diff {
      border-color: #ffc107;
    }
    .controls {
      text-align: center;
      margin-top: 30px;
    }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      margin: 0 10px;
    }
    button:hover {
      background: #0056b3;
    }
    .overlay-container {
      position: relative;
      width: 100%;
      height: 400px;
      overflow: hidden;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      margin: 20px 0;
    }
    .overlay-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .slider {
      width: 100%;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Visual Test Differences</h1>
    
    <div class="diff-section">
      <h2>Screenshot Comparisons</h2>
      <p>The following screenshots have differences from the baseline:</p>
      
      <!-- This would be populated dynamically with actual diff data -->
      <div class="image-comparison">
        <div class="image-container">
          <h3>Expected (Baseline)</h3>
          <img class="expected" src="placeholder-expected.png" alt="Expected">
        </div>
        <div class="image-container">
          <h3>Actual</h3>
          <img class="actual" src="placeholder-actual.png" alt="Actual">
        </div>
        <div class="image-container">
          <h3>Difference</h3>
          <img class="diff" src="placeholder-diff.png" alt="Difference">
        </div>
      </div>
      
      <div class="overlay-container">
        <img class="overlay-image" id="expected-overlay" src="placeholder-expected.png" style="opacity: 1;">
        <img class="overlay-image" id="actual-overlay" src="placeholder-actual.png" style="opacity: 0;">
      </div>
      
      <input type="range" class="slider" id="opacity-slider" min="0" max="100" value="0">
      <p style="text-align: center;">Slide to compare Expected vs Actual</p>
    </div>
    
    <div class="controls">
      <button onclick="acceptChanges()">✅ Accept Changes</button>
      <button onclick="rejectChanges()">❌ Reject Changes</button>
      <button onclick="viewPlaywrightReport()">📊 View Full Report</button>
    </div>
  </div>
  
  <script>
    const slider = document.getElementById('opacity-slider');
    const actualOverlay = document.getElementById('actual-overlay');
    
    slider.addEventListener('input', (e) => {
      actualOverlay.style.opacity = e.target.value / 100;
    });
    
    function acceptChanges() {
      if (confirm('Are you sure you want to accept these visual changes?')) {
        window.location.href = '?action=accept';
      }
    }
    
    function rejectChanges() {
      if (confirm('Are you sure you want to reject these visual changes?')) {
        window.location.href = '?action=reject';
      }
    }
    
    function viewPlaywrightReport() {
      window.open('playwright-report/index.html', '_blank');
    }
  </script>
</body>
</html>
    `;
    
    await fs.writeFile(path.join(__dirname, '..', 'visual-diff-report.html'), diffHTML);
    console.log('📄 Visual diff report generated: visual-diff-report.html');
  }

  async cleanupOldScreenshots() {
    console.log('🧹 Cleaning up old screenshots...');
    
    try {
      const files = await fs.readdir(this.diffDir);
      for (const file of files) {
        if (file.endsWith('-diff.png') || file.endsWith('-actual.png')) {
          await fs.unlink(path.join(this.diffDir, file));
        }
      }
      console.log('✅ Cleanup completed!');
    } catch (error) {
      console.error('⚠️  Cleanup failed:', error.message);
    }
  }

  async showHelp() {
    console.log(`
🎮 God Dots Visual Test Helper

Usage: node scripts/visual-test-helper.js [command]

Commands:
  update     Update visual test baselines
  compare    Run visual comparison tests
  clean      Clean up old diff screenshots
  help       Show this help message

Examples:
  node scripts/visual-test-helper.js update
  node scripts/visual-test-helper.js compare
    `);
  }

  async run() {
    const command = process.argv[2] || 'help';
    
    await this.ensureDirectories();
    
    switch (command) {
      case 'update':
        await this.updateBaselines();
        break;
      case 'compare':
        await this.runComparison();
        break;
      case 'clean':
        await this.cleanupOldScreenshots();
        break;
      case 'help':
      default:
        await this.showHelp();
    }
  }
}

// Run the helper
const helper = new VisualTestHelper();
helper.run().catch(error => {
  console.error('❌ Visual test helper failed:', error);
  process.exit(1);
});