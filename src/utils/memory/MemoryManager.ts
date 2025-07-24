/**
 * MemoryManager utility
 * Responsible for monitoring and optimizing memory usage during file processing
 * Enhanced with format-specific memory requirements and concurrent processing limits
 */

// Memory thresholds in bytes
const MEMORY_WARNING_THRESHOLD = 0.8; // 80% of available heap
const MEMORY_CRITICAL_THRESHOLD = 0.9; // 90% of available heap

// Default chunk size for stream processing (2MB)
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

// Format-specific memory multipliers and requirements
const FORMAT_MEMORY_REQUIREMENTS = {
  image: {
    baseMultiplier: 4, // Images need ~4x their file size in memory for processing
    maxConcurrent: 3,
    chunkSizeMultiplier: 1.0,
    streamingThreshold: 10 * 1024 * 1024, // 10MB
  },
  video: {
    baseMultiplier: 8, // Videos need ~8x their file size for frame processing
    maxConcurrent: 1,
    chunkSizeMultiplier: 0.5, // Smaller chunks for videos
    streamingThreshold: 25 * 1024 * 1024, // 25MB
  },
  audio: {
    baseMultiplier: 6, // Audio needs ~6x for decoding and processing
    maxConcurrent: 2,
    chunkSizeMultiplier: 0.8,
    streamingThreshold: 50 * 1024 * 1024, // 50MB
  },
  document: {
    baseMultiplier: 3, // Documents need ~3x for parsing and compression
    maxConcurrent: 2,
    chunkSizeMultiplier: 1.2, // Larger chunks for documents
    streamingThreshold: 20 * 1024 * 1024, // 20MB
  },
  archive: {
    baseMultiplier: 5, // Archives need ~5x for extraction and recompression
    maxConcurrent: 1,
    chunkSizeMultiplier: 0.6, // Smaller chunks for archives
    streamingThreshold: 15 * 1024 * 1024, // 15MB
  },
} as const;

// Browser capability detection for concurrent processing
const BROWSER_CAPABILITIES = {
  maxConcurrentTasks: 2, // Default conservative limit
  supportsSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  supportsWebWorkers: typeof Worker !== 'undefined',
  supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
} as const;

/**
 * Interface for memory statistics
 */
export interface MemoryStats {
  totalHeapSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
  usagePercentage: number;
  isHighUsage: boolean;
  isCriticalUsage: boolean;
  availableMemory: number;
  recommendedMaxFileSize: number;
}

/**
 * Format-specific memory requirements interface
 */
export interface FormatMemoryRequirements {
  baseMultiplier: number;
  maxConcurrent: number;
  chunkSizeMultiplier: number;
  streamingThreshold: number;
}

/**
 * Memory warning interface for format-specific suggestions
 */
export interface MemoryWarning {
  type: 'warning' | 'critical' | 'suggestion';
  format: string;
  message: string;
  suggestions: string[];
}

/**
 * Concurrent processing limits interface
 */
export interface ConcurrentLimits {
  maxTotal: number;
  maxPerFormat: Record<string, number>;
  currentActive: Record<string, number>;
}

