/**
 * AudioCompressor integration test
 * Simple test to verify the services are properly integrated
 */

import { AudioCompressor } from './AudioCompressor';
import { CompressionSettings } from '../../types';

describe('AudioCompressor Integration', () => {
  let audioCompressor: AudioCompressor;

  beforeEach(() => {
    audioCompressor = new AudioCompressor();
  });

  afterEach(() => {
    audioCompressor.cleanup();
  });

  describe('Basic functionality', () => {
    it('should be instantiable', () => {
      expect(audioCompressor).toBeInstanceOf(AudioCompressor);
    });

    it('should have required methods', () => {
      expect(typeof audioCompressor.detectFormat).toBe('function');
      expect(typeof audioCompressor.extractMetadata).toBe('function');
      expect(typeof audioCompressor.compressAudio).toBe('function');
      expect(typeof audioCompressor.compressAudioWithStreaming).toBe('function');
      expect(typeof audioCompressor.cancelCompression).toBe('function');
      expect(typeof audioCompressor.cleanup).toBe('function');
    });

    it('should have static methods', () => {
      expect(typeof AudioCompressor.getSupportedFormats).toBe('function');
      expect(typeof AudioCompressor.isFormatSupported).toBe('function');
    });

    it('should return supported formats', () => {
      const formats = AudioCompressor.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
      expect(formats).toContain('wav');
    });

    it('should check format support', () => {
      expect(AudioCompressor.isFormatSupported('wav')).toBe(true);
      expect(AudioCompressor.isFormatSupported('unknown')).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid files gracefully', async () => {
      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });
      
      const formatInfo = await audioCompressor.detectFormat(invalidFile);
      expect(formatInfo.format).toBe('unknown');
      expect(formatInfo.isValid).toBe(true); // Signature validation passes for unknown formats
    });

    it('should handle compression errors gracefully', async () => {
      const invalidAudioFile = new File(['invalid audio'], 'test.mp3', { type: 'audio/mpeg' });
      
      const settings: CompressionSettings = {
        quality: 70,
        outputFormat: 'mp3',
      };

      // This should throw an error due to invalid audio data
      await expect(audioCompressor.compressAudio(invalidAudioFile, settings)).rejects.toThrow();
    });
  });

  describe('State management', () => {
    it('should track compression state', () => {
      expect(typeof audioCompressor.isCompressing()).toBe('boolean');
    });

    it('should allow cancellation', () => {
      expect(() => audioCompressor.cancelCompression()).not.toThrow();
    });

    it('should cleanup resources', () => {
      expect(() => audioCompressor.cleanup()).not.toThrow();
    });
  });
});