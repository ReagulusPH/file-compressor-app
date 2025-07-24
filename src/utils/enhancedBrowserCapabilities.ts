/**
 * Enhanced browser capability detection for all new formats
 * Provides comprehensive format-specific capability detection and fallback selection
 */

import { FormatCapabilityDetector, type FormatSupportInfo } from './formatCapabilities';
import { GracefulDegradationManager, type ProcessingRecommendation } from './gracefulDegradation';
import { detectBrowserFeatures, detectFormatCapabilities, getBrowserInfo, type BrowserFeatures, type FormatCapabilities } from './browserSupport';
import type { FormatInfo } from '../types';

/**
 * Enhanced capability detection result
 */
export interface EnhancedCapabilityResult {
  formatInfo: FormatInfo;
  browserInfo: ReturnType<typeof getBrowserInfo>;
  supportInfo: FormatSupportInfo;
  processingRecommendation: ProcessingRecommendation;
  fallbackChain: string[];
  performanceProfile: {
    expectedSpeed: 'fast' | 'medium' | 'slow';
    memoryUsage: 'low' | 'medium' | 'high';
    cpuIntensity: 'low' | 'medium' | 'high';
  };
  compatibilityWarnings: Array<{
    type: 'unsupported' | 'limited' | 'fallback';
    feature: string;
    details: string;
    suggestions: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Format-specific capability requirements
 */
const FORMAT_REQUIREMENTS = {
  image: {
    tiff: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['webWorkers', 'offscreenCanvas'],
      libraries: ['tiff.js', 'utif'],
      fallbacks: ['canvas-conversion', 'server-side'],
    },
    webp: {
      required: ['canvas'],
      preferred: ['webpSupport'],
      libraries: ['browser-image-compression'],
      fallbacks: ['jpeg-conversion', 'png-conversion'],
    },
  },
  video: {
    mp4: {
      required: ['fileAPI'],
      preferred: ['mediaRecorder', 'webCodecs'],
      libraries: ['ffmpeg.js'],
      fallbacks: ['canvas-recording', 'frame-extraction'],
    },
    webm: {
      required: ['fileAPI'],
      preferred: ['mediaRecorder', 'webCodecs'],
      libraries: ['ffmpeg.js'],
      fallbacks: ['mp4-conversion'],
    },
  },
  audio: {
    mp3: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['webAudioAPI', 'audioContext'],
      libraries: ['lamejs', 'mp3-encoder'],
      fallbacks: ['wav-conversion', 'basic-compression'],
    },
    wav: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['webAudioAPI', 'audioContext'],
      libraries: ['wav-encoder', 'audio-buffer'],
      fallbacks: ['pcm-processing'],
    },
  },
  document: {
    pdf: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['compressionStreams', 'webWorkers'],
      libraries: ['pdf-lib', 'pdfjs'],
      fallbacks: ['image-extraction', 'text-extraction'],
    },
    docx: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['compressionStreams'],
      libraries: ['pizzip', 'docx', 'jszip'],
      fallbacks: ['zip-extraction', 'xml-parsing'],
    },
    xlsx: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['compressionStreams'],
      libraries: ['pizzip', 'xlsx', 'jszip'],
      fallbacks: ['csv-conversion', 'xml-parsing'],
    },
    pptx: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['compressionStreams'],
      libraries: ['pizzip', 'jszip'],
      fallbacks: ['image-extraction', 'xml-parsing'],
    },
    odt: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['compressionStreams'],
      libraries: ['pizzip', 'jszip'],
      fallbacks: ['xml-parsing', 'text-extraction'],
    },
  },
  archive: {
    apk: {
      required: ['fileAPI', 'arrayBuffer'],
      preferred: ['compressionStreams', 'webWorkers'],
      libraries: ['jszip', 'node-stream-zip'],
      fallbacks: ['basic-zip', 'file-listing'],
    },
  },
} as const;

/**
 * Browser-specific performance profiles
 */
