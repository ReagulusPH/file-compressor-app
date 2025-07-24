/**
 * Canvas-based ImageCompressor service
 * Simple, reliable image compression using native Canvas API
 */

import { CompressionSettings } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';
import TIFFUtils from '../../utils/tiffUtils';

/**
 * Canvas-based ImageCompressor service implementation
 */
export class CanvasImageCompressor {
  /**
   * Compresses an image using Canvas API
   * @param file - The image file
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed image as Blob
   */
  async compressImage(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // Check browser compatibility
    if (!document.createElement('canvas').getContext) {
      throw new BrowserCompatibilityError('Canvas API');
    }

    // Check memory before processing
    if (!MemoryManager.checkMemory()) {
      throw new MemoryError('Not enough memory available for image compression');
    }

    try {
      if (onProgress) onProgress(10);

      // Check if this is a TIFF file and handle it specially
      if (this.isTIFFFile(file)) {
        return await this.compressTIFFImage(file, settings, onProgress);
      }

      // Create image element for standard formats
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            if (onProgress) onProgress(30);

            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new CompressionError('Failed to get canvas context'));
              return;
            }

            // Calculate new dimensions based on quality
            const { width, height } = this.calculateDimensions(
              img.width,
              img.height,
              settings.quality
            );

            canvas.width = width;
            canvas.height = height;

            if (onProgress) onProgress(50);

            // Draw image on canvas with new dimensions
            ctx.drawImage(img, 0, 0, width, height);

            if (onProgress) onProgress(70);

            // Get output format and quality
            const outputFormat = this.getOutputFormat(settings.outputFormat);
            const quality = this.mapQualityToCanvasQuality(settings.quality);

            // Debug logging
            console.log('🔧 Canvas Image Compression Debug:');
            console.log('- Input quality setting:', settings.quality);
            console.log('- Canvas quality:', quality);
            console.log('- Original dimensions:', img.width, 'x', img.height);
            console.log('- New dimensions:', width, 'x', height);
            console.log('- Output format:', outputFormat);

            if (onProgress) onProgress(90);

            // Convert to blob
            canvas.toBlob(
              blob => {
                if (blob) {
                  // Debug logging for results
                  const originalSizeMB = file.size / (1024 * 1024);
                  const compressedSizeMB = blob.size / (1024 * 1024);
                  const reduction = ((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100;

                  console.log('- Original file size:', originalSizeMB.toFixed(2), 'MB');
                  console.log('- Compressed file size:', compressedSizeMB.toFixed(2), 'MB');
                  console.log('- Size reduction:', reduction.toFixed(1), '%');
                  console.log('🔧 End Canvas Image Compression Debug');

                  if (onProgress) onProgress(100);
                  resolve(blob);
                } else {
                  reject(new CompressionError('Failed to create compressed image blob'));
                }
              },
              outputFormat,
              quality
            );
          } catch (error) {
            reject(
              new CompressionError(
                `Canvas compression failed: ${error instanceof Error ? error.message : String(error)}`
              )
            );
          }
        };

        img.onerror = () => {
          reject(new CompressionError('Failed to load image'));
        };

