/**
 * Enhanced CompressionService
 * Unified orchestration service for all file format compression with smart routing and fallback chains
 */

import { FileModel, FormatInfo, CompressionSettings } from '../types';
import FileHandler from './FileHandler/FileHandler';
import FormatDetector from './FormatDetector';

// Primary compressors (native APIs)
import CanvasImageCompressor from './ImageCompressor/CanvasImageCompressor';
import WebCodecsVideoCompressor from './VideoCompressor/WebCodecsVideoCompressor';
import AudioCompressor from './AudioCompressor/AudioCompressor';
import { PDFCompressor } from './DocumentCompressor/PDFCompressor';
import { OfficeCompressor } from './DocumentCompressor/OfficeCompressor';
import APKCompressor from './ArchiveCompressor/APKCompressor';

// Fallback compressors (library-based)
import ImageCompressor from './ImageCompressor/ImageCompressor';
import VideoCompressor from './VideoCompressor/VideoCompressor';
import AudioLibCompressor from './AudioCompressor/AudioLibCompressor';

// Utilities
import { resultsManager } from './ResultsManager/ResultsManager';
import MemoryManager from '../utils/memory/MemoryManager';
import SecureProcessing from '../utils/security/SecureProcessing';
import { CompressionError, MemoryError, UnsupportedFileTypeError } from '../utils/errors/ErrorTypes';

/**
 * Compression method type for fallback chain
 */
export type CompressionMethod = 'native' | 'library' | 'basic';

/**
 * Compression strategy interface for unified processing
 */
export interface CompressionStrategy {
  method: CompressionMethod;
  compressor: any;
  fallback?: CompressionStrategy;
}

/**
 * Enhanced CompressionService interface with unified format support
 */
export interface CompressionServiceInterface {
  /**
   * Process a single file with unified interface and smart routing
   * @param fileModel - The file model to process
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to updated file model
   */
  processFile(fileModel: FileModel, onProgress?: (progress: number) => void): Promise<FileModel>;

  /**
   * Process multiple files in batch with mixed format support
   * @param fileModels - Array of file models to process
   * @param onProgress - Callback for progress updates for each file
   * @param onBatchProgress - Callback for overall batch progress
   * @returns Promise resolving to array of updated file models
   */
  processBatch(
    fileModels: FileModel[],
    onProgress?: (id: string, progress: number) => void,
    onBatchProgress?: (progress: number) => void
  ): Promise<FileModel[]>;

  /**
   * Get compression strategy for a format with fallback chain
   * @param formatInfo - The detected format information
   * @returns Compression strategy with fallback chain
   */
  getCompressionStrategy(formatInfo: FormatInfo): CompressionStrategy | null;

  /**
   * Cancel processing for a specific file
   * @param id - ID of the file to cancel
   */
  cancelProcessing(id: string): void;

  /**
   * Cancel all ongoing processing
   */
  cancelAllProcessing(): void;

  /**
   * Get supported formats
   * @returns Array of supported format information
   */
  getSupportedFormats(): FormatInfo[];
}

/**
 * Enhanced CompressionService implementation with unified format support
 */
export class CompressionService implements CompressionServiceInterface {
  // Track active processing tasks
  private activeTasks: Set<string> = new Set();

  // Maximum concurrent processing tasks
  private maxConcurrentTasks: number = 2;

  // Compression strategy registry for all formats
  private compressionStrategies: Map<string, CompressionStrategy> = new Map();

  constructor() {
    this.initializeCompressionStrategies();
    this.initializeSecurityFeatures();
  }

