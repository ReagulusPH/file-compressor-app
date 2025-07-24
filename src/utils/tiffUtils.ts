/**
 * TIFF utility functions for handling TIFF image format
 * Uses tiff.js library for TIFF parsing and conversion
 */

// Import UTIF library
// @ts-ignore - UTIF doesn't have TypeScript definitions
import UTIF from 'utif';

/**
 * TIFF metadata interface
 */
export interface TIFFMetadata {
  width: number;
  height: number;
  bitsPerSample: number;
  samplesPerPixel: number;
  photometricInterpretation: number;
  compression: number;
  planarConfiguration?: number;
  colorSpace?: string;
  hasMultiplePages?: boolean;
  pageCount?: number;
}

/**
 * TIFF processing utilities
 */
export class TIFFUtils {
  /**
   * Check if UTIF is available
   */
  static isAvailable(): boolean {
    return typeof UTIF !== 'undefined';
  }

  /**
   * Parse TIFF file and extract metadata
   * @param file - TIFF file to parse
   * @returns Promise<TIFFMetadata> with TIFF metadata
   */
  static async parseTIFFMetadata(file: File): Promise<TIFFMetadata> {
    if (!this.isAvailable()) {
      throw new Error('UTIF library is not available');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ifds = UTIF.decode(arrayBuffer);

      if (!ifds || ifds.length === 0) {
        throw new Error('No TIFF images found in file');
      }

      // Get the first image
      const ifd = ifds[0];

      // Extract TIFF-specific metadata
      const metadata: TIFFMetadata = {
        width: ifd.width || 0,
        height: ifd.height || 0,
        bitsPerSample: ifd.t258 ? ifd.t258[0] : 8, // BitsPerSample tag
        samplesPerPixel: ifd.t277 || 3, // SamplesPerPixel tag
        photometricInterpretation: ifd.t262 || 2, // PhotometricInterpretation tag
        compression: ifd.t259 || 1, // Compression tag
        colorSpace: this.getColorSpaceDescription(ifd.t262 || 2),
        hasMultiplePages: ifds.length > 1,
        pageCount: ifds.length,
      };

      return metadata;
    } catch (error) {
      console.error('Error parsing TIFF metadata:', error);
      throw new Error(`Failed to parse TIFF file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert TIFF file to Canvas element
   * @param file - TIFF file to convert
   * @param pageIndex - Page index for multi-page TIFF (default: 0)
   * @returns Promise<HTMLCanvasElement> with TIFF content
   */
  static async tiffToCanvas(file: File, pageIndex: number = 0): Promise<HTMLCanvasElement> {
    if (!this.isAvailable()) {
      throw new Error('UTIF library is not available');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ifds = UTIF.decode(arrayBuffer);

      if (!ifds || ifds.length === 0) {
        throw new Error('No TIFF images found in file');
      }

      // Select the specified page
      const ifdIndex = Math.min(pageIndex, ifds.length - 1);
      const ifd = ifds[ifdIndex];

      // Decode the image data
      UTIF.decodeImage(arrayBuffer, ifd);

      // Create canvas and draw the image
      const canvas = document.createElement('canvas');
      canvas.width = ifd.width;
      canvas.height = ifd.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Convert TIFF data to RGBA
      const rgba = UTIF.toRGBA8(ifd);
      const imageData = new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height);

      ctx.putImageData(imageData, 0, 0);
      return canvas;
    } catch (error) {
      console.error('Error converting TIFF to canvas:', error);
      throw new Error(`Failed to convert TIFF to canvas: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert TIFF file to ImageData
   * @param file - TIFF file to convert
   * @param pageIndex - Page index for multi-page TIFF (default: 0)
   * @returns Promise<ImageData> with TIFF pixel data
   */
  static async tiffToImageData(file: File, pageIndex: number = 0): Promise<ImageData> {
    const canvas = await this.tiffToCanvas(file, pageIndex);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Convert TIFF to standard image format (JPEG, PNG, WebP)
   * @param file - TIFF file to convert
   * @param outputFormat - Target format ('image/jpeg', 'image/png', 'image/webp')
   * @param quality - Quality setting (0-1)
   * @param pageIndex - Page index for multi-page TIFF (default: 0)
   * @returns Promise<Blob> with converted image
   */
  static async convertTIFFToFormat(
    file: File,
    outputFormat: string,
    quality: number = 0.8,
    pageIndex: number = 0
  ): Promise<Blob> {
    const canvas = await this.tiffToCanvas(file, pageIndex);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to convert TIFF to ${outputFormat}`));
          }
        },
        outputFormat,
        quality
      );
    });
  }

  /**
   * Get color space description from photometric interpretation
   * @param photometricInterpretation - TIFF photometric interpretation value
   * @returns Color space description
   */
  private static getColorSpaceDescription(photometricInterpretation: number): string {
    switch (photometricInterpretation) {
      case 0:
        return 'WhiteIsZero';
      case 1:
        return 'BlackIsZero';
      case 2:
        return 'RGB';
      case 3:
        return 'Palette';
      case 4:
        return 'Transparency';
      case 5:
        return 'CMYK';
      case 6:
        return 'YCbCr';
      case 8:
        return 'CIELab';
      default:
        return 'Unknown';
    }
  }

  /**
   * Validate TIFF file signature
   * @param file - File to validate
   * @returns Promise<boolean> indicating if file is a valid TIFF
   */
  static async validateTIFFSignature(file: File): Promise<boolean> {
    try {
      const buffer = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Check for TIFF signatures
      // Little-endian: 49 49 2A 00 (II*)
      // Big-endian: 4D 4D 00 2A (MM*)
      const isLittleEndian = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00;
      const isBigEndian = bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a;

      return isLittleEndian || isBigEndian;
    } catch (error) {
      console.warn('Failed to validate TIFF signature:', error);
      return false;
    }
  }

  /**
   * Get TIFF processing capabilities
   * @returns Object describing TIFF processing capabilities
   */
  static getCapabilities() {
    return {
      available: this.isAvailable(),
      canParse: this.isAvailable(),
      canConvert: this.isAvailable(),
      supportedOutputFormats: ['image/jpeg', 'image/png', 'image/webp'],
      supportsMultiPage: true,
      supportsMetadata: true,
    };
  }
}

export default TIFFUtils;