        // Load the image
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new CompressionError(error instanceof Error ? error.message : String(error));
    } finally {
      // Clean up resources
      MemoryManager.cleanup();
    }
  }

  /**
   * Calculate new dimensions based on quality setting
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    quality: number
  ): { width: number; height: number } {
    // Scale factor based on quality (higher quality = larger dimensions)
    let scaleFactor: number;

    if (quality >= 90) {
      scaleFactor = 1.0; // Keep original size
    } else if (quality >= 80) {
      scaleFactor = 0.95; // 95% of original
    } else if (quality >= 70) {
      scaleFactor = 0.9; // 90% of original
    } else if (quality >= 60) {
      scaleFactor = 0.85; // 85% of original (default)
    } else if (quality >= 50) {
      scaleFactor = 0.8; // 80% of original
    } else if (quality >= 40) {
      scaleFactor = 0.7; // 70% of original
    } else if (quality >= 30) {
      scaleFactor = 0.6; // 60% of original
    } else if (quality >= 20) {
      scaleFactor = 0.5; // 50% of original
    } else {
      scaleFactor = 0.4; // 40% of original
    }

    const width = Math.round(originalWidth * scaleFactor);
    const height = Math.round(originalHeight * scaleFactor);

    // Ensure minimum dimensions
    return {
      width: Math.max(width, 100),
      height: Math.max(height, 100),
    };
  }

  /**
   * Map quality setting to Canvas quality (0-1)
   */
  private mapQualityToCanvasQuality(quality: number): number {
    // Canvas quality: 0 = lowest quality, 1 = highest quality
    // Map our 0-100 scale to 0.1-1.0 scale
    return Math.max(0.1, Math.min(1.0, quality / 100));
  }

  /**
   * Get output format for Canvas
   */
  private getOutputFormat(outputFormat: string): string {
    if (outputFormat.startsWith('image/')) {
      return outputFormat;
    }

    // Map format strings to MIME types
    switch (outputFormat.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'tiff':
      case 'tif':
        // TIFF cannot be output directly by Canvas, convert to JPEG
        return 'image/jpeg';
      default:
        return 'image/jpeg'; // Default fallback
    }
  }

  /**
   * Convert format using Canvas API
   */
  async convertFormat(blob: Blob, format: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new CompressionError('Failed to get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          result => {
            URL.revokeObjectURL(img.src);
            if (result) {
              resolve(result);
            } else {
              reject(new CompressionError(`Failed to convert to ${format}`));
            }
          },
          this.getOutputFormat(format),
          quality / 100
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new CompressionError('Failed to load image for conversion'));
      };

      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Check if file is a TIFF image
   * @param file - File to check
   * @returns boolean indicating if file is TIFF
   */
  private isTIFFFile(file: File): boolean {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension === 'tiff' || extension === 'tif' || file.type === 'image/tiff';
  }

  /**
   * Compress TIFF image using tiff.js library
   * @param file - TIFF file to compress
   * @param settings - Compression settings
   * @param onProgress - Progress callback
   * @returns Promise<Blob> with compressed image
   */
  private async compressTIFFImage(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      // Check if UTIF is available
      if (!TIFFUtils.isAvailable()) {
        throw new CompressionError('UTIF library is not available');
      }

      if (onProgress) onProgress(20);

      // Validate TIFF file signature
      const isValidTIFF = await TIFFUtils.validateTIFFSignature(file);
      if (!isValidTIFF) {
        throw new CompressionError('Invalid TIFF file signature');
      }

      if (onProgress) onProgress(30);

      // Parse TIFF metadata
      const metadata = await TIFFUtils.parseTIFFMetadata(file);
      console.log('🔧 TIFF Compression Debug:');
      console.log('- TIFF metadata:', metadata);

      if (onProgress) onProgress(40);

      // Convert TIFF to canvas
      const tiffCanvas = await TIFFUtils.tiffToCanvas(file);

      if (onProgress) onProgress(60);

      // Create a new canvas for compression with calculated dimensions
      const { width, height } = this.calculateDimensions(
        tiffCanvas.width,
        tiffCanvas.height,
        settings.quality
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new CompressionError('Failed to get canvas context');
      }

      canvas.width = width;
      canvas.height = height;

      // Draw TIFF content on new canvas with compression
      ctx.drawImage(tiffCanvas, 0, 0, width, height);

      if (onProgress) onProgress(80);

      // Get output format and quality
      const outputFormat = this.getOutputFormat(settings.outputFormat);
      const quality = this.mapQualityToCanvasQuality(settings.quality);

      console.log('- Original TIFF dimensions:', tiffCanvas.width, 'x', tiffCanvas.height);
      console.log('- Compressed dimensions:', width, 'x', height);
      console.log('- Output format:', outputFormat);
      console.log('- Quality:', quality);

      // Convert to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) {
              // Debug logging for results
              const originalSizeMB = file.size / (1024 * 1024);
              const compressedSizeMB = blob.size / (1024 * 1024);
              const reduction = ((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100;

              console.log('- Original TIFF size:', originalSizeMB.toFixed(2), 'MB');
              console.log('- Compressed size:', compressedSizeMB.toFixed(2), 'MB');
              console.log('- Size reduction:', reduction.toFixed(1), '%');
              console.log('🔧 End TIFF Compression Debug');

              if (onProgress) onProgress(100);
              resolve(blob);
            } else {
              reject(new CompressionError('Failed to create compressed TIFF blob'));
            }
          },
          outputFormat,
          quality
        );
      });
    } catch (error) {
      console.error('Error compressing TIFF image:', error);
      throw new CompressionError(
        `TIFF compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert TIFF to other formats
   * @param file - TIFF file to convert
   * @param format - Target format
   * @param quality - Quality setting (0-100)
   * @returns Promise<Blob> with converted image
   */
  async convertTIFFFormat(file: File, format: string, quality: number): Promise<Blob> {
    try {
      if (!TIFFUtils.isAvailable()) {
        throw new CompressionError('UTIF library is not available');
      }

      // Use TIFFUtils for direct conversion
      const outputFormat = this.getOutputFormat(format);
      const qualityRatio = this.mapQualityToCanvasQuality(quality);

      return await TIFFUtils.convertTIFFToFormat(file, outputFormat, qualityRatio);
    } catch (error) {
      console.error('Error converting TIFF format:', error);
      throw new CompressionError(
        `TIFF format conversion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Export singleton instance
export default new CanvasImageCompressor();
