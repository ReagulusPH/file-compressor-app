/**
 * APKCompressor integration tests
 */

import compressionService from '../CompressionService';
import { FileModel, CompressionSettings } from '../../types';

// Mock SecureProcessing to allow test files to be processed
jest.mock('../../utils/security/SecureProcessing', () => ({
  __esModule: true,
  default: {
    canProcessSecurely: jest.fn().mockReturnValue(true),
    initialize: jest.fn(),
    cleanup: jest.fn(),
    isSecureProcessingActive: jest.fn().mockReturnValue(true),
    checkBrowserSupport: jest.fn().mockReturnValue({
      webWorkers: true,
      fileReader: true,
      canvas: true,
      webAssembly: true,
      indexedDB: true,
      overall: true,
    }),
    clearData: jest.fn(),
  },
}));

// Mock MemoryManager
jest.mock('../../utils/memory/MemoryManager', () => {
  const mockMemoryManager = {
    checkMemory: jest.fn().mockReturnValue(true),
    cleanup: jest.fn(),
    getMemoryStats: jest.fn().mockReturnValue({
      totalHeapSize: 1000000000,
      usedHeapSize: 500000000,
      heapSizeLimit: 2000000000,
      usagePercentage: 0.5,
      isHighUsage: false,
      isCriticalUsage: false,
    }),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    forceGarbageCollection: jest.fn(),
    shouldUseStreamProcessing: jest.fn().mockReturnValue(false),
    getOptimalChunkSize: jest.fn().mockReturnValue(2097152),
  };
  
  return {
    __esModule: true,
    default: mockMemoryManager,
  };
});

// Mock JSZip for integration tests
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    loadAsync: jest.fn().mockResolvedValue({
      files: {
        'AndroidManifest.xml': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        },
        'classes.dex': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8])),
        },
        'resources.arsc': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([9, 10, 11, 12])),
        },
      },
    }),
    generateAsync: jest.fn().mockResolvedValue(
      new Blob(['compressed apk'], { type: 'application/vnd.android.package-archive' })
    ),
    file: jest.fn(),
  }));
});

describe('APKCompressor Integration', () => {
  let mockAPKFile: File;
  let defaultSettings: CompressionSettings;

  beforeEach(() => {
    // Create mock APK file
    const mockArrayBuffer = new ArrayBuffer(2048);
    mockAPKFile = {
      name: 'test-app.apk',
      size: 2048,
      type: 'application/vnd.android.package-archive',
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    } as any;

    // Default compression settings
    defaultSettings = {
      quality: 80,
      outputFormat: 'apk',
      archiveSettings: {
        compressionLevel: 6,
        preserveStructure: true,
        validateIntegrity: true,
      },
    };
  });

  it('should process APK file through CompressionService', async () => {
    const fileModel: FileModel = {
      id: 'test-apk-1',
      originalFile: mockAPKFile,
      settings: defaultSettings,
      status: 'waiting',
      progress: 0,
    };

    const onProgress = jest.fn();
    const result = await compressionService.processFile(fileModel, onProgress);

    expect(result.status).toBe('complete');
    expect(result.progress).toBe(100);
    expect(result.result).toBeDefined();
    expect(result.result?.compressedFile.blob).toBeInstanceOf(Blob);
    expect(result.result?.compressedFile.type).toBe('application/vnd.android.package-archive');
    expect(result.formatMetadata).toBeDefined();
    expect(result.formatMetadata?.entryCount).toBe(3);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('should handle APK compression errors in CompressionService', async () => {
    // Create invalid APK file
    const invalidAPKFile = {
      ...mockAPKFile,
      arrayBuffer: jest.fn().mockRejectedValue(new Error('File read error')),
    };

    const fileModel: FileModel = {
      id: 'test-apk-error',
      originalFile: invalidAPKFile,
      settings: defaultSettings,
      status: 'waiting',
      progress: 0,
    };

    const result = await compressionService.processFile(fileModel);

    expect(result.status).toBe('error');
    expect(result.error).toContain('APK compression failed');
  });

  it('should process batch of APK files', async () => {
    const fileModels: FileModel[] = [
      {
        id: 'apk-1',
        originalFile: { ...mockAPKFile, name: 'app1.apk' },
        settings: defaultSettings,
        status: 'waiting',
        progress: 0,
      },
      {
        id: 'apk-2',
        originalFile: { ...mockAPKFile, name: 'app2.apk' },
        settings: defaultSettings,
        status: 'waiting',
        progress: 0,
      },
    ];

    const onProgress = jest.fn();
    const onBatchProgress = jest.fn();
    
    const results = await compressionService.processBatch(
      fileModels,
      onProgress,
      onBatchProgress
    );

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('complete');
    expect(results[1].status).toBe('complete');
    expect(onBatchProgress).toHaveBeenCalledWith(100);
  });

  it('should respect different compression levels', async () => {
    const highCompressionSettings: CompressionSettings = {
      quality: 80,
      outputFormat: 'apk',
      archiveSettings: {
        compressionLevel: 9,
        preserveStructure: true,
        validateIntegrity: true,
      },
    };

    const fileModel: FileModel = {
      id: 'test-apk-high-compression',
      originalFile: mockAPKFile,
      settings: highCompressionSettings,
      status: 'waiting',
      progress: 0,
    };

    const result = await compressionService.processFile(fileModel);

    expect(result.status).toBe('complete');
    expect(result.result).toBeDefined();
    expect(result.formatMetadata).toBeDefined();
  });

  it('should handle APK files with warnings', async () => {
    // Mock JSZip to return files without signature
    const JSZip = require('jszip');
    JSZip.mockImplementation(() => ({
      loadAsync: jest.fn().mockResolvedValue({
        files: {
          'AndroidManifest.xml': {
            dir: false,
            async: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
          },
          // No signature files - should generate warnings
        },
      }),
      generateAsync: jest.fn().mockResolvedValue(
        new Blob(['compressed apk'], { type: 'application/vnd.android.package-archive' })
      ),
      file: jest.fn(),
    }));

    const fileModel: FileModel = {
      id: 'test-apk-warnings',
      originalFile: mockAPKFile,
      settings: defaultSettings,
      status: 'waiting',
      progress: 0,
    };

    const result = await compressionService.processFile(fileModel);

    expect(result.status).toBe('complete');
    expect(result.error).toBeDefined(); // Should contain warnings
    expect(result.error).toContain('APK is not signed');
  });
});