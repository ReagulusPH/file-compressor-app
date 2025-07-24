/**
 * Simple APKCompressor integration test
 * Tests basic integration without complex mocking
 */

import APKCompressor from './APKCompressor';
import { ArchiveSettings } from '../../types';

// Mock JSZip
const mockZipInstance = {
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
    },
  }),
  generateAsync: jest.fn().mockResolvedValue(
    new Blob(['compressed apk'], { type: 'application/vnd.android.package-archive' })
  ),
  file: jest.fn(),
  files: {
    'AndroidManifest.xml': {
      dir: false,
    },
  },
};

jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => mockZipInstance);
});

describe('APKCompressor Simple Integration', () => {
  it('should be importable and have correct methods', () => {
    expect(APKCompressor).toBeDefined();
    expect(typeof APKCompressor.compressAPK).toBe('function');
    expect(typeof APKCompressor.validateAPKFile).toBe('function');
    expect(typeof APKCompressor.getSupportedFormats).toBe('function');
  });

  it('should return correct supported formats', () => {
    const formats = APKCompressor.getSupportedFormats();
    expect(formats).toEqual(['apk']);
  });

  it('should compress APK file directly', async () => {
    const mockFile = {
      name: 'test.apk',
      size: 1024,
      type: 'application/vnd.android.package-archive',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
    } as any;

    const settings: ArchiveSettings = {
      compressionLevel: 6,
      preserveStructure: true,
      validateIntegrity: true,
    };

    const result = await APKCompressor.compressAPK(mockFile, settings);

    expect(result).toBeDefined();
    expect(result.compressedBlob).toBeInstanceOf(Blob);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.entryCount).toBe(2);
    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('should validate APK files', async () => {
    const validAPKFile = {
      name: 'test.apk',
      size: 1024,
      type: 'application/vnd.android.package-archive',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
    } as any;

    const result = await APKCompressor.validateAPKFile(validAPKFile);
    expect(result.isValid).toBe(true);
  });
});