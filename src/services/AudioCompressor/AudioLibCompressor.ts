/**
 * AudioLibCompressor service
 * Fallback audio compression using lamejs and wav-encoder libraries
 */

import { CompressionSettings, AudioSettings } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';

// Import audio libraries
let lamejs: any = null;
let wavEncoder: any = null;

try {
  lamejs = require('lamejs');
} catch (error) {
  console.warn('lamejs not available:', error);
}

try {
  wavEncoder = require('wav-encoder');
} catch (error) {
  console.warn('wav-encoder not available:', error);
}



/**
 * AudioLibCompressor service implementation
 */
export class AudioLibCompressor {
  private isProcessing = false;
  private shouldCancel = false;

  /**
   * Check if required libraries are available
   * @returns boolean indicating availability
   */
  static isSupported(): boolean {
    return lamejs !== null && wavEncoder !== null;
  }

  /**
   * Instance method to check support (for consistency)
   * @returns boolean indicating availability
   */
  isSupported(): boolean {
    return AudioLibCompressor.isSupported();
  }

  /**
   * Compress audio file using library-based compression
   * @param file - Audio file to compress
   * @param settings - Compression settings
   * @param onProgress - Progress callback
   * @returns Promise<Blob> with compressed audio
   */
  async compressAudio(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!AudioLibCompressor.isSupported()) {
      throw new BrowserCompatibilityError('Audio compression libraries (lamejs, wav-encoder)');
    }

    if (!MemoryManager.checkMemory()) {
      throw new MemoryError('Not enough memory available for audio compression');
    }

    this.isProcessing = true;
    this.shouldCancel = false;
    
    let audioBuffer: AudioBuffer | null = null;

    try {
      if (onProgress) onProgress(10);

      // Decode audio file using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (this.shouldCancel) {
        throw new CompressionError('Compression cancelled');
      }

      if (onProgress) onProgress(30);

      // Get audio settings with defaults
      const audioSettings = this.getAudioSettings(settings);

      // Process audio based on target format
      let compressedBlob: Blob;

      if (audioSettings.format === 'mp3') {
        compressedBlob = await this.compressToMP3(audioBuffer, audioSettings, onProgress);
      } else if (audioSettings.format === 'wav') {
        compressedBlob = await this.compressToWAV(audioBuffer, audioSettings, onProgress);
      } else {
        throw new CompressionError(`Unsupported audio format: ${audioSettings.format}`);
      }

