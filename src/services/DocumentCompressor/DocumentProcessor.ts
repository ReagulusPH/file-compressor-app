/**
 * DocumentProcessor base service
 * Common document operations and utilities for all document formats
 */

import { DocumentSettings, FormatMetadata } from '../../types';
import { CompressionError, MemoryError } from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';

/**
 * Document processing result interface
 */
export interface DocumentProcessingResult {
  compressedBlob: Blob;
  metadata: FormatMetadata;
  compressionRatio: number;
  processingTime: number;
}

/**
 * Document chunk interface for memory-efficient processing
 */
export interface DocumentChunk {
  data: ArrayBuffer;
  index: number;
  totalChunks: number;
  type: 'page' | 'entry' | 'media';
}

/**
 * Base DocumentProcessor class
 */
export abstract class DocumentProcessor {
  protected isProcessing = false;
  protected shouldCancel = false;

  /**
   * Abstract method to compress a document
   * @param file - The document file to compress
   * @param settings - Document compression settings
   * @param onProgress - Progress callback
   * @returns Promise resolving to processing result
   */
  abstract compressDocument(
    file: File,
    settings: DocumentSettings,
    onProgress?: (progress: number) => void
  ): Promise<DocumentProcessingResult>;

  /**
   * Extract metadata from document file
   * @param file - The document file
   * @returns Promise resolving to format metadata
   */
  abstract extractMetadata(file: File): Promise<FormatMetadata>;

  /**
   * Check if document processing should use chunked operations based on enhanced memory management
   * @param file - The document file
   * @returns Boolean indicating if chunked processing is recommended
   */
  protected shouldUseChunkedProcessing(file: File): boolean {
    const format = 'document';
    const memoryCheck = MemoryManager.canProcessFile(file.size, format);
    const formatReqs = MemoryManager.getFormatMemoryRequirements(format);
    
    // Use chunked processing if memory management recommends streaming or file exceeds threshold
    return memoryCheck.shouldUseStreaming || file.size > formatReqs.streamingThreshold;
  }

  /**
   * Calculate optimal chunk size based on enhanced memory management
   * @param fileSize - Size of the file to process
   * @returns Optimal chunk size in bytes
   */
  protected calculateChunkSize(fileSize: number): number {
    const format = 'document';
    const recommendedChunkSize = MemoryManager.getRecommendedChunkSize(fileSize, format);
    const formatReqs = MemoryManager.getFormatMemoryRequirements(format);
    
    // Use format-specific chunk size calculation
    const maxChunkSize = Math.min(recommendedChunkSize, 5 * 1024 * 1024); // Use recommended or 5MB max
    const minChunkSize = 512 * 1024; // 512KB minimum

    // Calculate chunk size based on file size and format requirements
    let chunkSize = Math.max(fileSize / 20, minChunkSize); // Aim for ~20 chunks
    chunkSize = Math.min(chunkSize, maxChunkSize);

    // Apply format-specific multiplier
    chunkSize = Math.floor(chunkSize * formatReqs.chunkSizeMultiplier);

    return Math.max(minChunkSize, chunkSize);
  }

  /**
   * Process document in chunks for memory efficiency
   * @param file - The document file
   * @param processor - Function to process each chunk
   * @param onProgress - Progress callback
   * @returns Promise resolving to processed chunks
   */
  protected async processInChunks<T>(
    file: File,
    processor: (chunk: DocumentChunk) => Promise<T>,
    onProgress?: (progress: number) => void
  ): Promise<T[]> {
    if (!this.shouldUseChunkedProcessing(file)) {
      // Process entire file as single chunk
      const buffer = await file.arrayBuffer();
      const chunk: DocumentChunk = {
        data: buffer,
        index: 0,
        totalChunks: 1,
        type: 'page',
      };
      const result = await processor(chunk);
      if (onProgress) onProgress(100);
      return [result];
    }

    const chunkSize = this.calculateChunkSize(file.size);
    const totalChunks = Math.ceil(file.size / chunkSize);
    const results: T[] = [];

    for (let i = 0; i < totalChunks; i++) {
      if (this.shouldCancel) {
        throw new CompressionError('Document processing was cancelled');
      }

      // Check memory before processing each chunk
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Insufficient memory for document processing');
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunkBlob = file.slice(start, end);
      const chunkBuffer = await chunkBlob.arrayBuffer();

      const chunk: DocumentChunk = {
        data: chunkBuffer,
        index: i,
        totalChunks,
        type: 'page',
      };

      const result = await processor(chunk);
      results.push(result);

      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(progress);
      }

      // Clean up chunk data
      MemoryManager.cleanup();
    }

    return results;
  }

  /**
   * Validate document file before processing
   * @param file - The document file to validate
   * @returns Promise resolving to validation result
   */
  protected async validateDocument(file: File): Promise<boolean> {
    try {
      // Basic file validation
      if (!file || file.size === 0) {
        return false;
      }

      // Check if file is too large for processing
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        throw new CompressionError('Document file is too large for processing');
      }

      // Check available memory
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Insufficient memory for document processing');
      }

      return true;
    } catch (error) {
      console.error('Document validation failed:', error);
      return false;
    }
  }

  /**
   * Optimize embedded media in documents
   * @param mediaData - The media data to optimize
   * @param mediaType - Type of media (image, video, etc.)
   * @returns Promise resolving to optimized media data
   */
  protected async optimizeEmbeddedMedia(
    mediaData: ArrayBuffer,
    mediaType: string
  ): Promise<ArrayBuffer> {
    // For now, return original data
    // This can be extended to use existing image/video compressors
    return mediaData;
  }

  /**
   * Calculate compression statistics
   * @param originalSize - Original file size
   * @param compressedSize - Compressed file size
   * @param startTime - Processing start time
   * @returns Compression statistics
   */
  protected calculateCompressionStats(
    originalSize: number,
    compressedSize: number,
    startTime: number
  ): { compressionRatio: number; processingTime: number } {
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;
    const processingTime = Date.now() - startTime;

    return {
      compressionRatio,
      processingTime,
    };
  }

  /**
   * Cancel ongoing document processing
   */
  public cancelProcessing(): void {
    this.shouldCancel = true;
  }

  /**
   * Check if document processing is currently active
   * @returns Boolean indicating processing status
   */
  public isProcessingActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Reset processing state
   */
  protected resetProcessingState(): void {
    this.isProcessing = false;
    this.shouldCancel = false;
  }
}

export default DocumentProcessor;