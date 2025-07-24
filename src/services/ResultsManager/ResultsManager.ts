import { CompressionResult, FormatInfo, FormatSpecificData } from '../../types';

/**
 * Format-specific statistics interface
 */
export interface FormatStatistics {
  totalFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  averageProcessingTime: number;
  formatSpecificMetrics: {
    // Image metrics
    averageResolutionReduction?: number;
    formatConversions?: Record<string, number>;
    
    // Audio metrics
    averageBitrateReduction?: number;
    qualityDistribution?: Record<string, number>;
    
    // Document metrics
    totalPagesProcessed?: number;
    totalImagesOptimized?: number;
    
    // Archive metrics
    totalEntriesProcessed?: number;
    integritySuccessRate?: number;
  };
}

/**
 * Batch processing statistics interface
 */
export interface BatchStatistics {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  overallCompressionRatio: number;
  totalProcessingTime: number;
  formatBreakdown: Record<string, FormatStatistics>;
  topPerformingFormats: Array<{
    format: string;
    compressionRatio: number;
    fileCount: number;
  }>;
}

/**
 * Enhanced ResultsManager service for handling multi-format compression results
 * Responsible for:
 * - Calculating format-specific compression statistics
 * - Managing download functionality for mixed file types
 * - Storing temporary results with format metadata
 * - Providing unified compression comparison across formats
 */
export class ResultsManager {
  private results: Map<string, CompressionResult> = new Map();

  /**
   * Store a compression result
   * @param result The compression result to store
   */
  public storeResult(result: CompressionResult): void {
    this.results.set(result.id, result);
  }

  /**
   * Get a stored compression result by ID
   * @param id The ID of the result to retrieve
   * @returns The compression result or undefined if not found
   */
  public getResult(id: string): CompressionResult | undefined {
    return this.results.get(id);
  }

  /**
   * Get all stored compression results
   * @returns Array of all compression results
   */
  public getAllResults(): CompressionResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Clear all stored results
   */
  public clearResults(): void {
    this.results.clear();
  }

  /**
   * Remove a specific result by ID
   * @param id The ID of the result to remove
   * @returns True if the result was removed, false if it wasn't found
   */
  public removeResult(id: string): boolean {
    return this.results.delete(id);
  }

