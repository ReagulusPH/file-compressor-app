/**
 * APKCompressor tests
 */

// @ts-nocheck
import APKCompressor from './APKCompressor';
import JSZip from 'jszip';
import { ArchiveSettings } from '../../types';

// Mock JSZip
jest.mock('jszip');

// Type assertion helper for mock files
const createMockFiles = (files: any) => files as { [key: string]: JSZip.JSZipObject };

describe('APKCompressor', () => {
  let mockZip: jest.Mocked<JSZip>;
  let mockFile: File;
  let defaultSettings: ArchiveSettings;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock ZIP instance
    mockZip = {
      loadAsync: jest.fn(),
      generateAsync: jest.fn(),
      file: jest.fn(),
      files: {},
    } as any;

    // Mock JSZip constructor
    (JSZip as jest.MockedClass<typeof JSZip>).mockImplementation(() => mockZip);

    // Create mock file
    const mockArrayBuffer = new ArrayBuffer(1024);
    mockFile = {
      name: 'test.apk',
      size: 1024,
      type: 'application/vnd.android.package-archive',
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    } as any;

    // Default settings
    defaultSettings = {
      compressionLevel: 6,
      preserveStructure: true,
      validateIntegrity: true,
    };
  });

  describe('compressAPK', () => {
    it('should compress APK file successfully', async () => {
      // Setup mock ZIP files
      const mockFiles = {
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
        'res/': {
          dir: true,
        },
        'res/layout/activity_main.xml': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([13, 14, 15, 16])),
        },
      };

      mockZip.files = createMockFiles(mockFiles);
      mockZip.loadAsync.mockResolvedValue(mockZip);
      mockZip.generateAsync.mockResolvedValue(new Blob(['compressed'], { type: 'application/vnd.android.package-archive' }));

      const onProgress = jest.fn();
      const result = await APKCompressor.compressAPK(mockFile, defaultSettings, onProgress);

      expect(mockZip.loadAsync).toHaveBeenCalledWith(expect.any(ArrayBuffer));
      expect(mockZip.generateAsync).toHaveBeenCalledWith({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6,
        },
        mimeType: 'application/vnd.android.package-archive',
      });

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.metadata.entryCount).toBe(4); // Non-directory entries
      expect(result.metadata.hasSignature).toBe(false);
      expect(result.warnings).toContain('APK is not signed - this is unusual for production APKs');
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should handle signed APK files', async () => {
      // Setup mock ZIP files with signature
      const mockFiles = {
        'AndroidManifest.xml': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        },
        'classes.dex': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8])),
        },
        'META-INF/MANIFEST.MF': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([9, 10, 11, 12])),
        },
        'META-INF/CERT.SF': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([13, 14, 15, 16])),
        },
        'META-INF/CERT.RSA': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([17, 18, 19, 20])),
        },
      };

      mockZip.files = mockFiles;
      mockZip.loadAsync.mockResolvedValue(mockZip);
      mockZip.generateAsync.mockResolvedValue(new Blob(['compressed'], { type: 'application/vnd.android.package-archive' }));

      const result = await APKCompressor.compressAPK(mockFile, defaultSettings);

      expect(result.metadata.hasSignature).toBe(true);
      expect(result.warnings).toContain('APK is signed - compression may invalidate the signature');
    });

    it('should handle missing critical files', async () => {
      // Setup mock ZIP files without critical files
      const mockFiles = {
        'res/layout/activity_main.xml': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        },
      };

      mockZip.files = mockFiles;
      mockZip.loadAsync.mockResolvedValue(mockZip);
      mockZip.generateAsync.mockResolvedValue(new Blob(['compressed'], { type: 'application/vnd.android.package-archive' }));

      const result = await APKCompressor.compressAPK(mockFile, defaultSettings);

      expect(result.warnings).toContain('Missing critical file: AndroidManifest.xml');
      expect(result.warnings).toContain('Missing critical file: classes.dex');
      expect(result.warnings).toContain('Missing critical file: resources.arsc');
    });

    it('should handle compression errors gracefully', async () => {
      mockZip.loadAsync.mockRejectedValue(new Error('Invalid ZIP file'));

      await expect(APKCompressor.compressAPK(mockFile, defaultSettings)).rejects.toThrow('APK compression failed: Invalid ZIP file');
    });

    it('should respect compression level settings', async () => {
      const mockFiles = {
        'AndroidManifest.xml': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        },
      };

      mockZip.files = mockFiles;
      mockZip.loadAsync.mockResolvedValue(mockZip);
      mockZip.generateAsync.mockResolvedValue(new Blob(['compressed'], { type: 'application/vnd.android.package-archive' }));

      const highCompressionSettings: ArchiveSettings = {
        compressionLevel: 9,
        preserveStructure: true,
        validateIntegrity: true,
      };

      await APKCompressor.compressAPK(mockFile, highCompressionSettings);

      expect(mockZip.generateAsync).toHaveBeenCalledWith({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9,
        },
        mimeType: 'application/vnd.android.package-archive',
      });
    });

    it('should call progress callback with correct values', async () => {
      const mockFiles = {
        'AndroidManifest.xml': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        },
        'classes.dex': {
          dir: false,
          async: jest.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8])),
        },
      };

      mockZip.files = mockFiles;
      mockZip.loadAsync.mockResolvedValue(mockZip);
      mockZip.generateAsync.mockResolvedValue(new Blob(['compressed'], { type: 'application/vnd.android.package-archive' }));

      const onProgress = jest.fn();
      await APKCompressor.compressAPK(mockFile, defaultSettings, onProgress);

      expect(onProgress).toHaveBeenCalledWith(0);
      expect(onProgress).toHaveBeenCalledWith(10);
      expect(onProgress).toHaveBeenCalledWith(20);
      expect(onProgress).toHaveBeenCalledWith(30);
      expect(onProgress).toHaveBeenCalledWith(80);
      expect(onProgress).toHaveBeenCalledWith(90);
      expect(onProgress).toHaveBeenCalledWith(95);
      expect(onProgress).toHaveBeenCalledWith(100);
    });
  });

  describe('validateAPKFile', () => {
    it('should validate valid APK file', async () => {
      const mockFiles = {
        'AndroidManifest.xml': {
          dir: false,
        },
      };

      mockZip.files = mockFiles;
      mockZip.loadAsync.mockResolvedValue(mockZip);

      const result = await APKCompressor.validateAPKFile(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject non-APK files', async () => {
      const nonApkFile = {
        ...mockFile,
        name: 'test.txt',
      };

      const result = await APKCompressor.validateAPKFile(nonApkFile);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('File does not have .apk extension');
    });

    it('should warn about large files', async () => {
      const largeFile = {
        ...mockFile,
        size: 150 * 1024 * 1024, // 150MB
      };

      const mockFiles = {
        'AndroidManifest.xml': {
          dir: false,
        },
      };

      mockZip.files = mockFiles;
      mockZip.loadAsync.mockResolvedValue(mockZip);

      const result = await APKCompressor.validateAPKFile(largeFile);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large APK file - compression may take significant time and memory');
    });

    it('should handle invalid ZIP files', async () => {
      mockZip.loadAsync.mockRejectedValue(new Error('Invalid ZIP'));

      const result = await APKCompressor.validateAPKFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Invalid APK file: Invalid ZIP');
    });

    it('should warn about missing AndroidManifest.xml', async () => {
      const mockFiles = {
        'classes.dex': {
          dir: false,
        },
      };

      mockZip.files = mockFiles;
      mockZip.loadAsync.mockResolvedValue(mockZip);

      const result = await APKCompressor.validateAPKFile(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('APK does not contain AndroidManifest.xml - may not be a valid APK');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported APK formats', () => {
      const formats = APKCompressor.getSupportedFormats();
      expect(formats).toEqual(['apk']);
    });
  });
});