const BROWSER_PERFORMANCE_PROFILES = {
  Chrome: {
    webAudio: 'fast',
    canvas: 'fast',
    webAssembly: 'fast',
    fileProcessing: 'fast',
  },
  Firefox: {
    webAudio: 'medium',
    canvas: 'fast',
    webAssembly: 'medium',
    fileProcessing: 'medium',
  },
  Safari: {
    webAudio: 'medium',
    canvas: 'fast',
    webAssembly: 'slow',
    fileProcessing: 'medium',
  },
  Edge: {
    webAudio: 'fast',
    canvas: 'fast',
    webAssembly: 'fast',
    fileProcessing: 'fast',
  },
  'Internet Explorer': {
    webAudio: 'slow',
    canvas: 'slow',
    webAssembly: 'unsupported',
    fileProcessing: 'slow',
  },
} as const;

/**
 * Enhanced Browser Capability Detector
 */
export class EnhancedBrowserCapabilityDetector {
  private static browserFeatures: BrowserFeatures | null = null;
  private static formatCapabilities: FormatCapabilities | null = null;
  private static browserInfo: ReturnType<typeof getBrowserInfo> | null = null;

  /**
   * Initialize the detector
   */
  static initialize(): void {
    this.browserFeatures = detectBrowserFeatures();
    this.formatCapabilities = detectFormatCapabilities();
    this.browserInfo = getBrowserInfo();
  }

  /**
   * Get comprehensive capability analysis for a format
   * @param formatInfo - The format to analyze
   * @param fileSize - Optional file size for performance estimation
   * @returns Enhanced capability result
   */
  static getEnhancedCapabilities(
    formatInfo: FormatInfo,
    fileSize: number = 0
  ): EnhancedCapabilityResult {
    // Always initialize to ensure fresh data
    this.initialize();

    const supportInfo = FormatCapabilityDetector.getFormatSupport(formatInfo);
    const processingRecommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo, fileSize);
    const fallbackChain = this.buildFallbackChain(formatInfo);
    const performanceProfile = this.getPerformanceProfile(formatInfo, fileSize);
    const compatibilityWarnings = this.getEnhancedCompatibilityWarnings(formatInfo, supportInfo);

