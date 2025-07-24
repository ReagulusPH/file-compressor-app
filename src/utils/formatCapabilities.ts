/**
 * Format-specific browser capability detection and fallback selection
 */

import { detectBrowserFeatures, detectFormatCapabilities, getBrowserInfo, type BrowserFeatures, type FormatCapabilities } from './browserSupport';
import type { FormatInfo } from '../types';

/**
 * Interface for format support level with detailed capabilities
 */
export interface FormatSupportInfo {
  isSupported: boolean;
  supportLevel: 'native' | 'library' | 'fallback' | 'unsupported';
  primaryMethod: string;
  fallbackMethods: string[];
  limitations: string[];
  recommendations: string[];
}

/**
 * Browser support matrix for different formats and methods
 */
const BROWSER_SUPPORT_MATRIX = {
  // Image formats
  image: {
    jpeg: {
      chrome: { native: true, canvas: true, library: true },
      firefox: { native: true, canvas: true, library: true },
      safari: { native: true, canvas: true, library: true },
      edge: { native: true, canvas: true, library: true },
    },
    png: {
      chrome: { native: true, canvas: true, library: true },
      firefox: { native: true, canvas: true, library: true },
      safari: { native: true, canvas: true, library: true },
      edge: { native: true, canvas: true, library: true },
    },
    webp: {
      chrome: { native: true, canvas: true, library: true },
      firefox: { native: true, canvas: true, library: true },
      safari: { native: true, canvas: true, library: true }, // Safari 14+
      edge: { native: true, canvas: true, library: true },
    },
    tiff: {
      chrome: { native: false, canvas: false, library: true },
      firefox: { native: false, canvas: false, library: true },
      safari: { native: false, canvas: false, library: true },
      edge: { native: false, canvas: false, library: true },
    },
  },
  // Video formats
  video: {
    mp4: {
      chrome: { native: true, mediaRecorder: true, webCodecs: true, library: true },
      firefox: { native: true, mediaRecorder: true, webCodecs: false, library: true },
      safari: { native: true, mediaRecorder: true, webCodecs: false, library: true },
      edge: { native: true, mediaRecorder: true, webCodecs: true, library: true },
    },
    webm: {
      chrome: { native: true, mediaRecorder: true, webCodecs: true, library: true },
      firefox: { native: true, mediaRecorder: true, webCodecs: false, library: true },
      safari: { native: false, mediaRecorder: false, webCodecs: false, library: true },
      edge: { native: true, mediaRecorder: true, webCodecs: true, library: true },
    },
  },
  // Audio formats
  audio: {
    mp3: {
      chrome: { native: true, webAudio: true, mediaRecorder: true, library: true },
      firefox: { native: true, webAudio: true, mediaRecorder: true, library: true },
      safari: { native: true, webAudio: true, mediaRecorder: true, library: true },
      edge: { native: true, webAudio: true, mediaRecorder: true, library: true },
    },
    wav: {
      chrome: { native: true, webAudio: true, mediaRecorder: true, library: true },
      firefox: { native: true, webAudio: true, mediaRecorder: true, library: true },
      safari: { native: true, webAudio: true, mediaRecorder: true, library: true },
      edge: { native: true, webAudio: true, mediaRecorder: true, library: true },
    },
  },
  // Document formats
  document: {
    pdf: {
      chrome: { native: false, library: true },
      firefox: { native: false, library: true },
      safari: { native: false, library: true },
      edge: { native: false, library: true },
    },
    docx: {
      chrome: { native: false, library: true },
      firefox: { native: false, library: true },
      safari: { native: false, library: true },
      edge: { native: false, library: true },
    },
    xlsx: {
      chrome: { native: false, library: true },
      firefox: { native: false, library: true },
      safari: { native: false, library: true },
      edge: { native: false, library: true },
    },
    pptx: {
      chrome: { native: false, library: true },
      firefox: { native: false, library: true },
      safari: { native: false, library: true },
      edge: { native: false, library: true },
    },
    odt: {
      chrome: { native: false, library: true },
      firefox: { native: false, library: true },
      safari: { native: false, library: true },
      edge: { native: false, library: true },
    },
  },
  // Archive formats
  archive: {
    apk: {
      chrome: { native: false, library: true },
      firefox: { native: false, library: true },
      safari: { native: false, library: true },
      edge: { native: false, library: true },
    },
  },
};

