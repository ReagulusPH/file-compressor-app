// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

/**
 * Test setup for Jest
 * This file sets up mocks and polyfills needed for testing
 */

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock createImageBitmap
global.createImageBitmap = jest.fn(() =>
  Promise.resolve({
    width: 100,
    height: 100,
    close: jest.fn(),
  })
);

// Import and setup Canvas API mocks
import { setupCanvasMocks } from './mocks/canvasMock';
setupCanvasMocks();

// Fix for React 19 testing compatibility
// This is needed because React 19 uses a different rendering approach
// that conflicts with how JSDOM handles elements
import { configure } from '@testing-library/react';

// Configure testing library for React 19
configure({
  // Use a custom container to avoid JSDOM issues with React 19
  testIdAttribute: 'data-testid',
});

// Ensure document.createElement returns proper canvas elements
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tagName) {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement(tagName) as HTMLCanvasElement;
    canvas.width = 100;
    canvas.height = 100;
    
    // Ensure getContext is properly mocked
    canvas.getContext = jest.fn((contextType) => {
      if (contextType === '2d') {
        return {
          fillRect: jest.fn(),
          clearRect: jest.fn(),
          getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(100 * 100 * 4),
            width: 100,
            height: 100,
          })),
          putImageData: jest.fn(),
          createImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(100 * 100 * 4),
            width: 100,
            height: 100,
          })),
          setTransform: jest.fn(),
          drawImage: jest.fn(),
          save: jest.fn(),
          fillText: jest.fn(),
          restore: jest.fn(),
          beginPath: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          closePath: jest.fn(),
          stroke: jest.fn(),
          translate: jest.fn(),
          scale: jest.fn(),
          rotate: jest.fn(),
          arc: jest.fn(),
          fill: jest.fn(),
          measureText: jest.fn(() => ({ width: 0 })),
          transform: jest.fn(),
          rect: jest.fn(),
          clip: jest.fn(),
          canvas,
        };
      }
      return null;
    });
    
    canvas.toBlob = jest.fn((callback, type = 'image/png', quality = 0.92) => {
      const blob = new Blob(['mock-canvas-data'], { type });
      if (callback) {
        setTimeout(() => callback(blob), 0);
      }
    });
    
    canvas.toDataURL = jest.fn(() => 'data:image/png;base64,mock-data');
    
    return canvas;
  }
  return originalCreateElement(tagName);
};

// Import and setup Worker mocks
import { setupWorkerMocks } from './mocks/workerMock';
setupWorkerMocks();

// Mock import.meta for worker URLs
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      url: 'file:///',
    }
  },
  writable: true,
});

// Also define it on globalThis for broader compatibility
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'import', {
    value: {
      meta: {
        url: 'file:///',
      }
    },
    writable: true,
  });
}

// Mock FileReader
global.FileReader = class MockFileReader {
  constructor() {
    this.readAsArrayBuffer = jest.fn();
    this.readAsDataURL = jest.fn();
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }

  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock-data';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
};

// Mock performance.memory for memory monitoring tests
Object.defineProperty(window.performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
});

// Mock navigator.userAgent for browser detection tests
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
});

// Mock fetch for network tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
  })
);

// Mock WebAssembly
global.WebAssembly = {
  instantiate: jest.fn(() => Promise.resolve({})),
  compile: jest.fn(() => Promise.resolve({})),
};

// Mock indexedDB
global.indexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: jest.fn(),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
        })),
      })),
    },
  })),
};

// Suppress console errors for cleaner test output
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('A suspended resource finished loading') ||
        args[0].includes('Not implemented: HTMLCanvasElement.prototype.getContext'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});
