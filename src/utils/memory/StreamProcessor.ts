/**
 * StreamProcessor utility
 * Responsible for processing large files in chunks to optimize memory usage
 * Enhanced with format-specific streaming compression for documents and audio files
 */

import MemoryManager, { FormatMemoryRequirements, MemoryWarning } from './MemoryManager';

/**
 * Options for stream processing
 */
export interface StreamProcessingOptions {
  chunkSize?: number;
  format?: string;
  onProgress?: (progress: number) => void;
  onChunkProcessed?: (chunkIndex: number, totalChunks: number) => void;
  onMemoryWarning?: (warning: MemoryWarning) => void;
}

/**
 * Format-specific streaming options
 */
export interface FormatStreamingOptions extends StreamProcessingOptions {
  format: string;
  preserveQuality?: boolean;
  enableMemoryOptimization?: boolean;
  maxMemoryUsage?: number;
}

/**
 * StreamProcessor class for handling large files in chunks
 * Enhanced with format-specific streaming capabilities
 */
export class StreamProcessor {
  /**
   * Process a file in chunks with format-specific optimizations
   * @param file The file to process
   * @param processChunk Function to process each chunk
   * @param options Stream processing options
   * @returns Promise resolving to the combined result
   */
  public static async processFileInChunks<T>(
    file: File,
    processChunk: (chunk: ArrayBuffer, chunkIndex: number, totalChunks: number) => Promise<T>,
    options: StreamProcessingOptions = {}
  ): Promise<T[]> {
    const fileSize = file.size;
    const format = options.format || 'unknown';
    const chunkSize = options.chunkSize || MemoryManager.getRecommendedChunkSize(fileSize, format);
    const totalChunks = Math.ceil(fileSize / chunkSize);
    const results: T[] = [];

    // Check if file can be processed with current memory
    const memoryCheck = MemoryManager.canProcessFile(fileSize, format);
    
    // Report memory warnings if any
    if (options.onMemoryWarning && memoryCheck.warnings.length > 0) {
      memoryCheck.warnings.forEach(warning => options.onMemoryWarning!(warning));
    }

    if (!memoryCheck.canProcess) {
      throw new Error(`Cannot process ${format} file: insufficient memory. ${memoryCheck.warnings[0]?.message || 'Unknown memory issue'}`);
    }

    console.log(`🔄 Starting streaming processing for ${format} file (${totalChunks} chunks of ${Math.round(chunkSize / 1024)}KB each)`);

    // Report initial progress
    if (options.onProgress) {
      options.onProgress(0);
    }

    for (let i = 0; i < totalChunks; i++) {
      // Check memory before processing each chunk
      if (!MemoryManager.checkMemory()) {
        throw new Error('Not enough memory to continue processing');
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = await this.readFileChunk(file, start, end);

      // Process the chunk
      const result = await processChunk(chunk, i, totalChunks);
      results.push(result);

      // Report progress
      if (options.onProgress) {
        options.onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Notify chunk processed
      if (options.onChunkProcessed) {
        options.onChunkProcessed(i, totalChunks);
      }

      // Clean up after each chunk
      MemoryManager.cleanup();

      // Small delay to allow UI updates and potential garbage collection
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    console.log(`✅ Completed streaming processing for ${format} file`);
    return results;
  }

  /**
   * Process large documents with streaming compression
   * @param file Document file to process
   * @param processDocument Function to process document chunks
   * @param options Format-specific streaming options
   * @returns Promise resolving to processed document result
   */
  public static async processDocumentWithStreaming<T>(
    file: File,
    processDocument: (chunk: ArrayBuffer, metadata: { index: number; totalChunks: number; isLast: boolean }) => Promise<T>,
    options: FormatStreamingOptions
  ): Promise<T[]> {
    const formatReqs = MemoryManager.getFormatMemoryRequirements(options.format);
    
    // Use format-specific chunk size for documents
    const chunkSize = options.chunkSize || MemoryManager.getRecommendedChunkSize(file.size, options.format);
    const totalChunks = Math.ceil(file.size / chunkSize);
    const results: T[] = [];

    console.log(`📄 Starting document streaming for ${options.format} (${totalChunks} chunks)`);

    for (let i = 0; i < totalChunks; i++) {
      // Check if we can continue processing
      if (!MemoryManager.canStartProcessing(options.format)) {
        console.log(`⏸️ Waiting for ${options.format} processing slot...`);
        await this.waitForProcessingSlot(options.format);
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = await this.readFileChunk(file, start, end);

      const result = await processDocument(chunk, {
        index: i,
        totalChunks,
        isLast: i === totalChunks - 1,
      });

      results.push(result);

      // Report progress
      if (options.onProgress) {
        options.onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Memory optimization: clean up more aggressively for documents
      if (options.enableMemoryOptimization) {
        MemoryManager.cleanup();
        
        // Additional cleanup for large documents
        if (file.size > 50 * 1024 * 1024) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }

    return results;
  }

  /**
   * Process large audio files with streaming compression
   * @param file Audio file to process
   * @param processAudio Function to process audio chunks
   * @param options Format-specific streaming options
   * @returns Promise resolving to processed audio result
   */
  public static async processAudioWithStreaming<T>(
    file: File,
    processAudio: (chunk: ArrayBuffer, metadata: { index: number; totalChunks: number; sampleRate?: number }) => Promise<T>,
    options: FormatStreamingOptions
  ): Promise<T[]> {
    const formatReqs = MemoryManager.getFormatMemoryRequirements(options.format);
    
    // Audio files need smaller chunks due to decoding overhead
    const baseChunkSize = MemoryManager.getRecommendedChunkSize(file.size, options.format);
    const chunkSize = Math.min(baseChunkSize, 5 * 1024 * 1024); // Max 5MB chunks for audio
    const totalChunks = Math.ceil(file.size / chunkSize);
    const results: T[] = [];

    console.log(`🎵 Starting audio streaming for ${options.format} (${totalChunks} chunks)`);

    for (let i = 0; i < totalChunks; i++) {
      // Check concurrent processing limits
      if (!MemoryManager.canStartProcessing(options.format)) {
        await this.waitForProcessingSlot(options.format);
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = await this.readFileChunk(file, start, end);

      const result = await processAudio(chunk, {
        index: i,
        totalChunks,
        sampleRate: 44100, // Default sample rate, can be detected from file
      });

      results.push(result);

      // Report progress
      if (options.onProgress) {
        options.onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Audio-specific memory management
      if (options.enableMemoryOptimization) {
        MemoryManager.cleanup();
        
        // Longer delay for audio processing to allow for decoding cleanup
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    return results;
  }

  /**
   * Wait for a processing slot to become available for the given format
   * @param format File format
   * @returns Promise that resolves when a slot is available
   */
  private static async waitForProcessingSlot(format: string): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (MemoryManager.canStartProcessing(format)) {
          resolve();
        } else {
          setTimeout(checkSlot, 100); // Check every 100ms
        }
      };
      checkSlot();
    });
  }

  /**
   * Read a chunk of a file
   * @param file The file to read from
   * @param start Start byte position
   * @param end End byte position
   * @returns Promise resolving to the chunk as ArrayBuffer
   */
  private static readFileChunk(file: File, start: number, end: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file chunk as ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(new Error(`Error reading file chunk: ${reader.error?.message || 'Unknown error'}`));
      };

      const blob = file.slice(start, end);
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Combine multiple Blobs into a single Blob with memory optimization
   * @param blobs Array of Blobs to combine
   * @param type MIME type of the resulting Blob
   * @param options Optional streaming options for large combinations
   * @returns Combined Blob
   */
  public static combineBlobs(blobs: Blob[], type: string, options?: { enableMemoryOptimization?: boolean }): Blob {
    // For large blob combinations, use memory optimization
    if (options?.enableMemoryOptimization && blobs.length > 10) {
      console.log(`🔗 Combining ${blobs.length} blobs with memory optimization`);
      
      // Process blobs in smaller batches to avoid memory spikes
      const batchSize = 5;
      const batches: Blob[] = [];
      
      for (let i = 0; i < blobs.length; i += batchSize) {
        const batch = blobs.slice(i, i + batchSize);
        const combinedBatch = new Blob(batch, { type });
        batches.push(combinedBatch);
        
        // Clean up after each batch
        MemoryManager.cleanup();
      }
      
      return new Blob(batches, { type });
    }
    
    return new Blob(blobs, { type });
  }

  /**
   * Get optimal streaming settings for a file format
   * @param file File to analyze
   * @param format File format
   * @returns Recommended streaming options
   */
  public static getOptimalStreamingSettings(file: File, format: string): FormatStreamingOptions {
    const formatReqs = MemoryManager.getFormatMemoryRequirements(format);
    const memoryCheck = MemoryManager.canProcessFile(file.size, format);
    
    return {
      format,
      chunkSize: MemoryManager.getRecommendedChunkSize(file.size, format),
      preserveQuality: !memoryCheck.warnings.some(w => w.type === 'critical'),
      enableMemoryOptimization: memoryCheck.shouldUseStreaming || file.size > formatReqs.streamingThreshold,
      maxMemoryUsage: Math.floor(file.size * formatReqs.baseMultiplier * 0.8), // 80% of estimated need
    };
  }

  /**
   * Monitor memory usage during streaming operations
   * @param operation Name of the operation being monitored
   * @param callback Function to execute while monitoring
   * @returns Promise resolving to the callback result
   */
  public static async monitorMemoryDuringOperation<T>(
    operation: string,
    callback: (memoryStats: { usagePercentage: number; availableMemory: number }) => Promise<T>
  ): Promise<T> {
    console.log(`📊 Starting memory monitoring for ${operation}`);
    
    const startStats = MemoryManager.getMemoryStats();
    const startTime = Date.now();
    
    try {
      const result = await callback({
        usagePercentage: startStats?.usagePercentage || 0,
        availableMemory: startStats?.availableMemory || 0,
      });
      
      const endStats = MemoryManager.getMemoryStats();
      const duration = Date.now() - startTime;
      
      if (startStats && endStats) {
        const memoryDelta = endStats.usedHeapSize - startStats.usedHeapSize;
        console.log(`📊 Memory monitoring for ${operation} completed:`);
        console.log(`  - Duration: ${duration}ms`);
        console.log(`  - Memory delta: ${Math.round(memoryDelta / (1024 * 1024))}MB`);
        console.log(`  - Peak usage: ${Math.round(endStats.usagePercentage * 100)}%`);
      }
      
      return result;
    } catch (error) {
      console.error(`📊 Memory monitoring for ${operation} failed:`, error);
      throw error;
    } finally {
      MemoryManager.cleanup();
    }
  }
}

export default StreamProcessor;
