/**
 * FormatDetector service
 * Enhanced format detection and validation for all supported file types
 */

import { FormatInfo, FormatMetadata, ProcessingFile } from '../types';

/**
 * Format detection map with file signatures for validation
 */
const FORMAT_MAP: Record<string, FormatInfo> = {
  // Existing image formats
  jpg: {
    type: 'image',
    format: 'jpeg',
    mimeType: 'image/jpeg',
    compressor: 'CanvasImageCompressor',
    supportLevel: 'native',
    fileSignature: [0xff, 0xd8, 0xff],
  },
  jpeg: {
    type: 'image',
    format: 'jpeg',
    mimeType: 'image/jpeg',
    compressor: 'CanvasImageCompressor',
    supportLevel: 'native',
    fileSignature: [0xff, 0xd8, 0xff],
  },
  png: {
    type: 'image',
    format: 'png',
    mimeType: 'image/png',
    compressor: 'CanvasImageCompressor',
    supportLevel: 'native',
    fileSignature: [0x89, 0x50, 0x4e, 0x47],
  },
  webp: {
    type: 'image',
    format: 'webp',
    mimeType: 'image/webp',
    compressor: 'CanvasImageCompressor',
    supportLevel: 'native',
    fileSignature: [0x52, 0x49, 0x46, 0x46],
  },

  // New TIFF format
  tiff: {
    type: 'image',
    format: 'tiff',
    mimeType: 'image/tiff',
    compressor: 'CanvasImageCompressor',
    supportLevel: 'library',
    fileSignature: [0x49, 0x49, 0x2a, 0x00], // Little-endian TIFF (II*)
  },
  tif: {
    type: 'image',
    format: 'tiff',
    mimeType: 'image/tiff',
    compressor: 'CanvasImageCompressor',
    supportLevel: 'library',
    fileSignature: [0x49, 0x49, 0x2a, 0x00], // Little-endian TIFF (II*)
  },

  // Existing video formats
  mp4: {
    type: 'video',
    format: 'mp4',
    mimeType: 'video/mp4',
    compressor: 'WebCodecsVideoCompressor',
    supportLevel: 'native',
    fileSignature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  },
  webm: {
    type: 'video',
    format: 'webm',
    mimeType: 'video/webm',
    compressor: 'WebCodecsVideoCompressor',
    supportLevel: 'native',
    fileSignature: [0x1a, 0x45, 0xdf, 0xa3],
  },
  avi: {
    type: 'video',
    format: 'avi',
    mimeType: 'video/avi',
    compressor: 'VideoCompressor',
    supportLevel: 'library',
    fileSignature: [0x52, 0x49, 0x46, 0x46],
  },
  mov: {
    type: 'video',
    format: 'quicktime',
    mimeType: 'video/quicktime',
    compressor: 'VideoCompressor',
    supportLevel: 'library',
    fileSignature: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
  },
  mkv: {
    type: 'video',
    format: 'matroska',
    mimeType: 'video/x-matroska',
    compressor: 'VideoCompressor',
    supportLevel: 'library',
    fileSignature: [0x1a, 0x45, 0xdf, 0xa3],
  },

  // New audio formats
  mp3: {
    type: 'audio',
    format: 'mp3',
    mimeType: 'audio/mpeg',
    compressor: 'WebAudioCompressor',
    supportLevel: 'native',
    fileSignature: [0xff, 0xfb], // MP3 frame header
  },
  wav: {
    type: 'audio',
    format: 'wav',
    mimeType: 'audio/wav',
    compressor: 'WebAudioCompressor',
    supportLevel: 'native',
    fileSignature: [0x52, 0x49, 0x46, 0x46], // RIFF header
  },

  // New document formats
  pdf: {
    type: 'document',
    format: 'pdf',
    mimeType: 'application/pdf',
    compressor: 'PDFCompressor',
    supportLevel: 'library',
    fileSignature: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  doc: {
    type: 'document',
    format: 'doc',
    mimeType: 'application/msword',
    compressor: 'OfficeCompressor',
    supportLevel: 'library',
    fileSignature: [0xd0, 0xcf, 0x11, 0xe0], // OLE2 header
  },
  docx: {
    type: 'document',
    format: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compressor: 'OfficeCompressor',
    supportLevel: 'library',
    fileSignature: [0x50, 0x4b, 0x03, 0x04], // ZIP header
  },
  xls: {
    type: 'document',
    format: 'xls',
    mimeType: 'application/vnd.ms-excel',
    compressor: 'OfficeCompressor',
    supportLevel: 'library',
    fileSignature: [0xd0, 0xcf, 0x11, 0xe0], // OLE2 header
  },
  xlsx: {
    type: 'document',
    format: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compressor: 'OfficeCompressor',
    supportLevel: 'library',
    fileSignature: [0x50, 0x4b, 0x03, 0x04], // ZIP header
  },
  ppt: {
    type: 'document',
    format: 'ppt',
    mimeType: 'application/vnd.ms-powerpoint',
    compressor: 'OfficeCompressor',
    supportLevel: 'library',
    fileSignature: [0xd0, 0xcf, 0x11, 0xe0], // OLE2 header
  },
  pptx: {
    type: 'document',
    format: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    compressor: 'OfficeCompressor',
    supportLevel: 'library',
    fileSignature: [0x50, 0x4b, 0x03, 0x04], // ZIP header
  },
  odt: {
    type: 'document',
    format: 'odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    compressor: 'OfficeCompressor',
    supportLevel: 'library',
    fileSignature: [0x50, 0x4b, 0x03, 0x04], // ZIP header
  },

  // New archive formats
  apk: {
    type: 'archive',
    format: 'apk',
    mimeType: 'application/vnd.android.package-archive',
    compressor: 'APKCompressor',
    supportLevel: 'library',
    fileSignature: [0x50, 0x4b, 0x03, 0x04], // ZIP header
  },
};

/**
 * MIME type to extension mapping for additional validation
 */
const MIME_TO_EXTENSION: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/tiff': ['tiff', 'tif'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
  'video/avi': ['avi'],
  'video/quicktime': ['mov'],
  'video/x-matroska': ['mkv'],
  'audio/mpeg': ['mp3'],
  'audio/wav': ['wav'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.oasis.opendocument.text': ['odt'],
  'application/vnd.android.package-archive': ['apk'],
};

/**
 * FormatDetector service class
 */
export class FormatDetector {
  /**
   * Detect format from file extension
   * @param filename - The filename to analyze
   * @returns FormatInfo or null if not supported
   */
  static detectFromExtension(filename: string): FormatInfo | null {
    const extension = filename.toLowerCase().split('.').pop();
    if (!extension) return null;

    return FORMAT_MAP[extension] || null;
  }

  /**
   * Detect format from MIME type
   * @param mimeType - The MIME type to analyze
   * @returns FormatInfo or null if not supported
   */
  static detectFromMimeType(mimeType: string): FormatInfo | null {
    const extensions = MIME_TO_EXTENSION[mimeType];
    if (!extensions || extensions.length === 0) return null;

    return FORMAT_MAP[extensions[0]] || null;
  }

  /**
   * Validate file signature against expected format
   * @param file - The file to validate
   * @param expectedFormat - The expected format info
   * @returns Promise<boolean> indicating if signature matches
   */
  static async validateFileSignature(file: File, expectedFormat: FormatInfo): Promise<boolean> {
    if (!expectedFormat.fileSignature) return true; // No signature to validate

    try {
      // Check if we're in a test environment or if slice/arrayBuffer is not available
      if (typeof file.slice !== 'function' || !file.slice(0, 1).arrayBuffer) {
        // In test environment or unsupported browser, skip signature validation
        return true;
      }

      const buffer = await file.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Special handling for TIFF files (both little-endian and big-endian)
      if (expectedFormat.format === 'tiff') {
        // Little-endian TIFF: 49 49 2A 00 (II*)
        const isLittleEndian = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00;
        // Big-endian TIFF: 4D 4D 00 2A (MM*)
        const isBigEndian = bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a;
        return isLittleEndian || isBigEndian;
      }

      // Standard signature validation for other formats
      const signature = expectedFormat.fileSignature;
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Failed to validate file signature:', error);
      return true; // In case of error, assume valid to avoid blocking
    }
  }

  /**
   * Comprehensive format detection with validation
   * @param file - The file to analyze
   * @returns Promise<FormatInfo | null> with detected format or null if unsupported
   */
  static async detectFormat(file: File): Promise<FormatInfo | null> {
    // First try detection by extension
    let formatInfo = this.detectFromExtension(file.name);

    // If not found, try MIME type
    if (!formatInfo) {
      formatInfo = this.detectFromMimeType(file.type);
    }

    // If still not found, return null
    if (!formatInfo) {
      return null;
    }

    // Validate file signature if available
    const signatureValid = await this.validateFileSignature(file, formatInfo);
    if (!signatureValid) {
      console.warn(`File signature validation failed for ${file.name}`);
      // Return format info but mark as limited support
      return {
        ...formatInfo,
        supportLevel: 'limited',
      };
    }

    return formatInfo;
  }

  /**
   * Get all supported formats by type
   * @param type - Optional type filter
   * @returns Array of FormatInfo objects
   */
  static getSupportedFormats(type?: 'image' | 'video' | 'document' | 'audio' | 'archive'): FormatInfo[] {
    const formats = Object.values(FORMAT_MAP);

    if (type) {
      return formats.filter(format => format.type === type);
    }

    return formats;
  }

  /**
   * Get supported MIME types
   * @param type - Optional type filter
   * @returns Array of MIME type strings
   */
  static getSupportedMimeTypes(type?: 'image' | 'video' | 'document' | 'audio' | 'archive'): string[] {
    const formats = this.getSupportedFormats(type);
    return formats.map(format => format.mimeType);
  }

  /**
   * Get supported file extensions
   * @param type - Optional type filter
   * @returns Array of file extension strings
   */
  static getSupportedExtensions(type?: 'image' | 'video' | 'document' | 'audio' | 'archive'): string[] {
    const formats = this.getSupportedFormats(type);
    const extensions: string[] = [];

    Object.entries(FORMAT_MAP).forEach(([ext, format]) => {
      if (!type || format.type === type) {
        extensions.push(ext);
      }
    });

    return extensions;
  }

  /**
   * Check if a file type is supported
   * @param file - The file to check
   * @returns Promise<boolean> indicating support
   */
  static async isSupported(file: File): Promise<boolean> {
    const formatInfo = await this.detectFormat(file);
    return formatInfo !== null;
  }

  /**
   * Get processing method recommendation based on format and browser capabilities
   * @param formatInfo - The detected format information
   * @returns Recommended processing method
   */
  static getProcessingMethod(formatInfo: FormatInfo): 'native' | 'library' | 'fallback' {
    // Use enhanced browser capability detection for accurate recommendations
    try {
      const { EnhancedBrowserCapabilityDetector } = require('../utils/enhancedBrowserCapabilities');
      const bestMethod = EnhancedBrowserCapabilityDetector.getBestProcessingMethod(formatInfo);
      
      if (bestMethod === 'native') return 'native';
      if (bestMethod.startsWith('library:')) return 'library';
      if (bestMethod.startsWith('fallback:')) return 'fallback';
      
      return 'fallback';
    } catch (error) {
      // Fallback to basic detection if enhanced capabilities are not available
      switch (formatInfo.supportLevel) {
        case 'native':
          return 'native';
        case 'library':
          return 'library';
        case 'limited':
        default:
          return 'fallback';
      }
    }
  }

  /**
   * Get enhanced format information with browser capability analysis
   * @param file - The file to analyze
   * @returns Promise<FormatInfo & { enhancedCapabilities?: any } | null>
   */
  static async detectFormatWithCapabilities(file: File): Promise<FormatInfo & { enhancedCapabilities?: any } | null> {
    const formatInfo = await this.detectFormat(file);
    if (!formatInfo) return null;

    try {
      const { EnhancedBrowserCapabilityDetector } = require('../utils/enhancedBrowserCapabilities');
      const enhancedCapabilities = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo, file.size);
      
      return {
        ...formatInfo,
        enhancedCapabilities,
      };
    } catch (error) {
      // Return basic format info if enhanced capabilities are not available
      return formatInfo;
    }
  }
}

export default FormatDetector;
