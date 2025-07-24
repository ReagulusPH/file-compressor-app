/**
 * Browser Compatibility Service
 * Comprehensive service for managing browser compatibility and capability detection
 */

import { FormatCapabilityDetector, type FormatSupportInfo } from '../utils/formatCapabilities';
import { GracefulDegradationManager, type ProcessingRecommendation } from '../utils/gracefulDegradation';
import { EnhancedBrowserCapabilityDetector, type EnhancedCapabilityResult } from '../utils/enhancedBrowserCapabilities';
import { detectBrowserFeatures, detectFormatCapabilities, getBrowserInfo, checkBrowserCompatibility } from '../utils/browserSupport';
import type { FormatInfo } from '../types';

/**
 * Interface for comprehensive compatibility report
 */
export interface CompatibilityReport {
  browserInfo: {
    name: string;
    version: string;
    isSupported: boolean;
  };
  formatSupport: FormatSupportInfo;
  processingRecommendation: ProcessingRecommendation;
  warnings: Array<{
    type: 'unsupported' | 'limited' | 'fallback';
    feature: string;
    details: string;
    suggestions: string[];
    formatType?: string;
    fallbackMethods?: string[];
  }>;
  memoryEstimate: {
    estimated: number;
    available: number;
    shouldProceed: boolean;
  };
}

/**
 * Interface for batch compatibility check
 */
export interface BatchCompatibilityResult {
  overallCompatibility: 'full' | 'partial' | 'limited' | 'unsupported';
  formatResults: Map<string, CompatibilityReport>;
  globalWarnings: string[];
  recommendations: string[];
}

/**
 * Browser Compatibility Service class
 */
export class BrowserCompatibilityService {
  private static instance: BrowserCompatibilityService | null = null;
  private initialized = false;

  /**
   * Get singleton instance
   */
  static getInstance(): BrowserCompatibilityService {
    if (!this.instance) {
      this.instance = new BrowserCompatibilityService();
    }
    return this.instance;
  }

  /**
   * Initialize the service
   */
  initialize(): void {
    if (this.initialized) return;

    // Initialize capability detectors
    FormatCapabilityDetector.initialize();
    
    this.initialized = true;
  }

  /**
   * Get comprehensive compatibility report for a format
   * @param formatInfo - The format information
   * @param fileSize - Optional file size for memory estimation
   * @returns Comprehensive compatibility report
   */
  getCompatibilityReport(formatInfo: FormatInfo, fileSize: number = 0): CompatibilityReport {
    this.initialize();

    // Use enhanced capability detection for more comprehensive analysis
    const enhancedCapabilities = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo, fileSize);
    
    const browserCompatibility = checkBrowserCompatibility();
    
    // Convert enhanced warnings to expected format
    const warnings = enhancedCapabilities.compatibilityWarnings.map(warning => ({
      type: warning.type,
      feature: warning.feature,
      details: warning.details,
      suggestions: warning.suggestions,
      formatType: formatInfo.type,
      fallbackMethods: enhancedCapabilities.fallbackChain,
    }));

    // Memory estimation using enhanced capabilities
    const estimatedMemory = GracefulDegradationManager.getMemoryUsageEstimate(formatInfo, fileSize);
    const shouldAllowProcessing = GracefulDegradationManager.shouldAllowProcessing(formatInfo, fileSize);
    
