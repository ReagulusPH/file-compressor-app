/**
 * AudioCompressor service tests
 */

import { AudioCompressor } from './AudioCompressor';
import { CompressionSettings } from '../../types';

// Mock the sub-services
jest.mock('./WebAudioCompressor', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockReturnValue(true),
    extractMetadata: jest.fn().mockResolvedValue({
      duration: 180,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitrate: 128,
    }),
    compressAudio: jest.fn().mockResolvedValue(new Blob(['compressed'], { type: 'audio/wav' })),
    cancelCompression: jest.fn(),
    isCompressing: jest.fn().mockReturnValue(false),
    cleanup: jest.fn(),
  },
}));

jest.mock('./AudioLibCompressor', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn().mockReturnValue(true),
    compressAudio: jest.fn().mockResolvedValue(new Blob(['compressed'], { type: 'audio/mpeg' })),
    compressAudioWithStreaming: jest.fn().mockResolvedValue(new Blob(['compressed'], { type: 'audio/mpeg' })),
    cancelCompression: jest.fn(),
    isCompressing: jest.fn().mockReturnValue(false),
    cleanup: jest.fn(),
  },
}));

// Mock the audio compression libraries
jest.mock('lamejs', () => ({
  Mp3Encoder: jest.fn().mockImplementation(() => ({
    encodeBuffer: jest.fn().mockReturnValue(new Int8Array([1, 2, 3])),
    flush: jest.fn().mockReturnValue(new Int8Array([4, 5, 6])),
  })),
}));

jest.mock('wav-encoder', () => ({
  encode: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
}));

// Mock File.slice for signature validation
const mockSlice = jest.fn().mockReturnValue({
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
});

// Extend File prototype
Object.defineProperty(File.prototype, 'slice', {
  value: mockSlice,
  writable: true,
});

describe('AudioCompressor', () => {
  let audioCompressor: AudioCompressor;

  beforeEach(() => {
    audioCompressor = new AudioCompressor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    audioCompressor.cleanup();
  });

  describe('detectFormat', () => {
    it('should detect MP3 format from extension', async () => {
      const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      const result = await audioCompressor.detectFormat(file);
      
      expect(result.format).toBe('mp3');
      expect(result.isValid).toBe(true);
    });

    it('should detect WAV format from extension', async () => {
      const file = new File([''], 'test.wav', { type: 'audio/wav' });
      const result = await audioCompressor.detectFormat(file);
      
      expect(result.format).toBe('wav');
      expect(result.isValid).toBe(true);
    });

    it('should return unknown for unsupported format', async () => {
      const file = new File([''], 'test.flac', { type: 'audio/flac' });
      const result = await audioCompressor.detectFormat(file);
      
      expect(result.format).toBe('unknown');
    });
  });

  describe('extractMetadata', () => {
    it('should extract audio metadata using Web Audio API', async () => {
      const file = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const metadata = await audioCompressor.extractMetadata(file);
      
      expect(metadata.duration).toBe(180);
      expect(metadata.sampleRate).toBe(44100);
      expect(metadata.channels).toBe(2);
      expect(metadata.bitrate).toBeGreaterThan(0);
    });
  });

  describe('compressAudio', () => {
    const mockSettings: CompressionSettings = {
      quality: 70,
      outputFormat: 'mp3',
      audioSettings: {
        bitrate: 128,
        sampleRate: 44100,
        channels: 2,
        format: 'mp3',
      },
    };

    it('should compress audio file successfully', async () => {
      const file = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      file.slice = jest.fn().mockReturnValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      } as any);

      const progressCallback = jest.fn();
      const result = await audioCompressor.compressAudio(file, mockSettings, progressCallback);
      
      expect(result).toBeInstanceOf(Blob);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle compression errors gracefully', async () => {
      const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      file.arrayBuffer = jest.fn().mockRejectedValue(new Error('Failed to read file'));

      await expect(audioCompressor.compressAudio(file, mockSettings)).rejects.toThrow();
    });
  });

  describe('compressAudioWithStreaming', () => {
    it('should use regular compression for small files', async () => {
      const file = new File(['small audio'], 'test.mp3', { type: 'audio/mpeg' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      file.slice = jest.fn().mockReturnValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      } as any);

      const mockSettings: CompressionSettings = {
        quality: 70,
        outputFormat: 'mp3',
      };

      const result = await audioCompressor.compressAudioWithStreaming(file, mockSettings);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should use streaming compression for large files', async () => {
      // Create a large file (>50MB)
      const largeSize = 60 * 1024 * 1024;
      const file = new File(['x'.repeat(largeSize)], 'large.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(file, 'size', { value: largeSize });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      file.slice = jest.fn().mockReturnValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      } as any);

      const mockSettings: CompressionSettings = {
        quality: 70,
        outputFormat: 'mp3',
      };

      const result = await audioCompressor.compressAudioWithStreaming(file, mockSettings);
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('static methods', () => {
    it('should return supported formats', () => {
      const formats = AudioCompressor.getSupportedFormats();
      expect(formats).toContain('wav');
      expect(formats).toContain('mp3');
    });

    it('should check format support correctly', () => {
      expect(AudioCompressor.isFormatSupported('mp3')).toBe(true);
      expect(AudioCompressor.isFormatSupported('wav')).toBe(true);
      expect(AudioCompressor.isFormatSupported('flac')).toBe(false);
    });
  });

  describe('cancellation and cleanup', () => {
    it('should cancel compression', () => {
      expect(() => audioCompressor.cancelCompression()).not.toThrow();
    });

    it('should check compression status', () => {
      expect(audioCompressor.isCompressing()).toBe(false);
    });

    it('should cleanup resources', () => {
      expect(() => audioCompressor.cleanup()).not.toThrow();
    });
  });
});