/**
 * AudioLibCompressor unit tests
 */

import AudioLibCompressor from './AudioLibCompressor';
import { CompressionSettings } from '../../types';

// Mock lamejs
const mockMp3Encoder = {
  encodeBuffer: jest.fn().mockReturnValue(new Int8Array([1, 2, 3, 4])),
  flush: jest.fn().mockReturnValue(new Int8Array([5, 6, 7, 8])),
};

jest.mock('lamejs', () => ({
  Mp3Encoder: jest.fn().mockImplementation(() => mockMp3Encoder),
}));

// Mock wav-encoder
jest.mock('wav-encoder', () => ({
  encode: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
}));

// Mock Web Audio API for fallback
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  close: jest.fn(),
  sampleRate: 44100,
};

const mockAudioBuffer = {
  length: 44100,
  duration: 1.0,
  sampleRate: 44100,
  numberOfChannels: 2,
  getChannelData: jest.fn().mockReturnValue(new Float32Array(44100)),
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
(global as any).webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

describe('AudioLibCompressor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
  });

  describe('isSupported', () => {
    it('should return true when required libraries are available', () => {
      expect(AudioLibCompressor.isSupported()).toBe(true);
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

    it('should compress audio to MP3 format', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const progressCallback = jest.fn();
      const result = await AudioLibCompressor.compressAudio(mockFile, mockSettings, progressCallback);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/mpeg');
      expect(progressCallback).toHaveBeenCalled();
      expect(mockMp3Encoder.encodeBuffer).toHaveBeenCalled();
      expect(mockMp3Encoder.flush).toHaveBeenCalled();
    });

    it('should compress audio to WAV format', async () => {
      const wavSettings: CompressionSettings = {
        ...mockSettings,
        outputFormat: 'wav',
        audioSettings: {
          ...mockSettings.audioSettings!,
          format: 'wav',
        },
      };

      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await AudioLibCompressor.compressAudio(mockFile, wavSettings);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle mono channel conversion', async () => {
      const monoSettings: CompressionSettings = {
        ...mockSettings,
        audioSettings: {
          ...mockSettings.audioSettings!,
          channels: 1,
        },
      };

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await AudioLibCompressor.compressAudio(mockFile, monoSettings);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle different sample rates', async () => {
      const resampleSettings: CompressionSettings = {
        ...mockSettings,
        audioSettings: {
          ...mockSettings.audioSettings!,
          sampleRate: 22050,
        },
      };

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const result = await AudioLibCompressor.compressAudio(mockFile, resampleSettings);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle compression cancellation', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      // Start compression
      const compressionPromise = AudioLibCompressor.compressAudio(mockFile, mockSettings);
      
      // Cancel immediately
      AudioLibCompressor.cancelCompression();

      await expect(compressionPromise).rejects.toThrow('Audio compression was cancelled');
    });

    it('should handle audio decoding errors', async () => {
      const mockFile = new File(['invalid audio'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode failed'));

      await expect(AudioLibCompressor.compressAudio(mockFile, mockSettings))
        .rejects.toThrow('Audio compression failed');
    });
  });

  describe('compressAudioWithStreaming', () => {
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

    it('should compress large audio files with streaming', async () => {
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.wav', { type: 'audio/wav' });
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 });
      largeFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const progressCallback = jest.fn();
      const result = await AudioLibCompressor.compressAudioWithStreaming(largeFile, mockSettings, progressCallback);

      expect(result).toBeInstanceOf(Blob);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle streaming cancellation', async () => {
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.wav', { type: 'audio/wav' });
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 });
      largeFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      // Start streaming compression
      const compressionPromise = AudioLibCompressor.compressAudioWithStreaming(largeFile, mockSettings);
      
      // Cancel immediately
      AudioLibCompressor.cancelCompression();

      await expect(compressionPromise).rejects.toThrow('Audio compression was cancelled');
    });
  });

  describe('helper methods', () => {
    it('should convert Float32Array to Int16Array', () => {
      const floatArray = new Float32Array([0.5, -0.5, 1.0, -1.0]);
      const result = (AudioLibCompressor as any).floatTo16BitPCM(floatArray);

      expect(result).toBeInstanceOf(Int16Array);
      expect(result.length).toBe(4);
    });

    it('should resample audio data', () => {
      const inputData = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const inputSampleRate = 44100;
      const targetSampleRate = 22050;

      const result = (AudioLibCompressor as any).resampleAudio(
        inputData,
        inputSampleRate,
        targetSampleRate
      );

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBeLessThan(inputData.length);
    });

    it('should convert stereo to mono', () => {
      const leftChannel = new Float32Array([0.1, 0.2, 0.3]);
      const rightChannel = new Float32Array([0.4, 0.5, 0.6]);

      const result = (AudioLibCompressor as any).convertToMono(leftChannel, rightChannel);

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(3);
      expect(result[0]).toBe(0.25); // (0.1 + 0.4) / 2
    });

    it('should calculate chunk size for streaming', () => {
      const fileSize = 100 * 1024 * 1024; // 100MB
      const chunkSize = (AudioLibCompressor as any).calculateChunkSize(fileSize);

      expect(chunkSize).toBeGreaterThan(0);
      expect(chunkSize).toBeLessThanOrEqual(10 * 1024 * 1024); // Max 10MB
    });
  });

  describe('state management', () => {
    it('should track compression state', () => {
      expect(AudioLibCompressor.isCompressing()).toBe(false);
    });

    it('should handle cleanup', () => {
      expect(() => AudioLibCompressor.cleanup()).not.toThrow();
    });

    it('should handle cancellation', () => {
      expect(() => AudioLibCompressor.cancelCompression()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle MP3 encoding errors', async () => {
      mockMp3Encoder.encodeBuffer.mockImplementation(() => {
        throw new Error('MP3 encoding failed');
      });

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

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

      await expect(AudioLibCompressor.compressAudio(mockFile, mockSettings))
        .rejects.toThrow('Audio compression failed');
    });

    it('should handle WAV encoding errors', async () => {
      const wavEncoder = require('wav-encoder');
      wavEncoder.encode.mockRejectedValue(new Error('WAV encoding failed'));

      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const wavSettings: CompressionSettings = {
        quality: 70,
        outputFormat: 'wav',
        audioSettings: {
          bitrate: 128,
          sampleRate: 44100,
          channels: 2,
          format: 'wav',
        },
      };

      await expect(AudioLibCompressor.compressAudio(mockFile, wavSettings))
        .rejects.toThrow('Audio compression failed');
    });

    it('should handle file reading errors', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockRejectedValue(new Error('File read error'));

      const mockSettings: CompressionSettings = {
        quality: 70,
        outputFormat: 'mp3',
      };

      await expect(AudioLibCompressor.compressAudio(mockFile, mockSettings))
        .rejects.toThrow('Audio compression failed');
    });
  });
});