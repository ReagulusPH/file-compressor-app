/**
 * Graceful degradation utilities for limited browser environments
 */

import { FormatCapabilityDetector, type FormatSupportInfo } from './formatCapabilities';
import { detectBrowserFeatures, getBrowserInfo } from './browserSupport';
import type { FormatInfo } from '../types';

/**
 * Interface for degradation strategy
 */
export interface DegradationStrategy {
  canProcess: boolean;
  method: string;
  limitations: string[];
  alternatives: string[];
  performanceImpact: 'none' | 'low' | 'medium' | 'high';
  memoryImpact: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Interface for processing recommendation
 */
export interface ProcessingRecommendation {
  shouldProceed: boolean;
  strategy: DegradationStrategy;
  warnings: string[];
  userActions: string[];
}

/**
 * Graceful degradation manager
 */
export class GracefulDegradationManager {
  private static browserFeatures = detectBrowserFeatures();
  private static browserInfo = getBrowserInfo();

  /**
   * Get processing recommendation for a format in the current browser environment
   * @param formatInfo - The format information
   * @param fileSize - The file size in bytes
   * @returns Processing recommendation
   */
  static getProcessingRecommendation(
    formatInfo: FormatInfo,
    fileSize: number = 0
  ): ProcessingRecommendation {
    const supportInfo = FormatCapabilityDetector.getFormatSupport(formatInfo);
    const strategy = this.getDegradationStrategy(formatInfo, supportInfo, fileSize);
    
    const warnings: string[] = [];
    const userActions: string[] = [];

    // Add warnings based on support level
    if (supportInfo.supportLevel === 'unsupported') {
      warnings.push(`${formatInfo.format.toUpperCase()} format is not supported in your browser`);
      userActions.push('Consider using a different file format');
      userActions.push('Update to a modern browser');
    } else if (supportInfo.supportLevel === 'fallback') {
      warnings.push('Using fallback processing method - performance may be reduced');
    } else if (supportInfo.limitations.length > 0) {
      warnings.push(...supportInfo.limitations);
    }

    // Add file size warnings
    if (fileSize > 0) {
      const sizeWarnings = this.getFileSizeWarnings(formatInfo, fileSize, strategy);
      warnings.push(...sizeWarnings);
    }

    // Add browser-specific warnings
    const browserWarnings = this.getBrowserSpecificWarnings(formatInfo);
    warnings.push(...browserWarnings);

    return {
      shouldProceed: strategy.canProcess,
      strategy,
      warnings,
      userActions,
    };
  }

  /**
   * Get degradation strategy for a specific format
   */
  private static getDegradationStrategy(
    formatInfo: FormatInfo,
    supportInfo: FormatSupportInfo,
    fileSize: number
  ): DegradationStrategy {
    const baseStrategy: DegradationStrategy = {
      canProcess: supportInfo.isSupported,
      method: supportInfo.primaryMethod,
      limitations: supportInfo.limitations,
      alternatives: supportInfo.fallbackMethods,
      performanceImpact: 'none',
      memoryImpact: 'none',
    };

    // Adjust strategy based on format type
    switch (formatInfo.type) {
      case 'image':
        return this.getImageDegradationStrategy(formatInfo, supportInfo, fileSize, baseStrategy);
      
      case 'video':
        return this.getVideoDegradationStrategy(formatInfo, supportInfo, fileSize, baseStrategy);
      
      case 'audio':
        return this.getAudioDegradationStrategy(formatInfo, supportInfo, fileSize, baseStrategy);
      
      case 'document':
        return this.getDocumentDegradationStrategy(formatInfo, supportInfo, fileSize, baseStrategy);
      
      case 'archive':
        return this.getArchiveDegradationStrategy(formatInfo, supportInfo, fileSize, baseStrategy);
      
      default:
        return baseStrategy;
    }
  }

  /**
   * Get image-specific degradation strategy
   */
  private static getImageDegradationStrategy(
    formatInfo: FormatInfo,
    supportInfo: FormatSupportInfo,
    fileSize: number,
    baseStrategy: DegradationStrategy
  ): DegradationStrategy {
    const strategy = { ...baseStrategy };

    // TIFF-specific handling
    if (formatInfo.format === 'tiff') {
      strategy.performanceImpact = 'medium';
      strategy.memoryImpact = 'medium';
      strategy.limitations.push('TIFF processing requires JavaScript libraries');
      
      if (!this.browserFeatures.webWorkers) {
        strategy.performanceImpact = 'high';
        strategy.limitations.push('Web Workers not available - processing will block UI');
      }
    }

    // Canvas API fallback
    if (!this.browserFeatures.canvas) {
      strategy.canProcess = false;
      strategy.limitations.push('Canvas API not supported');
      strategy.alternatives = ['Use a modern browser with Canvas support'];
    }

    // Large file handling
    if (fileSize > 50 * 1024 * 1024) { // 50MB
      strategy.memoryImpact = 'high';
      strategy.limitations.push('Large image files may cause memory issues');
      
      if (!this.browserFeatures.webWorkers) {
        strategy.performanceImpact = 'high';
        strategy.limitations.push('Consider reducing image size before processing');
      }
    }

    return strategy;
  }