  /**
   * Initialize compression strategies with fallback chains for all formats
   */
  private initializeCompressionStrategies(): void {
    // Image compression strategies
    this.compressionStrategies.set('image', {
      method: 'native',
      compressor: CanvasImageCompressor,
      fallback: {
        method: 'library',
        compressor: ImageCompressor,
        fallback: {
          method: 'basic',
          compressor: ImageCompressor, // Basic fallback uses same library with minimal settings
        }
      }
    });

    // Video compression strategies
    this.compressionStrategies.set('video', {
      method: 'native',
      compressor: WebCodecsVideoCompressor,
      fallback: {
        method: 'library',
        compressor: VideoCompressor,
        fallback: {
          method: 'basic',
          compressor: VideoCompressor, // Basic fallback uses same library with minimal settings
        }
      }
    });

    // Audio compression strategies
    this.compressionStrategies.set('audio', {
      method: 'native',
      compressor: AudioCompressor, // Web Audio API based
      fallback: {
        method: 'library',
        compressor: AudioLibCompressor, // Library-based fallback
        fallback: {
          method: 'basic',
          compressor: AudioLibCompressor, // Basic fallback with minimal processing
        }
      }
    });

    // Document compression strategies
    this.compressionStrategies.set('document', {
      method: 'library', // Documents primarily use libraries
      compressor: {
        pdf: new PDFCompressor(),
        office: new OfficeCompressor(),
      },
      fallback: {
        method: 'basic',
        compressor: {
          pdf: new PDFCompressor(), // Basic PDF compression
          office: new OfficeCompressor(), // Basic office compression
        }
      }
    });

    // Archive compression strategies
    this.compressionStrategies.set('archive', {
      method: 'library', // Archives primarily use libraries
      compressor: APKCompressor,
      fallback: {
        method: 'basic',
        compressor: APKCompressor, // Basic archive compression
      }
    });
  }

  /**
   * Initialize security features for multi-format compression
   */
  private initializeSecurityFeatures(): void {
    // Initialize secure processing with library validation
    SecureProcessing.initialize({
      monitorNetwork: true,
      allowedDomains: [], // No external domains allowed for compression libraries
      logBlocked: true,
      validateLibraries: true,
    });

    // Validate all compression libraries
    const libraryValidation = SecureProcessing.validateCompressionLibraries();
    
    // Log only critical security issues, not informational warnings
    let criticalIssues = 0;
    libraryValidation.forEach((result, libraryName) => {
      if (!result.isSecure) {
        console.warn(`⚠️ Security warning for ${libraryName}:`, result.warnings);
        criticalIssues++;
      }
      // Suppress informational warnings to reduce console noise
    });

    if (criticalIssues === 0) {
      console.log('🔒 Security features initialized - all compression libraries validated');
    } else {
      console.warn(`🔒 Security features initialized with ${criticalIssues} warnings`);
    }
  }

  /**
   * Get compression strategy for a format with fallback chain
   * @param formatInfo - The detected format information
   * @returns Compression strategy with fallback chain
   */
  getCompressionStrategy(formatInfo: FormatInfo): CompressionStrategy | null {
    return this.compressionStrategies.get(formatInfo.type) || null;
  }

  /**
   * Get supported formats
   * @returns Array of supported format information
   */
  getSupportedFormats(): FormatInfo[] {
    return FormatDetector.getSupportedFormats();
  }

  /**
   * Smart format routing to determine appropriate compressor
   * @param file - The file to analyze
   * @returns Promise with format info and compression strategy
   */
  private async routeToCompressor(file: File): Promise<{
    formatInfo: FormatInfo;
    strategy: CompressionStrategy;
  } | null> {
    // Detect format using enhanced FormatDetector
    const formatInfo = await FormatDetector.detectFormat(file);
    
    console.log('🔍 Format detection result:', {
      fileName: file.name,
      fileType: file.type,
      detectedFormat: formatInfo
    });
    
    if (!formatInfo) {
      console.warn('❌ No format detected for file:', file.name);
      return null;
    }

    // Get compression strategy for the detected format
    const strategy = this.getCompressionStrategy(formatInfo);
    
    console.log('🎯 Compression strategy:', {
      formatType: formatInfo.type,
      strategy: strategy ? {
        method: strategy.method,
        hasCompressor: !!strategy.compressor,
        hasFallback: !!strategy.fallback
      } : null
    });
    
    if (!strategy) {
      console.warn('❌ No compression strategy found for format:', formatInfo.type);
      return null;
    }

    return { formatInfo, strategy };
  }