/**
 * Memory Manager class for monitoring and optimizing memory usage
 * Enhanced with format-specific memory requirements and concurrent processing limits
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryWarningIssued = false;
  private memoryCriticalIssued = false;
  private hasMemoryAPI: boolean;
  private lastGarbageCollection: number = 0;
  private gcMinInterval: number = 10000; // Minimum 10 seconds between GC attempts
  private listeners: Array<(stats: MemoryStats) => void> = [];
  
  // Format-specific tracking
  private activeProcessingByFormat: Record<string, number> = {};
  private formatWarnings: Map<string, MemoryWarning[]> = new Map();
  private browserCapabilities: typeof BROWSER_CAPABILITIES;
  
  // Concurrent processing limits
  private maxConcurrentTasks: number = 2;
  private activeTasks: Set<string> = new Set();

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Check if performance.memory is available (Chrome only)
    this.hasMemoryAPI = !!(
      window.performance &&
      (window.performance as any).memory &&
      (window.performance as any).memory.usedJSHeapSize
    );
    
    // Initialize browser capabilities first (before calling detectOptimalConcurrentTasks)
    this.browserCapabilities = {
      ...BROWSER_CAPABILITIES,
      maxConcurrentTasks: 2, // Temporary default
    };
    
    // Now detect optimal concurrent tasks
    this.browserCapabilities.maxConcurrentTasks = this.detectOptimalConcurrentTasks();
    
    // Initialize format tracking
    Object.keys(FORMAT_MEMORY_REQUIREMENTS).forEach(format => {
      this.activeProcessingByFormat[format] = 0;
      this.formatWarnings.set(format, []);
    });
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get current memory statistics with enhanced format-specific information
   * @returns Memory statistics or null if not available
   */
  public getMemoryStats(): MemoryStats | null {
    if (!this.hasMemoryAPI) {
      return null;
    }

    const memory = (window.performance as any).memory;
    const usedHeapSize = memory.usedJSHeapSize;
    const totalHeapSize = memory.totalJSHeapSize;
    const heapSizeLimit = memory.jsHeapSizeLimit;
    const usagePercentage = usedHeapSize / heapSizeLimit;
    const availableMemory = heapSizeLimit - usedHeapSize;
    
    // Calculate recommended max file size based on available memory
    const recommendedMaxFileSize = Math.floor(availableMemory / 8); // Conservative estimate

    return {
      totalHeapSize,
      usedHeapSize,
      heapSizeLimit,
      usagePercentage,
      isHighUsage: usagePercentage > MEMORY_WARNING_THRESHOLD,
      isCriticalUsage: usagePercentage > MEMORY_CRITICAL_THRESHOLD,
      availableMemory,
      recommendedMaxFileSize,
    };
  }

  /**
   * Check if memory usage is within safe limits
   * @returns True if memory usage is safe, false if high or critical
   */
  public checkMemory(): boolean {
    const stats = this.getMemoryStats();

    if (!stats) {
      return true; // Can't check memory, assume it's fine
    }

    // Notify listeners of current memory stats
    this.notifyListeners(stats);

    // Check for high memory usage
    if (stats.isHighUsage && !this.memoryWarningIssued) {
      this.memoryWarningIssued = true;
      console.warn(
        'Memory usage is high. Consider processing smaller files or fewer files at once.'
      );

      // Try to free up some memory
      this.attemptGarbageCollection();
    }

    // Check for critical memory usage
    if (stats.isCriticalUsage) {
      if (!this.memoryCriticalIssued) {
        this.memoryCriticalIssued = true;
        console.error('Memory usage is critical. Processing may fail.');
      }
      return false;
    }

    return !stats.isCriticalUsage;
  }

  /**
   * Clean up resources and attempt garbage collection
   */
  public cleanup(): void {
    // Reset warning flags
    this.memoryWarningIssued = false;
    this.memoryCriticalIssued = false;

    // Attempt garbage collection
    this.attemptGarbageCollection();
  }

  /**
   * Attempt to run garbage collection if available and not called recently
   */
  private attemptGarbageCollection(): void {
    const now = Date.now();

    // Only attempt GC if enough time has passed since last attempt
    if (now - this.lastGarbageCollection < this.gcMinInterval) {
      return;
    }

    this.lastGarbageCollection = now;

    // Suggest garbage collection (not guaranteed to run)
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        console.log('Failed to run garbage collection');
      }
    }

    // Alternative approach to encourage garbage collection
    try {
      const arr = [];
      for (let i = 0; i < 1000000; i++) {
        arr.push(1);
      }
    } catch (e) {
      // This is expected to potentially fail, but may trigger GC
    }
  }

  /**
   * Add a listener for memory statistics updates
   * @param listener Function to call with memory statistics
   */
  public addListener(listener: (stats: MemoryStats) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   * @param listener The listener to remove
   */
  public removeListener(listener: (stats: MemoryStats) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners with current memory statistics
   * @param stats Current memory statistics
   */
  private notifyListeners(stats: MemoryStats): void {
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (e) {
        console.error('Error in memory stats listener:', e);
      }
    });
  }

  /**
   * Get recommended chunk size based on current memory conditions and format
   * @param fileSize Total file size
   * @param format File format (optional)
   * @returns Recommended chunk size in bytes
   */
  public getRecommendedChunkSize(fileSize: number, format?: string): number {
    const stats = this.getMemoryStats();
    let baseChunkSize = DEFAULT_CHUNK_SIZE;

    if (!stats) {
      return baseChunkSize;
    }

    // Apply format-specific chunk size multiplier
    if (format && FORMAT_MEMORY_REQUIREMENTS[format as keyof typeof FORMAT_MEMORY_REQUIREMENTS]) {
      const formatReqs = FORMAT_MEMORY_REQUIREMENTS[format as keyof typeof FORMAT_MEMORY_REQUIREMENTS];
      baseChunkSize = Math.floor(DEFAULT_CHUNK_SIZE * formatReqs.chunkSizeMultiplier);
    }

    // Adjust based on memory conditions
    if (stats.usagePercentage > MEMORY_CRITICAL_THRESHOLD) {
      // Critical memory: use very small chunks
      return Math.min(baseChunkSize, 512 * 1024); // 512KB max
    } else if (stats.usagePercentage > MEMORY_WARNING_THRESHOLD) {
      // High memory: use smaller chunks
      return Math.min(baseChunkSize, 1 * 1024 * 1024); // 1MB max
    } else if (fileSize > 50 * 1024 * 1024) {
      // Large files: use smaller chunks regardless of memory
      return Math.min(baseChunkSize, 2 * 1024 * 1024); // 2MB max
    }

    return baseChunkSize;
  }

  /**
   * Get format-specific memory requirements
   * @param format File format
   * @returns Format memory requirements or defaults
   */
  public getFormatMemoryRequirements(format: string): FormatMemoryRequirements {
    return FORMAT_MEMORY_REQUIREMENTS[format as keyof typeof FORMAT_MEMORY_REQUIREMENTS] || {
      baseMultiplier: 4,
      maxConcurrent: 2,
      chunkSizeMultiplier: 1.0,
      streamingThreshold: 10 * 1024 * 1024,
    };
  }

  /**
   * Check if file can be processed based on format-specific memory requirements
   * @param fileSize File size in bytes
   * @param format File format
   * @returns Object with canProcess flag and suggestions
   */
  public canProcessFile(fileSize: number, format: string): {
    canProcess: boolean;
    shouldUseStreaming: boolean;
    warnings: MemoryWarning[];
  } {
    const stats = this.getMemoryStats();
    const formatReqs = this.getFormatMemoryRequirements(format);
    const warnings: MemoryWarning[] = [];
    
    if (!stats) {
      // Can't check memory, assume it's okay but suggest streaming for large files
      return {
        canProcess: true,
        shouldUseStreaming: fileSize > formatReqs.streamingThreshold,
        warnings: [{
          type: 'suggestion',
          format,
          message: 'Memory monitoring not available',
          suggestions: ['Consider using a Chromium-based browser for better memory monitoring'],
        }],
      };
    }

    // Estimate memory needed for processing
    const estimatedMemoryNeeded = fileSize * formatReqs.baseMultiplier;
    const shouldUseStreaming = fileSize > formatReqs.streamingThreshold;
    
    // Check if we have enough memory
    if (estimatedMemoryNeeded > stats.availableMemory) {
      warnings.push({
        type: 'critical',
        format,
        message: `File too large for available memory (needs ~${Math.round(estimatedMemoryNeeded / (1024 * 1024))}MB, available: ${Math.round(stats.availableMemory / (1024 * 1024))}MB)`,
        suggestions: [
          'Close other browser tabs to free up memory',
          'Try processing a smaller file',
          'Use streaming compression if available',
          'Restart your browser to clear memory',
        ],
      });
      
      return {
        canProcess: false,
        shouldUseStreaming: true,
        warnings,
      };
    }

    // Check if memory usage would be high
    if (stats.usagePercentage > MEMORY_WARNING_THRESHOLD || 
        (stats.usedHeapSize + estimatedMemoryNeeded) / stats.heapSizeLimit > MEMORY_WARNING_THRESHOLD) {
      warnings.push({
        type: 'warning',
        format,
        message: `Processing this ${format} file will use significant memory`,
        suggestions: [
          'Close unnecessary browser tabs',
          'Consider processing smaller files first',
          shouldUseStreaming ? 'Streaming compression will be used automatically' : 'Enable streaming compression',
        ],
      });
    }

    return {
      canProcess: true,
      shouldUseStreaming,
      warnings,
    };
  }

  /**
   * Get concurrent processing limits based on format and browser capabilities
   * @returns Current concurrent limits
   */
  public getConcurrentLimits(): ConcurrentLimits {
    const maxPerFormat: Record<string, number> = {};
    
    // Calculate max concurrent tasks per format based on memory and browser capabilities
    Object.entries(FORMAT_MEMORY_REQUIREMENTS).forEach(([format, reqs]) => {
      let maxForFormat = reqs.maxConcurrent;
      
      // Reduce limits if memory is constrained
      const stats = this.getMemoryStats();
      if (stats && stats.usagePercentage > MEMORY_WARNING_THRESHOLD) {
        maxForFormat = Math.max(1, Math.floor(maxForFormat / 2));
      }
      
      // Adjust based on browser capabilities
      if (!this.browserCapabilities.supportsWebWorkers) {
        maxForFormat = Math.max(1, Math.floor(maxForFormat / 2));
      }
      
      maxPerFormat[format] = maxForFormat;
    });

    return {
      maxTotal: this.maxConcurrentTasks,
      maxPerFormat,
      currentActive: { ...this.activeProcessingByFormat },
    };
  }

  /**
   * Check if we can start processing a file of the given format
   * @param format File format
   * @returns Boolean indicating if processing can start
   */
  public canStartProcessing(format: string): boolean {
    const limits = this.getConcurrentLimits();
    const currentActive = this.activeProcessingByFormat[format] || 0;
    const maxForFormat = limits.maxPerFormat[format] || 1;
    const totalActive = this.activeTasks.size; // Use activeTasks.size for accurate count
    
    return currentActive < maxForFormat && totalActive < limits.maxTotal;
  }

  /**
   * Register that processing has started for a format
   * @param format File format
   * @param taskId Unique task identifier
   */
  public startProcessing(format: string, taskId: string): void {
    this.activeProcessingByFormat[format] = (this.activeProcessingByFormat[format] || 0) + 1;
    this.activeTasks.add(taskId);
    
    console.log(`📊 Started processing ${format} (${this.activeProcessingByFormat[format]} active, ${this.activeTasks.size} total)`);
  }

  /**
   * Register that processing has finished for a format
   * @param format File format
   * @param taskId Unique task identifier
   */
  public finishProcessing(format: string, taskId: string): void {
    this.activeProcessingByFormat[format] = Math.max(0, (this.activeProcessingByFormat[format] || 0) - 1);
    this.activeTasks.delete(taskId);
    
    console.log(`📊 Finished processing ${format} (${this.activeProcessingByFormat[format]} active, ${this.activeTasks.size} total)`);
    
    // Clean up after processing
    this.cleanup();
  }

  /**
   * Get format-specific memory warnings and suggestions
   * @param format File format
   * @returns Array of current warnings for the format
   */
  public getFormatWarnings(format: string): MemoryWarning[] {
    return this.formatWarnings.get(format) || [];
  }

  /**
   * Add a format-specific memory warning
   * @param format File format
   * @param warning Memory warning to add
   */
  public addFormatWarning(format: string, warning: MemoryWarning): void {
    const warnings = this.formatWarnings.get(format) || [];
    warnings.push(warning);
    this.formatWarnings.set(format, warnings);
  }

  /**
   * Clear format-specific warnings
   * @param format File format (optional, clears all if not specified)
   */
  public clearFormatWarnings(format?: string): void {
    if (format) {
      this.formatWarnings.set(format, []);
    } else {
      this.formatWarnings.clear();
      Object.keys(FORMAT_MEMORY_REQUIREMENTS).forEach(fmt => {
        this.formatWarnings.set(fmt, []);
      });
    }
  }

  /**
   * Detect optimal concurrent tasks based on browser capabilities
   * @returns Optimal number of concurrent tasks
   */
  private detectOptimalConcurrentTasks(): number {
    let maxTasks = 2; // Conservative default
    
    // Increase if browser supports advanced features
    if (this.browserCapabilities.supportsSharedArrayBuffer) {
      maxTasks += 1;
    }
    
    if (this.browserCapabilities.supportsWebWorkers) {
      maxTasks += 1;
    }
    
    if (this.browserCapabilities.supportsOffscreenCanvas) {
      maxTasks += 1;
    }
    
    // Check available CPU cores (if available)
    if (navigator.hardwareConcurrency) {
      maxTasks = Math.min(maxTasks, Math.max(2, Math.floor(navigator.hardwareConcurrency / 2)));
    }
    
    // Check memory constraints
    const stats = this.getMemoryStats();
    if (stats && stats.heapSizeLimit < 1024 * 1024 * 1024) { // Less than 1GB
      maxTasks = Math.min(maxTasks, 2);
    }
    
    return Math.max(1, Math.min(maxTasks, 4)); // Limit between 1 and 4
  }

  /**
   * Set maximum concurrent tasks with validation
   * @param max Maximum number of concurrent tasks
   */
  public setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = Math.max(1, Math.min(max, 4));
    console.log(`📊 Set max concurrent tasks to ${this.maxConcurrentTasks}`);
  }

  /**
   * Get current active task count
   * @returns Number of active tasks
   */
  public getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Get browser capabilities
   * @returns Browser capabilities object
   */
  public getBrowserCapabilities(): typeof BROWSER_CAPABILITIES {
    return this.browserCapabilities;
  }
}

// Export singleton instance
export default MemoryManager.getInstance();
