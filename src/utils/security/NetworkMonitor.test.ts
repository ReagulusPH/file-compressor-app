/**
 * NetworkMonitor tests
 * Tests for enhanced network monitoring for compression libraries
 */

import NetworkMonitor from './NetworkMonitor';

describe('NetworkMonitor', () => {
  let originalFetch: typeof fetch;
  let originalXHR: typeof XMLHttpRequest;

  beforeEach(() => {
    // Store original implementations
    originalFetch = window.fetch;
    originalXHR = window.XMLHttpRequest;
    
    // Reset monitor state
    NetworkMonitor.stop();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original implementations
    window.fetch = originalFetch;
    window.XMLHttpRequest = originalXHR;
    
    // Stop monitoring
    NetworkMonitor.stop();
  });

  describe('basic monitoring', () => {
    it('should start monitoring with default options', () => {
      NetworkMonitor.start();
      expect(NetworkMonitor.isMonitoring()).toBe(true);
    });

    it('should start monitoring with custom options', () => {
      NetworkMonitor.start({
        logBlocked: true,
        allowedDomains: ['example.com'],
        monitorLibraries: true,
      });
      
      expect(NetworkMonitor.isMonitoring()).toBe(true);
    });

    it('should stop monitoring', () => {
      NetworkMonitor.start();
      expect(NetworkMonitor.isMonitoring()).toBe(true);
      
      NetworkMonitor.stop();
      expect(NetworkMonitor.isMonitoring()).toBe(false);
    });

    it('should not start monitoring if already active', () => {
      NetworkMonitor.start();
      const firstFetch = window.fetch;
      
      NetworkMonitor.start();
      expect(window.fetch).toBe(firstFetch);
    });
  });

  describe('fetch API monitoring', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      );
      
      NetworkMonitor.start();
    });

    it('should allow same-origin requests', async () => {
      const url = '/api/test';
      
      const result = await fetch(url);
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
    });

    it('should block external requests by default', async () => {
      const url = 'https://external.com/api';
      
      await expect(fetch(url)).rejects.toThrow('Network request blocked for security reasons');
      // Note: global.fetch is replaced by secure fetch, so we can't check if it was called
    });

    it('should allow requests to allowed domains', async () => {
      NetworkMonitor.stop();
      NetworkMonitor.start({
        allowedDomains: ['allowed.com'],
      });
      
      const url = 'https://allowed.com/api';
      
      const result = await fetch(url);
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
    });

    it('should track library network activity', async () => {
      // Simulate request from pdf-lib by creating error with stack trace
      const originalError = Error;
      global.Error = class extends originalError {
        constructor(message?: string) {
          super(message);
          this.stack = 'Error\n    at pdf-lib/src/core/PDFDocument.js:123:45';
        }
      } as any;

      const url = 'https://external.com/api';
      
      await expect(fetch(url)).rejects.toThrow();
      
      const activity = NetworkMonitor.getLibraryActivitySummary('pdf-lib');
      expect(activity).toBeDefined();
      expect(activity?.blockedRequests).toContain(url);
      
      // Restore Error
      global.Error = originalError;
    });
  });

  describe('XMLHttpRequest monitoring', () => {
    beforeEach(() => {
      NetworkMonitor.start();
    });

    it('should allow same-origin XMLHttpRequest', () => {
      const xhr = new XMLHttpRequest();
      
      expect(() => {
        xhr.open('GET', '/api/test');
      }).not.toThrow();
    });

    it('should block external XMLHttpRequest', () => {
      const xhr = new XMLHttpRequest();
      
      expect(() => {
        xhr.open('GET', 'https://external.com/api');
      }).toThrow('Network request blocked for security reasons');
    });

    it('should allow XMLHttpRequest to allowed domains', () => {
      NetworkMonitor.stop();
      NetworkMonitor.start({
        allowedDomains: ['allowed.com'],
      });
      
      const xhr = new XMLHttpRequest();
      
      expect(() => {
        xhr.open('GET', 'https://allowed.com/api');
      }).not.toThrow();
    });
  });

  describe('library activity tracking', () => {
    beforeEach(() => {
      NetworkMonitor.start({ monitorLibraries: true });
    });

    it('should initialize library activity tracking', () => {
      const activity = NetworkMonitor.getLibraryActivity();
      
      expect(activity.size).toBeGreaterThan(0);
      expect(activity.has('pdf-lib')).toBe(true);
      expect(activity.has('jszip')).toBe(true);
      expect(activity.has('lamejs')).toBe(true);
    });

    it('should get library activity summary', () => {
      const summary = NetworkMonitor.getLibraryActivitySummary('pdf-lib');
      
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('libraryName', 'pdf-lib');
      expect(summary).toHaveProperty('requestCount', 0);
      expect(summary).toHaveProperty('blockedRequests');
      expect(summary).toHaveProperty('allowedRequests');
      expect(summary).toHaveProperty('lastActivity');
    });

    it('should return null for unknown library', () => {
      const summary = NetworkMonitor.getLibraryActivitySummary('unknown-lib');
      expect(summary).toBeNull();
    });

    it('should track blocked request count', () => {
      expect(NetworkMonitor.getBlockedRequestCount()).toBe(0);
      expect(NetworkMonitor.hasBlockedLibraryRequests()).toBe(false);
    });

    it('should reset library activity', () => {
      NetworkMonitor.resetLibraryActivity();
      
      const activity = NetworkMonitor.getLibraryActivity();
      for (const [, data] of activity) {
        expect(data.requestCount).toBe(0);
        expect(data.blockedRequests).toHaveLength(0);
        expect(data.allowedRequests).toHaveLength(0);
      }
    });
  });

  describe('security reporting', () => {
    beforeEach(() => {
      NetworkMonitor.start({ monitorLibraries: true });
    });

    it('should generate security report', () => {
      const report = NetworkMonitor.getSecurityReport();
      
      expect(report).toHaveProperty('isSecure');
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('libraryActivity');
      
      expect(Array.isArray(report.violations)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.libraryActivity)).toBe(true);
    });

    it('should report secure state when no violations', () => {
      const report = NetworkMonitor.getSecurityReport();
      
      expect(report.isSecure).toBe(true);
      expect(report.violations).toHaveLength(0);
      expect(report.recommendations).toContain(
        'All compression libraries are operating securely without external network requests'
      );
    });
  });

  describe('library detection', () => {
    it('should detect library from stack trace', async () => {
      // This is testing a private method indirectly through fetch blocking
      const originalError = Error;
      global.Error = class extends originalError {
        constructor(message?: string) {
          super(message);
          this.stack = 'Error\n    at jszip/lib/index.js:123:45\n    at Object.compress';
        }
      } as any;

      NetworkMonitor.start();
      
      try {
        await fetch('https://external.com/test');
      } catch (error) {
        // Expected to be blocked
      }

      const activity = NetworkMonitor.getLibraryActivitySummary('jszip');
      expect(activity?.requestCount).toBeGreaterThan(0);
      
      // Restore Error
      global.Error = originalError;
    });
  });

  describe('URL validation', () => {
    beforeEach(() => {
      NetworkMonitor.start();
    });

    it('should handle malformed URLs', async () => {
      const malformedUrl = 'not-a-valid-url';
      
      await expect(fetch(malformedUrl)).rejects.toThrow('Network request blocked for security reasons');
    });

    it('should handle relative URLs', async () => {
      global.fetch = jest.fn(() => Promise.resolve({} as Response));
      
      const result = await fetch('./relative/path');
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle URLs with subdomains', async () => {
      NetworkMonitor.stop();
      NetworkMonitor.start({
        allowedDomains: ['example.com'],
      });
      
      global.fetch = jest.fn(() => Promise.resolve({} as Response));
      
      const result = await fetch('https://sub.example.com/api');
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});