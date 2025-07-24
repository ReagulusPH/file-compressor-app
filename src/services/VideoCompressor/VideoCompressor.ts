/**
 * VideoCompressor service
 * Responsible for video compression using FFmpeg.js
 */

import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { CompressionSettings } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
  WorkerError,
} from '../../utils/errors/ErrorTypes';
import { monitorMemory } from '../../utils/errors/ErrorUtils';
import MemoryManager from '../../utils/memory/MemoryManager';

/**
 * VideoCompressor service interface
 */
export interface VideoCompressorService {
  /**
   * Compresses a video based on provided settings
   * @param fileBuffer - The video file as ArrayBuffer
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed video as Blob
   */
  compressVideo(
    fileBuffer: ArrayBuffer,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob>;

  /**
   * Compresses a video using stream processing for large files
   * @param file - The video file
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed video as Blob
   */
  compressVideoWithStreaming(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob>;

  /**
   * Converts a video to a different format
   * @param fileBuffer - The video file as ArrayBuffer
   * @param format - Target format (e.g., 'mp4', 'webm')
   * @param quality - Quality setting (0-100)
   * @returns Promise resolving to converted video as Blob
   */
  convertFormat(fileBuffer: ArrayBuffer, format: string, quality: number): Promise<Blob>;

  /**
   * Adjusts video resolution
   * @param fileBuffer - The video file as ArrayBuffer
   * @param width - Target width
   * @param height - Target height
   * @param format - Output format
   * @param quality - Quality setting (0-100)
   * @returns Promise resolving to resized video as Blob
   */
  adjustResolution(
    fileBuffer: ArrayBuffer,
    width: number,
    height: number,
    format: string,
    quality: number
  ): Promise<Blob>;

  /**
   * Cancels any ongoing compression operations
   * @returns Promise that resolves when cancellation is complete
   */
  cancelCompression(): Promise<void>;
}

/**
 * VideoCompressor service implementation
 */
export class VideoCompressor implements VideoCompressorService {
  // FFmpeg instance - use local files for reliability
  private ffmpeg = createFFmpeg({
    log: true, // Enable logging for debugging
    corePath: `${window.location.origin}/ffmpeg/ffmpeg-core.js`,
    wasmPath: `${window.location.origin}/ffmpeg/ffmpeg-core.wasm`,
    workerPath: `${window.location.origin}/ffmpeg/ffmpeg-core.worker.js`,
  });

  // Flag to track if FFmpeg is loaded
  private ffmpegLoaded = false;

  // Flag to track if compression should be cancelled
  private compressionCancelled = false;

  // Stream processing chunk size (5MB)
  private readonly CHUNK_SIZE = 5 * 1024 * 1024;

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
   * Determines file type based on ArrayBuffer signature
   * @param buffer - The file as ArrayBuffer
   * @returns File extension or null if can't determine
   */
  private determineFileType(buffer: ArrayBuffer): string | null {
    const uint8Array = new Uint8Array(buffer.slice(0, 16));
    const signature = Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Check file signatures
    if (signature.startsWith('000001')) {
      return 'mp4';
    } else if (signature.includes('66747970')) {
      return 'mp4'; // ISO Base Media File Format (MP4, MOV, etc.)
    } else if (signature.startsWith('1a45dfa3')) {
      return 'webm'; // WebM
    } else if (signature.startsWith('52494646') && signature.includes('41564920')) {
      return 'avi'; // AVI
    } else if (signature.startsWith('1a45dfa3')) {
      return 'mkv'; // Matroska
    }

    return null;
  }

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

        console.log('🎬 Loading FFmpeg...');
        console.log('- Core path:', `${window.location.origin}/ffmpeg/ffmpeg-core.js`);
        console.log('- WASM path:', `${window.location.origin}/ffmpeg/ffmpeg-core.wasm`);
        console.log('- Worker path:', `${window.location.origin}/ffmpeg/ffmpeg-core.worker.js`);
        
        await this.ffmpeg.load();
        this.ffmpegLoaded = true;
        console.log('✅ FFmpeg loaded successfully!');
      } catch (error) {
        console.error('❌ FFmpeg loading error:', error);
        
        if (error instanceof BrowserCompatibilityError) {
          throw error;
        }
        
        // Try fallback with CDN
        console.log('🔄 Trying fallback CDN loading...');
        try {
          // Create new FFmpeg instance with CDN paths
          this.ffmpeg = createFFmpeg({
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
            wasmPath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm',
            workerPath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.worker.js',
          });
          
          await this.ffmpeg.load();
          this.ffmpegLoaded = true;
          console.log('✅ FFmpeg loaded successfully from CDN fallback!');
        } catch (fallbackError) {
          console.error('❌ CDN fallback also failed:', fallbackError);
          throw new WorkerError(
            `Failed to load FFmpeg: ${error instanceof Error ? error.message : String(error)}. CDN fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
          );
        }
      }
    }
  }

  /**
   * Compresses a video based on provided settings
   * @param fileBuffer - The video file as ArrayBuffer
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed video as Blob
   */
  async compressVideo(
    fileBuffer: ArrayBuffer,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // Set up memory monitoring
    const { checkMemory, cleanup } = monitorMemory();

    try {
      // Check memory before processing
      if (!checkMemory()) {
        throw new MemoryError('Not enough memory available for video compression');
      }

      await this.ensureFFmpegLoaded();

      // Determine input file type
      const inputType = this.determineFileType(fileBuffer) || 'mp4';
      const inputFileName = `input.${inputType}`;

      // Determine output format
      const outputFormat = settings.outputFormat.split('/')[1] || 'mp4';
      const outputFileName = `output.${outputFormat}`;

      try {
        // Write input file to FFmpeg virtual file system
        const fileData = new Uint8Array(fileBuffer);
        this.ffmpeg.FS('writeFile', inputFileName, fileData);
      } catch (error) {
        // Check if this is likely a memory error
        if (error instanceof Error && error.message.includes('memory')) {
          throw new MemoryError('Not enough memory to process this video file');
        }
        throw new CompressionError(
          `Failed to prepare video for compression: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Set up compression parameters
      const crf = this.mapQualityToCRF(settings.quality);
      const bitrate = this.mapQualityToBitrate(settings.quality);

      // Set up FFmpeg command
      const ffmpegArgs = [
        '-i',
        inputFileName,
        '-c:v',
        this.getVideoCodecForFormat(outputFormat),
        '-crf',
        crf.toString(),
        '-b:v',
        bitrate,
        '-preset',
        'fast',
      ];

      // Add resolution parameters if specified
      if (settings.resolution) {
        ffmpegArgs.push('-vf', `scale=${settings.resolution.width}:${settings.resolution.height}`);
      }

      // Add audio codec
      ffmpegArgs.push(
        '-c:a',
        this.getAudioCodecForFormat(outputFormat),
        '-strict',
        'experimental',
        outputFileName
      );

      // Set up progress handler if provided
      if (onProgress) {
        this.ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
          onProgress(Math.round(ratio * 100));

          // Check memory during processing
          checkMemory();
        });
      }

      // Run FFmpeg command
      try {
        await this.ffmpeg.run(...ffmpegArgs);
      } catch (error) {
        // Check if this is likely a memory error
        if (error instanceof Error && error.message.includes('memory')) {
          throw new MemoryError('Ran out of memory during video compression');
        }
        throw new CompressionError(
          `FFmpeg error: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Read output file from FFmpeg virtual file system
      let data;
      try {
        data = this.ffmpeg.FS('readFile', outputFileName);
      } catch (error) {
        throw new CompressionError(
          `Failed to read compressed video: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Create blob
      const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });

      // Clean up files from memory
      try {
        this.ffmpeg.FS('unlink', inputFileName);
        this.ffmpeg.FS('unlink', outputFileName);
      } catch (error) {
        console.warn('Failed to clean up temporary files:', error);
        // Non-critical error, don't throw
      }

      return blob;
    } catch (error) {
      console.error('Error compressing video:', error);

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
      cleanup();
    }
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
   * Converts a video to a different format
   * @param fileBuffer - The video file as ArrayBuffer
   * @param format - Target format (e.g., 'mp4', 'webm')
   * @param quality - Quality setting (0-100)
   * @returns Promise resolving to converted video as Blob
   */
  async convertFormat(fileBuffer: ArrayBuffer, format: string, quality: number): Promise<Blob> {
    // Set up memory monitoring
    const { checkMemory, cleanup } = monitorMemory();

    try {
      // Check memory before processing
      if (!checkMemory()) {
        throw new MemoryError('Not enough memory available for video format conversion');
      }

      await this.ensureFFmpegLoaded();

      // Determine input file type
      const inputType = this.determineFileType(fileBuffer) || 'mp4';
      const inputFileName = `input.${inputType}`;

      // Clean format string (remove 'video/' prefix if present)
      const outputFormat = format.replace('video/', '');
      const outputFileName = `output.${outputFormat}`;

      try {
        // Write input file to FFmpeg virtual file system
        const fileData = new Uint8Array(fileBuffer);
        this.ffmpeg.FS('writeFile', inputFileName, fileData);
      } catch (error) {
        // Check if this is likely a memory error
        if (error instanceof Error && error.message.includes('memory')) {
          throw new MemoryError('Not enough memory to process this video file');
        }
        throw new CompressionError(
          `Failed to prepare video for format conversion: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Set up FFmpeg command for format conversion
      const ffmpegArgs = [
        '-i',
        inputFileName,
        '-c:v',
        this.getVideoCodecForFormat(outputFormat),
        '-crf',
        this.mapQualityToCRF(quality).toString(),
        '-c:a',
        this.getAudioCodecForFormat(outputFormat),
        '-strict',
        'experimental',
        outputFileName,
      ];

      // Run FFmpeg command
      try {
        await this.ffmpeg.run(...ffmpegArgs);
      } catch (error) {
        // Check if this is likely a memory error
        if (error instanceof Error && error.message.includes('memory')) {
          throw new MemoryError('Ran out of memory during video format conversion');
        }
        throw new CompressionError(
          `FFmpeg error during format conversion: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Read output file from FFmpeg virtual file system
      let data;
      try {
        data = this.ffmpeg.FS('readFile', outputFileName);
      } catch (error) {
        throw new CompressionError(
          `Failed to read converted video: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Create blob
      const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });

      // Clean up files from memory
      try {
        this.ffmpeg.FS('unlink', inputFileName);
        this.ffmpeg.FS('unlink', outputFileName);
      } catch (error) {
        console.warn('Failed to clean up temporary files:', error);
        // Non-critical error, don't throw
      }

      return blob;
    } catch (error) {
      console.error('Error converting video format:', error);

      // Convert to appropriate error type if it's not already
      if (
        !(error instanceof CompressionError) &&
        !(error instanceof BrowserCompatibilityError) &&
        !(error instanceof MemoryError) &&
        !(error instanceof WorkerError)
      ) {
        throw new CompressionError(
          `Format conversion failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Re-throw the original error
      throw error;
    } finally {
      // Clean up resources
      cleanup();
    }
  }

  /**
   * Adjusts video resolution
   * @param fileBuffer - The video file as ArrayBuffer
   * @param width - Target width
   * @param height - Target height
   * @param format - Output format
   * @param quality - Quality setting (0-100)
   * @returns Promise resolving to resized video as Blob
   */
  async adjustResolution(
    fileBuffer: ArrayBuffer,
    width: number,
    height: number,
    format: string,
    quality: number
  ): Promise<Blob> {
    try {
      // Check memory before processing
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available for video resolution adjustment');
      }

      await this.ensureFFmpegLoaded();

      // Determine input file type
      const inputType = this.determineFileType(fileBuffer) || 'mp4';
      const inputFileName = `input.${inputType}`;

      // Clean format string (remove 'video/' prefix if present)
      const outputFormat = format.replace('video/', '');
      const outputFileName = `output.${outputFormat}`;

      try {
        // Write input file to FFmpeg virtual file system
        const fileData = new Uint8Array(fileBuffer);
        this.ffmpeg.FS('writeFile', inputFileName, fileData);
      } catch (error) {
        // Check if this is likely a memory error
        if (error instanceof Error && error.message.includes('memory')) {
          throw new MemoryError('Not enough memory to process this video file');
        }
        throw new CompressionError(
          `Failed to prepare video for resolution adjustment: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Set up FFmpeg command for resolution adjustment
      const ffmpegArgs = [
        '-i',
        inputFileName,
        '-c:v',
        this.getVideoCodecForFormat(outputFormat),
        '-vf',
        `scale=${width}:${height}`,
        '-crf',
        this.mapQualityToCRF(quality).toString(),
        '-preset',
        'fast',
        '-c:a',
        'copy', // Copy audio stream without re-encoding
        outputFileName,
      ];

      // Run FFmpeg command
      try {
        await this.ffmpeg.run(...ffmpegArgs);
      } catch (error) {
        // Check if this is likely a memory error
        if (error instanceof Error && error.message.includes('memory')) {
          throw new MemoryError('Ran out of memory during video resolution adjustment');
        }
        throw new CompressionError(
          `FFmpeg error during resolution adjustment: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Read output file from FFmpeg virtual file system
      let data;
      try {
        data = this.ffmpeg.FS('readFile', outputFileName);
      } catch (error) {
        throw new CompressionError(
          `Failed to read resized video: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Create blob
      const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });

      // Clean up files from memory
      try {
        this.ffmpeg.FS('unlink', inputFileName);
        this.ffmpeg.FS('unlink', outputFileName);
      } catch (error) {
        console.warn('Failed to clean up temporary files:', error);
        // Non-critical error, don't throw
      }

      return blob;
    } catch (error) {
      console.error('Error adjusting video resolution:', error);

      // Convert to appropriate error type if it's not already
      if (
        !(error instanceof CompressionError) &&
        !(error instanceof BrowserCompatibilityError) &&
        !(error instanceof MemoryError) &&
        !(error instanceof WorkerError)
      ) {
        throw new CompressionError(
          `Resolution adjustment failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Re-throw the original error
      throw error;
    } finally {
      // Clean up resources
      MemoryManager.cleanup();
    }
  }

  /**
   * Compresses a video using stream processing for large files
   * @param file - The video file
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed video as Blob
   */
  async compressVideoWithStreaming(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // Reset cancellation flag
    this.compressionCancelled = false;

    try {
      // Check memory before processing
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available for video compression');
      }

      await this.ensureFFmpegLoaded();

      // Determine input file type
      const fileExtension = file.name.split('.').pop() || 'mp4';
      const inputFileName = `input.${fileExtension}`;

      // Determine output format
      const outputFormat = settings.outputFormat.split('/')[1] || 'mp4';
      const outputFileName = `output.${outputFormat}`;

      // Get recommended chunk size based on current memory conditions
      const chunkSize = MemoryManager.getRecommendedChunkSize(file.size);

      // For videos, we need to process the entire file at once with FFmpeg
      // But we can read and write in chunks to reduce memory pressure

      // Report initial progress
      if (onProgress) {
        onProgress(5);
      }

      // Read the file in chunks and write to FFmpeg virtual file system
      let bytesWritten = 0;
      const totalBytes = file.size;
      const reader = new FileReader();

      // Create a function to read and write chunks
      const readAndWriteChunk = async (start: number, end: number): Promise<void> => {
        return new Promise((resolve, reject) => {
          // Check if compression was cancelled
          if (this.compressionCancelled) {
            reject(new Error('Compression cancelled'));
            return;
          }

          // Check memory before reading chunk
          if (!MemoryManager.checkMemory()) {
            reject(new MemoryError('Not enough memory to continue processing'));
            return;
          }

          const chunk = file.slice(start, end);

          reader.onload = async () => {
            try {
              if (reader.result instanceof ArrayBuffer) {
                // If this is the first chunk, create the file
                if (start === 0) {
                  this.ffmpeg.FS('writeFile', inputFileName, new Uint8Array(reader.result));
                } else {
                  // Append to existing file
                  const existingData = this.ffmpeg.FS('readFile', inputFileName);
                  const newData = new Uint8Array(existingData.length + reader.result.byteLength);
                  newData.set(existingData);
                  newData.set(new Uint8Array(reader.result), existingData.length);
                  this.ffmpeg.FS('writeFile', inputFileName, newData);
                }

                bytesWritten += reader.result.byteLength;

                // Report progress (up to 30%)
                if (onProgress) {
                  const readProgress = Math.min(30, Math.round((bytesWritten / totalBytes) * 30));
                  onProgress(readProgress);
                }

                resolve();
              } else {
                reject(new CompressionError('Failed to read file chunk as ArrayBuffer'));
              }
            } catch (error) {
              // Check if this is likely a memory error
              if (error instanceof Error && error.message.includes('memory')) {
                reject(new MemoryError('Not enough memory to process this video file'));
              } else {
                reject(
                  new CompressionError(
                    `Failed to process video chunk: ${error instanceof Error ? error.message : String(error)}`
                  )
                );
              }
            }
          };

          reader.onerror = () => {
            reject(
              new CompressionError(
                `Error reading file chunk: ${reader.error?.message || 'Unknown error'}`
              )
            );
          };

          reader.readAsArrayBuffer(chunk);
        });
      };

      // Read and write the file in chunks
      for (let start = 0; start < totalBytes; start += chunkSize) {
        const end = Math.min(start + chunkSize, totalBytes);
        await readAndWriteChunk(start, end);

        // Clean up after each chunk
        MemoryManager.cleanup();

        // Small delay to allow UI updates and potential garbage collection
        await new Promise(resolve => setTimeout(resolve, 0));

        // Check if compression was cancelled
        if (this.compressionCancelled) {
          throw new Error('Compression cancelled');
        }
      }

      // Report progress after file is loaded
      if (onProgress) {
        onProgress(30);
      }

      // Set up compression parameters
      const crf = this.mapQualityToCRF(settings.quality);
      const bitrate = this.mapQualityToBitrate(settings.quality);

      // Set up FFmpeg command
      const ffmpegArgs = [
        '-i',
        inputFileName,
        '-c:v',
        this.getVideoCodecForFormat(outputFormat),
        '-crf',
        crf.toString(),
        '-b:v',
        bitrate,
        '-preset',
        'fast',
      ];

      // Add resolution parameters if specified
      if (settings.resolution) {
        ffmpegArgs.push('-vf', `scale=${settings.resolution.width}:${settings.resolution.height}`);
      }

      // Add audio codec
      ffmpegArgs.push(
        '-c:a',
        this.getAudioCodecForFormat(outputFormat),
        '-strict',
        'experimental',
        outputFileName
      );

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

      // Read output file from FFmpeg virtual file system in chunks
      const outputData = this.ffmpeg.FS('readFile', outputFileName);

      // Create blob
      const blob = new Blob([outputData.buffer], { type: `video/${outputFormat}` });

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
      console.error('Error compressing video with streaming:', error);

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
export default new VideoCompressor();
