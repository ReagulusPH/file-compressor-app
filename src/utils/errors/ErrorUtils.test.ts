/**
 * Tests for error utilities
 */
import {
  validateFile,
  checkBrowserCompatibility,
  formatErrorMessage,
  getErrorSeverity,
  getErrorSuggestions,
  monitorMemory,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from './ErrorUtils';
import {
  UnsupportedFileTypeError,
  FileSizeError,
  BrowserCompatibilityError,
  MemoryError,
  CompressionError,
} from './ErrorTypes';

describe('ErrorUtils', () => {
  describe('validateFile', () => {
    it('should validate a file with supported type and size', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      expect(() => validateFile(file)).not.toThrow();
    });

    it('should throw UnsupportedFileTypeError for unsupported file type', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(() => validateFile(file)).toThrow(UnsupportedFileTypeError);
    });

    it('should throw FileSizeError for files exceeding maximum size', () => {
      // Mock a large file by overriding the size property
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
      expect(() => validateFile(file)).toThrow(FileSizeError);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format UnsupportedFileTypeError', () => {
      const error = new UnsupportedFileTypeError('text/plain');
      const message = formatErrorMessage(error);
      expect(message).toContain('Unsupported file type');
    });

    it('should format FileSizeError', () => {
      const error = new FileSizeError(MAX_FILE_SIZE + 1, MAX_FILE_SIZE);
      const message = formatErrorMessage(error);
      expect(message).toContain('File is too large');
    });

    it('should format BrowserCompatibilityError', () => {
      const error = new BrowserCompatibilityError('Canvas API');
      const message = formatErrorMessage(error);
      expect(message).toContain("Your browser doesn't support Canvas API");
    });

    it('should format MemoryError', () => {
      const error = new MemoryError();
      const message = formatErrorMessage(error);
      expect(message).toContain('Not enough memory');
    });

    it('should format CompressionError', () => {
      const error = new CompressionError('Failed to compress');
      const message = formatErrorMessage(error);
      expect(message).toContain('Failed to compress');
    });

    it('should format generic Error', () => {
      const error = new Error('Generic error');
      const message = formatErrorMessage(error);
      expect(message).toContain('Generic error');
    });
  });

  describe('getErrorSeverity', () => {
    it('should return critical for BrowserCompatibilityError', () => {
      const error = new BrowserCompatibilityError('Canvas API');
      expect(getErrorSeverity(error)).toBe('critical');
    });

    it('should return critical for MemoryError', () => {
      const error = new MemoryError();
      expect(getErrorSeverity(error)).toBe('critical');
    });

    it('should return warning for CompressionError', () => {
      const error = new CompressionError('Failed to compress');
      expect(getErrorSeverity(error)).toBe('warning');
    });

    it('should return info for other errors', () => {
      const error = new UnsupportedFileTypeError('text/plain');
      expect(getErrorSeverity(error)).toBe('info');
    });
  });

  describe('getErrorSuggestions', () => {
    it('should return suggestions for UnsupportedFileTypeError', () => {
      const error = new UnsupportedFileTypeError('text/plain');
      const suggestions = getErrorSuggestions(error);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('supported file type');
    });

    it('should return suggestions for FileSizeError', () => {
      const error = new FileSizeError(MAX_FILE_SIZE + 1, MAX_FILE_SIZE);
      const suggestions = getErrorSuggestions(error);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('smaller file');
    });

    it('should return suggestions for BrowserCompatibilityError', () => {
      const error = new BrowserCompatibilityError('Canvas API');
      const suggestions = getErrorSuggestions(error);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('modern browser');
    });

    it('should return suggestions for MemoryError', () => {
      const error = new MemoryError();
      const suggestions = getErrorSuggestions(error);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('Close other tabs');
    });

    it('should return suggestions for CompressionError', () => {
      const error = new CompressionError('Failed to compress');
      const suggestions = getErrorSuggestions(error);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('different compression settings');
    });

    it('should return generic suggestions for other errors', () => {
      const error = new Error('Generic error');
      const suggestions = getErrorSuggestions(error);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('refreshing');
    });
  });

  describe('checkBrowserCompatibility', () => {
    // Save original window properties
    const originalFile = window.File;
    const originalFileReader = window.FileReader;
    const originalFileList = window.FileList;
    const originalBlob = window.Blob;
    const originalWorker = window.Worker;
    const originalIndexedDB = window.indexedDB;
    
    // Mock canvas getContext to ensure it's available in tests
    const mockCanvas = {
      getContext: jest.fn(() => ({})),
    };
    
    beforeEach(() => {
      // Ensure document.createElement('canvas') returns our mock
      jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return document.createElement(tag);
      });
    });

    afterEach(() => {
      // Restore original window properties
      window.File = originalFile;
      window.FileReader = originalFileReader;
      window.FileList = originalFileList;
      window.Blob = originalBlob;
      window.Worker = originalWorker;
      window.indexedDB = originalIndexedDB;
      jest.restoreAllMocks();
    });

    it('should detect File API compatibility issues', () => {
      // Mock missing File API
      window.File = undefined as any;

      const result = checkBrowserCompatibility();
      expect(result.isCompatible).toBe(false);
      expect(result.errors.some(e => e.message.includes('File API'))).toBe(true);
    });

    it('should detect Web Workers compatibility issues', () => {
      // Mock missing Web Workers
      window.Worker = undefined as any;

      const result = checkBrowserCompatibility();
      expect(result.isCompatible).toBe(false);
      expect(result.errors.some(e => e.message.includes('Web Workers'))).toBe(true);
    });

    it('should report compatibility when all features are available', () => {
      // All features should be available in the test environment
      const result = checkBrowserCompatibility();
      expect(result.isCompatible).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('monitorMemory', () => {
    // Mock performance.memory
    const originalPerformance = window.performance;

    beforeEach(() => {
      // Mock performance.memory
      Object.defineProperty(window, 'performance', {
        value: {
          ...originalPerformance,
          memory: {
            usedJSHeapSize: 100,
            jsHeapSizeLimit: 1000,
          },
        },
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      // Restore original performance
      Object.defineProperty(window, 'performance', {
        value: originalPerformance,
        configurable: true,
        writable: true,
      });
    });

    it('should return true when memory usage is acceptable', () => {
      const { checkMemory } = monitorMemory();
      expect(checkMemory()).toBe(true);
    });

    it('should return false when memory usage is high', () => {
      // Set memory usage to 90%
      Object.defineProperty(window, 'performance', {
        value: {
          ...originalPerformance,
          memory: {
            usedJSHeapSize: 900,
            jsHeapSizeLimit: 1000,
          },
        },
        configurable: true,
        writable: true,
      });

      const { checkMemory } = monitorMemory();
      expect(checkMemory()).toBe(false);
    });

    it('should return true when memory API is not available', () => {
      // Remove memory API
      Object.defineProperty(window, 'performance', {
        value: {
          ...originalPerformance,
          // No memory property
        },
        configurable: true,
        writable: true,
      });

      const { checkMemory } = monitorMemory();
      expect(checkMemory()).toBe(true);
    });

    it('should provide a cleanup function', () => {
      const { cleanup } = monitorMemory();
      expect(typeof cleanup).toBe('function');
      // Just make sure it doesn't throw
      expect(() => cleanup()).not.toThrow();
    });
  });
});