  /**
   * Get video-specific degradation strategy
   */
  private static getVideoDegradationStrategy(
    formatInfo: FormatInfo,
    supportInfo: FormatSupportInfo,
    fileSize: number,
    baseStrategy: DegradationStrategy
  ): DegradationStrategy {
    const strategy = { ...baseStrategy };

    // MediaRecorder API availability
    if (this.browserFeatures.mediaRecorder) {
      strategy.method = 'mediaRecorder';
      strategy.performanceImpact = 'low';
    } else if (this.browserFeatures.webAssembly) {
      strategy.method = 'ffmpeg';
      strategy.performanceImpact = 'medium';
      strategy.memoryImpact = 'medium';
      
      if (!this.browserFeatures.sharedArrayBuffer) {
        strategy.performanceImpact = 'high';
        strategy.memoryImpact = 'high';
        strategy.limitations.push('SharedArrayBuffer not available - reduced performance');
      }
    } else {
      strategy.canProcess = false;
      strategy.limitations.push('Neither MediaRecorder nor WebAssembly available');
    }

    // Large video file handling
    if (fileSize > 100 * 1024 * 1024) { // 100MB
      strategy.memoryImpact = 'high';
      strategy.limitations.push('Large video files require significant memory');
      
      if (!this.browserFeatures.sharedArrayBuffer) {
        strategy.limitations.push('Consider splitting large videos into smaller segments');
      }
    }

    return strategy;
  }

  /**
   * Get audio-specific degradation strategy
   */
  private static getAudioDegradationStrategy(
    formatInfo: FormatInfo,
    supportInfo: FormatSupportInfo,
    fileSize: number,
    baseStrategy: DegradationStrategy
  ): DegradationStrategy {
    const strategy = { ...baseStrategy };

    // Web Audio API availability
    if (this.browserFeatures.webAudioAPI) {
      strategy.method = 'webAudio';
      strategy.performanceImpact = 'low';
    } else {
      strategy.method = 'library';
      strategy.performanceImpact = 'medium';
      strategy.limitations.push('Web Audio API not available - using library fallback');
    }

    // Large audio file handling
    if (fileSize > 50 * 1024 * 1024) { // 50MB
      strategy.memoryImpact = 'medium';
      strategy.limitations.push('Large audio files may require streaming processing');
      
      if (!this.browserFeatures.compressionStreams) {
        strategy.memoryImpact = 'high';
        strategy.limitations.push('Compression Streams not available - higher memory usage');
      }
    }

    return strategy;
  }

  /**
   * Get document-specific degradation strategy
   */
  private static getDocumentDegradationStrategy(
    formatInfo: FormatInfo,
    supportInfo: FormatSupportInfo,
    fileSize: number,
    baseStrategy: DegradationStrategy
  ): DegradationStrategy {
    const strategy = { ...baseStrategy };

    // All document processing requires libraries
    strategy.performanceImpact = 'medium';
    strategy.memoryImpact = 'medium';

    // Check for basic requirements
    if (!this.browserFeatures.fileAPI) {
      strategy.canProcess = false;
      strategy.limitations.push('File API not supported');
    }

    // PDF-specific handling
    if (formatInfo.format === 'pdf') {
      strategy.limitations.push('PDF processing requires pdf-lib library');
      
      if (fileSize > 20 * 1024 * 1024) { // 20MB
        strategy.memoryImpact = 'high';
        strategy.limitations.push('Large PDF files may cause memory issues');
      }
    }

    // Office document handling
    if (['docx', 'xlsx', 'pptx', 'odt'].includes(formatInfo.format)) {
      strategy.limitations.push('Office document processing requires ZIP manipulation');
      
      if (!this.browserFeatures.compressionStreams) {
        strategy.memoryImpact = 'high';
        strategy.limitations.push('Compression Streams not available - higher memory usage');
      }
    }

    return strategy;
  }

  /**
   * Get archive-specific degradation strategy
   */
  private static getArchiveDegradationStrategy(
    formatInfo: FormatInfo,
    supportInfo: FormatSupportInfo,
    fileSize: number,
    baseStrategy: DegradationStrategy
  ): DegradationStrategy {
    const strategy = { ...baseStrategy };

    // Archive processing always requires libraries
    strategy.performanceImpact = 'medium';
    strategy.memoryImpact = 'medium';

    // APK-specific handling
    if (formatInfo.format === 'apk') {
      strategy.limitations.push('APK compression may affect app functionality');
      strategy.limitations.push('Signature validation required after compression');
      
      if (fileSize > 100 * 1024 * 1024) { // 100MB
        strategy.memoryImpact = 'high';
        strategy.limitations.push('Large APK files require significant memory');
      }
    }

    // Check for compression streams
    if (!this.browserFeatures.compressionStreams) {
      strategy.memoryImpact = 'high';
      strategy.limitations.push('Compression Streams not available - higher memory usage');
    }

    return strategy;
  }

