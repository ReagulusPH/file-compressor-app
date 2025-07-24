/**
 * OptimizedVideoCompressor service
 * Enhanced version of VideoCompressor with optimized algorithms for browser performance
 */

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { CompressionSettings } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
  WorkerError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';

/**
 * OptimizedVideoCompressor service interface
 */
export interface OptimizedVideoCompressorService {
  /**
   * Compresses a video with optimized settings
   * @param file - The video file or ArrayBuffer
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed video as Blob
   */
  compressVideo(
    file: File | ArrayBuffer,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob>;

  /**
   * Cancels any ongoing compression operations
   * @returns Promise that resolves when cancellation is complete
   */
  cancelCompression(): Promise<void>;
}

/**
 * OptimizedVideoCompressor service implementation
 */
export class OptimizedVideoCompressor implements OptimizedVideoCompressorService {
  // FFmpeg instance
  private ffmpeg = createFFmpeg({
    log: false, // Set to true for debugging
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
  });

  // Flag to track if FFmpeg is loaded
  private ffmpegLoaded = false;

  // Flag to track if compression should be cancelled
  private compressionCancelled = false;

  // Stream processing chunk size (5MB)
  private readonly CHUNK_SIZE = 5 * 1024 * 1024;

  /**
   * Ensures FFmpeg is loaded
   */
  private async ensureFFmpegLoaded(): Promise<void> {
    if (!this.ffmpegLoaded) {
      try {
        // Check for SharedArrayBuffer support (required for FFmpeg.js)
        if (typeof SharedArrayBuffer === 'undefined') {
          throw new BrowserCompatibilityError('SharedArrayBuffer (required for video compression)');
        }

        await this.ffmpeg.load();
        this.ffmpegLoaded = true;
      } catch (error) {
        if (error instanceof BrowserCompatibilityError) {
          throw error;
        }
        throw new WorkerError(
          `Failed to load FFmpeg: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Maps quality setting (0-100) to FFmpeg CRF value (0-51, lower is better)
   * @param quality - Quality setting from 0 to 100
   * @returns CRF value (0-51)
   */
  private mapQualityToCRF(quality: number): number {
    // More aggressive CRF mapping for better compression
    // CRF 18-28 is generally considered good quality range
    if (quality >= 90) {
      return 20; // High quality
    } else if (quality >= 70) {
      return 25; // Good quality
    } else if (quality >= 50) {
      return 30; // Medium quality
    } else if (quality >= 30) {
      return 35; // Low quality
    } else {
      return 40; // Very low quality
    }
  }

  /**
   * Maps quality setting (0-100) to FFmpeg bitrate value
   * @param quality - Quality setting from 0 to 100
   * @param resolution - Video resolution (if available)
   * @returns Bitrate string (e.g., '1000k')
   */
  private mapQualityToBitrate(
    quality: number,
    resolution?: { width: number; height: number }
  ): string {
    // More aggressive bitrate mapping for better compression
    let baseBitrate: number;

    if (quality >= 90) {
      baseBitrate = 3000; // 3 Mbps for high quality (reduced from 5000)
    } else if (quality >= 70) {
      baseBitrate = 2000; // 2 Mbps for good quality (reduced from 3000)
    } else if (quality >= 50) {
      baseBitrate = 1000; // 1 Mbps for medium quality (reduced from 1500)
    } else if (quality >= 30) {
      baseBitrate = 600; // 600 kbps for low quality (reduced from 800)
    } else {
      baseBitrate = 400; // 400 kbps for very low quality (reduced from 500)
    }

    // Adjust bitrate based on resolution if available
    if (resolution) {
      const pixels = resolution.width * resolution.height;
      const hdPixels = 1280 * 720; // 720p reference

      // Scale bitrate based on resolution relative to 720p
      const scaleFactor = Math.sqrt(pixels / hdPixels);
      baseBitrate = Math.round(baseBitrate * scaleFactor);
    }

    return `${baseBitrate}k`;
  }

  /**
   * Optimizes video resolution based on quality setting
   * @param originalWidth - Original width
   * @param originalHeight - Original height
   * @param quality - Quality setting (0-100)
   * @returns Optimized resolution
   */
  private optimizeVideoResolution(
    originalWidth: number,
    originalHeight: number,
    quality: number
  ): { width: number; height: number } {
    // For very high resolution videos, reduce dimensions based on quality
    const maxDimension = Math.max(originalWidth, originalHeight);

    // Only resize if the video is large
    if (maxDimension > 1280) {
      let targetHeight: number;

      // Determine target height based on quality
      if (quality < 30) {
        targetHeight = 480; // 480p for low quality
      } else if (quality < 50) {
        targetHeight = 720; // 720p for medium-low quality
      } else if (quality < 70) {
        targetHeight = 1080; // 1080p for medium quality
      } else if (quality < 90) {
        targetHeight = 1440; // 1440p for medium-high quality
      } else {
        targetHeight = 2160; // 4K for high quality
      }

      // Cap target height to original height
      targetHeight = Math.min(targetHeight, originalHeight);

      // Calculate width while maintaining aspect ratio
      const aspectRatio = originalWidth / originalHeight;
      const targetWidth = Math.round(targetHeight * aspectRatio);

      // Ensure width is even (required by some codecs)
      const evenWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;

      // Ensure height is even (required by some codecs)
      const evenHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

      return { width: evenWidth, height: evenHeight };
    }

    // Ensure dimensions are even for smaller videos
    const evenWidth = originalWidth % 2 === 0 ? originalWidth : originalWidth + 1;
    const evenHeight = originalHeight % 2 === 0 ? originalHeight : originalHeight + 1;

    return { width: evenWidth, height: evenHeight };
  }

  /**
   * Gets the appropriate video codec for the specified format
   * @param format - Output format
   * @returns Video codec string
   */
  private getVideoCodecForFormat(format: string): string {
    switch (format.toLowerCase()) {
      case 'mp4':
        return 'libx264';
      case 'webm':
        return 'libvpx-vp9';
      case 'avi':
        return 'mpeg4';
      case 'mkv':
        return 'libx264';
      default:
        return 'libx264'; // Default to H.264
    }
  }

  /**
   * Gets the appropriate audio codec for the specified format
   * @param format - Output format
   * @returns Audio codec string
   */
  private getAudioCodecForFormat(format: string): string {
    switch (format.toLowerCase()) {
      case 'mp4':
        return 'aac';
      case 'webm':
        return 'libopus';
      case 'avi':
        return 'mp3';
      case 'mkv':
        return 'aac';
      default:
        return 'aac'; // Default to AAC
    }
  }

  /**
   * Analyzes video to get information like dimensions
   * @param inputFileName - Input file name in FFmpeg virtual filesystem
   * @returns Video information
   */
  private async analyzeVideo(
    inputFileName: string
  ): Promise<{ width: number; height: number } | null> {
    try {
      // Run FFprobe to get video information
      await this.ffmpeg.run(
        '-i',
        inputFileName,
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'csv=p=0',
        'info.txt'
      );

      // Read the output
      const info = this.ffmpeg.FS('readFile', 'info.txt').toString();
      const [width, height] = info.trim().split(',').map(Number);

      // Clean up info file
      this.ffmpeg.FS('unlink', 'info.txt');

      if (width && height) {
        return { width, height };
      }

      return null;
    } catch (e) {
      console.warn('Could not analyze video:', e);
      return null;
    }
  }

  /**
   * Reads a file chunk as ArrayBuffer
   * @param chunk - The file chunk to read
   * @returns Promise resolving to ArrayBuffer
   */
  private async readFileChunkAsArrayBuffer(chunk: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file chunk as ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(new Error(`Error reading file chunk: ${reader.error?.message || 'Unknown error'}`));
      };

      reader.readAsArrayBuffer(chunk);
    });
  }

  /**
   * Compresses a video with optimized settings
   * @param file - The video file or ArrayBuffer
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed video as Blob
   */
  async compressVideo(
    file: File | ArrayBuffer,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // Reset cancellation flag
    this.compressionCancelled = false;

    // Convert ArrayBuffer to File if needed
    let videoFile: File;
    if (file instanceof ArrayBuffer) {
      const blob = new Blob([file], { type: 'video/mp4' });
      videoFile = new File([blob], 'video.mp4', { type: 'video/mp4' });
    } else {
      videoFile = file;
    }

    console.log('Starting video compression for file:', videoFile.name, 'Size:', videoFile.size, 'Settings:', settings);

    try {
      // Check memory before processing
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available for video compression');
      }

      console.log('Loading FFmpeg...');
      await this.ensureFFmpegLoaded();
      console.log('FFmpeg loaded successfully');

      // Report initial progress
      if (onProgress) {
        onProgress(5);
      }

      // Get file extension from file name
      const fileExtension = videoFile.name.split('.').pop() || 'mp4';
      const inputFileName = `input.${fileExtension}`;

      // Determine output format
      const outputFormat = settings.outputFormat.split('/')[1] || 'mp4';
      const outputFileName = `output.${outputFormat}`;

      // Get recommended chunk size based on current memory conditions
      const chunkSize = MemoryManager.getRecommendedChunkSize(videoFile.size);

      // Read the file in chunks and write to FFmpeg virtual file system
      let bytesWritten = 0;
      const totalBytes = videoFile.size;

      // Process file in chunks
      for (let start = 0; start < totalBytes; start += chunkSize) {
        // Check for cancellation
        if (this.compressionCancelled) {
          throw new Error('Compression cancelled');
        }

        // Check memory before processing chunk
        if (!MemoryManager.checkMemory()) {
          throw new MemoryError('Not enough memory to continue processing');
        }

        const end = Math.min(start + chunkSize, totalBytes);
        const chunk = videoFile.slice(start, end);

        // Read chunk
        const chunkBuffer = await this.readFileChunkAsArrayBuffer(chunk);

        // Write chunk to FFmpeg file system
        if (start === 0) {
          // First chunk - create new file
          this.ffmpeg.FS('writeFile', inputFileName, new Uint8Array(chunkBuffer));
        } else {
          // Append to existing file
          const existingData = this.ffmpeg.FS('readFile', inputFileName);
          const newData = new Uint8Array(existingData.length + chunkBuffer.byteLength);
          newData.set(existingData);
          newData.set(new Uint8Array(chunkBuffer), existingData.length);
          this.ffmpeg.FS('writeFile', inputFileName, newData);
        }

        bytesWritten += chunkBuffer.byteLength;

        // Report progress during file reading (up to 30%)
        if (onProgress) {
          const readProgress = Math.min(30, Math.round((bytesWritten / totalBytes) * 30));
          onProgress(readProgress);
        }

        // Clean up after each chunk
        MemoryManager.cleanup();

        // Small delay to allow UI updates and potential garbage collection
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Check for cancellation
      if (this.compressionCancelled) {
        throw new Error('Compression cancelled');
      }

      // Report progress after file is loaded
      if (onProgress) {
        onProgress(30);
      }

      // Get video information to optimize settings
      let resolution = settings.resolution;

      // If no resolution is specified, analyze the video to get dimensions
      if (!resolution) {
        const videoInfo = await this.analyzeVideo(inputFileName);
        if (videoInfo) {
          // Optimize resolution based on quality
          resolution = this.optimizeVideoResolution(
            videoInfo.width,
            videoInfo.height,
            settings.quality
          );
        }
      }

      // Set up compression parameters
      const crf = this.mapQualityToCRF(settings.quality);
      const bitrate = this.mapQualityToBitrate(settings.quality, resolution);

      // Set up FFmpeg command with optimized settings
      const ffmpegArgs = [
        '-i',
        inputFileName,
        '-c:v',
        this.getVideoCodecForFormat(outputFormat),
        '-crf',
        crf.toString(),
        '-maxrate',
        bitrate,
        '-bufsize',
        `${parseInt(bitrate) * 2}k`, // Buffer size should be 2x bitrate
        '-preset',
        'medium', // Better compression than 'fast'
        '-profile:v',
        'main', // Use main profile for better compatibility
        '-level',
        '4.0', // H.264 level for good compatibility
      ];

      // Add resolution parameters if available
      if (resolution) {
        ffmpegArgs.push('-vf', `scale=${resolution.width}:${resolution.height}:flags=lanczos`);
      }

      // Add audio codec with optimized settings
      ffmpegArgs.push(
        '-c:a',
        this.getAudioCodecForFormat(outputFormat),
        '-b:a',
        '96k', // Lower audio bitrate for more compression
        '-ac',
        '2', // Stereo audio
        '-movflags',
        '+faststart', // Optimize for web streaming
        '-f',
        outputFormat, // Explicitly set output format
        outputFileName
      );

      console.log('FFmpeg command:', ffmpegArgs.join(' '));

      // Set up progress handler if provided
      if (onProgress) {
        this.ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
          // Check if compression was cancelled
          if (this.compressionCancelled) {
            return;
          }

          const processProgress = Math.round(30 + ratio * 60); // Scale from 30% to 90%
          onProgress(processProgress);

          // Check memory during processing
          MemoryManager.checkMemory();
        });
      }

      // Run FFmpeg command
      try {
        await this.ffmpeg.run(...ffmpegArgs);
      } catch (error) {
        // Check if compression was cancelled
        if (this.compressionCancelled) {
          throw new Error('Compression cancelled');
        }

        // Check if this is likely a memory error
        if (error instanceof Error && error.message.includes('memory')) {
          throw new MemoryError('Ran out of memory during video compression');
        }
        throw new CompressionError(
          `FFmpeg error: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Report progress after compression
      if (onProgress) {
        onProgress(90);
      }

      // Read output file from FFmpeg virtual file system
      const outputData = this.ffmpeg.FS('readFile', outputFileName);

      // Create blob
      const blob = new Blob([outputData.buffer], { type: `video/${outputFormat}` });

      console.log('Video compression completed. Original size:', videoFile.size, 'Compressed size:', blob.size, 'Compression ratio:', ((blob.size / videoFile.size) * 100).toFixed(2) + '%');

      // Clean up files from memory
      try {
        this.ffmpeg.FS('unlink', inputFileName);
        this.ffmpeg.FS('unlink', outputFileName);
      } catch (error) {
        console.warn('Failed to clean up temporary files:', error);
        // Non-critical error, don't throw
      }

      // Report final progress
      if (onProgress) {
        onProgress(100);
      }

      return blob;
    } catch (error) {
      console.error('Error compressing video:', error);

      // If compression was cancelled, throw a specific error
      if (this.compressionCancelled) {
        throw new Error('Compression cancelled by user');
      }

      // Convert to appropriate error type if it's not already
      if (
        !(error instanceof CompressionError) &&
        !(error instanceof BrowserCompatibilityError) &&
        !(error instanceof MemoryError) &&
        !(error instanceof WorkerError)
      ) {
        throw new CompressionError(error instanceof Error ? error.message : String(error));
      }

      // Re-throw the original error
      throw error;
    } finally {
      // Clean up resources
      MemoryManager.cleanup();
    }
  }



  /**
   * Cancels any ongoing compression operations
   * @returns Promise that resolves when cancellation is complete
   */
  async cancelCompression(): Promise<void> {
    this.compressionCancelled = true;

    // Give time for any ongoing operations to detect cancellation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clean up any resources
    try {
      // Try to clean up any temporary files
      const files = this.ffmpeg.FS('readdir', '/');
      for (const file of files) {
        if (file.startsWith('input.') || file.startsWith('output.')) {
          try {
            this.ffmpeg.FS('unlink', file);
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      }
    } catch (e) {
      // Ignore errors during cleanup
    }

    // Force garbage collection
    MemoryManager.cleanup();
  }
}

// Export singleton instance
export default new OptimizedVideoCompressor();
