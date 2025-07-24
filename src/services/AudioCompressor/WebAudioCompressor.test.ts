/**
 * WebAudioCompressor unit tests
 */

import WebAudioCompressor from './WebAudioCompressor';
import { CompressionSettings } from '../../types';

// Mock Web Audio API
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  createBuffer: jest.fn(),
  createBufferSource: jest.fn(),
  createScriptProcessor: jest.fn(),
  createAnalyser: jest.fn(),
  close: jest.fn(),
  state: 'running',
  sampleRate: 44100,
};

const mockAudioBuffer = {
  length: 44100,
  duration: 1.0,
  sampleRate: 44100,
  numberOfChannels: 2,
  getChannelData: jest.fn().mockReturnValue(new Float32Array(44100)),
};

// Mock AudioContext constructor
global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
(global as any).webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

// Mock OfflineAudioContext
global.OfflineAudioContext = jest.fn().mockImplementation(() => ({
  ...mockAudioContext,
  startRendering: jest.fn().mockResolvedValue(mockAudioBuffer),
}));

// Mock MediaRecorder
const MockMediaRecorder: any = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive',
}));
MockMediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);
global.MediaRecorder = MockMediaRecorder;

describe('WebAudioCompressor', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
  });

  describe('isSupported', () => {
    it('should return true when Web Audio API is available', () => {
      expect(WebAudioCompressor.isSupported()).toBe(true);
    });

    it('should return false when Web Audio API is not available', () => {
      const originalAudioContext = global.AudioContext;
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;

      expect(WebAudioCompressor.isSupported()).toBe(false);

      global.AudioContext = originalAudioContext;
    });
  });

  describe('extractMetadata', () => {
    it('should extract audio metadata successfully', async () => {
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mpeg' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const metadata = await WebAudioCompressor.extractMetadata(mockFile);

      expect(metadata.duration).toBe(1.0);
      expect(metadata.sampleRate).toBe(44100);
      expect(metadata.numberOfChannels).toBe(2);
      expect(metadata.bitrate).toBeGreaterThan(0);
    });

    it('should handle metadata extraction errors', async () => {
      const mockFile = new File(['invalid audio'], 'test.mp3', { type: 'audio/mpeg' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode failed'));

      const metadata = await WebAudioCompressor.extractMetadata(mockFile);

      expect(metadata.duration).toBe(0);
      expect(metadata.sampleRate).toBe(0);
      expect(metadata.numberOfChannels).toBe(0);
      expect(metadata.bitrate).toBe(0);
    });
  });

  describe('compressAudio', () => {

    it('should compress audio successfully', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const progressCallback = jest.fn();
      const result = await WebAudioCompressor.compressAudio(mockFile, mockSettings, progressCallback);

      expect(result).toBeInstanceOf(Blob);
      expect(progressCallback).toHaveBeenCalled();
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    });

    it('should handle different output formats', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      const wavSettings: CompressionSettings = {
        ...mockSettings,
        outputFormat: 'wav',
        audioSettings: {
          ...mockSettings.audioSettings!,
          format: 'wav',
        },
      };

      const result = await WebAudioCompressor.compressAudio(mockFile, wavSettings);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle compression cancellation', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      // Start compression
      const compressionPromise = WebAudioCompressor.compressAudio(mockFile, mockSettings);
      
      // Cancel immediately
      WebAudioCompressor.cancelCompression();

      await expect(compressionPromise).rejects.toThrow('Audio compression was cancelled');
    });

    it('should handle audio decoding errors', async () => {
      const mockFile = new File(['invalid audio'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
      
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode failed'));

      await expect(WebAudioCompressor.compressAudio(mockFile, mockSettings))
        .rejects.toThrow('Audio compression failed');
    });
  });

  describe('resampleAudio', () => {
    it('should resample audio to target sample rate', () => {
      const inputData = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const inputSampleRate = 44100;
      const targetSampleRate = 22050;

      const result = (WebAudioCompressor as any).resampleAudio(
        inputData,
        inputSampleRate,
        targetSampleRate
      );

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBeLessThan(inputData.length);
    });

    it('should handle same sample rate', () => {
      const inputData = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const sampleRate = 44100;

      const result = (WebAudioCompressor as any).resampleAudio(
        inputData,
        sampleRate,
        sampleRate
      );

      expect(result).toBe(inputData);
    });
  });

  describe('convertToMono', () => {
    it('should convert stereo to mono', () => {
      const leftChannel = new Float32Array([0.1, 0.2, 0.3]);
      const rightChannel = new Float32Array([0.4, 0.5, 0.6]);

      const result = (WebAudioCompressor as any).convertToMono(leftChannel, rightChannel);

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(3);
      expect(result[0]).toBe(0.25); // (0.1 + 0.4) / 2
    });

    it('should handle single channel', () => {
      const channel = new Float32Array([0.1, 0.2, 0.3]);

      const result = (WebAudioCompressor as any).convertToMono(channel);

      expect(result).toBe(channel);
    });
  });

  describe('calculateBitrate', () => {
    it('should calculate bitrate from file size and duration', () => {
      const fileSize = 1024 * 1024; // 1MB
      const duration = 60; // 60 seconds

      const bitrate = (WebAudioCompressor as any).calculateBitrate(fileSize, duration);

      expect(bitrate).toBeGreaterThan(0);
      expect(typeof bitrate).toBe('number');
    });

    it('should handle zero duration', () => {
      const fileSize = 1024 * 1024;
      const duration = 0;

      const bitrate = (WebAudioCompressor as any).calculateBitrate(fileSize, duration);

      expect(bitrate).toBe(0);
    });
  });

  describe('state management', () => {
    it('should track compression state', () => {
      expect(WebAudioCompressor.isCompressing()).toBe(false);
    });

    it('should handle cleanup', () => {
      expect(() => WebAudioCompressor.cleanup()).not.toThrow();
    });

    it('should handle cancellation', () => {
      expect(() => WebAudioCompressor.cancelCompression()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle file reading errors', async () => {
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockRejectedValue(new Error('File read error'));

      await expect(WebAudioCompressor.compressAudio(mockFile, mockSettings))
        .rejects.toThrow('Audio compression failed');
    });

    it('should handle AudioContext creation errors', async () => {
      const originalAudioContext = global.AudioContext;
      global.AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('AudioContext creation failed');
      });

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      await expect(WebAudioCompressor.compressAudio(mockFile, mockSettings))
        .rejects.toThrow('Audio compression failed');

      global.AudioContext = originalAudioContext;
    });
  });
});