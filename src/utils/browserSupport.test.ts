import {
  detectBrowserFeatures,
  checkBrowserCompatibility,
  getBrowserCompatibilityMessage,
  getBrowserInfo,
  BrowserCompatibility,
} from './browserSupport';

// Mock window and navigator objects
const mockWindow = { ...window };
const mockNavigator = { ...navigator };

describe('Browser Support Utilities', () => {
  // Restore original window and navigator after each test
  afterEach(() => {
    Object.defineProperty(global, 'window', { value: mockWindow });
    Object.defineProperty(global, 'navigator', { value: mockNavigator });
  });

  test('detectBrowserFeatures should return an object with feature detection results', () => {
    const features = detectBrowserFeatures();

    // Check that all expected properties exist
    expect(features).toHaveProperty('webWorkers');
    expect(features).toHaveProperty('webGL');
    expect(features).toHaveProperty('canvas');
    expect(features).toHaveProperty('fileAPI');
    expect(features).toHaveProperty('webAssembly');
    expect(features).toHaveProperty('sharedArrayBuffer');
    expect(features).toHaveProperty('indexedDB');
    expect(features).toHaveProperty('webRTC');
    expect(features).toHaveProperty('mediaRecorder');
    expect(features).toHaveProperty('serviceWorker');

    // All properties should be booleans
    Object.values(features).forEach(value => {
      expect(typeof value).toBe('boolean');
    });
  });

  test('checkBrowserCompatibility should return compatibility status', () => {
    const compatibility = checkBrowserCompatibility();

    expect(compatibility).toHaveProperty('isCompatible');
    expect(compatibility).toHaveProperty('missingFeatures');
    expect(compatibility).toHaveProperty('partialSupport');

    expect(typeof compatibility.isCompatible).toBe('boolean');
    expect(Array.isArray(compatibility.missingFeatures)).toBe(true);
    expect(typeof compatibility.partialSupport).toBe('boolean');
  });

  test('getBrowserCompatibilityMessage should return appropriate message for compatible browser', () => {
    const compatibility: BrowserCompatibility = {
      isCompatible: true,
      missingFeatures: [],
      partialSupport: false,
    };

    const message = getBrowserCompatibilityMessage(compatibility);
    expect(message).toContain('fully supports');
  });

  test('getBrowserCompatibilityMessage should return appropriate message for partially supported browser', () => {
    const compatibility: BrowserCompatibility = {
      isCompatible: true,
      missingFeatures: [],
      partialSupport: true,
    };

    const message = getBrowserCompatibilityMessage(compatibility);
    expect(message).toContain('core features');
    expect(message).toContain('advanced features');
  });

  test('getBrowserCompatibilityMessage should return appropriate message for incompatible browser', () => {
    const compatibility: BrowserCompatibility = {
      isCompatible: false,
      missingFeatures: ['webWorkers', 'canvas'],
      partialSupport: true,
    };

    const message = getBrowserCompatibilityMessage(compatibility);
    expect(message).toContain('not supported');
    expect(message).toContain('webWorkers, canvas');
  });

  test('getBrowserInfo should return browser name and version', () => {
    const info = getBrowserInfo();

    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('version');
    expect(typeof info.name).toBe('string');
    expect(typeof info.version).toBe('string');
  });
});