/**
 * Format capability detector class
 */
export class FormatCapabilityDetector {
  private static browserFeatures: BrowserFeatures | null = null;
  private static formatCapabilities: FormatCapabilities | null = null;
  private static browserInfo: { name: string; version: string } | null = null;

  /**
   * Initialize the detector with current browser capabilities
   */
  static initialize(): void {
    this.browserFeatures = detectBrowserFeatures();
    this.formatCapabilities = detectFormatCapabilities();
    this.browserInfo = getBrowserInfo();
  }

  /**
   * Get browser capabilities (lazy initialization)
   */
  private static getBrowserFeatures(): BrowserFeatures {
    if (!this.browserFeatures) {
      this.initialize();
    }
    return this.browserFeatures!;
  }

  /**
   * Get format capabilities (lazy initialization)
   */
  private static getFormatCapabilities(): FormatCapabilities {
    if (!this.formatCapabilities) {
      this.initialize();
    }
    return this.formatCapabilities!;
  }

  /**
   * Get browser info (lazy initialization)
   */
  private static getBrowserInfo(): { name: string; version: string } {
    if (!this.browserInfo) {
      this.initialize();
    }
    return this.browserInfo!;
  }

  /**
   * Get format support information for a specific format
   * @param formatInfo - The format information to check
   * @returns Detailed support information
   */
  static getFormatSupport(formatInfo: FormatInfo): FormatSupportInfo {
    const browserFeatures = this.getBrowserFeatures();
    const formatCapabilities = this.getFormatCapabilities();
    const browserInfo = this.getBrowserInfo();

    const browserName = browserInfo.name.toLowerCase();
    const formatType = formatInfo.type;
    const formatName = formatInfo.format;

    // Get browser support matrix for this format
    const browserSupport = this.getBrowserSupportMatrix(formatType, formatName, browserName);

    // Determine support level and methods
    const supportInfo = this.determineSupportLevel(
      formatInfo,
      browserSupport,
      browserFeatures,
      formatCapabilities
    );

    return supportInfo;
  }

  /**
   * Get browser support matrix for a specific format and browser
   */
  private static getBrowserSupportMatrix(
    formatType: string,
    formatName: string,
    browserName: string
  ): Record<string, boolean> {
    const typeMatrix = (BROWSER_SUPPORT_MATRIX as any)[formatType];
    if (!typeMatrix) return {};

    const formatMatrix = typeMatrix[formatName];
    if (!formatMatrix) return {};

    const browserMatrix = formatMatrix[browserName] || formatMatrix['chrome']; // Fallback to Chrome
    return browserMatrix || {};
  }

  /**
   * Determine support level based on capabilities and browser support
   */
  private static determineSupportLevel(
    formatInfo: FormatInfo,
    browserSupport: Record<string, boolean>,
    browserFeatures: BrowserFeatures,
    formatCapabilities: FormatCapabilities
  ): FormatSupportInfo {
    const limitations: string[] = [];
    const recommendations: string[] = [];
    const fallbackMethods: string[] = [];
    let primaryMethod = 'library';
    let supportLevel: 'native' | 'library' | 'fallback' | 'unsupported' = 'unsupported';

    // Check format-specific capabilities
    switch (formatInfo.type) {
      case 'image':
        return this.checkImageSupport(formatInfo, browserSupport, formatCapabilities.image, limitations, recommendations, fallbackMethods);
      
      case 'video':
        return this.checkVideoSupport(formatInfo, browserSupport, formatCapabilities.video, limitations, recommendations, fallbackMethods);
      
      case 'audio':
        return this.checkAudioSupport(formatInfo, browserSupport, formatCapabilities.audio, limitations, recommendations, fallbackMethods);
      
      case 'document':
        return this.checkDocumentSupport(formatInfo, browserSupport, formatCapabilities.document, limitations, recommendations, fallbackMethods);
      
      case 'archive':
        return this.checkArchiveSupport(formatInfo, browserSupport, formatCapabilities.archive, limitations, recommendations, fallbackMethods);
      
      default:
        return {
          isSupported: false,
          supportLevel: 'unsupported',
          primaryMethod: 'none',
          fallbackMethods: [],
          limitations: ['Unsupported file type'],
          recommendations: ['Use a supported file format'],
        };
    }
  }