    return {
      formatInfo,
      browserInfo: this.browserInfo!,
      supportInfo,
      processingRecommendation,
      fallbackChain,
      performanceProfile,
      compatibilityWarnings,
    };
  }

  /**
   * Build a comprehensive fallback chain for a format
   * @param formatInfo - The format information
   * @returns Array of fallback methods in order of preference
   */
  private static buildFallbackChain(formatInfo: FormatInfo): string[] {
    const requirements = this.getFormatRequirements(formatInfo);
    const fallbackChain: string[] = [];

    // Check native support first
    if (this.hasNativeSupport(formatInfo)) {
      fallbackChain.push('native');
    }

    // Add library-based methods
    if (requirements.libraries) {
      requirements.libraries.forEach(library => {
        if (this.canUseLibrary(library, formatInfo)) {
          fallbackChain.push(`library:${library}`);
        }
      });
    }

    // Add fallback methods
    if (requirements.fallbacks) {
      requirements.fallbacks.forEach(fallback => {
        if (this.canUseFallback(fallback, formatInfo)) {
          fallbackChain.push(`fallback:${fallback}`);
        }
      });
    }

    return fallbackChain;
  }

  /**
   * Get format-specific requirements
   */
  private static getFormatRequirements(formatInfo: FormatInfo): any {
    const typeRequirements = (FORMAT_REQUIREMENTS as any)[formatInfo.type];
    return typeRequirements?.[formatInfo.format] || {
      required: ['fileAPI'],
      preferred: [],
      libraries: [],
      fallbacks: [],
    };
  }

  /**
   * Check if native support is available for a format
   */
  private static hasNativeSupport(formatInfo: FormatInfo): boolean {
    const requirements = this.getFormatRequirements(formatInfo);
    
    // Check all required features
    for (const feature of requirements.required) {
      if (!this.hasFeature(feature)) {
        return false;
      }
    }

    // Check format-specific native support
    switch (formatInfo.type) {
      case 'image':
        return this.browserFeatures!.canvas && (
          formatInfo.format !== 'tiff' // TIFF requires libraries
        );
      
      case 'video':
        return this.browserFeatures!.mediaRecorder;
      
      case 'audio':
        return this.browserFeatures!.webAudioAPI;
      
      case 'document':
      case 'archive':
        return false; // Always require libraries
      
      default:
        return false;
    }
  }

  /**
   * Check if a library can be used
   */
  private static canUseLibrary(library: string, formatInfo: FormatInfo): boolean {
    // Basic requirements for library usage
    if (!this.browserFeatures!.fileAPI) return false;

    // Library-specific requirements
    switch (library) {
      case 'ffmpeg.js':
        return this.browserFeatures!.webAssembly && this.browserFeatures!.webWorkers;
      
      case 'tiff.js':
      case 'utif':
        return this.browserFeatures!.canvas;
      
      case 'lamejs':
      case 'wav-encoder':
        return this.browserFeatures!.webAudioAPI || this.browserFeatures!.fileAPI;
      
      case 'pdf-lib':
      case 'pizzip':
      case 'jszip':
        return this.browserFeatures!.fileAPI && this.browserFeatures!.indexedDB;
      
      default:
        return true; // Assume basic libraries work if File API is available
    }
  }

  /**
   * Check if a fallback method can be used
   */
  private static canUseFallback(fallback: string, formatInfo: FormatInfo): boolean {
    switch (fallback) {
      case 'canvas-conversion':
      case 'canvas-recording':
        return this.browserFeatures!.canvas;
      
      case 'server-side':
        return false; // We don't support server-side processing
      
      case 'basic-compression':
      case 'file-listing':
        return this.browserFeatures!.fileAPI;
      
      default:
        return this.browserFeatures!.fileAPI;
    }
  }

  /**
   * Check if a browser feature is available
   */
  private static hasFeature(feature: string): boolean {
    switch (feature) {
      case 'fileAPI':
        return this.browserFeatures!.fileAPI;
      case 'arrayBuffer':
        return true; // ArrayBuffer is widely supported
      case 'webWorkers':
        return this.browserFeatures!.webWorkers;
      case 'canvas':
        return this.browserFeatures!.canvas;
      case 'webAudioAPI':
        return this.browserFeatures!.webAudioAPI;
      case 'audioContext':
        return this.formatCapabilities!.audio.audioContext;
      case 'mediaRecorder':
        return this.browserFeatures!.mediaRecorder;
      case 'webCodecs':
        return this.browserFeatures!.webCodecs;
      case 'compressionStreams':
        return this.browserFeatures!.compressionStreams;
      case 'offscreenCanvas':
        return this.browserFeatures!.offscreenCanvas;
      case 'webpSupport':
        return this.formatCapabilities!.image.webp;
      default:
        return false;
    }
  }

  /**
   * Get performance profile for a format and file size
   */
  private static getPerformanceProfile(
    formatInfo: FormatInfo,
    fileSize: number
  ): EnhancedCapabilityResult['performanceProfile'] {
    const browserName = this.browserInfo!.name;
    const browserProfile = (BROWSER_PERFORMANCE_PROFILES as any)[browserName] || BROWSER_PERFORMANCE_PROFILES.Chrome;
    
    let expectedSpeed: 'fast' | 'medium' | 'slow' = 'medium';
    let memoryUsage: 'low' | 'medium' | 'high' = 'medium';
    let cpuIntensity: 'low' | 'medium' | 'high' = 'medium';

    // Base performance on format type and browser capabilities
    switch (formatInfo.type) {
      case 'image':
        expectedSpeed = browserProfile.canvas as any;
        memoryUsage = fileSize > 50 * 1024 * 1024 ? 'high' : 'medium';
        cpuIntensity = formatInfo.format === 'tiff' ? 'high' : 'medium';
        break;
      
      case 'video':
        expectedSpeed = this.browserFeatures!.mediaRecorder ? 'fast' : 'slow';
        memoryUsage = 'high';
        cpuIntensity = 'high';
        break;
      
      case 'audio':
        expectedSpeed = browserProfile.webAudio as any;
        memoryUsage = fileSize > 100 * 1024 * 1024 ? 'high' : 'low';
        cpuIntensity = 'medium';
        break;
      
      case 'document':
        expectedSpeed = browserProfile.fileProcessing as any;
        memoryUsage = fileSize > 20 * 1024 * 1024 ? 'high' : 'medium';
        cpuIntensity = 'medium';
        break;
      
      case 'archive':
        expectedSpeed = 'slow';
        memoryUsage = 'high';
        cpuIntensity = 'high';
        break;
    }

    // Adjust for file size
    if (fileSize > 100 * 1024 * 1024) {
      expectedSpeed = expectedSpeed === 'fast' ? 'medium' : 'slow';
      memoryUsage = 'high';
    }

    // Adjust for browser limitations
    if (!this.browserFeatures!.webWorkers) {
      expectedSpeed = 'slow';
      cpuIntensity = 'high';
    }

    if (!this.browserFeatures!.sharedArrayBuffer) {
      memoryUsage = memoryUsage === 'low' ? 'medium' : 'high';
    }

    return { expectedSpeed, memoryUsage, cpuIntensity };
  }

  /**
   * Get enhanced compatibility warnings with severity levels
   */
  private static getEnhancedCompatibilityWarnings(
    formatInfo: FormatInfo,
    supportInfo: FormatSupportInfo
  ): EnhancedCapabilityResult['compatibilityWarnings'] {
    const warnings: EnhancedCapabilityResult['compatibilityWarnings'] = [];
    const browserName = this.browserInfo!.name;
    const majorVersion = this.browserInfo!.majorVersion;

    // Add basic compatibility warnings from FormatCapabilityDetector
    const basicWarnings = FormatCapabilityDetector.getCompatibilityWarnings(formatInfo);
    basicWarnings.forEach(warning => {
      warnings.push({
        ...warning,
        severity: this.getWarningSeverity(warning.type, formatInfo),
      });
    });

    // Add browser-specific warnings
    this.addBrowserSpecificWarnings(warnings, formatInfo, browserName, majorVersion);

    // Add format-specific warnings
    this.addFormatSpecificWarnings(warnings, formatInfo);

    // Add performance warnings
    this.addPerformanceWarnings(warnings, formatInfo);

    return warnings;
  }

  /**
   * Determine warning severity
   */
  private static getWarningSeverity(
    type: 'unsupported' | 'limited' | 'fallback',
    formatInfo: FormatInfo
  ): 'low' | 'medium' | 'high' {
    switch (type) {
      case 'unsupported':
        return 'high';
      case 'limited':
        return formatInfo.type === 'video' || formatInfo.type === 'archive' ? 'high' : 'medium';
      case 'fallback':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Add browser-specific warnings
   */
  private static addBrowserSpecificWarnings(
    warnings: EnhancedCapabilityResult['compatibilityWarnings'],
    formatInfo: FormatInfo,
    browserName: string,
    majorVersion: number
  ): void {
    switch (browserName) {
      case 'Safari':
        if (formatInfo.type === 'video' && formatInfo.format === 'webm') {
          warnings.push({
            type: 'limited',
            feature: 'WebM Video Support',
            details: 'Safari has limited WebM support. Consider using MP4 format instead.',
            suggestions: ['Convert to MP4 format', 'Use H.264 codec'],
            severity: 'medium',
          });
        }
        
        if (!this.browserFeatures!.sharedArrayBuffer) {
          warnings.push({
            type: 'limited',
            feature: 'SharedArrayBuffer',
            details: 'SharedArrayBuffer is not available in Safari, which may reduce performance for large files.',
            suggestions: ['Enable cross-origin isolation', 'Process smaller files'],
            severity: 'medium',
          });
        }
        break;

      case 'Firefox':
        if (!this.browserFeatures!.webCodecs) {
          warnings.push({
            type: 'fallback',
            feature: 'WebCodecs API',
            details: 'WebCodecs API is not available in Firefox. Using fallback video processing.',
            suggestions: ['Consider using Chrome for better video performance'],
            severity: 'low',
          });
        }
        break;

      case 'Internet Explorer':
        warnings.push({
          type: 'unsupported',
          feature: 'Modern Web APIs',
          details: 'Internet Explorer lacks support for modern web APIs required for file processing.',
          suggestions: ['Use a modern browser like Chrome, Firefox, Safari, or Edge'],
          severity: 'high',
        });
        break;
    }

    // Version-specific warnings
    if (browserName === 'Chrome' && majorVersion < 80) {
      warnings.push({
        type: 'limited',
        feature: 'Modern Compression APIs',
        details: 'Older Chrome versions may have limited support for some compression features.',
        suggestions: ['Update to the latest Chrome version'],
        severity: 'medium',
      });
    }
  }

  /**
   * Add format-specific warnings
   */
  private static addFormatSpecificWarnings(
    warnings: EnhancedCapabilityResult['compatibilityWarnings'],
    formatInfo: FormatInfo
  ): void {
    switch (formatInfo.format) {
      case 'tiff':
        warnings.push({
          type: 'fallback',
          feature: 'TIFF Processing',
          details: 'TIFF files require JavaScript libraries for processing, which may be slower than native formats.',
          suggestions: ['Consider converting to JPEG or PNG for better performance'],
          severity: 'low',
        });
        break;

      case 'apk':
        warnings.push({
          type: 'limited',
          feature: 'APK Compression',
          details: 'APK compression may affect app functionality and signature validity.',
          suggestions: [
            'Test compressed APK thoroughly',
            'Backup original APK file',
            'Consider using APK optimization tools instead'
          ],
          severity: 'high',
        });
        break;

      case 'pdf':
        if (!this.browserFeatures!.compressionStreams) {
          warnings.push({
            type: 'limited',
            feature: 'PDF Processing',
            details: 'Large PDF files may use significant memory without Compression Streams support.',
            suggestions: ['Process smaller PDF files', 'Split large PDFs into smaller parts'],
            severity: 'medium',
          });
        }
        break;
    }
  }

  /**
   * Add performance warnings
   */
  private static addPerformanceWarnings(
    warnings: EnhancedCapabilityResult['compatibilityWarnings'],
    formatInfo: FormatInfo
  ): void {
    if (!this.browserFeatures!.webWorkers) {
      warnings.push({
        type: 'limited',
        feature: 'Background Processing',
        details: 'Web Workers are not available. File processing will block the browser UI.',
        suggestions: ['Avoid switching tabs during processing', 'Process smaller files'],
        severity: 'medium',
      });
    }

    if (this.browserInfo!.isMobile) {
      warnings.push({
        type: 'limited',
        feature: 'Mobile Performance',
        details: 'Mobile devices may have limited processing power and memory for large files.',
        suggestions: [
          'Process smaller files',
          'Close other apps to free memory',
          'Use a desktop browser for large files'
        ],
        severity: 'medium',
      });
    }
  }

  /**
   * Get the best processing method for a format based on capabilities
   * @param formatInfo - The format information
   * @returns Recommended processing method
   */
  static getBestProcessingMethod(formatInfo: FormatInfo): string {
    this.initialize();
    const capabilities = this.getEnhancedCapabilities(formatInfo);
    return capabilities.fallbackChain[0] || 'unsupported';
  }

  /**
   * Check if batch processing is recommended for multiple formats
   * @param formats - Array of format information
   * @returns Batch processing recommendation
   */
  static getBatchProcessingRecommendation(formats: FormatInfo[]): {
    recommended: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    this.initialize();
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let recommended = true;

    // Check for memory-intensive formats
    const memoryIntensiveFormats = formats.filter(format => 
      format.type === 'video' || format.type === 'archive' || format.format === 'tiff'
    );

    if (memoryIntensiveFormats.length > 1) {
      recommended = false;
      warnings.push('Multiple memory-intensive formats detected');
      suggestions.push('Process memory-intensive files one at a time');
    }

    // Check for unsupported formats
    const unsupportedFormats = formats.filter(format => {
      const capabilities = this.getEnhancedCapabilities(format);
      return capabilities.fallbackChain.length === 0;
    });

    if (unsupportedFormats.length > 0) {
      warnings.push(`${unsupportedFormats.length} unsupported format(s) detected`);
      suggestions.push('Remove unsupported files from batch');
    }

    // Check browser limitations
    if (!this.browserFeatures!.webWorkers && formats.length > 3) {
      recommended = false;
      warnings.push('Large batch processing without Web Workers may block the browser');
      suggestions.push('Process files in smaller batches');
    }

    return { recommended, warnings, suggestions };
  }
}

export default EnhancedBrowserCapabilityDetector;