  /**
   * Execute compression with fallback chain
   * @param file - The file to compress
   * @param settings - Compression settings
   * @param strategy - Compression strategy with fallback chain
   * @param formatInfo - Format information
   * @param onProgress - Progress callback
   * @returns Promise with compressed result
   */
  private async executeCompressionWithFallback(
    file: File,
    settings: CompressionSettings,
    strategy: CompressionStrategy,
    formatInfo: FormatInfo,
    onProgress?: (progress: number) => void
  ): Promise<{ blob: Blob; metadata?: any; method: string }> {
    let currentStrategy: CompressionStrategy | undefined = strategy;
    let lastError: Error | null = null;

    while (currentStrategy) {
      try {
        console.log(`🔄 Attempting ${formatInfo.type} compression using ${currentStrategy.method} method...`);
        
        const result = await this.executeCompressionMethod(
          file,
          settings,
          currentStrategy,
          formatInfo,
          onProgress
        );

        console.log(`✅ ${formatInfo.type} compression successful using ${currentStrategy.method} method`);
        return {
          ...result,
          method: `${formatInfo.type}-${currentStrategy.method}`,
        };
      } catch (error) {
        console.warn(`❌ ${formatInfo.type} compression failed with ${currentStrategy.method} method:`, error);
        lastError = error as Error;
        currentStrategy = currentStrategy.fallback;
      }
    }

    // If all methods failed, throw the last error
    throw lastError || new CompressionError(`All compression methods failed for ${formatInfo.type} format`);
  }

  /**
   * Execute specific compression method
   * @param file - The file to compress
   * @param settings - Compression settings
   * @param strategy - Current compression strategy
   * @param formatInfo - Format information
   * @param onProgress - Progress callback
   * @returns Promise with compressed result
   */
  private async executeCompressionMethod(
    file: File,
    settings: CompressionSettings,
    strategy: CompressionStrategy,
    formatInfo: FormatInfo,
    onProgress?: (progress: number) => void
  ): Promise<{ blob: Blob; metadata?: any }> {
    const { type, format } = formatInfo;
    const { compressor, method } = strategy;

    switch (type) {
      case 'image':
        if (method === 'native') {
          const blob = await compressor.compressImage(file, settings, onProgress);
          return { blob };
        } else {
          // Library fallback
          const fileBuffer = await FileHandler.prepareFileForCompression(file);
          const blob = await compressor.compressImage(fileBuffer, settings, onProgress);
          return { blob };
        }

      case 'video':
        if (method === 'native') {
          const blob = await compressor.compressVideo(file, settings, onProgress);
          return { blob };
        } else {
          // Library fallback with streaming
          const preparedFile = await FileHandler.prepareFileForStreamProcessing(file);
          const blob = await compressor.compressVideoWithStreaming(preparedFile, settings, onProgress);
          return { blob };
        }

      case 'audio':
        console.log('🎵 Processing audio file:', {
          fileName: file.name,
          compressorType: typeof compressor,
          hasCompressAudio: typeof compressor.compressAudio === 'function'
        });
        const blob = await compressor.compressAudio(file, settings, onProgress);
        return { blob };

      case 'document':
        console.log('📄 Processing document file:', {
          fileName: file.name,
          format: format,
          compressorType: typeof compressor,
          hasPdf: !!compressor.pdf,
          hasOffice: !!compressor.office
        });
        
        const documentSettings = settings.documentSettings || {
          compressionLevel: 'medium',
          preserveMetadata: true,
          optimizeImages: true,
        };

        let documentCompressor;
        if (format === 'pdf') {
          documentCompressor = compressor.pdf || compressor;
        } else {
          documentCompressor = compressor.office || compressor;
        }

        console.log('📄 Using document compressor:', {
          compressorType: typeof documentCompressor,
          hasCompressDocument: typeof documentCompressor.compressDocument === 'function'
        });

        const documentResult = await documentCompressor.compressDocument(
          file,
          documentSettings,
          onProgress
        );

        return {
          blob: documentResult.compressedBlob,
          metadata: documentResult.metadata,
        };

      case 'archive':
        console.log('📦 Processing archive file:', {
          fileName: file.name,
          compressorType: typeof compressor,
          hasCompressAPK: typeof compressor.compressAPK === 'function'
        });
        
        const archiveSettings = settings.archiveSettings || {
          compressionLevel: 6,
          preserveStructure: true,
          validateIntegrity: true,
        };

        const archiveResult = await compressor.compressAPK(file, archiveSettings, onProgress);
        return {
          blob: archiveResult.compressedBlob,
          metadata: archiveResult.metadata,
        };

      default:
        throw new UnsupportedFileTypeError(`Unsupported format type: ${type}`);
    }
  }

