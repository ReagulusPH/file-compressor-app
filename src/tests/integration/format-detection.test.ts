/**
 * Integration tests for format detection across all compression services
 */

import { FormatDetector } from '../../services/FormatDetector';
import { CompressionService } from '../../services/CompressionService';
import { DocumentProcessor } from '../../services/DocumentCompressor/DocumentProcessor';
import { AudioCompressor } from '../../services/AudioCompressor/AudioCompressor';
import APKCompressor from '../../services/ArchiveCompressor/APKCompressor';

// Mock all compression services
jest.mock('../../services/DocumentCompressor/PDFCompressor', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockReturnValue(true),
    compressDocument: jest.fn().mockResolvedValue({
      compressedBlob: new Blob(['compressed'], { type: 'application/pdf' }),
      metadata: { pageCount: 1, hasEmbeddedMedia: false },
      compressionRatio: 0.5,
      processingTime: 1000,
    }),
  },
}));

jest.mock('../../services/DocumentCompressor/OfficeCompressor', () => ({
  OfficeCompressor: {
    isSupported: jest.fn().mockReturnValue(true),
    compressDocument: jest.fn().mockResolvedValue({
      compressedBlob: new Blob(['compressed'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      metadata: { pageCount: 1, hasEmbeddedMedia: false },
      compressionRatio: 0.5,
      processingTime: 1000,
    }),
  },
}));

jest.mock('../../services/AudioCompressor/WebAudioCompressor', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockReturnValue(true),
    compressAudio: jest.fn().mockResolvedValue(new Blob(['compressed'], { type: 'audio/mpeg' })),
  },
}));

jest.mock('../../services/ArchiveCompressor/APKCompressor', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockReturnValue(true),
    compressAPK: jest.fn().mockResolvedValue({
      compressedBlob: new Blob(['compressed'], { type: 'application/vnd.android.package-archive' }),
      metadata: { entryCount: 10, hasSignature: false },
      compressionRatio: 0.6,
      processingTime: 2000,
      warnings: [],
    }),
  },
}));

