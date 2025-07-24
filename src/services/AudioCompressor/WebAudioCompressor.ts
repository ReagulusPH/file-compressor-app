/**
 * WebAudioCompressor service
 * Primary audio compression using Web Audio API for MP3 and WAV files
 */

import { CompressionSettings, AudioSettings } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';
import { SecureProcessing } from '../../utils/security';

/**
 * Audio metadata interface
 */
interface AudioMetadata {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  bitrate?: number;
}

/**
 * WebAudioCompressor service implementation
 */
export class WebAudioCompressor {
  private audioContext: AudioContext | null = null;
  private isProcessing = false;
  private shouldCancel = false;

  /**
   * Check if Web Audio API is supported
   * @returns boolean indicating support
   */
  static isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Instance method to check support (for consistency)
   * @returns boolean indicating availability
   */
  isSupported(): boolean {
    return WebAudioCompressor.isSupported();
  }

  /**
   * Initialize AudioContext
   * @returns Promise<AudioContext>
   */
  private async initializeAudioContext(): Promise<AudioContext> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return this.audioContext;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new BrowserCompatibilityError('Web Audio API');
    }

    this.audioContext = new AudioContextClass();
    
    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Extract audio metadata from file
   * @param file - Audio file to analyze
   * @returns Promise<AudioMetadata>
   */
  async extractMetadata(file: File): Promise<AudioMetadata> {
    try {
      const audioContext = await this.initializeAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      return {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitrate: this.estimateBitrate(file.size, audioBuffer.duration),
      };
    } catch (error) {
      console.error('Error extracting audio metadata:', error);
      throw new CompressionError(
        `Failed to extract audio metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Estimate bitrate from file size and duration
   * @param fileSize - File size in bytes
   * @param duration - Duration in seconds
   * @returns Estimated bitrate in kbps
   */
  private estimateBitrate(fileSize: number, duration: number): number {
    if (duration === 0) return 0;
    return Math.round((fileSize * 8) / (duration * 1000));
  }

  /**
   * Compress audio file using Web Audio API
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
    if (!WebAudioCompressor.isSupported()) {
      throw new BrowserCompatibilityError('Web Audio API');
    }

    if (!MemoryManager.checkMemory()) {
      throw new MemoryError('Not enough memory available for audio compression');
    }

    this.isProcessing = true;
    this.shouldCancel = false;
    
    let audioBuffer: AudioBuffer | null = null;

    try {
      if (onProgress) onProgress(10);

      // Initialize audio context
      const audioContext = await this.initializeAudioContext();
      
      if (onProgress) onProgress(20);

      // Decode audio file
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (this.shouldCancel) {
        throw new CompressionError('Compression cancelled');
      }

      if (onProgress) onProgress(40);

      // Get audio settings with defaults
      const audioSettings = this.getAudioSettings(settings);
      
      // Process audio based on target format and settings
      let compressedBlob: Blob;
      
      if (audioSettings.format === 'wav') {
        compressedBlob = await this.compressToWAV(audioBuffer, audioSettings, onProgress);
      } else if (audioSettings.format === 'mp3') {
        // For MP3, we'll need to fall back to library-based compression
        // as Web Audio API doesn't natively support MP3 encoding
        throw new CompressionError('MP3 encoding requires library fallback');
      } else {
        // Default to WAV compression
        compressedBlob = await this.compressToWAV(audioBuffer, audioSettings, onProgress);
      }

      if (onProgress) onProgress(100);
      return compressedBlob;

    } catch (error) {
      console.error('Error compressing audio:', error);
      throw new CompressionError(
        `Audio compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.isProcessing = false;
      
      // Secure memory disposal for audio buffer data
      if (audioBuffer) {
        SecureProcessing.secureMemoryDisposal(audioBuffer, 'audio');
      }
      
      MemoryManager.cleanup();
    }
  }

  /**
   * Compress audio to WAV format using Web Audio API
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
      if (onProgress) onProgress(50);

      // Resample if needed
      let processedBuffer = audioBuffer;
      if (settings.sampleRate !== audioBuffer.sampleRate) {
        processedBuffer = await this.resampleAudio(audioBuffer, settings.sampleRate);
      }

      if (this.shouldCancel) {
        throw new CompressionError('Compression cancelled');
      }

      if (onProgress) onProgress(70);

      // Convert to mono if needed
      if (settings.channels === 1 && processedBuffer.numberOfChannels > 1) {
        processedBuffer = this.convertToMono(processedBuffer);
      }

      if (onProgress) onProgress(80);

      // Convert to WAV format
      const wavBlob = this.audioBufferToWAV(processedBuffer);

      if (onProgress) onProgress(90);

      return wavBlob;
    } catch (error) {
      throw new CompressionError(
        `WAV compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Resample audio to target sample rate
   * @param audioBuffer - Source audio buffer
   * @param targetSampleRate - Target sample rate
   * @returns Promise<AudioBuffer> with resampled audio
   */
  private async resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new CompressionError('Audio context not initialized');
    }

    // Create offline context for resampling
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    // Create buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    // Render the resampled audio
    return await offlineContext.startRendering();
  }

  /**
   * Convert stereo audio to mono
   * @param audioBuffer - Source audio buffer
   * @returns AudioBuffer with mono audio
   */
  private convertToMono(audioBuffer: AudioBuffer): AudioBuffer {
    if (!this.audioContext) {
      throw new CompressionError('Audio context not initialized');
    }

    const monoBuffer = this.audioContext.createBuffer(
      1,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const monoData = monoBuffer.getChannelData(0);
    
    if (audioBuffer.numberOfChannels === 2) {
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);
      
      // Mix left and right channels
      for (let i = 0; i < audioBuffer.length; i++) {
        monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }
    } else {
      // Copy first channel
      const sourceData = audioBuffer.getChannelData(0);
      monoData.set(sourceData);
    }

    return monoBuffer;
  }

  /**
   * Convert AudioBuffer to WAV Blob
   * @param audioBuffer - Audio buffer to convert
   * @returns Blob with WAV data
   */
  private audioBufferToWAV(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2; // 16-bit
    
    // Calculate buffer size
    const bufferLength = 44 + length * numberOfChannels * bytesPerSample;
    const buffer = new ArrayBuffer(bufferLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    this.writeWAVHeader(view, numberOfChannels, sampleRate, length, bytesPerSample);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        // Convert float to 16-bit PCM
        const intSample = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Write WAV file header
   * @param view - DataView to write to
   * @param numberOfChannels - Number of audio channels
   * @param sampleRate - Sample rate
   * @param length - Audio length in samples
   * @param bytesPerSample - Bytes per sample
   */
  private writeWAVHeader(
    view: DataView,
    numberOfChannels: number,
    sampleRate: number,
    length: number,
    bytesPerSample: number
  ): void {
    const byteRate = sampleRate * numberOfChannels * bytesPerSample;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * numberOfChannels * bytesPerSample;
    
    // RIFF header
    view.setUint32(0, 0x46464952, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    view.setUint32(8, 0x45564157, false); // "WAVE"
    
    // Format chunk
    view.setUint32(12, 0x20746d66, false); // "fmt "
    view.setUint32(16, 16, true); // Chunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, numberOfChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, byteRate, true); // Byte rate
    view.setUint16(32, blockAlign, true); // Block align
    view.setUint16(34, bytesPerSample * 8, true); // Bits per sample
    
    // Data chunk
    view.setUint32(36, 0x61746164, false); // "data"
    view.setUint32(40, dataSize, true); // Data size
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
      format: 'wav', // WAV default for Web Audio API
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
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isProcessing = false;
    this.shouldCancel = false;
  }
}

// Export singleton instance
export default new WebAudioCompressor();