  /**
   * Unified error handling and recovery for all compression types
   * @param error - The error that occurred
   * @param formatInfo - Format information
   * @param method - Compression method that failed
   * @returns Formatted error message with recovery suggestions
   */
  private handleCompressionError(error: Error, formatInfo: FormatInfo, method: string): string {
    const baseMessage = `${formatInfo.type} compression failed using ${method} method`;
    
    // Format-specific error handling
    switch (formatInfo.type) {
      case 'image':
        if (error.message.includes('memory')) {
          return `${baseMessage}: Image too large for available memory. Try reducing image size or closing other browser tabs.`;
        }
        if (error.message.includes('canvas')) {
          return `${baseMessage}: Canvas API not supported. Using library fallback.`;
        }
        break;

      case 'video':
        if (error.message.includes('codec')) {
          return `${baseMessage}: Video codec not supported. Try converting to MP4 format first.`;
        }
        if (error.message.includes('SharedArrayBuffer')) {
          return `${baseMessage}: Browser security restrictions. Please use HTTPS or enable SharedArrayBuffer.`;
        }
        break;

      case 'audio':
        if (error.message.includes('decode')) {
          return `${baseMessage}: Audio format not supported or file corrupted.`;
        }
        break;

      case 'document':
        if (error.message.includes('encrypted')) {
          return `${baseMessage}: Document is password-protected. Please remove protection first.`;
        }
        if (error.message.includes('corrupted')) {
          return `${baseMessage}: Document appears to be corrupted or invalid.`;
        }
        break;

      case 'archive':
        if (error.message.includes('signature')) {
          return `${baseMessage}: APK signature validation failed. Compression may break the app.`;
        }
        if (error.message.includes('structure')) {
          return `${baseMessage}: APK structure is invalid or unsupported.`;
        }
        break;
    }

    // Generic error handling
    if (error instanceof MemoryError) {
      return `${baseMessage}: Not enough memory available. Try processing smaller files or closing other applications.`;
    }

    if (error instanceof UnsupportedFileTypeError) {
      return `${baseMessage}: File format not supported or file is corrupted.`;
    }

    return `${baseMessage}: ${error.message}`;
  }