  /**
   * Check image format support
   */
  private static checkImageSupport(
    formatInfo: FormatInfo,
    browserSupport: Record<string, boolean>,
    imageCapabilities: FormatCapabilities['image'],
    limitations: string[],
    recommendations: string[],
    fallbackMethods: string[]
  ): FormatSupportInfo {
    let primaryMethod = 'library';
    let supportLevel: 'native' | 'library' | 'fallback' | 'unsupported' = 'library';

    // Check for native Canvas API support
    if (imageCapabilities.canvas && browserSupport.canvas) {
      if (formatInfo.format === 'tiff') {
        // TIFF requires library support
        primaryMethod = 'library';
        supportLevel = 'library';
        fallbackMethods.push('tiff.js library', 'utif library');
        limitations.push('Requires JavaScript library for TIFF processing');
        recommendations.push('Consider converting to JPEG or PNG for better browser support');
      } else {
        // Native formats (JPEG, PNG, WebP)
        primaryMethod = 'canvas';
        supportLevel = 'native';
        fallbackMethods.push('browser-image-compression library');
      }
    } else {
      limitations.push('Canvas API not supported');
      recommendations.push('Update to a modern browser');
      supportLevel = 'fallback';
    }

    // Check for specific format support
    if (formatInfo.format === 'webp' && !imageCapabilities.webp) {
      limitations.push('WebP format not natively supported');
      recommendations.push('Output will be converted to JPEG or PNG');
    }

    return {
      isSupported: imageCapabilities.canvas || browserSupport.library,
      supportLevel,
      primaryMethod,
      fallbackMethods,
      limitations,
      recommendations,
    };
  }

  /**
   * Check video format support
   */
  private static checkVideoSupport(
    formatInfo: FormatInfo,
    browserSupport: Record<string, boolean>,
    videoCapabilities: FormatCapabilities['video'],
    limitations: string[],
    recommendations: string[],
    fallbackMethods: string[]
  ): FormatSupportInfo {
    let primaryMethod = 'library';
    let supportLevel: 'native' | 'library' | 'fallback' | 'unsupported' = 'library';

    // Check for MediaRecorder API support
    if (videoCapabilities.mediaRecorder && browserSupport.mediaRecorder) {
      primaryMethod = 'mediaRecorder';
      supportLevel = 'native';
      fallbackMethods.push('FFmpeg.js library');
    } else {
      limitations.push('MediaRecorder API not supported');
      fallbackMethods.push('FFmpeg.js library');
    }

    // Check for WebCodecs support (advanced)
    if (videoCapabilities.webCodecs && browserSupport.webCodecs) {
      fallbackMethods.unshift('WebCodecs API');
    }

    // Check for WebAssembly support (required for FFmpeg fallback)
    if (!videoCapabilities.webAssembly) {
      limitations.push('WebAssembly not supported - FFmpeg fallback unavailable');
      supportLevel = 'unsupported';
      recommendations.push('Update to a browser that supports WebAssembly');
    }

    // Check for SharedArrayBuffer (required for optimal FFmpeg performance)
    if (!videoCapabilities.sharedArrayBuffer) {
      limitations.push('SharedArrayBuffer not available - reduced performance');
      recommendations.push('Enable cross-origin isolation for better performance');
    }

    return {
      isSupported: videoCapabilities.mediaRecorder || videoCapabilities.webAssembly,
      supportLevel,
      primaryMethod,
      fallbackMethods,
      limitations,
      recommendations,
    };
  }