      if (onProgress) onProgress(100);
      return compressedBlob;

    } catch (error) {
      console.error('Error compressing audio with libraries:', error);
      throw new CompressionError(
        `Library-based audio compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.isProcessing = false;
      MemoryManager.cleanup();
    }
  }

  /**
   * Compress audio to MP3 format using lamejs
   * @param audioBuffer - Decoded audio buffer
   * @param settings - Audio settings
   * @param onProgress - Progress callback
   * @returns Promise<Blob> with compressed MP3
   */
  private async compressToMP3(
    audioBuffer: AudioBuffer,
    settings: AudioSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      const { Mp3Encoder } = await import('lamejs');
      
      if (onProgress) onProgress(40);

      // Prepare audio data
      const { left, right } = this.prepareAudioData(audioBuffer, settings);

      if (this.shouldCancel) {
        throw new CompressionError('Compression cancelled');
      }

      if (onProgress) onProgress(60);

      // Initialize MP3 encoder
      const encoder = new Mp3Encoder(settings.channels, settings.sampleRate, settings.bitrate);
      const mp3Data: Int8Array[] = [];

      // Encode audio in chunks for better memory management
      const chunkSize = 1152; // Standard MP3 frame size
      const totalChunks = Math.ceil(left.length / chunkSize);

      for (let i = 0; i < left.length; i += chunkSize) {
        if (this.shouldCancel) {
          throw new CompressionError('Compression cancelled');
        }

        const leftChunk = left.subarray(i, i + chunkSize);
        const rightChunk = right ? right.subarray(i, i + chunkSize) : undefined;

        const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        // Update progress
        const chunkProgress = Math.floor((i / chunkSize) / totalChunks * 30); // 30% of remaining progress
        if (onProgress) onProgress(60 + chunkProgress);
      }

      // Flush encoder
      const mp3buf = encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }

      if (onProgress) onProgress(95);

      // Combine MP3 data
      const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedData = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of mp3Data) {
        combinedData.set(chunk, offset);
        offset += chunk.length;
      }

      return new Blob([combinedData], { type: 'audio/mpeg' });

    } catch (error) {
      throw new CompressionError(
        `MP3 compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compress audio to WAV format using wav-encoder
   * @param audioBuffer - Decoded audio buffer
   * @param settings - Audio settings
   * @param onProgress - Progress callback
   * @returns Promise<Blob> with compressed WAV
   */
  private async compressToWAV(
    audioBuffer: AudioBuffer,
    settings: AudioSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      const { encode } = await import('wav-encoder');
      
      if (onProgress) onProgress(50);

      // Prepare channel data
      const channelData: Float32Array[] = [];
      
      if (settings.channels === 1) {
        // Convert to mono
        const monoData = new Float32Array(audioBuffer.length);
        if (audioBuffer.numberOfChannels === 1) {
          monoData.set(audioBuffer.getChannelData(0));
        } else {
          // Mix stereo to mono
          const left = audioBuffer.getChannelData(0);
          const right = audioBuffer.getChannelData(1);
          for (let i = 0; i < audioBuffer.length; i++) {
            monoData[i] = (left[i] + right[i]) / 2;
          }
        }
        channelData.push(monoData);
      } else {
        // Use stereo
        channelData.push(audioBuffer.getChannelData(0));
        if (audioBuffer.numberOfChannels > 1) {
          channelData.push(audioBuffer.getChannelData(1));
        } else {
          // Duplicate mono to stereo
          channelData.push(audioBuffer.getChannelData(0));
        }
      }

      if (this.shouldCancel) {
        throw new CompressionError('Compression cancelled');
      }

      if (onProgress) onProgress(70);

      // Encode to WAV
      const wavBuffer = await encode({
        sampleRate: settings.sampleRate,
        channelData: channelData,
      }, {
        sampleRate: settings.sampleRate,
        float: false,
        bitDepth: 16,
      });

      if (onProgress) onProgress(90);

      return new Blob([wavBuffer], { type: 'audio/wav' });

    } catch (error) {
      throw new CompressionError(
        `WAV compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Prepare audio data for compression
   * @param audioBuffer - Source audio buffer
   * @param settings - Audio settings
   * @returns Prepared audio data as Int16Arrays
   */
  private prepareAudioData(audioBuffer: AudioBuffer, settings: AudioSettings): {
    left: Int16Array;
    right?: Int16Array;
  } {
    const length = audioBuffer.length;
    const left = new Int16Array(length);
    let right: Int16Array | undefined;

    // Convert float samples to 16-bit PCM
    const leftChannel = audioBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, leftChannel[i]));
      left[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    // Handle stereo
    if (settings.channels === 2) {
      right = new Int16Array(length);
      const rightChannel = audioBuffer.numberOfChannels > 1 
        ? audioBuffer.getChannelData(1) 
        : audioBuffer.getChannelData(0); // Duplicate mono to stereo

      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, rightChannel[i]));
        right[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
    }

    return { left, right };
  }

  /**
   * Compress audio with streaming for large files
   * @param file - Audio file to compress
   * @param settings - Compression settings
   * @param onProgress - Progress callback
   * @returns Promise<Blob> with compressed audio
   */
  async compressAudioWithStreaming(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // For now, use the same compression method
    // In a full implementation, this would process audio in chunks
    return this.compressAudio(file, settings, onProgress);
  }

  /**
   * Get audio settings with defaults
   * @param settings - Compression settings
   * @returns AudioSettings with defaults applied
   */
  private getAudioSettings(settings: CompressionSettings): AudioSettings {
    const defaults: AudioSettings = {
      bitrate: 128, // 128 kbps default
      sampleRate: 44100, // 44.1 kHz default
      channels: 2, // Stereo default
      format: 'mp3', // MP3 default for library compression
    };

    return {
      ...defaults,
      ...settings.audioSettings,
    };
  }

  /**
   * Cancel ongoing compression
   */
  cancelCompression(): void {
    this.shouldCancel = true;
  }

  /**
   * Check if compression is in progress
   * @returns boolean indicating if processing
   */
  isCompressing(): boolean {
    return this.isProcessing;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.isProcessing = false;
    this.shouldCancel = false;
  }
}

// Export singleton instance
export default new AudioLibCompressor();