describe('Format Detection Integration Tests', () => {
  let formatDetector: FormatDetector;
  let compressionService: CompressionService;

  beforeEach(() => {
    formatDetector = new FormatDetector();
    compressionService = new CompressionService();
    jest.clearAllMocks();
  });

  describe('Document Format Detection', () => {
    const documentFormats = [
      { name: 'test.pdf', type: 'application/pdf', expectedFormat: 'pdf' },
      { name: 'test.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', expectedFormat: 'docx' },
      { name: 'test.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', expectedFormat: 'xlsx' },
      { name: 'test.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', expectedFormat: 'pptx' },
      { name: 'test.odt', type: 'application/vnd.oasis.opendocument.text', expectedFormat: 'odt' },
      { name: 'test.ods', type: 'application/vnd.oasis.opendocument.spreadsheet', expectedFormat: 'ods' },
      { name: 'test.odp', type: 'application/vnd.oasis.opendocument.presentation', expectedFormat: 'odp' },
    ];

    documentFormats.forEach(({ name, type, expectedFormat }) => {
      it(`should detect ${expectedFormat.toUpperCase()} format correctly`, async () => {
        const file = new File(['document content'], name, { type });
        file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

        const result = await formatDetector.detectFormat(file);

        expect(result.format).toBe(expectedFormat);
        expect(result.category).toBe('document');
        expect(result.isSupported).toBe(true);
      });
    });

    it('should detect document format from file signature when MIME type is missing', async () => {
      // PDF signature: %PDF-
      const pdfSignature = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]);
      const file = new File([pdfSignature], 'document', { type: '' });
      file.arrayBuffer = jest.fn().mockResolvedValue(pdfSignature.buffer);

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('pdf');
      expect(result.category).toBe('document');
    });
  });

  describe('Audio Format Detection', () => {
    const audioFormats = [
      { name: 'test.mp3', type: 'audio/mpeg', expectedFormat: 'mp3' },
      { name: 'test.wav', type: 'audio/wav', expectedFormat: 'wav' },
      { name: 'test.m4a', type: 'audio/mp4', expectedFormat: 'm4a' },
      { name: 'test.ogg', type: 'audio/ogg', expectedFormat: 'ogg' },
    ];

    audioFormats.forEach(({ name, type, expectedFormat }) => {
      it(`should detect ${expectedFormat.toUpperCase()} format correctly`, async () => {
        const file = new File(['audio content'], name, { type });
        file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

        const result = await formatDetector.detectFormat(file);

        expect(result.format).toBe(expectedFormat);
        expect(result.category).toBe('audio');
        expect(result.isSupported).toBe(['mp3', 'wav'].includes(expectedFormat));
      });
    });

    it('should detect MP3 format from file signature', async () => {
      // MP3 signature: ID3 or MPEG frame sync
      const mp3Signature = new Uint8Array([0x49, 0x44, 0x33]); // ID3
      const file = new File([mp3Signature], 'audio', { type: '' });
      file.arrayBuffer = jest.fn().mockResolvedValue(mp3Signature.buffer);

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('mp3');
      expect(result.category).toBe('audio');
    });

    it('should detect WAV format from file signature', async () => {
      // WAV signature: RIFF...WAVE
      const wavSignature = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
      const file = new File([wavSignature], 'audio', { type: '' });
      file.arrayBuffer = jest.fn().mockResolvedValue(wavSignature.buffer);

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('wav');
      expect(result.category).toBe('audio');
    });
  });

  describe('Archive Format Detection', () => {
    it('should detect APK format correctly', async () => {
      const file = new File(['archive content'], 'test.apk', { 
        type: 'application/vnd.android.package-archive' 
      });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('apk');
      expect(result.category).toBe('archive');
      expect(result.isSupported).toBe(true);
    });

    it('should detect ZIP signature for APK files', async () => {
      // ZIP signature: PK
      const zipSignature = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
      const file = new File([zipSignature], 'app.apk', { type: '' });
      file.arrayBuffer = jest.fn().mockResolvedValue(zipSignature.buffer);

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('apk');
      expect(result.category).toBe('archive');
    });
  });

  describe('Image Format Detection (Extended)', () => {
    it('should detect TIFF format correctly', async () => {
      const file = new File(['image content'], 'test.tiff', { type: 'image/tiff' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('tiff');
      expect(result.category).toBe('image');
      expect(result.isSupported).toBe(true);
    });

    it('should detect TIFF format from file signature', async () => {
      // TIFF signature: II* (little-endian) or MM* (big-endian)
      const tiffSignature = new Uint8Array([0x49, 0x49, 0x2A, 0x00]); // II*
      const file = new File([tiffSignature], 'image', { type: '' });
      file.arrayBuffer = jest.fn().mockResolvedValue(tiffSignature.buffer);

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('tiff');
      expect(result.category).toBe('image');
    });
  });

  describe('Unsupported Format Detection', () => {
    it('should handle unsupported formats gracefully', async () => {
      const file = new File(['unknown content'], 'test.xyz', { type: 'application/unknown' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('unknown');
      expect(result.category).toBe('unknown');
      expect(result.isSupported).toBe(false);
    });

    it('should provide helpful error messages for unsupported formats', async () => {
      const file = new File(['text content'], 'document.txt', { type: 'text/plain' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await formatDetector.detectFormat(file);

      expect(result.format).toBe('txt');
      expect(result.isSupported).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  describe('Unified Compression Workflow', () => {
    it('should route PDF files to document compressor', async () => {
      const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings = {
        quality: 70,
        documentSettings: {
          compressionLevel: 'medium' as const,
          preserveMetadata: true,
          optimizeImages: true,
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result).toBeDefined();
      expect(result.compressedBlob).toBeInstanceOf(Blob);
    });

    it('should route MP3 files to audio compressor', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings = {
        quality: 70,
        audioSettings: {
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          format: 'mp3' as const,
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result).toBeDefined();
      expect(result.compressedBlob).toBeInstanceOf(Blob);
    });

    it('should route APK files to archive compressor', async () => {
      const file = new File(['archive data'], 'test.apk', { 
        type: 'application/vnd.android.package-archive' 
      });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings = {
        quality: 70,
        archiveSettings: {
          compressionLevel: 6,
          preserveStructure: true,
          validateIntegrity: true,
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result).toBeDefined();
      expect(result.compressedBlob).toBeInstanceOf(Blob);
    });

    it('should handle batch processing of mixed formats', async () => {
      const files = [
        new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' }),
        new File(['audio data'], 'audio.mp3', { type: 'audio/mpeg' }),
        new File(['archive data'], 'app.apk', { type: 'application/vnd.android.package-archive' }),
      ];

      // Mock arrayBuffer for all files
      files.forEach(file => {
        file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      });

      const settings = {
        quality: 70,
        documentSettings: {
          compressionLevel: 'medium' as const,
          preserveMetadata: true,
          optimizeImages: true,
        },
        audioSettings: {
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          format: 'mp3' as const,
        },
        archiveSettings: {
          compressionLevel: 6,
          preserveStructure: true,
          validateIntegrity: true,
        },
      };

      const results = await Promise.all(
        files.map(file => compressionService.compressFile(file, settings))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.compressedBlob).toBeInstanceOf(Blob);
      });
    });

    it('should handle compression errors gracefully', async () => {
      const file = new File(['invalid data'], 'test.pdf', { type: 'application/pdf' });
      file.arrayBuffer = jest.fn().mockRejectedValue(new Error('File read error'));

      const settings = {
        quality: 70,
        documentSettings: {
          compressionLevel: 'medium' as const,
          preserveMetadata: true,
          optimizeImages: true,
        },
      };

      await expect(compressionService.compressFile(file, settings))
        .rejects.toThrow();
    });
  });

  describe('Format Capability Detection', () => {
    it('should detect browser capabilities for each format', async () => {
      const capabilities = await formatDetector.getBrowserCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.document).toBeDefined();
      expect(capabilities.audio).toBeDefined();
      expect(capabilities.archive).toBeDefined();
      expect(capabilities.image).toBeDefined();
    });

    it('should provide fallback information for unsupported features', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await formatDetector.detectFormat(file);

      expect(result.fallbackAvailable).toBeDefined();
      expect(result.recommendedAction).toBeDefined();
    });
  });
});