import '@testing-library/jest-dom';

// Mock Canvas API with Phaser-compatible features
global.HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
  // Mock ImageData for Phaser's canvas feature detection
  const mockImageData = {
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  };

  return {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => mockImageData),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => mockImageData),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    translate: jest.fn(),
    transform: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    arc: jest.fn(),
    arcTo: jest.fn(),
    rect: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    clip: jest.fn(),
    isPointInPath: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    })),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    })),
    createPattern: jest.fn(),
    globalCompositeOperation: 'source-over',
    canvas: {
      width: 800,
      height: 600,
      style: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getAttribute: jest.fn(),
      setAttribute: jest.fn()
    }
  };
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock WebGL context for Phaser
global.WebGLRenderingContext = jest.fn();
global.WebGL2RenderingContext = jest.fn();

// Mock Image
global.Image = class {
  constructor() {
    this.src = '';
    this.onload = null;
  }
};

// Mock Audio
global.Audio = class {
  constructor() {
    this.src = '';
  }
  play() {}
  pause() {}
};

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = class {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});