  /**
   * Calculate compression ratio between original and compressed file sizes
   * @param originalSize Original file size in bytes
   * @param compressedSize Compressed file size in bytes
   * @returns Compression ratio as a percentage (smaller is better)
   */
  public calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize <= 0) {
      throw new Error('Original size must be greater than zero');
    }

    // Calculate ratio as percentage of original size (smaller is better)
    return (compressedSize / originalSize) * 100;
  }

  /**
   * Calculate size reduction as a percentage
   * @param originalSize Original file size in bytes
   * @param compressedSize Compressed file size in bytes
   * @returns Size reduction as a percentage (larger is better)
   */
  public calculateSizeReduction(originalSize: number, compressedSize: number): number {
    if (originalSize <= 0) {
      throw new Error('Original size must be greater than zero');
    }

    // Calculate size reduction as percentage (larger is better)
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  /**
   * Calculate processing time in seconds
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @returns Processing time in seconds
   */
  public calculateProcessingTime(startTime: number, endTime: number): number {
    if (endTime < startTime) {
      throw new Error('End time must be greater than or equal to start time');
    }

    // Return processing time in seconds
    return (endTime - startTime) / 1000;
  }

  /**
   * Calculate compression results from original and compressed files with format-specific data
   * @param originalFile Original file
   * @param compressedBlob Compressed file blob
   * @param processingTime Processing time in milliseconds
   * @param method Compression method used
   * @param formatSpecificData Format-specific result data
   * @returns Compression result object
   */
  public calculateResults(
    originalFile: File,
    compressedBlob: Blob,
    processingTime: number,
    method: string = 'unknown',
    formatSpecificData?: FormatSpecificData
  ): CompressionResult {
    const compressionRatio = this.calculateCompressionRatio(originalFile.size, compressedBlob.size);

    return {
      id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalFile: {
        name: originalFile.name,
        size: originalFile.size,
        type: originalFile.type,
      },
      compressedFile: {
        blob: compressedBlob,
        size: compressedBlob.size,
        type: compressedBlob.type,
      },
      compressionRatio,
      processingTime: processingTime / 1000, // Convert to seconds
      method,
      formatSpecificData,
    };
  }

  /**
   * Format file size to human-readable string
   * @param bytes File size in bytes
   * @returns Formatted file size string (e.g., "1.5 MB")
   */
  public formatFileSize(bytes: number): string {
    if (bytes < 0) {
      throw new Error('File size cannot be negative');
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    // Round to 2 decimal places
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Create a download URL for a blob
   * @param blob The blob to create a download URL for
   * @returns A URL that can be used to download the blob
   */
  public createDownloadURL(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Trigger download of a file
   * @param blob The blob to download
   * @param fileName The name to give the downloaded file
   */
  public downloadFile(blob: Blob, fileName: string): void {
    const url = this.createDownloadURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Append to the document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Calculate format-specific statistics for a given format type
   * @param formatType Format type to analyze (image, video, audio, document, archive)
   * @returns Format-specific statistics
   */
  public calculateFormatStatistics(formatType: string): FormatStatistics {
    const formatResults = this.getResultsByFormat(formatType);
    
    if (formatResults.length === 0) {
      return {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        averageProcessingTime: 0,
        formatSpecificMetrics: {},
      };
    }

    const totalOriginalSize = formatResults.reduce((sum, result) => sum + result.originalFile.size, 0);
    const totalCompressedSize = formatResults.reduce((sum, result) => sum + result.compressedFile.size, 0);
    const averageCompressionRatio = formatResults.reduce((sum, result) => sum + result.compressionRatio, 0) / formatResults.length;
    const averageProcessingTime = formatResults.reduce((sum, result) => sum + result.processingTime, 0) / formatResults.length;

    // Calculate format-specific metrics
    const formatSpecificMetrics = this.calculateFormatSpecificMetrics(formatType, formatResults);

    return {
      totalFiles: formatResults.length,
      totalOriginalSize,
      totalCompressedSize,
      averageCompressionRatio,
      averageProcessingTime,
      formatSpecificMetrics,
    };
  }

  /**
   * Calculate batch processing statistics across all formats
   * @returns Comprehensive batch statistics
   */
  public calculateBatchStatistics(): BatchStatistics {
    const allResults = this.getAllResults();
    const successfulResults = allResults.filter(result => result.compressedFile.blob);
    const failedResults = allResults.filter(result => !result.compressedFile.blob);

    const totalOriginalSize = successfulResults.reduce((sum, result) => sum + result.originalFile.size, 0);
    const totalCompressedSize = successfulResults.reduce((sum, result) => sum + result.compressedFile.size, 0);
    const overallCompressionRatio = totalOriginalSize > 0 ? (totalCompressedSize / totalOriginalSize) * 100 : 0;
    const totalProcessingTime = successfulResults.reduce((sum, result) => sum + result.processingTime, 0);

    // Calculate format breakdown
    const formatBreakdown: Record<string, FormatStatistics> = {};
    const formatTypes = this.getUniqueFormatTypes();
    
    formatTypes.forEach(formatType => {
      formatBreakdown[formatType] = this.calculateFormatStatistics(formatType);
    });

    // Calculate top performing formats
    const topPerformingFormats = Object.entries(formatBreakdown)
      .map(([format, stats]) => ({
        format,
        compressionRatio: stats.averageCompressionRatio,
        fileCount: stats.totalFiles,
      }))
      .filter(item => item.fileCount > 0)
      .sort((a, b) => a.compressionRatio - b.compressionRatio) // Lower ratio is better
      .slice(0, 5);

    return {
      totalFiles: allResults.length,
      successfulFiles: successfulResults.length,
      failedFiles: failedResults.length,
      totalOriginalSize,
      totalCompressedSize,
      overallCompressionRatio,
      totalProcessingTime,
      formatBreakdown,
      topPerformingFormats,
    };
  }

  /**
   * Get results filtered by format type
   * @param formatType Format type to filter by
   * @returns Array of results for the specified format
   */
  public getResultsByFormat(formatType: string): CompressionResult[] {
    return this.getAllResults().filter(result => {
      const mimeType = result.originalFile.type;
      return this.getFormatTypeFromMimeType(mimeType) === formatType;
    });
  }

  /**
   * Get unique format types from all stored results
   * @returns Array of unique format types
   */
  public getUniqueFormatTypes(): string[] {
    const formatTypes = new Set<string>();
    
    this.getAllResults().forEach(result => {
      const formatType = this.getFormatTypeFromMimeType(result.originalFile.type);
      formatTypes.add(formatType);
    });

    return Array.from(formatTypes);
  }

  /**
   * Determine format type from MIME type
   * @param mimeType MIME type string
   * @returns Format type
   */
  private getFormatTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf' || 
        mimeType.includes('document') || 
        mimeType.includes('spreadsheet') || 
        mimeType.includes('presentation') ||
        mimeType.includes('officedocument')) return 'document';
    if (mimeType === 'application/vnd.android.package-archive' ||
        mimeType.includes('zip') ||
        mimeType.includes('archive')) return 'archive';
    return 'unknown';
  }

  /**
   * Calculate format-specific metrics based on format type and results
   * @param formatType Format type
   * @param results Results for the format
   * @returns Format-specific metrics
   */
  private calculateFormatSpecificMetrics(formatType: string, results: CompressionResult[]): any {
    switch (formatType) {
      case 'image':
        return this.calculateImageMetrics(results);
      case 'audio':
        return this.calculateAudioMetrics(results);
      case 'document':
        return this.calculateDocumentMetrics(results);
      case 'archive':
        return this.calculateArchiveMetrics(results);
      default:
        return {};
    }
  }

  /**
   * Calculate image-specific metrics
   * @param results Image compression results
   * @returns Image-specific metrics
   */
  private calculateImageMetrics(results: CompressionResult[]): any {
    const formatConversions: Record<string, number> = {};
    
    results.forEach(result => {
      const originalFormat = result.originalFile.type.split('/')[1];
      const compressedFormat = result.compressedFile.type.split('/')[1];
      
      if (originalFormat !== compressedFormat) {
        const conversion = `${originalFormat} → ${compressedFormat}`;
        formatConversions[conversion] = (formatConversions[conversion] || 0) + 1;
      }
    });

    return {
      formatConversions,
    };
  }

  /**
   * Calculate audio-specific metrics
   * @param results Audio compression results
   * @returns Audio-specific metrics
   */
  private calculateAudioMetrics(results: CompressionResult[]): any {
    const bitrateReductions: number[] = [];
    const qualityDistribution: Record<string, number> = {};

    results.forEach(result => {
      if (result.formatSpecificData?.finalBitrate) {
        // Estimate original bitrate based on file size and assume standard duration
        const estimatedOriginalBitrate = (result.originalFile.size * 8) / (1000 * 180); // Assume 3 min average
        const bitrateReduction = ((estimatedOriginalBitrate - result.formatSpecificData.finalBitrate) / estimatedOriginalBitrate) * 100;
        bitrateReductions.push(bitrateReduction);
      }

      if (result.formatSpecificData?.qualityScore) {
        const qualityRange = this.getQualityRange(result.formatSpecificData.qualityScore);
        qualityDistribution[qualityRange] = (qualityDistribution[qualityRange] || 0) + 1;
      }
    });

    const averageBitrateReduction = bitrateReductions.length > 0 
      ? bitrateReductions.reduce((sum, reduction) => sum + reduction, 0) / bitrateReductions.length
      : 0;

    return {
      averageBitrateReduction,
      qualityDistribution,
    };
  }

  /**
   * Calculate document-specific metrics
   * @param results Document compression results
   * @returns Document-specific metrics
   */
  private calculateDocumentMetrics(results: CompressionResult[]): any {
    let totalPagesProcessed = 0;
    let totalImagesOptimized = 0;

    results.forEach(result => {
      if (result.formatSpecificData?.pagesProcessed) {
        totalPagesProcessed += result.formatSpecificData.pagesProcessed;
      }
      if (result.formatSpecificData?.imagesOptimized) {
        totalImagesOptimized += result.formatSpecificData.imagesOptimized;
      }
    });

    return {
      totalPagesProcessed,
      totalImagesOptimized,
    };
  }

  /**
   * Calculate archive-specific metrics
   * @param results Archive compression results
   * @returns Archive-specific metrics
   */
  private calculateArchiveMetrics(results: CompressionResult[]): any {
    let totalEntriesProcessed = 0;
    let integrityVerifiedCount = 0;

    results.forEach(result => {
      if (result.formatSpecificData?.entriesProcessed) {
        totalEntriesProcessed += result.formatSpecificData.entriesProcessed;
      }
      if (result.formatSpecificData?.integrityVerified) {
        integrityVerifiedCount++;
      }
    });

    const integritySuccessRate = results.length > 0 ? (integrityVerifiedCount / results.length) * 100 : 0;

    return {
      totalEntriesProcessed,
      integritySuccessRate,
    };
  }

  /**
   * Get quality range string for a numeric quality score
   * @param score Quality score (0-10)
   * @returns Quality range string
   */
  private getQualityRange(score: number): string {
    if (score >= 8) return 'High (8-10)';
    if (score >= 6) return 'Medium (6-7)';
    if (score >= 4) return 'Low (4-5)';
    return 'Poor (0-3)';
  }

  /**
   * Download results by format type
   * @param formatType Format type to download
   * @param zipFileName Name for the zip file
   */
  public async downloadByFormat(formatType: string, zipFileName?: string): Promise<void> {
    const formatResults = this.getResultsByFormat(formatType);
    
    if (formatResults.length === 0) {
      throw new Error(`No ${formatType} results to download`);
    }

    const fileName = zipFileName || `compressed_${formatType}_files.zip`;
    await this.downloadResultsAsZip(formatResults, fileName);
  }

  /**
   * Download specific results as a zip file
   * @param results Results to download
   * @param zipFileName Name for the zip file
   */
  public async downloadResultsAsZip(results: CompressionResult[], zipFileName: string): Promise<void> {
    if (results.length === 0) {
      throw new Error('No results to download');
    }

    try {
      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Group files by format to organize in folders
      const filesByFormat: Record<string, CompressionResult[]> = {};
      
      results.forEach(result => {
        const formatType = this.getFormatTypeFromMimeType(result.originalFile.type);
        if (!filesByFormat[formatType]) {
          filesByFormat[formatType] = [];
        }
        filesByFormat[formatType].push(result);
      });

      // Add files to zip, organized by format if multiple formats
      const hasMultipleFormats = Object.keys(filesByFormat).length > 1;

      Object.entries(filesByFormat).forEach(([formatType, formatResults]) => {
        formatResults.forEach(result => {
          // Use original filename but with new extension if format changed
          const fileExtension = result.compressedFile.type.split('/')[1] || 'bin';
          const baseName = result.originalFile.name.split('.').slice(0, -1).join('.') || 'compressed';
          const fileName = `${baseName}_compressed.${fileExtension}`;

          // Add to appropriate folder if multiple formats
          const filePath = hasMultipleFormats ? `${formatType}/${fileName}` : fileName;
          zip.file(filePath, result.compressedFile.blob);
        });
      });

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download the zip file
      this.downloadFile(zipBlob, zipFileName);
    } catch (error) {
      console.error('Failed to create zip file:', error);
      throw new Error('Failed to create zip file. JSZip library might be missing.');
    }
  }

  /**
   * Download all stored results as a zip file with format organization
   * @param zipFileName The name to give the zip file
   * @returns Promise that resolves when the download starts
   */
  public async downloadAllAsZip(zipFileName: string = 'compressed_files.zip'): Promise<void> {
    const allResults = this.getAllResults();
    await this.downloadResultsAsZip(allResults, zipFileName);
  }
}

// Export a singleton instance
export const resultsManager = new ResultsManager();
