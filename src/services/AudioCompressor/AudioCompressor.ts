/**
 * AudioCompressor service
 * Main audio compression service that orchestrates between Web Audio API and library fallbacks
 */

import { CompressionSettings, AudioSettings, FormatMetadata } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';
import { SecureProcessing } from '../../utils/security';
import WebAudioCompressor from './WebAudioCompressor';
import AudioLibCompressor from './AudioLibCompressor';

/**
 * Audio format detection interface
 */
interface AudioFormatInfo {
  format: 'mp3' | 'wav' | 'unknown';
  isValid: boolean;
  metadata?: FormatMetadata;
}

/**
 * AudioCompressor service implementation
 */
export class AudioCompressor {
  private isProcessing = false;

  /**
   * Get supported audio formats
   * @returns Array of supported format strings
   */
  static getSupportedFormats(): string[] {
    const formats = ['wav']; // WAV is always supported via Web Audio API

    if (AudioLibCompressor.isSupported()) {
      formats.push('mp3');
    }

    return formats;
  }

  /**
   * Check if a specific format is supported
   * @param format - Format to check
   * @returns boolean indicating support
   */
  static isFormatSupported(format: string): boolean {
    return this.getSupportedFormats().includes(format.toLowerCase());
  }

  /**
   * Detect audio format and validate file
   * @param file - Audio file to analyze
   * @returns Promise<AudioFormatInfo>
   */
  async detectFormat(file: File): Promise<AudioFormatInfo> {
    try {
      // Check file extension and MIME type
      const extension = file.name.toLowerCase().split('.').pop();
      const mimeType = file.type.toLowerCase();

      let format: 'mp3' | 'wav' | 'unknown' = 'unknown';

      // Determine format
      if (extension === 'mp3' || mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') {
        format = 'mp3';
      } else if (extension === 'wav' || mimeType === 'audio/wav' || mimeType === 'audio/wave') {
        format = 'wav';
      }

      // Validate file signature
      const isValid = await this.validateAudioSignature(file, format);

      // Extract metadata if possible
      let metadata: FormatMetadata | undefined;
      try {
        metadata = await this.extractMetadata(file);
      } catch (error) {
        console.warn('Could not extract audio metadata:', error);
      }

      return {
        format,
        isValid,
        metadata,
      };
    } catch (error) {
      console.error('Error detecting audio format:', error);
      return {
        format: 'unknown',
        isValid: false,
      };
    }
  }

