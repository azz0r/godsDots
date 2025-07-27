#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, duration: 0 },
      integration: { passed: 0, failed: 0, duration: 0 },
      visual: { passed: 0, failed: 0, duration: 0 },
      performance: { passed: 0, failed: 0, duration: 0 },
      timestamp: new Date().toISOString()
    };
  }

  async runCommand(command, args = [], label = '') {
    console.log(`\n🚀 Running ${label}...`);
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const proc = spawn(command, args, { 
        stdio: 'inherit',
        shell: true 
      });
      
      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        console.log(`${success ? '✅' : '❌'} ${label} completed in ${duration}ms`);
        resolve({ success, duration, code });
      });
    });
  }

  async runUnitTests() {
    const result = await this.runCommand('npm', ['test', '--', '--testPathPattern=__tests__', '--coverage'], 'Unit Tests');
    this.results.unit.duration = result.duration;
    if (result.success) {
      this.results.unit.passed = 1;
    } else {
      this.results.unit.failed = 1;
    }
  }

  async runIntegrationTests() {
    const result = await this.runCommand('npm', ['test', '--', '--testPathPattern=integration'], 'Integration Tests');
    this.results.integration.duration = result.duration;
    if (result.success) {
      this.results.integration.passed = 1;
    } else {
      this.results.integration.failed = 1;
    }
  }

  async runPerformanceTests() {
    const result = await this.runCommand('npm', ['test', '--', '--testPathPattern=performance'], 'Performance Tests');
    this.results.performance.duration = result.duration;
    if (result.success) {
      this.results.performance.passed = 1;
    } else {
      this.results.performance.failed = 1;
    }
  }

  async runVisualTests() {
    const result = await this.runCommand('npx', ['playwright', 'test'], 'Visual Regression Tests');
    this.results.visual.duration = result.duration;
    if (result.success) {
      this.results.visual.passed = 1;
    } else {
      this.results.visual.failed = 1;
    }
  }

  async generateHTMLReport() {
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>God Dots Test Report - ${new Date().toLocaleDateString()}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .test-suite {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }
    .test-suite.passed {
      border-left-color: #28a745;
    }
    .test-suite.failed {
      border-left-color: #dc3545;
    }
    .test-suite h3 {
      margin: 0 0 10px;
      color: #495057;
    }
    .metrics {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status {
      font-size: 24px;
      font-weight: bold;
    }
    .status.passed {
      color: #28a745;
    }
    .status.failed {
      color: #dc3545;
    }
    .duration {
      color: #6c757d;
      font-size: 14px;
    }
    .visual-diff {
      margin-top: 40px;
    }
    .visual-diff h2 {
      color: #333;
      margin-bottom: 20px;
    }
    .diff-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .diff-item {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .diff-item img {
      width: 100%;
      height: auto;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      margin-top: 10px;
    }
    .timestamp {
      color: #6c757d;
      font-size: 14px;
      margin-top: 40px;
      text-align: center;
    }
    .overall-status {
      text-align: center;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: bold;
    }
    .overall-status.passed {
      background: #d4edda;
      color: #155724;
    }
    .overall-status.failed {
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎮 God Dots Test Report</h1>
    
    <div class="overall-status ${this.isAllPassed() ? 'passed' : 'failed'}">
      ${this.isAllPassed() ? '✅ All Tests Passed!' : '❌ Some Tests Failed'}
    </div>
    
    <div class="summary">
      ${this.generateTestSuiteHTML('Unit Tests', this.results.unit)}
      ${this.generateTestSuiteHTML('Integration Tests', this.results.integration)}
      ${this.generateTestSuiteHTML('Visual Tests', this.results.visual)}
      ${this.generateTestSuiteHTML('Performance Tests', this.results.performance)}
    </div>
    
    <div class="visual-diff">
      <h2>📸 Visual Regression Results</h2>
      <div class="diff-grid">
        <div class="diff-item">
          <h4>Main Menu</h4>
          <a href="playwright-report/index.html">View Playwright Report</a>
        </div>
      </div>
    </div>
    
    <div class="timestamp">
      Generated on ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
    `;

    await fs.writeFile(path.join(__dirname, 'test-report.html'), reportHTML);
    console.log('\n📊 HTML report generated: test-report.html');
  }

  generateTestSuiteHTML(name, suite) {
    const passed = suite.passed > 0 && suite.failed === 0;
    return `
      <div class="test-suite ${passed ? 'passed' : 'failed'}">
        <h3>${name}</h3>
        <div class="metrics">
          <span class="status ${passed ? 'passed' : 'failed'}">
            ${passed ? '✅ PASS' : '❌ FAIL'}
          </span>
          <span class="duration">${(suite.duration / 1000).toFixed(2)}s</span>
        </div>
      </div>
    `;
  }

  isAllPassed() {
    return Object.values(this.results)
      .filter(r => typeof r === 'object' && r.failed !== undefined)
      .every(r => r.failed === 0 && r.passed > 0);
  }

  async generateJSONReport() {
    await fs.writeFile(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(this.results, null, 2)
    );
    console.log('📄 JSON report generated: test-results.json');
  }

  async run() {
    console.log('🧪 Starting God Dots Test Suite...\n');
    
    // Run tests in sequence to avoid resource conflicts
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runPerformanceTests();
    await this.runVisualTests();
    
    // Generate reports
    await this.generateHTMLReport();
    await this.generateJSONReport();
    
    // Summary
    console.log('\n📈 Test Summary:');
    console.log('================');
    Object.entries(this.results).forEach(([suite, result]) => {
      if (typeof result === 'object' && result.passed !== undefined) {
        const status = result.failed === 0 ? '✅' : '❌';
        console.log(`${status} ${suite}: ${result.passed} passed, ${result.failed} failed (${(result.duration / 1000).toFixed(2)}s)`);
      }
    });
    
    // Exit with appropriate code
    const allPassed = this.isAllPassed();
    console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'}`);
    process.exit(allPassed ? 0 : 1);
  }
}

// Run the test suite
const runner = new TestRunner();
runner.run().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});