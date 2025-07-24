/**
 * ImageCompressor service
 * Responsible for image compression using Canvas API and browser-image-compression library
 */

import imageCompression from 'browser-image-compression';
import { CompressionSettings } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';

/**
 * ImageCompressor service interface
 */
export interface ImageCompressorService {
  /**
   * Compresses an image based on provided settings
   * @param fileBuffer - The image file as ArrayBuffer
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed image as Blob
   */
  compressImage(
    fileBuffer: ArrayBuffer,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob>;

  /**
   * Compresses an image using stream processing for large files
   * @param file - The image file
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed image as Blob
   */
  compressImageWithStreaming(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob>;

  /**
   * Converts an image to a different format
   * @param blob - The image as Blob
   * @param format - Target format (e.g., 'image/jpeg', 'image/png', 'image/webp')
   * @param quality - Quality setting (0-1)
   * @returns Promise resolving to converted image as Blob
   */
  convertFormat(blob: Blob, format: string, quality: number): Promise<Blob>;
}

/**
 * ImageCompressor service implementation
 */
export class ImageCompressor implements ImageCompressorService {
  /**
   * Maps quality setting (0-100) to compression options
   * @param quality - Quality setting from 0 to 100
   * @returns Quality value (0-1, higher means better quality)
   */
  private mapQualityToCompressionOptions(quality: number): number {
    // Map quality setting to actual compression quality
    // Higher input quality = higher output quality = larger file size
    if (quality >= 90) {
      return 0.95; // Very high quality: 95% quality
    } else if (quality >= 80) {
      return 0.85; // High quality: 85% quality
    } else if (quality >= 70) {
      return 0.75; // Medium-high quality: 75% quality
    } else if (quality >= 60) {
      return 0.65; // Balanced quality: 65% quality (default case)
    } else if (quality >= 50) {
      return 0.55; // Medium quality: 55% quality
    } else if (quality >= 40) {
      return 0.45; // Medium-low quality: 45% quality
    } else if (quality >= 30) {
      return 0.35; // Low quality: 35% quality
    } else if (quality >= 20) {
      return 0.25; // Very low quality: 25% quality
    } else {
      return 0.15; // Minimum quality: 15% quality
    }
  }

  /**
   * Optimizes image dimensions for compression
   * @param width - Original width
   * @param height - Original height
   * @param quality - Quality setting (0-100)
   * @returns Optimized dimensions
   */
  private optimizeImageDimensions(
    width: number,
    height: number,
    quality: number
  ): { width: number; height: number } {
    // For very large images, reduce dimensions based on quality setting
    const maxDimension = Math.max(width, height);

    // Only resize if the image is large
    if (maxDimension > 2000) {
      // Scale factor based on quality
      let scaleFactor = 1;

      if (quality < 30) {
        scaleFactor = 0.5; // 50% of original size for low quality
      } else if (quality < 50) {
        scaleFactor = 0.6; // 60% of original size for medium-low quality
      } else if (quality < 70) {
        scaleFactor = 0.7; // 70% of original size for medium quality
      } else if (quality < 90) {
        scaleFactor = 0.8; // 80% of original size for medium-high quality
      } else {
        scaleFactor = 0.9; // 90% of original size for high quality
      }

      // Calculate new dimensions
      return {
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor),
      };
    }

    // Return original dimensions for smaller images
    return { width, height };
  }

  /**
   * Creates a File object from ArrayBuffer
   * @param buffer - The file as ArrayBuffer
   * @param type - MIME type of the file
   * @returns File object
   */
  private createFileFromArrayBuffer(buffer: ArrayBuffer, type: string): File {
    const blob = new Blob([buffer], { type });
    return new File([blob], 'temp-image', { type });
  }

  /**
   * Compresses an image based on provided settings
   * @param fileBuffer - The image file as ArrayBuffer
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed image as Blob
   */
  async compressImage(
    fileBuffer: ArrayBuffer,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      // Check browser compatibility for Canvas API
      if (!document.createElement('canvas').getContext) {
        throw new BrowserCompatibilityError('Canvas API');
      }

      // Check memory before processing
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available for image compression');
      }

      // Determine input file type based on ArrayBuffer signature
      // Default to JPEG if can't determine
      const type = this.determineFileType(fileBuffer) || 'image/jpeg';

      // Create a File object from ArrayBuffer
      const file = this.createFileFromArrayBuffer(fileBuffer, type);

      // Map quality setting to compression quality (0-1 for the library)
      const quality = this.mapQualityToCompressionOptions(settings.quality);
      
      // Debug logging
      console.log('🔧 Image Compression Debug:');
      console.log('- Input quality setting:', settings.quality);
      console.log('- Mapped compression quality:', quality);
      console.log('- Original file size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');

      // Get optimized dimensions
      let maxWidthOrHeight;

      if (settings.resolution) {
        // Use specified resolution
        maxWidthOrHeight = Math.max(settings.resolution.width, settings.resolution.height);
      } else {
        // Get image dimensions from the file
        const img = await createImageBitmap(file);
        const { width, height } = this.optimizeImageDimensions(
          img.width,
          img.height,
          settings.quality
        );
        maxWidthOrHeight = Math.max(width, height);
        img.close(); // Release resources
      }

      // Set up compression options - focus on quality, not file size
      const options = {
        maxWidthOrHeight,
        useWebWorker: true,
        maxIteration: 3, // Allow a few iterations for better quality
        initialQuality: quality,
        alwaysKeepResolution: false, // Allow resolution changes for better compression
        onProgress,
      };
      
      console.log('- Compression options:', JSON.stringify(options, null, 2));

      // Compress the image
      const compressedFile = await imageCompression(file, options);
      
      // Debug logging for results
      const originalSizeMB = file.size / (1024 * 1024);
      const compressedSizeMB = compressedFile.size / (1024 * 1024);
      const actualReduction = ((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100;
      console.log('- Compressed file size:', compressedSizeMB.toFixed(2), 'MB');
      console.log('- Actual size reduction:', actualReduction.toFixed(1), '%');
      console.log('🔧 End Image Compression Debug');

      // Check memory after compression
      MemoryManager.checkMemory();

      // Ensure compressedFile has a type property
      const outputType = compressedFile.type || type;

      // If output format is different from original, convert format
      if (settings.outputFormat && settings.outputFormat !== outputType) {
        return this.convertFormat(compressedFile, settings.outputFormat, quality);
      }

      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);

      // Convert to appropriate error type if it's not already
      if (
        !(error instanceof CompressionError) &&
        !(error instanceof BrowserCompatibilityError) &&
        !(error instanceof MemoryError)
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
   * Compresses an image using stream processing for large files
   * @param file - The image file
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed image as Blob
   */
  async compressImageWithStreaming(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      // Check browser compatibility for Canvas API
      if (!document.createElement('canvas').getContext) {
        throw new BrowserCompatibilityError('Canvas API');
      }

      // Check memory before processing
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available for image compression');
      }

      // For images, we can't process in chunks like video
      // Instead, we'll use a different approach by resizing first if needed

      // Map quality setting to compression quality (0-1 for the library)
      const quality = this.mapQualityToCompressionOptions(settings.quality);

      // Create a processing function for the image
      const processImage = async (): Promise<Blob> => {
        // Set up compression options - focus on quality, not file size
        const options = {
          maxWidthOrHeight: settings.resolution
            ? Math.max(settings.resolution.width, settings.resolution.height)
            : undefined,
          useWebWorker: true,
          maxIteration: 3, // Allow a few iterations for better quality
          initialQuality: quality,
          alwaysKeepResolution: false, // Allow resolution changes for better compression
          onProgress,
        };

        // Compress the image
        const compressedFile = await imageCompression(file, options);

        // Ensure compressedFile has a type property
        const outputType = compressedFile.type || file.type;

        // If output format is different from original, convert format
        if (settings.outputFormat && settings.outputFormat !== outputType) {
          return this.convertFormat(compressedFile, settings.outputFormat, quality);
        }

        return compressedFile;
      };

      // Process the image with memory monitoring
      const result = await processImage();

      // Check memory after processing
      MemoryManager.checkMemory();

      return result;
    } catch (error) {
      console.error('Error compressing image with streaming:', error);

      // Convert to appropriate error type if it's not already
      if (
        !(error instanceof CompressionError) &&
        !(error instanceof BrowserCompatibilityError) &&
        !(error instanceof MemoryError)
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
   * Determines file type based on ArrayBuffer signature
   * @param buffer - The file as ArrayBuffer
   * @returns MIME type or null if can't determine
   */
  private determineFileType(buffer: ArrayBuffer): string | null {
    const uint8Array = new Uint8Array(buffer.slice(0, 4));
    const signature = Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Check file signatures
    if (signature.startsWith('ffd8')) {
      return 'image/jpeg';
    } else if (signature.startsWith('89504e47')) {
      return 'image/png';
    } else if (signature.startsWith('52494646')) {
      return 'image/webp';
    }

    return null;
  }

  /**
   * Converts an image to a different format using Canvas API
   * @param blob - The image as Blob
   * @param format - Target format (e.g., 'image/jpeg', 'image/png', 'image/webp')
   * @param quality - Quality setting (0-1)
   * @returns Promise resolving to converted image as Blob
   */
  async convertFormat(blob: Blob, format: string, quality: number): Promise<Blob> {
    // Check browser compatibility for Canvas API
    if (!document.createElement('canvas').getContext) {
      throw new BrowserCompatibilityError('Canvas API');
    }

    return new Promise((resolve, reject) => {
      // Create an image element
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image on canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new CompressionError('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0);

          // Check if the format is supported
          if (!canvas.toBlob) {
            reject(new BrowserCompatibilityError('Canvas toBlob method'));
            return;
          }

          // Convert to desired format
          canvas.toBlob(
            result => {
              // Clean up the object URL
              URL.revokeObjectURL(img.src);

              if (result) {
                resolve(result);
              } else {
                reject(new CompressionError(`Failed to convert image to ${format} format`));
              }
            },
            format,
            quality
          );
        } catch (error) {
          // Clean up the object URL
          URL.revokeObjectURL(img.src);
          reject(
            new CompressionError(
              `Error during format conversion: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      };

      img.onerror = () => {
        // Clean up the object URL
        URL.revokeObjectURL(img.src);
        reject(new CompressionError('Failed to load image for format conversion'));
      };

      // Set image source
      img.src = URL.createObjectURL(blob);
    });
  }
}

// Export singleton instance
export default new ImageCompressor();
