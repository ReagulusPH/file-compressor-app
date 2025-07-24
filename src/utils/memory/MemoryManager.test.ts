/**
 * Tests for MemoryManager utility
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import MemoryManager, { MemoryStats, FormatMemoryRequirements, MemoryWarning } from './MemoryManager';

describe('MemoryManager', () => {
  // Mock performance.memory
  const originalPerformance = global.performance;

  beforeEach(() => {
    // Mock performance.memory
    Object.defineProperty(global, 'performance', {
      value: {
        memory: {
          usedJSHeapSize: 500 * 1024 * 1024, // 500MB
          totalJSHeapSize: 800 * 1024 * 1024, // 800MB
          jsHeapSizeLimit: 1000 * 1024 * 1024, // 1GB
        },
      },
      configurable: true,
    });

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore performance
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      configurable: true,
    });

    jest.restoreAllMocks();
  });

  it('should get memory statistics', () => {
    const stats = MemoryManager.getMemoryStats();

    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.usedHeapSize).toBe(500 * 1024 * 1024);
      expect(stats.totalHeapSize).toBe(800 * 1024 * 1024);
      expect(stats.heapSizeLimit).toBe(1000 * 1024 * 1024);
      expect(stats.usagePercentage).toBe(0.5); // 500MB / 1GB = 0.5
      expect(stats.isHighUsage).toBe(false);
      expect(stats.isCriticalUsage).toBe(false);
    }
  });

  it('should detect high memory usage', () => {
    // Update mock to simulate high memory usage
    Object.defineProperty(global.performance, 'memory', {
      value: {
        usedJSHeapSize: 850 * 1024 * 1024, // 850MB
        totalJSHeapSize: 900 * 1024 * 1024, // 900MB
        jsHeapSizeLimit: 1000 * 1024 * 1024, // 1GB
      },
      configurable: true,
    });

    const stats = MemoryManager.getMemoryStats();

    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.usagePercentage).toBe(0.85); // 850MB / 1GB = 0.85
      expect(stats.isHighUsage).toBe(true);
      expect(stats.isCriticalUsage).toBe(false);
    }

    // Check memory should warn but return true
    expect(MemoryManager.checkMemory()).toBe(true);
    expect(console.warn).toHaveBeenCalled();
  });

  it('should detect critical memory usage', () => {
    // Update mock to simulate critical memory usage
    Object.defineProperty(global.performance, 'memory', {
      value: {
        usedJSHeapSize: 950 * 1024 * 1024, // 950MB
        totalJSHeapSize: 980 * 1024 * 1024, // 980MB
        jsHeapSizeLimit: 1000 * 1024 * 1024, // 1GB
      },
      configurable: true,
    });

    const stats = MemoryManager.getMemoryStats();

    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.usagePercentage).toBe(0.95); // 950MB / 1GB = 0.95
      expect(stats.isHighUsage).toBe(true);
      expect(stats.isCriticalUsage).toBe(true);
    }

    // Check memory should return false for critical usage
    expect(MemoryManager.checkMemory()).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('should notify listeners of memory changes', () => {
    const listener = jest.fn();
    MemoryManager.addListener(listener);

    // Check memory to trigger listener
    MemoryManager.checkMemory();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        usagePercentage: 0.5,
        isHighUsage: false,
        isCriticalUsage: false,
      })
    );

    // Remove listener
    MemoryManager.removeListener(listener);

    // Update memory usage
    Object.defineProperty(global.performance, 'memory', {
      value: {
        usedJSHeapSize: 900 * 1024 * 1024, // 900MB
        totalJSHeapSize: 950 * 1024 * 1024, // 950MB
        jsHeapSizeLimit: 1000 * 1024 * 1024, // 1GB
      },
      configurable: true,
    });

    // Check memory again
    MemoryManager.checkMemory();

    // Listener should not be called again
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should get recommended chunk size based on file size and memory conditions', () => {
    // Default memory conditions (50% usage)
    expect(MemoryManager.getRecommendedChunkSize(10 * 1024 * 1024)).toBe(2 * 1024 * 1024); // 2MB for small files

    // Large file - should use smaller chunks
    const largeFileChunkSize = MemoryManager.getRecommendedChunkSize(60 * 1024 * 1024);
    expect(largeFileChunkSize).toBeLessThanOrEqual(2 * 1024 * 1024); // Should be 2MB or less

    // Update to high memory usage
    Object.defineProperty(global.performance, 'memory', {
      value: {
        usedJSHeapSize: 850 * 1024 * 1024, // 850MB (85% usage)
        totalJSHeapSize: 900 * 1024 * 1024, // 900MB
        jsHeapSizeLimit: 1000 * 1024 * 1024, // 1GB
      },
      configurable: true,
    });

    // Even small files should use smaller chunks when memory usage is high
    const highMemoryChunkSize = MemoryManager.getRecommendedChunkSize(10 * 1024 * 1024);
    expect(highMemoryChunkSize).toBeLessThanOrEqual(1 * 1024 * 1024); // Should be 1MB or less
  });

  describe('Format-specific memory management', () => {
    it('should get format-specific memory requirements', () => {
      const imageReqs = MemoryManager.getFormatMemoryRequirements('image');
      expect(imageReqs.baseMultiplier).toBe(4);
      expect(imageReqs.maxConcurrent).toBe(3);
      expect(imageReqs.chunkSizeMultiplier).toBe(1.0);

      const videoReqs = MemoryManager.getFormatMemoryRequirements('video');
      expect(videoReqs.baseMultiplier).toBe(8);
      expect(videoReqs.maxConcurrent).toBe(1);
      expect(videoReqs.chunkSizeMultiplier).toBe(0.5);

      const audioReqs = MemoryManager.getFormatMemoryRequirements('audio');
      expect(audioReqs.baseMultiplier).toBe(6);
      expect(audioReqs.maxConcurrent).toBe(2);
      expect(audioReqs.chunkSizeMultiplier).toBe(0.8);
    });

    it('should calculate format-specific chunk sizes', () => {
      const fileSize = 10 * 1024 * 1024; // 10MB

      // Image format (multiplier 1.0)
      const imageChunkSize = MemoryManager.getRecommendedChunkSize(fileSize, 'image');
      expect(imageChunkSize).toBe(2 * 1024 * 1024); // 2MB

      // Video format (multiplier 0.5)
      const videoChunkSize = MemoryManager.getRecommendedChunkSize(fileSize, 'video');
      expect(videoChunkSize).toBe(1 * 1024 * 1024); // 1MB

      // Audio format (multiplier 0.8)
      const audioChunkSize = MemoryManager.getRecommendedChunkSize(fileSize, 'audio');
      expect(audioChunkSize).toBeLessThan(2 * 1024 * 1024); // Less than 2MB
    });

    it('should check if file can be processed based on format requirements', () => {
      const smallFileSize = 5 * 1024 * 1024; // 5MB
      const largeFileSize = 200 * 1024 * 1024; // 200MB

      // Small image file should be processable
      const smallImageCheck = MemoryManager.canProcessFile(smallFileSize, 'image');
      expect(smallImageCheck.canProcess).toBe(true);
      expect(smallImageCheck.shouldUseStreaming).toBe(false);

      // Large video file should require streaming
      const largeVideoCheck = MemoryManager.canProcessFile(largeFileSize, 'video');
      expect(largeVideoCheck.shouldUseStreaming).toBe(true);
    });

    it('should manage concurrent processing limits', () => {
      // Clean up any existing processing first
      MemoryManager.finishProcessing('image', 'cleanup-1');
      MemoryManager.finishProcessing('image', 'cleanup-2');
      MemoryManager.finishProcessing('image', 'cleanup-3');
      
      const limits = MemoryManager.getConcurrentLimits();
      
      expect(limits.maxPerFormat.image).toBe(3);
      expect(limits.maxPerFormat.video).toBe(1);
      expect(limits.maxPerFormat.audio).toBe(2);

      // Test starting processing up to total limit
      expect(MemoryManager.canStartProcessing('image')).toBe(true);
      
      MemoryManager.startProcessing('image', 'test-task-1');
      expect(MemoryManager.canStartProcessing('image')).toBe(true); // Still under total limit
      
      MemoryManager.startProcessing('image', 'test-task-2');
      // Now we're at the total limit (2), so no more tasks can start
      expect(MemoryManager.canStartProcessing('image')).toBe(false); // At total limit

      // Test finishing processing
      MemoryManager.finishProcessing('image', 'test-task-1');
      expect(MemoryManager.canStartProcessing('image')).toBe(true); // Under total limit again
      
      // Clean up remaining tasks
      MemoryManager.finishProcessing('image', 'test-task-2');
    });

    it('should handle format warnings', () => {
      const warning: MemoryWarning = {
        type: 'warning',
        format: 'video',
        message: 'High memory usage detected',
        suggestions: ['Close other tabs', 'Use smaller files'],
      };

      MemoryManager.addFormatWarning('video', warning);
      const warnings = MemoryManager.getFormatWarnings('video');
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toBe('High memory usage detected');
      expect(warnings[0].suggestions).toContain('Close other tabs');

      MemoryManager.clearFormatWarnings('video');
      expect(MemoryManager.getFormatWarnings('video')).toHaveLength(0);
    });

    it('should detect browser capabilities', () => {
      const capabilities = MemoryManager.getBrowserCapabilities();
      
      expect(capabilities).toHaveProperty('maxConcurrentTasks');
      expect(capabilities).toHaveProperty('supportsSharedArrayBuffer');
      expect(capabilities).toHaveProperty('supportsWebWorkers');
      expect(capabilities).toHaveProperty('supportsOffscreenCanvas');
      
      expect(typeof capabilities.maxConcurrentTasks).toBe('number');
      expect(capabilities.maxConcurrentTasks).toBeGreaterThan(0);
      expect(capabilities.maxConcurrentTasks).toBeLessThanOrEqual(4);
    });
  });
});
