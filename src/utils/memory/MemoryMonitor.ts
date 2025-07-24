/**
 * MemoryMonitor utility
 * Provides real-time memory monitoring with format-specific warnings and suggestions
 */

import MemoryManager, { MemoryStats, MemoryWarning } from './MemoryManager';

/**
 * Memory monitoring configuration
 */
export interface MemoryMonitorConfig {
  checkInterval: number; // Milliseconds between checks
  enableWarnings: boolean;
  enableSuggestions: boolean;
  warningThreshold: number; // 0-1 percentage
  criticalThreshold: number; // 0-1 percentage
}

/**
 * Memory monitoring event interface
 */
export interface MemoryMonitorEvent {
  type: 'warning' | 'critical' | 'recovered' | 'suggestion';
  timestamp: number;
  stats: MemoryStats | null;
  format?: string;
  message: string;
  suggestions?: string[];
}

/**
 * MemoryMonitor class for real-time memory monitoring
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private config: MemoryMonitorConfig;
  private listeners: Array<(event: MemoryMonitorEvent) => void> = [];
  private lastWarningTime = 0;
  private warningCooldown = 5000; // 5 seconds between warnings

  /**
   * Default monitoring configuration
   */
  private static readonly DEFAULT_CONFIG: MemoryMonitorConfig = {
    checkInterval: 2000, // Check every 2 seconds
    enableWarnings: true,
    enableSuggestions: true,
    warningThreshold: 0.8, // 80%
    criticalThreshold: 0.9, // 90%
  };

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config?: Partial<MemoryMonitorConfig>) {
    this.config = { ...MemoryMonitor.DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(config?: Partial<MemoryMonitorConfig>): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor(config);
    }
    return MemoryMonitor.instance;
  }

  /**
   * Start memory monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('📊 Starting memory monitoring...');

    this.monitoringInterval = window.setInterval(() => {
      this.checkMemoryStatus();
    }, this.config.checkInterval);
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.log('📊 Stopping memory monitoring...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Check current memory status and emit events if needed
   */
  private checkMemoryStatus(): void {
    const stats = MemoryManager.getMemoryStats();
    
    if (!stats) {
      return; // Memory API not available
    }

    const now = Date.now();
    
    // Check for critical memory usage
    if (stats.usagePercentage >= this.config.criticalThreshold) {
      if (now - this.lastWarningTime > this.warningCooldown) {
        this.emitEvent({
          type: 'critical',
          timestamp: now,
          stats,
          message: `Critical memory usage: ${Math.round(stats.usagePercentage * 100)}%`,
          suggestions: this.getCriticalMemorySuggestions(stats),
        });
        this.lastWarningTime = now;
      }
    }
    // Check for high memory usage
    else if (stats.usagePercentage >= this.config.warningThreshold) {
      if (now - this.lastWarningTime > this.warningCooldown) {
        this.emitEvent({
          type: 'warning',
          timestamp: now,
          stats,
          message: `High memory usage: ${Math.round(stats.usagePercentage * 100)}%`,
          suggestions: this.getHighMemorySuggestions(stats),
        });
        this.lastWarningTime = now;
      }
    }
    // Check if memory has recovered
    else if (stats.usagePercentage < this.config.warningThreshold && this.lastWarningTime > 0) {
      this.emitEvent({
        type: 'recovered',
        timestamp: now,
        stats,
        message: `Memory usage normalized: ${Math.round(stats.usagePercentage * 100)}%`,
      });
      this.lastWarningTime = 0;
    }
  }

  /**
   * Get suggestions for critical memory situations
   */
  private getCriticalMemorySuggestions(stats: MemoryStats): string[] {
    const suggestions = [
      'Stop processing large files immediately',
      'Close unnecessary browser tabs',
      'Restart your browser to clear memory',
      'Process smaller files or reduce quality settings',
    ];

    // Add format-specific suggestions based on active processing
    const limits = MemoryManager.getConcurrentLimits();
    Object.entries(limits.currentActive).forEach(([format, count]) => {
      if (count > 0) {
        suggestions.push(`Cancel ${format} processing to free memory`);
      }
    });

    return suggestions;
  }

  /**
   * Get suggestions for high memory situations
   */
  private getHighMemorySuggestions(stats: MemoryStats): string[] {
    const suggestions = [
      'Close some browser tabs to free memory',
      'Process files one at a time instead of in batches',
      'Use lower quality settings for compression',
    ];

    // Add memory-specific suggestions
    const availableMB = Math.round(stats.availableMemory / (1024 * 1024));
    if (availableMB < 100) {
      suggestions.push('Consider processing files smaller than 50MB');
    } else if (availableMB < 500) {
      suggestions.push('Consider processing files smaller than 200MB');
    }

    return suggestions;
  }

  /**
   * Monitor memory usage for a specific format during processing
   */
  public monitorFormatProcessing(
    format: string,
    fileSize: number,
    onWarning?: (warning: MemoryWarning) => void
  ): () => void {
    const taskId = `${format}-${Date.now()}`;
    MemoryManager.startProcessing(format, taskId);

    // Check if processing should use streaming
    const memoryCheck = MemoryManager.canProcessFile(fileSize, format);
    
    if (onWarning && memoryCheck.warnings.length > 0) {
      memoryCheck.warnings.forEach(warning => onWarning(warning));
    }

    // Emit format-specific suggestions
    if (this.config.enableSuggestions && memoryCheck.shouldUseStreaming) {
      this.emitEvent({
        type: 'suggestion',
        timestamp: Date.now(),
        stats: MemoryManager.getMemoryStats(),
        format,
        message: `Large ${format} file detected - using streaming compression`,
        suggestions: [
          'Streaming compression will use less memory',
          'Processing may take longer but will be more stable',
          'Consider processing smaller files for faster results',
        ],
      });
    }

    // Return cleanup function
    return () => {
      MemoryManager.finishProcessing(format, taskId);
    };
  }

  /**
   * Get format-specific memory recommendations
   */
  public getFormatRecommendations(format: string, fileSize: number): {
    canProcess: boolean;
    shouldUseStreaming: boolean;
    recommendedSettings: {
      maxConcurrent: number;
      chunkSize: number;
      enableOptimization: boolean;
    };
    warnings: MemoryWarning[];
  } {
    const memoryCheck = MemoryManager.canProcessFile(fileSize, format);
    const formatReqs = MemoryManager.getFormatMemoryRequirements(format);
    const stats = MemoryManager.getMemoryStats();

    let maxConcurrent = formatReqs.maxConcurrent;
    let enableOptimization = false;

    // Adjust recommendations based on current memory usage
    if (stats) {
      if (stats.usagePercentage > 0.7) {
        maxConcurrent = Math.max(1, Math.floor(maxConcurrent / 2));
        enableOptimization = true;
      }
    }

    return {
      canProcess: memoryCheck.canProcess,
      shouldUseStreaming: memoryCheck.shouldUseStreaming,
      recommendedSettings: {
        maxConcurrent,
        chunkSize: MemoryManager.getRecommendedChunkSize(fileSize, format),
        enableOptimization,
      },
      warnings: memoryCheck.warnings,
    };
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: (event: MemoryMonitorEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: (event: MemoryMonitorEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Emit memory monitoring event
   */
  private emitEvent(event: MemoryMonitorEvent): void {
    if (!this.config.enableWarnings && (event.type === 'warning' || event.type === 'critical')) {
      return;
    }

    if (!this.config.enableSuggestions && event.type === 'suggestion') {
      return;
    }

    console.log(`📊 Memory Monitor: ${event.type} - ${event.message}`);
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in memory monitor listener:', error);
      }
    });
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(config: Partial<MemoryMonitorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring with new config if currently monitoring
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Get current monitoring status
   */
  public getStatus(): {
    isMonitoring: boolean;
    config: MemoryMonitorConfig;
    currentStats: MemoryStats | null;
    activeProcessing: Record<string, number>;
  } {
    return {
      isMonitoring: this.isMonitoring,
      config: this.config,
      currentStats: MemoryManager.getMemoryStats(),
      activeProcessing: MemoryManager.getConcurrentLimits().currentActive,
    };
  }
}

// Export both the class and singleton instance
export { MemoryMonitor };
export default MemoryMonitor.getInstance();