    return {
      browserInfo: {
        name: enhancedCapabilities.browserInfo.name,
        version: enhancedCapabilities.browserInfo.version,
        isSupported: browserCompatibility.isCompatible,
      },
      formatSupport: enhancedCapabilities.supportInfo,
      processingRecommendation: enhancedCapabilities.processingRecommendation,
      warnings,
      memoryEstimate: {
        estimated: estimatedMemory,
        available: this.getEstimatedAvailableMemory(),
        shouldProceed: shouldAllowProcessing,
      },
    };
  }

  /**
   * Check compatibility for multiple formats (batch processing)
   * @param formats - Array of format information
   * @param fileSizes - Optional array of file sizes
   * @returns Batch compatibility result
   */
  checkBatchCompatibility(
    formats: FormatInfo[],
    fileSizes: number[] = []
  ): BatchCompatibilityResult {
    this.initialize();

    const formatResults = new Map<string, CompatibilityReport>();
    const globalWarnings: string[] = [];
    const recommendations: string[] = [];
    
    let fullSupport = 0;
    let partialSupport = 0;
    let limitedSupport = 0;
    let unsupported = 0;

    // Check each format
    formats.forEach((format, index) => {
      const fileSize = fileSizes[index] || 0;
      const report = this.getCompatibilityReport(format, fileSize);
      
      formatResults.set(`${format.type}-${format.format}`, report);

      // Count support levels
      switch (report.formatSupport.supportLevel) {
        case 'native':
          fullSupport++;
          break;
        case 'library':
          partialSupport++;
          break;
        case 'fallback':
          limitedSupport++;
          break;
        case 'unsupported':
          unsupported++;
          break;
      }
    });

    // Get batch processing recommendation from enhanced capabilities
    const batchRecommendation = EnhancedBrowserCapabilityDetector.getBatchProcessingRecommendation(formats);
    globalWarnings.push(...batchRecommendation.warnings);
    recommendations.push(...batchRecommendation.suggestions);

    // Determine overall compatibility
    let overallCompatibility: 'full' | 'partial' | 'limited' | 'unsupported';
    if (unsupported > 0) {
      overallCompatibility = 'unsupported';
      globalWarnings.push(`${unsupported} format(s) are not supported in your browser`);
      recommendations.push('Consider using alternative file formats');
      recommendations.push('Update to a modern browser for better support');
    } else if (limitedSupport > 0) {
      overallCompatibility = 'limited';
      globalWarnings.push(`${limitedSupport} format(s) have limited support`);
      recommendations.push('Performance may be reduced for some formats');
    } else if (partialSupport > 0) {
      overallCompatibility = 'partial';
      globalWarnings.push(`${partialSupport} format(s) require library support`);
    } else {
      overallCompatibility = 'full';
    }

    // Add browser-specific recommendations
    const browserInfo = getBrowserInfo();
    const browserRecommendations = this.getBrowserSpecificRecommendations(browserInfo.name);
    recommendations.push(...browserRecommendations);

    return {
      overallCompatibility,
      formatResults,
      globalWarnings,
      recommendations,
    };
  }

  /**
   * Get the best processing method for a format
   * @param formatInfo - The format information
   * @returns Recommended processing method
   */
  getRecommendedProcessingMethod(formatInfo: FormatInfo): string {
    this.initialize();
    return EnhancedBrowserCapabilityDetector.getBestProcessingMethod(formatInfo);
  }

  /**
   * Check if a format is supported in the current browser
   * @param formatInfo - The format information
   * @returns Boolean indicating support
   */
  isFormatSupported(formatInfo: FormatInfo): boolean {
    this.initialize();
    return FormatCapabilityDetector.isFormatSupported(formatInfo);
  }

  /**
   * Get all supported formats for the current browser
   * @param type - Optional type filter
   * @returns Array of supported format information
   */
  getSupportedFormats(type?: 'image' | 'video' | 'audio' | 'document' | 'archive'): FormatInfo[] {
    this.initialize();
    
    // This would need to be implemented in FormatDetector
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get browser feature summary
   * @returns Object containing browser features and capabilities
   */
  getBrowserFeatureSummary(): {
    features: ReturnType<typeof detectBrowserFeatures>;
    formatCapabilities: ReturnType<typeof detectFormatCapabilities>;
    browserInfo: ReturnType<typeof getBrowserInfo>;
    compatibility: ReturnType<typeof checkBrowserCompatibility>;
  } {
    this.initialize();

    return {
      features: detectBrowserFeatures(),
      formatCapabilities: detectFormatCapabilities(),
      browserInfo: getBrowserInfo(),
      compatibility: checkBrowserCompatibility(),
    };
  }

  /**
   * Get performance recommendations for processing
   * @param formatInfo - The format information
   * @param fileSize - The file size in bytes
   * @returns Array of performance recommendations
   */
  getPerformanceRecommendations(formatInfo: FormatInfo, fileSize: number): string[] {
    this.initialize();

    const recommendations: string[] = [];
    const processingRecommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo, fileSize);
    
    // Performance impact recommendations
    switch (processingRecommendation.strategy.performanceImpact) {
      case 'high':
        recommendations.push('Processing may take significant time and block the browser');
        recommendations.push('Consider processing smaller files or using a more powerful device');
        break;
      case 'medium':
        recommendations.push('Processing may take some time');
        recommendations.push('Avoid switching tabs during processing');
        break;
      case 'low':
        recommendations.push('Processing should be relatively fast');
        break;
    }

    // Memory impact recommendations
    switch (processingRecommendation.strategy.memoryImpact) {
      case 'high':
        recommendations.push('Close other browser tabs to free up memory');
        recommendations.push('Consider processing files one at a time');
        break;
      case 'medium':
        recommendations.push('Monitor browser memory usage during processing');
        break;
    }

    // File size specific recommendations
    const sizeMB = fileSize / (1024 * 1024);
    if (sizeMB > 100) {
      recommendations.push('Consider splitting large files into smaller chunks');
    } else if (sizeMB > 50) {
      recommendations.push('Large file detected - processing may take time');
    }

    return recommendations;
  }

  /**
   * Get browser-specific recommendations
   */
  private getBrowserSpecificRecommendations(browserName: string): string[] {
    const recommendations: string[] = [];
    
    switch (browserName.toLowerCase()) {
      case 'safari':
        recommendations.push('For best video processing performance, consider using Chrome or Firefox');
        recommendations.push('Enable cross-origin isolation for SharedArrayBuffer support');
        break;
      
      case 'firefox':
        recommendations.push('WebCodecs API not available - using fallback methods for video');
        break;
      
      case 'internet explorer':
        recommendations.push('Internet Explorer is not recommended - please use a modern browser');
        break;
      
      case 'edge':
        recommendations.push('Microsoft Edge provides good compatibility for all formats');
        break;
      
      case 'chrome':
        recommendations.push('Chrome provides optimal support for all compression formats');
        break;
    }

    return recommendations;
  }

  /**
   * Get estimated available memory (rough approximation)
   */
  private getEstimatedAvailableMemory(): number {
    const browserInfo = getBrowserInfo();
    
    switch (browserInfo.name.toLowerCase()) {
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

  /**
   * Reset the service (useful for testing)
   */
  reset(): void {
    this.initialized = false;
    BrowserCompatibilityService.instance = null;
  }
}

export default BrowserCompatibilityService;