  /**
   * Validate audio file signature
   * @param file - Audio file to validate
   * @param format - Expected format
   * @returns Promise<boolean>
   */
  private async validateAudioSignature(file: File, format: 'mp3' | 'wav' | 'unknown'): Promise<boolean> {
    try {
      const buffer = await file.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      switch (format) {
        case 'mp3':
          // MP3 frame header: FF FB (or FF FA for MPEG-2)
          return (bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xfa)) ||
                 // ID3 tag: 49 44 33 (ID3)
                 (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33);
        
        case 'wav':
          // RIFF header: 52 49 46 46 (RIFF)
          return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
        
        default:
          return true; // Unknown format, assume valid
      }
    } catch (error) {
      console.warn('Could not validate audio signature:', error);
      return true; // Assume valid if validation fails
    }
  }

  /**
   * Extract audio metadata
   * @param file - Audio file to analyze
   * @returns Promise<FormatMetadata>
   */
  async extractMetadata(file: File): Promise<FormatMetadata> {
    try {
      // Try to use Web Audio API for metadata extraction
      if (WebAudioCompressor.isSupported()) {
        const metadata = await WebAudioCompressor.extractMetadata(file);
        return {
          duration: metadata.duration,
          bitrate: metadata.bitrate,
          sampleRate: metadata.sampleRate,
          channels: metadata.numberOfChannels,
        };
      }

      // Fallback: basic metadata from file properties
      return {
        duration: 0, // Cannot determine without decoding
        bitrate: this.estimateBitrateFromSize(file.size),
        sampleRate: 44100, // Assume standard sample rate
        channels: 2, // Assume stereo
      };
    } catch (error) {
      console.error('Error extracting audio metadata:', error);
      throw new CompressionError(
        `Failed to extract audio metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Estimate bitrate from file size (rough approximation)
   * @param fileSize - File size in bytes
   * @returns Estimated bitrate in kbps
   */
  private estimateBitrateFromSize(fileSize: number): number {
    // Very rough estimation assuming 3-4 minute average song
    const averageDuration = 210; // 3.5 minutes in seconds
    return Math.round((fileSize * 8) / (averageDuration * 1000));
  }

  /**
   * Compress audio file using the best available method
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
    if (!MemoryManager.checkMemory()) {
      throw new MemoryError('Not enough memory available for audio compression');
    }

    this.isProcessing = true;

    try {
      if (onProgress) onProgress(5);

      // Validate privacy compliance for audio processing
      const privacyValidation = SecureProcessing.validatePrivacyCompliance('mp3', ['lamejs', 'wav-encoder']);
      if (!privacyValidation.isCompliant) {
        console.warn('Audio processing privacy warnings:', privacyValidation.warnings);
      }

      // Detect and validate audio format
      const formatInfo = await this.detectFormat(file);
      if (!formatInfo.isValid) {
        throw new CompressionError('Invalid or corrupted audio file');
      }

      if (onProgress) onProgress(10);

      // Get audio settings with defaults
      const audioSettings = this.getAudioSettings(settings);

      console.log('🎵 Audio Compression Debug:');
      console.log('- Detected format:', formatInfo.format);
      console.log('- Target format:', audioSettings.format);
      console.log('- Target bitrate:', audioSettings.bitrate, 'kbps');
      console.log('- Target sample rate:', audioSettings.sampleRate, 'Hz');
      console.log('- Target channels:', audioSettings.channels);

      // Choose compression method based on target format and browser support
      let compressedBlob: Blob;

      if (audioSettings.format === 'wav' && WebAudioCompressor.isSupported()) {
        try {
          // Try Web Audio API first for WAV compression
          console.log('- Using Web Audio API for WAV compression');
          compressedBlob = await WebAudioCompressor.compressAudio(file, settings, onProgress);
        } catch (webAudioError) {
          console.warn('Web Audio API compression failed, trying library fallback:', webAudioError);
          
          if (AudioLibCompressor.isSupported()) {
            console.log('- Using library fallback for WAV compression');
            compressedBlob = await AudioLibCompressor.compressAudio(file, settings, onProgress);
          } else {
            throw new CompressionError('No suitable audio compression method available');
          }
        }
      } else if (audioSettings.format === 'mp3') {
        // MP3 compression requires library support
        if (AudioLibCompressor.isSupported()) {
          console.log('- Using library compression for MP3');
          compressedBlob = await AudioLibCompressor.compressAudio(file, settings, onProgress);
        } else {
          throw new CompressionError('MP3 compression requires additional libraries');
        }
      } else {
        // Default to library compression
        if (AudioLibCompressor.isSupported()) {
          console.log('- Using library compression as default');
          compressedBlob = await AudioLibCompressor.compressAudio(file, settings, onProgress);
        } else if (WebAudioCompressor.isSupported()) {
          console.log('- Using Web Audio API as fallback');
          // Force WAV format for Web Audio API
          const wavSettings = {
            ...settings,
            audioSettings: {
              ...audioSettings,
              format: 'wav' as const,
            },
          };
          compressedBlob = await WebAudioCompressor.compressAudio(file, wavSettings, onProgress);
        } else {
          throw new BrowserCompatibilityError('Audio compression (Web Audio API or compression libraries)');
        }
      }

      // Debug logging for results
      const originalSizeMB = file.size / (1024 * 1024);
      const compressedSizeMB = compressedBlob.size / (1024 * 1024);
      const reduction = ((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100;

      console.log('- Original file size:', originalSizeMB.toFixed(2), 'MB');
      console.log('- Compressed file size:', compressedSizeMB.toFixed(2), 'MB');
      console.log('- Size reduction:', reduction.toFixed(1), '%');
      console.log('🎵 End Audio Compression Debug');

      return compressedBlob;

    } catch (error) {
      console.error('Error compressing audio:', error);
      throw new CompressionError(
        `Audio compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.isProcessing = false;
      
      // Secure memory disposal for audio data
      SecureProcessing.secureMemoryDisposal(null, 'audio');
      
      MemoryManager.cleanup();
    }
  }

  /**
   * Compress audio with streaming for large files using enhanced memory management
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
    const format = 'audio';
    const formatReqs = MemoryManager.getFormatMemoryRequirements(format);
    
    // Check if file should use streaming based on enhanced memory management
    const memoryCheck = MemoryManager.canProcessFile(file.size, format);
    
    if (!memoryCheck.shouldUseStreaming && file.size < formatReqs.streamingThreshold) {
      // Use regular compression for smaller files
      return this.compressAudio(file, settings, onProgress);
    }

    console.log('🎵 Using streaming compression for large audio file with enhanced memory management');

    // Register processing start for memory tracking
    const taskId = `audio-streaming-${Date.now()}`;
    MemoryManager.startProcessing(format, taskId);

    try {
      // Use library-based streaming compression with memory monitoring
      if (AudioLibCompressor.isSupported()) {
        const result = await AudioLibCompressor.compressAudioWithStreaming(file, settings, onProgress);
        return result;
      } else {
        // Fallback to regular compression with memory warnings
        console.warn('Streaming compression not available, using regular compression with memory monitoring');
        
        // Check if regular compression is safe
        if (!memoryCheck.canProcess) {
          throw new MemoryError(`Audio file too large for available memory: ${memoryCheck.warnings[0]?.message || 'Unknown memory issue'}`);
        }
        
        return this.compressAudio(file, settings, onProgress);
      }
    } finally {
      // Always clean up memory tracking
      MemoryManager.finishProcessing(format, taskId);
    }
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
      format: 'mp3', // MP3 default
    };

    // Apply quality-based bitrate adjustment if no specific bitrate is set
    if (!settings.audioSettings?.bitrate) {
      defaults.bitrate = this.qualityToBitrate(settings.quality);
    }

    return {
      ...defaults,
      ...settings.audioSettings,
    };
  }

  /**
   * Convert quality setting to bitrate
   * @param quality - Quality setting (0-100)
   * @returns Bitrate in kbps
   */
  private qualityToBitrate(quality: number): number {
    // Map quality to bitrate ranges
    if (quality >= 90) return 320; // High quality
    if (quality >= 80) return 256; // Very good quality
    if (quality >= 70) return 192; // Good quality
    if (quality >= 60) return 160; // Standard quality
    if (quality >= 50) return 128; // Acceptable quality
    if (quality >= 40) return 96;  // Lower quality
    if (quality >= 30) return 80;  // Low quality
    if (quality >= 20) return 64;  // Very low quality
    return 48; // Minimum quality
  }

  /**
   * Cancel ongoing compression
   */
  cancelCompression(): void {
    WebAudioCompressor.cancelCompression();
    AudioLibCompressor.cancelCompression();
  }

  /**
   * Check if compression is in progress
   * @returns boolean indicating if processing
   */
  isCompressing(): boolean {
    return this.isProcessing || WebAudioCompressor.isCompressing() || AudioLibCompressor.isCompressing();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    WebAudioCompressor.cleanup();
    AudioLibCompressor.cleanup();
    this.isProcessing = false;
  }
}

// Export singleton instance
export default new AudioCompressor();