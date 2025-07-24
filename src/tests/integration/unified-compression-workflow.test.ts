/**
 * Integration tests for unified compression workflow across all formats
 */

import { CompressionService } from '../../services/CompressionService';
import { FormatDetector } from '../../services/FormatDetector';
import { MemoryManager } from '../../utils/memory/MemoryManager';
import { CompressionSettings } from '../../types';

// Mock all compression services
jest.mock('../../services/DocumentCompressor/PDFCompressor', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockReturnValue(true),
    compressDocument: jest.fn().mockResolvedValue({
      compressedBlob: new Blob(['compressed pdf'], { type: 'application/pdf' }),
      metadata: { pageCount: 5, hasEmbeddedMedia: true, isEncrypted: false },
      compressionRatio: 0.65,
      processingTime: 1500,
    }),
    extractMetadata: jest.fn().mockResolvedValue({
      pageCount: 5,
      hasEmbeddedMedia: true,
      isEncrypted: false,
    }),
  },
}));

jest.mock('../../services/DocumentCompressor/OfficeCompressor', () => ({
  OfficeCompressor: jest.fn().mockImplementation(() => ({
    compressDocument: jest.fn().mockResolvedValue({
      compressedBlob: new Blob(['compressed office'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      metadata: { pageCount: 3, hasEmbeddedMedia: false, isEncrypted: false },
      compressionRatio: 0.55,
      processingTime: 1200,
    }),
    extractMetadata: jest.fn().mockResolvedValue({
      pageCount: 3,
      hasEmbeddedMedia: false,
      isEncrypted: false,
    }),
  })),
}));

jest.mock('../../services/AudioCompressor/AudioCompressor', () => ({
  AudioCompressor: jest.fn().mockImplementation(() => ({
    compressAudio: jest.fn().mockResolvedValue(new Blob(['compressed audio'], { type: 'audio/mpeg' })),
    compressAudioWithStreaming: jest.fn().mockResolvedValue(new Blob(['compressed audio stream'], { type: 'audio/mpeg' })),
    extractMetadata: jest.fn().mockResolvedValue({
      duration: 180,
      sampleRate: 44100,
      channels: 2,
      bitrate: 128,
    }),
    detectFormat: jest.fn().mockResolvedValue({
      format: 'mp3',
      isValid: true,
    }),
  })),
}));

jest.mock('../../services/ArchiveCompressor/APKCompressor', () => ({
  __esModule: true,
  default: {
    compressAPK: jest.fn().mockResolvedValue({
      compressedBlob: new Blob(['compressed apk'], { type: 'application/vnd.android.package-archive' }),
      metadata: { entryCount: 150, hasSignature: true },
      compressionRatio: 0.75,
      processingTime: 2000,
      warnings: ['APK is signed - compression may invalidate the signature'],
    }),
    validateAPKFile: jest.fn().mockResolvedValue({
      isValid: true,
      warnings: [],
    }),
  },
}));

jest.mock('../../services/ImageCompressor/CanvasImageCompressor', () => ({
  __esModule: true,
  default: {
    compressImage: jest.fn().mockResolvedValue(new Blob(['compressed image'], { type: 'image/jpeg' })),
  },
}));

// Mock MemoryManager
jest.mock('../../utils/memory/MemoryManager', () => ({
  MemoryManager: {
    getInstance: jest.fn().mockReturnValue({
      checkMemory: jest.fn().mockReturnValue(true),
      getMemoryStats: jest.fn().mockReturnValue({
        usedHeapSize: 50 * 1024 * 1024,
        totalHeapSize: 200 * 1024 * 1024,
        usagePercentage: 25,
      }),
      cleanup: jest.fn(),
    }),
  },
}));

describe('Unified Compression Workflow Integration Tests', () => {
  let compressionService: CompressionService;
  let formatDetector: FormatDetector;

  beforeEach(() => {
    compressionService = new CompressionService();
    formatDetector = new FormatDetector();
    jest.clearAllMocks();
  });

  describe('Single File Compression Workflow', () => {
    it('should handle PDF compression end-to-end', async () => {
      const file = new File(['%PDF-1.4 content'], 'document.pdf', { type: 'application/pdf' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings: CompressionSettings = {
        quality: 70,
        documentSettings: {
          compressionLevel: 'medium',
          preserveMetadata: true,
          optimizeImages: true,
        },
      };

      const progressCallback = jest.fn();
      const result = await compressionService.compressFile(file, settings, progressCallback);

      expect(result).toBeDefined();
      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.originalSize).toBe(file.size);
      expect(result.compressionRatio).toBe(0.65);
      expect(result.processingTime).toBe(1500);
      expect(result.metadata).toEqual({
        pageCount: 5,
        hasEmbeddedMedia: true,
        isEncrypted: false,
      });
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle Office document compression end-to-end', async () => {
      const file = new File(['office content'], 'document.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(2048));

      const settings: CompressionSettings = {
        quality: 80,
        documentSettings: {
          compressionLevel: 'high',
          preserveMetadata: false,
          optimizeImages: true,
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.compressionRatio).toBe(0.55);
      expect(result.metadata).toEqual({
        pageCount: 3,
        hasEmbeddedMedia: false,
        isEncrypted: false,
      });
    });

    it('should handle audio compression end-to-end', async () => {
      const file = new File(['audio content'], 'song.mp3', { type: 'audio/mpeg' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(5 * 1024 * 1024));

      const settings: CompressionSettings = {
        quality: 75,
        audioSettings: {
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          format: 'mp3',
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.metadata).toEqual({
        duration: 180,
        sampleRate: 44100,
        channels: 2,
        bitrate: 128,
      });
    });

    it('should handle APK compression end-to-end', async () => {
      const file = new File(['apk content'], 'app.apk', { 
        type: 'application/vnd.android.package-archive' 
      });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(50 * 1024 * 1024));

      const settings: CompressionSettings = {
        quality: 60,
        archiveSettings: {
          compressionLevel: 7,
          preserveStructure: true,
          validateIntegrity: true,
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.compressionRatio).toBe(0.75);
      expect(result.warnings).toContain('APK is signed - compression may invalidate the signature');
      expect(result.metadata).toEqual({
        entryCount: 150,
        hasSignature: true,
      });
    });

    it('should handle TIFF image compression end-to-end', async () => {
      const file = new File(['tiff content'], 'image.tiff', { type: 'image/tiff' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10 * 1024 * 1024));

      const settings: CompressionSettings = {
        quality: 85,
        outputFormat: 'image/jpeg',
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
    });
  });

  describe('Batch Processing Workflow', () => {
    it('should handle mixed format batch processing', async () => {
      const files = [
        new File(['%PDF-1.4'], 'doc1.pdf', { type: 'application/pdf' }),
        new File(['docx'], 'doc2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        new File(['mp3'], 'audio.mp3', { type: 'audio/mpeg' }),
        new File(['apk'], 'app.apk', { type: 'application/vnd.android.package-archive' }),
        new File(['tiff'], 'image.tiff', { type: 'image/tiff' }),
      ];

      // Mock arrayBuffer for all files
      files.forEach(file => {
        file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024 * 1024));
      });

      const settings: CompressionSettings = {
        quality: 70,
        documentSettings: {
          compressionLevel: 'medium',
          preserveMetadata: true,
          optimizeImages: true,
        },
        audioSettings: {
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          format: 'mp3',
        },
        archiveSettings: {
          compressionLevel: 6,
          preserveStructure: true,
          validateIntegrity: true,
        },
      };

      const results = await compressionService.compressFiles(files, settings);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.compressedBlob).toBeInstanceOf(Blob);
        expect(result.originalSize).toBe(files[index].size);
        expect(result.processingTime).toBeGreaterThan(0);
      });

      // Verify different compression ratios for different formats
      expect(results[0].compressionRatio).toBe(0.65); // PDF
      expect(results[1].compressionRatio).toBe(0.55); // DOCX
      expect(results[3].compressionRatio).toBe(0.75); // APK
    });

    it('should handle batch processing with progress tracking', async () => {
      const files = [
        new File(['pdf1'], 'doc1.pdf', { type: 'application/pdf' }),
        new File(['pdf2'], 'doc2.pdf', { type: 'application/pdf' }),
        new File(['mp3'], 'audio.mp3', { type: 'audio/mpeg' }),
      ];

      files.forEach(file => {
        file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024 * 1024));
      });

      const settings: CompressionSettings = { quality: 70 };
      const progressCallback = jest.fn();

      const results = await compressionService.compressFiles(files, settings, progressCallback);

      expect(results).toHaveLength(3);
      expect(progressCallback).toHaveBeenCalled();
      
      // Verify progress was reported for each file
      const progressCalls = progressCallback.mock.calls;
      expect(progressCalls.some(call => call[0].fileIndex === 0)).toBe(true);
      expect(progressCalls.some(call => call[0].fileIndex === 1)).toBe(true);
      expect(progressCalls.some(call => call[0].fileIndex === 2)).toBe(true);
    });

    it('should handle partial failures in batch processing', async () => {
      const files = [
        new File(['valid pdf'], 'valid.pdf', { type: 'application/pdf' }),
        new File(['invalid'], 'invalid.pdf', { type: 'application/pdf' }),
        new File(['valid mp3'], 'valid.mp3', { type: 'audio/mpeg' }),
      ];

      files[0].arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      files[1].arrayBuffer = jest.fn().mockRejectedValue(new Error('File corrupted'));
      files[2].arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings: CompressionSettings = { quality: 70 };

      const results = await compressionService.compressFiles(files, settings);

      expect(results).toHaveLength(3);
      expect(results[0].compressedBlob).toBeInstanceOf(Blob);
      expect(results[1].error).toBeDefined();
      expect(results[2].compressedBlob).toBeInstanceOf(Blob);
    });
  });

  describe('Format Detection Integration', () => {
    it('should detect format and route to appropriate compressor', async () => {
      const testCases = [
        { file: new File(['%PDF'], 'test.pdf', { type: 'application/pdf' }), expectedFormat: 'pdf' },
        { file: new File(['ID3'], 'test.mp3', { type: 'audio/mpeg' }), expectedFormat: 'mp3' },
        { file: new File(['PK'], 'test.apk', { type: 'application/vnd.android.package-archive' }), expectedFormat: 'apk' },
      ];

      for (const testCase of testCases) {
        testCase.file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

        const formatInfo = await formatDetector.detectFormat(testCase.file);
        expect(formatInfo.format).toBe(testCase.expectedFormat);

        const result = await compressionService.compressFile(testCase.file, { quality: 70 });
        expect(result.compressedBlob).toBeInstanceOf(Blob);
      }
    });

    it('should handle format detection errors gracefully', async () => {
      const file = new File(['unknown'], 'test.unknown', { type: 'application/unknown' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      await expect(compressionService.compressFile(file, { quality: 70 }))
        .rejects.toThrow('Unsupported file format');
    });

    it('should provide format-specific error messages', async () => {
      const file = new File(['text'], 'document.txt', { type: 'text/plain' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      try {
        await compressionService.compressFile(file, { quality: 70 });
      } catch (error) {
        expect(error.message).toContain('not supported');
        expect(error.suggestedFormats).toBeDefined();
      }
    });
  });

  describe('Memory Management Integration', () => {
    it('should handle memory constraints during compression', async () => {
      const memoryManager = MemoryManager.getInstance();
      
      // Mock memory pressure
      (memoryManager.checkMemory as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      const file = new File(['large content'], 'large.pdf', { type: 'application/pdf' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(100 * 1024 * 1024));

      const settings: CompressionSettings = {
        quality: 70,
        documentSettings: {
          compressionLevel: 'low', // Should use low compression due to memory pressure
          preserveMetadata: false,
          optimizeImages: false,
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(memoryManager.cleanup).toHaveBeenCalled();
    });

    it('should use streaming for large audio files', async () => {
      const largeAudioFile = new File(['large audio'], 'large.wav', { type: 'audio/wav' });
      Object.defineProperty(largeAudioFile, 'size', { value: 100 * 1024 * 1024 }); // 100MB
      largeAudioFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings: CompressionSettings = {
        quality: 70,
        audioSettings: {
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          format: 'mp3',
        },
      };

      const result = await compressionService.compressFile(largeAudioFile, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      // Verify streaming was used (mock should have been called)
      const AudioCompressor = require('../../services/AudioCompressor/AudioCompressor').AudioCompressor;
      const mockInstance = new AudioCompressor();
      expect(mockInstance.compressAudioWithStreaming).toHaveBeenCalled();
    });
  });

  describe('Settings Validation and Application', () => {
    it('should validate and apply format-specific settings', async () => {
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings: CompressionSettings = {
        quality: 70,
        documentSettings: {
          compressionLevel: 'high',
          preserveMetadata: false,
          optimizeImages: true,
        },
        // These should be ignored for PDF files
        audioSettings: {
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          format: 'mp3',
        },
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      
      // Verify only document settings were used
      const PDFCompressor = require('../../services/DocumentCompressor/PDFCompressor').default;
      expect(PDFCompressor.compressDocument).toHaveBeenCalledWith(
        file,
        settings.documentSettings,
        expect.any(Function)
      );
    });

    it('should provide default settings for missing format-specific options', async () => {
      const file = new File(['mp3 content'], 'test.mp3', { type: 'audio/mpeg' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const settings: CompressionSettings = {
        quality: 70,
        // No audioSettings provided
      };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      
      // Verify default audio settings were applied
      const AudioCompressor = require('../../services/AudioCompressor/AudioCompressor').AudioCompressor;
      const mockInstance = new AudioCompressor();
      expect(mockInstance.compressAudio).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          audioSettings: expect.objectContaining({
            bitrate: expect.any(Number),
            sampleRate: expect.any(Number),
            channels: expect.any(Number),
            format: expect.any(String),
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle compression service errors with fallback', async () => {
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      // Mock primary compressor failure
      const PDFCompressor = require('../../services/DocumentCompressor/PDFCompressor').default;
      PDFCompressor.compressDocument.mockRejectedValueOnce(new Error('Primary compression failed'));
      
      // Mock successful fallback
      PDFCompressor.compressDocument.mockResolvedValueOnce({
        compressedBlob: new Blob(['fallback compressed'], { type: 'application/pdf' }),
        metadata: { pageCount: 1, hasEmbeddedMedia: false, isEncrypted: false },
        compressionRatio: 0.8,
        processingTime: 2000,
      });

      const settings: CompressionSettings = { quality: 70 };

      const result = await compressionService.compressFile(file, settings);

      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.compressionRatio).toBe(0.8);
      expect(PDFCompressor.compressDocument).toHaveBeenCalledTimes(2); // Primary + fallback
    });

    it('should provide detailed error information for debugging', async () => {
      const file = new File(['corrupted'], 'corrupted.pdf', { type: 'application/pdf' });
      file.arrayBuffer = jest.fn().mockRejectedValue(new Error('File read error'));

      const settings: CompressionSettings = { quality: 70 };

      try {
        await compressionService.compressFile(file, settings);
      } catch (error) {
        expect(error.message).toContain('File read error');
        expect(error.fileName).toBe('corrupted.pdf');
        expect(error.fileType).toBe('application/pdf');
        expect(error.stage).toBe('file-reading');
      }
    });
  });
});