  /**
   * Get file size-specific warnings
   */
  private static getFileSizeWarnings(
    formatInfo: FormatInfo,
    fileSize: number,
    strategy: DegradationStrategy
  ): string[] {
    const warnings: string[] = [];
    const sizeMB = fileSize / (1024 * 1024);

    // General size warnings
    if (sizeMB > 100) {
      warnings.push(`Large file (${sizeMB.toFixed(1)}MB) - processing may take significant time`);
    } else if (sizeMB > 50) {
      warnings.push(`Medium file (${sizeMB.toFixed(1)}MB) - processing may take some time`);
    }

    // Format-specific size warnings
    switch (formatInfo.type) {
      case 'image':
        if (sizeMB > 20) {
          warnings.push('Large images may cause browser memory issues');
        }
        break;
      
      case 'video':
        if (sizeMB > 200) {
          warnings.push('Very large video files may exceed browser memory limits');
        }
        break;
      
      case 'document':
        if (sizeMB > 50) {
          warnings.push('Large documents may take significant time to process');
        }
        break;
    }

    return warnings;
  }

  /**
   * Get browser-specific warnings
   */
  private static getBrowserSpecificWarnings(formatInfo: FormatInfo): string[] {
    const warnings: string[] = [];
    const browserName = this.browserInfo.name.toLowerCase();

    // Safari-specific warnings
    if (browserName === 'safari') {
      if (formatInfo.type === 'video' && formatInfo.format === 'webm') {
        warnings.push('WebM video format has limited support in Safari');
      }
      
      if (!this.browserFeatures.sharedArrayBuffer) {
        warnings.push('SharedArrayBuffer not available in Safari - reduced performance for video processing');
      }
    }

    // Firefox-specific warnings
    if (browserName === 'firefox') {
      if (!this.browserFeatures.webCodecs) {
        warnings.push('WebCodecs API not available in Firefox - using fallback methods');
      }
    }

    // Internet Explorer warnings
    if (browserName === 'internet explorer') {
      warnings.push('Internet Explorer has limited support - consider using a modern browser');
    }

    return warnings;
  }

  /**
   * Get memory usage estimate for a format and file size
   * @param formatInfo - The format information
   * @param fileSize - The file size in bytes
   * @returns Estimated memory usage in bytes
   */
  static getMemoryUsageEstimate(formatInfo: FormatInfo, fileSize: number): number {
    let multiplier = 1;

    switch (formatInfo.type) {
      case 'image':
        // Images typically require 3-4x memory for processing
        multiplier = formatInfo.format === 'tiff' ? 4 : 3;
        break;
      
      case 'video':
        // Video processing can require 2-5x memory depending on method
        multiplier = this.browserFeatures.sharedArrayBuffer ? 2 : 5;
        break;
      
      case 'audio':
        // Audio processing typically requires 2-3x memory
        multiplier = this.browserFeatures.webAudioAPI ? 2 : 3;
        break;
      
      case 'document':
        // Document processing requires 2-4x memory for parsing and manipulation
        multiplier = this.browserFeatures.compressionStreams ? 2 : 4;
        break;
      
      case 'archive':
        // Archive processing requires 3-5x memory for decompression and recompression
        multiplier = this.browserFeatures.compressionStreams ? 3 : 5;
        break;
    }

    return fileSize * multiplier;
  }

  /**
   * Check if processing should be allowed based on estimated memory usage
   * @param formatInfo - The format information
   * @param fileSize - The file size in bytes
   * @returns Whether processing should be allowed
   */
  static shouldAllowProcessing(formatInfo: FormatInfo, fileSize: number): boolean {
    const estimatedMemory = this.getMemoryUsageEstimate(formatInfo, fileSize);
    const availableMemory = this.getAvailableMemory();
    
    // Allow processing if estimated memory is less than 70% of available memory
    return estimatedMemory < (availableMemory * 0.7);
  }

  /**
   * Get estimated available memory (rough approximation)
   */
  private static getAvailableMemory(): number {
    // Rough estimates based on typical browser memory limits
    const browserName = this.browserInfo.name.toLowerCase();
    
    switch (browserName) {
      case 'chrome':
      case 'edge':
        return 2 * 1024 * 1024 * 1024; // 2GB
      
      case 'firefox':
        return 1.5 * 1024 * 1024 * 1024; // 1.5GB
      
      case 'safari':
        return 1 * 1024 * 1024 * 1024; // 1GB
      
      default:
        return 512 * 1024 * 1024; // 512MB (conservative)
    }
  }
}

export default GracefulDegradationManager;