  /**
   * Check audio format support
   */
  private static checkAudioSupport(
    formatInfo: FormatInfo,
    browserSupport: Record<string, boolean>,
    audioCapabilities: FormatCapabilities['audio'],
    limitations: string[],
    recommendations: string[],
    fallbackMethods: string[]
  ): FormatSupportInfo {
    let primaryMethod = 'library';
    let supportLevel: 'native' | 'library' | 'fallback' | 'unsupported' = 'library';

    // Check for Web Audio API support
    if (audioCapabilities.webAudioAPI && browserSupport.webAudio) {
      primaryMethod = 'webAudio';
      supportLevel = 'native';
      fallbackMethods.push('lamejs library', 'wav-encoder library');
    } else {
      limitations.push('Web Audio API not supported');
      fallbackMethods.push('lamejs library', 'wav-encoder library');
    }

    // Check for AudioContext support
    if (!audioCapabilities.audioContext) {
      limitations.push('AudioContext not available');
      recommendations.push('Update to a modern browser for better audio processing');
    }

    // Check for MediaRecorder support (for recording)
    if (audioCapabilities.mediaRecorder && browserSupport.mediaRecorder) {
      fallbackMethods.unshift('MediaRecorder API');
    }

    // Check for Compression Streams (for efficient processing)
    if (audioCapabilities.compressionStreams) {
      fallbackMethods.unshift('Compression Streams API');
    } else {
      limitations.push('Compression Streams not available - may use more memory');
    }

    return {
      isSupported: audioCapabilities.webAudioAPI || true, // Libraries always available
      supportLevel,
      primaryMethod,
      fallbackMethods,
      limitations,
      recommendations,
    };
  }

  /**
   * Check document format support
   */
  private static checkDocumentSupport(
    formatInfo: FormatInfo,
    browserSupport: Record<string, boolean>,
    documentCapabilities: FormatCapabilities['document'],
    limitations: string[],
    recommendations: string[],
    fallbackMethods: string[]
  ): FormatSupportInfo {
    let primaryMethod = 'library';
    let supportLevel: 'library' | 'fallback' | 'unsupported' = 'library';

    // All document formats require libraries
    fallbackMethods.push('pdf-lib', 'pizzip', 'docx');

    // Check for basic file reading capabilities
    if (!documentCapabilities.fileReader) {
      limitations.push('File API not supported');
      supportLevel = 'unsupported';
      recommendations.push('Update to a modern browser');
      return {
        isSupported: false,
        supportLevel,
        primaryMethod: 'none',
        fallbackMethods: [],
        limitations,
        recommendations,
      };
    }

    // Check for ArrayBuffer support
    if (!documentCapabilities.arrayBuffer) {
      limitations.push('ArrayBuffer not supported');
      supportLevel = 'fallback';
    }

    // Check for TextDecoder support
    if (!documentCapabilities.textDecoder) {
      limitations.push('TextDecoder not available - may affect text processing');
    }

    // Check for Compression Streams
    if (documentCapabilities.compressionStreams) {
      fallbackMethods.unshift('Compression Streams API');
    } else {
      limitations.push('Compression Streams not available - may use more memory');
    }

    return {
      isSupported: documentCapabilities.fileReader && documentCapabilities.arrayBuffer,
      supportLevel,
      primaryMethod,
      fallbackMethods,
      limitations,
      recommendations,
    };
  }

