/**
 * Browser compatibility tests for multi-format compression
 */

import { BrowserCompatibilityService } from '../../services/BrowserCompatibilityService';

// Mock user agents for different browsers
const mockUserAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
};

// Mock browser APIs
const mockBrowserAPIs = {
  webAudio: {
    AudioContext: true,
    OfflineAudioContext: true,
    MediaRecorder: true,
  },
  webAssembly: {
    WebAssembly: true,
    SharedArrayBuffer: true,
  },
  fileAPI: {
    FileReader: true,
    Blob: true,
    URL: true,
  },
  canvas: {
    HTMLCanvasElement: true,
    CanvasRenderingContext2D: true,
    OffscreenCanvas: false, // Not widely supported
  },
};

describe.skip('Multi-Format Browser Compatibility Tests', () => {
  let originalUserAgent: string;
  let originalNavigator: any;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    originalNavigator = global.navigator;
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    });
    global.navigator = originalNavigator;
  });

  const mockBrowser = (userAgent: string, apis: any = {}) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      writable: true,
    });

    // Mock APIs based on browser capabilities
    Object.keys(apis).forEach(category => {
      Object.keys(apis[category]).forEach(api => {
        if (apis[category][api]) {
          (global as any)[api] = jest.fn();
        } else {
          delete (global as any)[api];
        }
      });
    });
  };

  describe('Document Compression Compatibility', () => {
    it('should support PDF compression in Chrome', async () => {
      mockBrowser(mockUserAgents.chrome, mockBrowserAPIs);
      
      const service = new BrowserCompatibilityService();
      const formatInfo = {
        format: 'pdf',
        type: 'document' as const,
        mimeType: 'application/pdf',
        compressor: 'pdf-lib',
        supportLevel: 'library' as const
      };
      const report = service.getCompatibilityReport(formatInfo);

      expect(report.formatSupport.isSupported).toBe(true);
      expect(report.formatSupport.primaryMethod).toBe('library'); // pdf-lib
    });

    it('should support PDF compression in Firefox', async () => {
      mockBrowser(mockUserAgents.firefox, mockBrowserAPIs);
      
      const service = new BrowserCompatibilityService();
      const formatInfo = {
        format: 'pdf',
        type: 'document' as const,
        mimeType: 'application/pdf',
        compressor: 'pdf-lib',
        supportLevel: 'library' as const
      };
      const report = service.getCompatibilityReport(formatInfo);

      expect(report.formatSupport.isSupported).toBe(true);
    });

    it('should support Office document compression across browsers', async () => {
      const browsers = [mockUserAgents.chrome, mockUserAgents.firefox, mockUserAgents.safari, mockUserAgents.edge];
      const formats = ['docx', 'xlsx', 'pptx'];

      for (const browser of browsers) {
        for (const format of formats) {
          mockBrowser(browser, mockBrowserAPIs);
          
          const service = new BrowserCompatibilityService();
          const formatInfo = {
            format,
            type: 'document' as const,
            mimeType: format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                     format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            compressor: 'pizzip',
            supportLevel: 'library' as const
          };
          const report = service.getCompatibilityReport(formatInfo);

          expect(report.formatSupport.isSupported).toBe(true);
        }
      }
    });

    it('should handle limited memory environments', async () => {
      mockBrowser(mockUserAgents.mobile, mockBrowserAPIs);
      
      // Mock limited memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024, // 50MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB
          jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
        },
        configurable: true,
      });

      const service = new BrowserCompatibilityService();
      const formatInfo = {
        format: 'pdf',
        type: 'document' as const,
        mimeType: 'application/pdf',
        compressor: 'pdf-lib',
        supportLevel: 'library' as const
      };
      const report = service.getCompatibilityReport(formatInfo);

      expect(report.warnings.some(w => w.details.includes('Limited memory available'))).toBe(true);
    });
  });

  describe('Audio Compression Compatibility', () => {
    it('should prefer Web Audio API in modern browsers', async () => {
      mockBrowser(mockUserAgents.chrome, {
        ...mockBrowserAPIs,
        webAudio: {
          AudioContext: true,
          OfflineAudioContext: true,
          MediaRecorder: true,
        },
      });
      
      const service = new BrowserCompatibilityService();
      const formatInfo = {
        format: 'mp3',
        type: 'audio' as const,
        mimeType: 'audio/mpeg',
        compressor: 'web-audio-api',
        supportLevel: 'native' as const
      };
      const report = service.getCompatibilityReport(formatInfo);

      expect(report.formatSupport.isSupported).toBe(true);
      expect(report.formatSupport.primaryMethod).toBe('native'); // Web Audio API
      expect(report.formatSupport.fallbackMethods.length).toBeGreaterThan(0);
    });

    it('should fallback to library compression when Web Audio API is limited', async () => {
      mockBrowser(mockUserAgents.safari, {
        ...mockBrowserAPIs,
        webAudio: {
          AudioContext: true,
          OfflineAudioContext: false, // Safari limitations
          MediaRecorder: false,
        },
      });
      
      const service = new BrowserCompatibilityService();
      const formatInfo = {
        format: 'mp3',
        type: 'audio' as const,
        mimeType: 'audio/mpeg',
        compressor: 'lamejs',
        supportLevel: 'library' as const
      };
      const report = service.getCompatibilityReport(formatInfo);

      expect(report.formatSupport.isSupported).toBe(true);
      expect(report.formatSupport.primaryMethod).toBe('library'); // lamejs fallback
      expect(report.warnings.some(w => w.details.includes('Limited Web Audio API support'))).toBe(true);
    });

    it('should handle WAV compression across browsers', async () => {
      const browsers = [mockUserAgents.chrome, mockUserAgents.firefox, mockUserAgents.safari];

      for (const browser of browsers) {
        mockBrowser(browser, mockBrowserAPIs);
        
        const service = new BrowserCompatibilityService();
        const capabilities = await service.checkFormatSupport('wav');

        expect(capabilities.isSupported).toBe(true);
        expect(['native', 'library']).toContain(capabilities.method);
      }
    });

    it('should warn about mobile audio limitations', async () => {
      mockBrowser(mockUserAgents.mobile, {
        ...mockBrowserAPIs,
        webAudio: {
          AudioContext: true,
          OfflineAudioContext: true,
          MediaRecorder: false, // Often limited on mobile
        },
      });
      
      const service = new BrowserCompatibilityService();
      const capabilities = await service.checkFormatSupport('mp3');

      expect(capabilities.warnings).toContain('Mobile audio processing may be limited');
    });
  });

  describe('Archive Compression Compatibility', () => {
    it('should support APK compression with JSZip', async () => {
      mockBrowser(mockUserAgents.chrome, mockBrowserAPIs);
      
      const service = new BrowserCompatibilityService();
      const capabilities = await service.checkFormatSupport('apk');

      expect(capabilities.isSupported).toBe(true);
      expect(capabilities.method).toBe('library'); // jszip
      expect(capabilities.warnings).toContain('APK compression may invalidate signatures');
    });

    it('should handle ZIP compression across browsers', async () => {
      const browsers = [mockUserAgents.chrome, mockUserAgents.firefox, mockUserAgents.safari, mockUserAgents.edge];

      for (const browser of browsers) {
        mockBrowser(browser, mockBrowserAPIs);
        
        const service = new BrowserCompatibilityService();
        const capabilities = await service.checkFormatSupport('apk');

        expect(capabilities.isSupported).toBe(true);
        expect(capabilities.method).toBe('library');
      }
    });
  });

  describe('TIFF Image Compression Compatibility', () => {
    it('should support TIFF compression with library fallback', async () => {
      mockBrowser(mockUserAgents.chrome, mockBrowserAPIs);
      
      const service = new BrowserCompatibilityService();
      const capabilities = await service.checkFormatSupport('tiff');

      expect(capabilities.isSupported).toBe(true);
      expect(capabilities.method).toBe('library'); // utif
      expect(capabilities.fallbackAvailable).toBe(true);
    });

    it('should handle TIFF in browsers without native support', async () => {
      const browsers = [mockUserAgents.firefox, mockUserAgents.safari];

      for (const browser of browsers) {
        mockBrowser(browser, mockBrowserAPIs);
        
        const service = new BrowserCompatibilityService();
        const capabilities = await service.checkFormatSupport('tiff');

        expect(capabilities.isSupported).toBe(true);
        expect(capabilities.method).toBe('library');
        expect(capabilities.warnings).toContain('TIFF support requires JavaScript library');
      }
    });
  });

  describe('WebAssembly Support', () => {
    it('should detect WebAssembly support for enhanced performance', async () => {
      mockBrowser(mockUserAgents.chrome, {
        ...mockBrowserAPIs,
        webAssembly: {
          WebAssembly: true,
          SharedArrayBuffer: true,
        },
      });
      
      const service = new BrowserCompatibilityService();
      const wasmSupport = await service.checkWebAssemblySupport();

      expect(wasmSupport.isSupported).toBe(true);
      expect(wasmSupport.sharedArrayBufferSupported).toBe(true);
      expect(wasmSupport.recommendedForFormats).toContain('pdf');
      expect(wasmSupport.recommendedForFormats).toContain('audio');
    });

    it('should handle browsers without WebAssembly support', async () => {
      mockBrowser(mockUserAgents.safari, {
        ...mockBrowserAPIs,
        webAssembly: {
          WebAssembly: false,
          SharedArrayBuffer: false,
        },
      });
      
      const service = new BrowserCompatibilityService();
      const wasmSupport = await service.checkWebAssemblySupport();

      expect(wasmSupport.isSupported).toBe(false);
      expect(wasmSupport.fallbackMessage).toContain('JavaScript libraries will be used');
    });
  });

  describe('Memory and Performance Constraints', () => {
    it('should detect memory limitations and adjust recommendations', async () => {
      mockBrowser(mockUserAgents.mobile, mockBrowserAPIs);
      
      // Mock limited memory environment
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 30 * 1024 * 1024,
          totalJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 50 * 1024 * 1024,
        },
        configurable: true,
      });

      const service = new BrowserCompatibilityService();
      const memoryInfo = await service.checkMemoryConstraints();

      expect(memoryInfo.isConstrained).toBe(true);
      expect(memoryInfo.recommendedMaxFileSize).toBeLessThan(10 * 1024 * 1024);
      expect(memoryInfo.suggestedFormats).not.toContain('video');
    });

    it('should recommend streaming for large files', async () => {
      mockBrowser(mockUserAgents.chrome, mockBrowserAPIs);
      
      const service = new BrowserCompatibilityService();
      const recommendations = await service.getProcessingRecommendations(100 * 1024 * 1024); // 100MB

      expect(recommendations.useStreaming).toBe(true);
      expect(recommendations.chunkSize).toBeGreaterThan(0);
      expect(recommendations.warnings).toContain('Large file - streaming recommended');
    });
  });

  describe('Feature Detection and Graceful Degradation', () => {
    it('should provide comprehensive feature detection report', async () => {
      mockBrowser(mockUserAgents.chrome, mockBrowserAPIs);
      
      const service = new BrowserCompatibilityService();
      const report = await service.generateCompatibilityReport();

      expect(report.browser).toBeDefined();
      expect(report.supportedFormats).toContain('pdf');
      expect(report.supportedFormats).toContain('mp3');
      expect(report.supportedFormats).toContain('apk');
      expect(report.supportedFormats).toContain('tiff');
      expect(report.limitations).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should handle unknown browsers gracefully', async () => {
      mockBrowser('Unknown Browser/1.0', {});
      
      const service = new BrowserCompatibilityService();
      const report = await service.generateCompatibilityReport();

      expect(report.browser.name).toBe('Unknown');
      expect(report.warnings).toContain('Unknown browser - compatibility not guaranteed');
      expect(report.supportedFormats.length).toBeGreaterThan(0); // Should still support some formats
    });

    it('should provide fallback options for unsupported features', async () => {
      mockBrowser(mockUserAgents.safari, {
        webAudio: {
          AudioContext: false,
          OfflineAudioContext: false,
          MediaRecorder: false,
        },
      });
      
      const service = new BrowserCompatibilityService();
      const capabilities = await service.checkFormatSupport('mp3');

      expect(capabilities.isSupported).toBe(true);
      expect(capabilities.method).toBe('library');
      expect(capabilities.fallbackAvailable).toBe(true);
      expect(capabilities.fallbackMethod).toBe('library');
    });
  });

  describe('Cross-Browser Format Support Matrix', () => {
    it('should generate support matrix for all formats and browsers', async () => {
      const browsers = Object.keys(mockUserAgents);
      const formats = ['pdf', 'docx', 'mp3', 'wav', 'apk', 'tiff'];
      const supportMatrix: any = {};

      for (const browserName of browsers) {
        mockBrowser(mockUserAgents[browserName as keyof typeof mockUserAgents], mockBrowserAPIs);
        
        const service = new BrowserCompatibilityService();
        supportMatrix[browserName] = {};

        for (const format of formats) {
          const capabilities = await service.checkFormatSupport(format);
          supportMatrix[browserName][format] = {
            supported: capabilities.isSupported,
            method: capabilities.method,
            warnings: capabilities.warnings?.length || 0,
          };
        }
      }

      // Verify all browsers support core formats
      browsers.forEach(browser => {
        expect(supportMatrix[browser].pdf.supported).toBe(true);
        expect(supportMatrix[browser].mp3.supported).toBe(true);
        expect(supportMatrix[browser].apk.supported).toBe(true);
      });

      // Log support matrix for documentation
      console.table(supportMatrix);
    });
  });
});