  /**
   * Process a single file with unified interface and smart routing
   * @param fileModel - The file model to process
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to updated file model
   */
  async processFile(fileModel: FileModel, onProgress?: (progress: number) => void): Promise<FileModel> {
    try {
      // Add to active tasks
      this.activeTasks.add(fileModel.id);

      // Update status to processing
      let updatedModel: FileModel = {
        ...fileModel,
        status: 'processing',
        progress: 0,
        startTime: Date.now(),
      };

      // Check memory before processing
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available to process this file');
      }

      // Verify file can be processed securely
      if (!SecureProcessing.canProcessSecurely(fileModel.originalFile)) {
        throw new Error('File cannot be processed securely');
      }

      // Smart format routing to determine compressor and strategy
      const routingResult = await this.routeToCompressor(fileModel.originalFile);
      
      if (!routingResult) {
        throw new UnsupportedFileTypeError('Unsupported file type or format detection failed');
      }

      const { formatInfo, strategy } = routingResult;

      // Store detected format info in the model
      updatedModel.detectedFormat = formatInfo;
      updatedModel.processingMethod = strategy.method === 'basic' ? 'fallback' : strategy.method;

      console.log(`🔍 Detected format: ${formatInfo.type}/${formatInfo.format} (${formatInfo.supportLevel} support)`);

      // Execute compression with comprehensive fallback chain
      const compressionResult = await this.executeCompressionWithFallback(
        fileModel.originalFile,
        fileModel.settings,
        strategy,
        formatInfo,
        progress => {
          if (onProgress) onProgress(progress);
          updatedModel.progress = progress;
        }
      );

      // Calculate results using the unified results manager with format-specific data
      const result = resultsManager.calculateResults(
        fileModel.originalFile,
        compressionResult.blob,
        Date.now() - (updatedModel.startTime || 0),
        compressionResult.method,
        compressionResult.metadata
      );

      // Update model with results
      updatedModel = {
        ...updatedModel,
        result,
        status: 'complete',
        progress: 100,
        endTime: Date.now(),
        formatMetadata: compressionResult.metadata,
      };

      // Clean up after processing
      MemoryManager.cleanup();

      // Remove from active tasks
      this.activeTasks.delete(fileModel.id);

      console.log(`✅ Successfully processed ${formatInfo.type} file using ${compressionResult.method} method`);
      return updatedModel;

    } catch (error) {
      console.error('Error processing file:', error);

      // Remove from active tasks
      this.activeTasks.delete(fileModel.id);

      // Get format info for error handling if available
      let formatInfo: FormatInfo | null = null;
      try {
        formatInfo = await FormatDetector.detectFormat(fileModel.originalFile);
      } catch {
        // Ignore format detection errors during error handling
      }

      // Use unified error handling
      const errorMessage = formatInfo 
        ? this.handleCompressionError(error as Error, formatInfo, fileModel.processingMethod || 'unknown')
        : (error instanceof Error ? error.message : 'Unknown error occurred during file processing');

      // Return updated model with formatted error
      return {
        ...fileModel,
        status: 'error',
        error: errorMessage,
        endTime: Date.now(),
        detectedFormat: formatInfo || undefined,
      };
    }
  }

  /**
   * Process multiple files in batch with mixed format support
   * @param fileModels - Array of file models to process
   * @param onProgress - Callback for progress updates for each file
   * @param onBatchProgress - Callback for overall batch progress
   * @returns Promise resolving to array of updated file models
   */
  async processBatch(
    fileModels: FileModel[],
    onProgress?: (id: string, progress: number) => void,
    onBatchProgress?: (progress: number) => void
  ): Promise<FileModel[]> {
    console.log(`🚀 Starting batch processing of ${fileModels.length} files with mixed formats`);

    // Pre-analyze files to optimize processing order
    const analyzedFiles = await Promise.all(
      fileModels.map(async (fileModel) => {
        const formatInfo = await FormatDetector.detectFormat(fileModel.originalFile);
        return {
          ...fileModel,
          detectedFormat: formatInfo || undefined,
          priority: this.getProcessingPriority(fileModel.originalFile, formatInfo),
        };
      })
    );

    // Sort files by priority and size for optimal processing order
    // Priority: images first (fastest), then audio, documents, videos, archives (slowest)
    const sortedModels = analyzedFiles.sort((a, b) => {
      // First sort by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by size (smaller files first)
      return a.originalFile.size - b.originalFile.size;
    });

    const results: FileModel[] = [];
    const totalFiles = sortedModels.length;
    let completedFiles = 0;

    // Process files in batches to limit concurrent operations
    const processBatch = async (batch: FileModel[]): Promise<FileModel[]> => {
      console.log(`📦 Processing batch of ${batch.length} files`);
      
      // Process files in parallel, but limit concurrency
      const batchResults = await Promise.all(
        batch.map(fileModel =>
          this.processFile(fileModel, progress => {
            // Report individual file progress
            if (onProgress) {
              onProgress(fileModel.id, progress);
            }

            // Calculate and report overall batch progress
            if (onBatchProgress) {
              const overallProgress = Math.round(
                (completedFiles / totalFiles) * 100 + (progress / 100) * (1 / totalFiles) * 100
              );
              onBatchProgress(Math.min(overallProgress, 99)); // Cap at 99% until all complete
            }
          })
        )
      );

      // Update completed files count
      completedFiles += batch.length;

      // Report 100% progress when all files are complete
      if (completedFiles === totalFiles && onBatchProgress) {
        onBatchProgress(100);
      }

      return batchResults;
    };

    // Process files in batches based on maxConcurrentTasks
    for (let i = 0; i < sortedModels.length; i += this.maxConcurrentTasks) {
      const batch = sortedModels.slice(i, i + this.maxConcurrentTasks);
      const batchResults = await processBatch(batch);
      results.push(...batchResults);

      // Clean up after each batch
      MemoryManager.cleanup();
    }

    console.log(`✅ Batch processing completed: ${results.filter(r => r.status === 'complete').length}/${totalFiles} successful`);
    return results;
  }

  /**
   * Get processing priority for optimal batch processing order
   * @param file - The file to analyze
   * @param formatInfo - Detected format information
   * @returns Priority number (lower = higher priority)
   */
  private getProcessingPriority(file: File, formatInfo: FormatInfo | null): number {
    if (!formatInfo) return 999; // Unknown formats last

    // Priority based on typical processing speed and resource usage
    switch (formatInfo.type) {
      case 'image':
        return 1; // Fastest, process first
      case 'audio':
        return 2; // Fast, good for early wins
      case 'document':
        return 3; // Medium speed
      case 'video':
        return 4; // Slower, more resource intensive
      case 'archive':
        return 5; // Slowest, most complex
      default:
        return 999;
    }
  }

  /**
   * Cancel processing for a specific file
   * @param id - ID of the file to cancel
   */
  cancelProcessing(id: string): void {
    if (this.activeTasks.has(id)) {
      console.log(`🛑 Cancelling processing for file: ${id}`);
      
      // Cancel all compression methods across all formats
      this.cancelAllCompressionMethods();

      // Remove from active tasks
      this.activeTasks.delete(id);
    }
  }

  /**
   * Cancel all ongoing processing
   */
  cancelAllProcessing(): void {
    if (this.activeTasks.size > 0) {
      console.log(`🛑 Cancelling all processing (${this.activeTasks.size} active tasks)`);
      
      // Cancel all compression methods across all formats
      this.cancelAllCompressionMethods();

      // Clear active tasks
      this.activeTasks.clear();
    }
  }

  /**
   * Cancel all compression methods across all supported formats
   */
  private cancelAllCompressionMethods(): void {
    try {
      // Cancel video compression
      if (typeof VideoCompressor.cancelCompression === 'function') {
        VideoCompressor.cancelCompression();
      }
      if (typeof WebCodecsVideoCompressor.cancelCompression === 'function') {
        WebCodecsVideoCompressor.cancelCompression();
      }

      // Cancel audio compression
      if (typeof AudioCompressor.cancelCompression === 'function') {
        AudioCompressor.cancelCompression();
      }
      if (typeof AudioLibCompressor.cancelCompression === 'function') {
        AudioLibCompressor.cancelCompression();
      }

      // Cancel document compression
      try {
        PDFCompressor.cancelCompression();
      } catch (error) {
        console.warn('Failed to cancel PDF compression:', error);
      }
      try {
        OfficeCompressor.cancelCompression();
      } catch (error) {
        console.warn('Failed to cancel Office compression:', error);
      }

      // Cancel archive compression
      try {
        APKCompressor.cancelCompression();
      } catch (error) {
        console.warn('Failed to cancel APK compression:', error);
      }

      // Note: Image compression (Canvas-based) typically doesn't need cancellation
      // as it's usually synchronous or very fast
    } catch (error) {
      console.warn('Error during compression cancellation:', error);
    }
  }

  /**
   * Set the maximum number of concurrent processing tasks
   * @param max - Maximum number of concurrent tasks
   */
  setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = Math.max(1, Math.min(max, 4)); // Limit between 1 and 4
  }

  /**
   * Get the current number of active processing tasks
   * @returns Number of active tasks
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Get security report for compression libraries
   * @returns Security report with network activity and violations
   */
  getSecurityReport(): {
    isSecure: boolean;
    violations: string[];
    recommendations: string[];
    libraryActivity: any[];
  } {
    const networkMonitor = require('../utils/security/NetworkMonitor').default;
    return networkMonitor.getSecurityReport();
  }

  /**
   * Clean up security features and resources
   */
  cleanup(): void {
    console.log('🧹 Cleaning up CompressionService security features');
    
    // Cancel all active processing
    this.cancelAllProcessing();
    
    // Clean up security features
    SecureProcessing.cleanup();
    
    // Clear active tasks
    this.activeTasks.clear();
    
    console.log('✅ CompressionService cleanup completed');
  }
}

// Export singleton instance
const compressionService = new CompressionService();
export default compressionService;