  /**
   * Check archive format support
   */
  private static checkArchiveSupport(
    formatInfo: FormatInfo,
    browserSupport: Record<string, boolean>,
    archiveCapabilities: FormatCapabilities['archive'],
    limitations: string[],
    recommendations: string[],
    fallbackMethods: string[]
  ): FormatSupportInfo {
    let primaryMethod = 'library';
    let supportLevel: 'library' | 'fallback' | 'unsupported' = 'library';

    // Archive formats require libraries
    fallbackMethods.push('jszip', 'node-stream-zip');

    // Check for basic capabilities
    if (!archiveCapabilities.fileReader || !archiveCapabilities.arrayBuffer) {
      limitations.push('Basic file processing not supported');
      supportLevel = 'unsupported';
      recommendations.push('Update to a modern browser');
      return {
        isSupported: false,
        supportLevel,
        primaryMethod: 'none',
        fallbackMethods: [],
        limitations,
        recommendations,
      };
    }

    // Check for Uint8Array support
    if (!archiveCapabilities.uint8Array) {
      limitations.push('Uint8Array not supported');
      supportLevel = 'fallback';
    }

    // Check for Compression Streams
    if (archiveCapabilities.compressionStreams) {
      fallbackMethods.unshift('Compression Streams API');
    } else {
      limitations.push('Compression Streams not available - may use more memory');
    }

    // APK-specific warnings
    if (formatInfo.format === 'apk') {
      limitations.push('APK compression may affect app functionality');
      recommendations.push('Test compressed APK thoroughly before distribution');
      recommendations.push('Consider using APK optimization tools instead');
    }

    return {
      isSupported: archiveCapabilities.fileReader && archiveCapabilities.arrayBuffer,
      supportLevel,
      primaryMethod,
      fallbackMethods,
      limitations,
      recommendations,
    };
  }

  /**
   * Get recommended compression method for a format
   * @param formatInfo - The format information
   * @returns Recommended method name
   */
  static getRecommendedMethod(formatInfo: FormatInfo): string {
    const supportInfo = this.getFormatSupport(formatInfo);
    return supportInfo.primaryMethod;
  }

  /**
   * Check if a format is fully supported in the current browser
   * @param formatInfo - The format information
   * @returns Boolean indicating full support
   */
  static isFormatSupported(formatInfo: FormatInfo): boolean {
    const supportInfo = this.getFormatSupport(formatInfo);
    return supportInfo.isSupported && supportInfo.supportLevel !== 'unsupported';
  }

  /**
   * Get all compatibility warnings for a format
   * @param formatInfo - The format information
   * @returns Array of warning objects
   */
  static getCompatibilityWarnings(formatInfo: FormatInfo): Array<{
    type: 'unsupported' | 'limited' | 'fallback';
    feature: string;
    details: string;
    suggestions: string[];
  }> {
    const supportInfo = this.getFormatSupport(formatInfo);
    const warnings: Array<{
      type: 'unsupported' | 'limited' | 'fallback';
      feature: string;
      details: string;
      suggestions: string[];
    }> = [];

    // Add warnings based on support level
    if (supportInfo.supportLevel === 'unsupported') {
      warnings.push({
        type: 'unsupported',
        feature: `${formatInfo.format.toUpperCase()} Compression`,
        details: `${formatInfo.format.toUpperCase()} compression is not supported in your browser.`,
        suggestions: supportInfo.recommendations,
      });
    } else if (supportInfo.supportLevel === 'fallback') {
      warnings.push({
        type: 'fallback',
        feature: `${formatInfo.format.toUpperCase()} Compression`,
        details: `Using fallback method for ${formatInfo.format.toUpperCase()} compression.`,
        suggestions: supportInfo.recommendations,
      });
    } else if (supportInfo.limitations.length > 0) {
      warnings.push({
        type: 'limited',
        feature: `${formatInfo.format.toUpperCase()} Compression`,
        details: supportInfo.limitations.join('. '),
        suggestions: supportInfo.recommendations,
      });
    }

    return warnings;
  }
}

export default FormatCapabilityDetector;