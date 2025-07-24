/**
 * WebCodecs-based VideoCompressor service
 * Modern alternative to FFmpeg using native browser APIs
 */

import { CompressionSettings } from '../../types';
import {
  CompressionError,
  BrowserCompatibilityError,
  MemoryError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';

/**
 * WebCodecs VideoCompressor service implementation
 */
export class WebCodecsVideoCompressor {
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  /**
   * Check if WebCodecs is supported in the current browser
   */
  private checkSupport(): void {
    this.isSupported = 
      'VideoEncoder' in window && 
      'VideoDecoder' in window &&
      'VideoFrame' in window;
  }

  /**
   * Compresses a video using WebCodecs API
   * @param file - The video file
   * @param settings - Compression settings
   * @param onProgress - Callback for progress updates
   * @returns Promise resolving to compressed video as Blob
   */
  async compressVideo(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.isSupported) {
      throw new BrowserCompatibilityError('WebCodecs API (required for video compression)');
    }

    // Check memory before processing
    if (!MemoryManager.checkMemory()) {
      throw new MemoryError('Not enough memory available for video compression');
    }

    try {
      // For now, use Canvas-based compression as a fallback
      return await this.compressWithCanvas(file, settings, onProgress);
    } catch (error) {
      console.error('WebCodecs compression failed:', error);
      throw new CompressionError(
        `Video compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compress video using Canvas API (fallback method)
   * This creates a simpler compression by re-encoding frames
   */
  private async compressWithCanvas(
    file: File,
    settings: CompressionSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      // Mute video immediately to prevent any audio playback
      video.muted = true;
      video.volume = 0;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new CompressionError('Failed to get canvas context'));
        return;
      }

      video.onloadedmetadata = () => {
        // Mute the video to prevent audio playback during processing
        video.muted = true;
        video.volume = 0;
        
        // Set canvas dimensions based on quality settings
        const scaleFactor = this.getScaleFactor(settings.quality);
        canvas.width = Math.round(video.videoWidth * scaleFactor);
        canvas.height = Math.round(video.videoHeight * scaleFactor);

        // Start recording
        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: this.getMimeType(settings.outputFormat),
          videoBitsPerSecond: this.getBitrate(settings.quality),
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { 
            type: this.getMimeType(settings.outputFormat) 
          });
          resolve(blob);
        };

        mediaRecorder.onerror = (event: any) => {
          reject(new CompressionError(`Recording failed: ${event.error?.message || 'Unknown error'}`));
        };

        // Start recording
        mediaRecorder.start();

        // Play video and draw frames to canvas
        let frameCount = 0;
        const totalFrames = Math.ceil(video.duration * 30); // Estimate

        const drawFrame = () => {
          if (video.ended || video.paused) {
            mediaRecorder.stop();
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameCount++;

          if (onProgress && totalFrames > 0) {
            onProgress(Math.min(95, Math.round((frameCount / totalFrames) * 100)));
          }

          requestAnimationFrame(drawFrame);
        };

        video.onplay = () => {
          drawFrame();
        };

        video.play();
      };

      video.onerror = () => {
        reject(new CompressionError('Failed to load video file'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get scale factor based on quality setting
   */
  private getScaleFactor(quality: number): number {
    if (quality >= 90) return 1.0;      // Original size
    if (quality >= 80) return 0.9;      // 90% size
    if (quality >= 70) return 0.8;      // 80% size
    if (quality >= 60) return 0.7;      // 70% size
    if (quality >= 50) return 0.6;      // 60% size
    if (quality >= 40) return 0.5;      // 50% size
    if (quality >= 30) return 0.4;      // 40% size
    return 0.3;                         // 30% size
  }

  /**
   * Get bitrate based on quality setting
   */
  private getBitrate(quality: number): number {
    if (quality >= 90) return 5000000;  // 5 Mbps
    if (quality >= 80) return 3000000;  // 3 Mbps
    if (quality >= 70) return 2000000;  // 2 Mbps
    if (quality >= 60) return 1500000;  // 1.5 Mbps
    if (quality >= 50) return 1000000;  // 1 Mbps
    if (quality >= 40) return 750000;   // 750 kbps
    if (quality >= 30) return 500000;   // 500 kbps
    return 250000;                      // 250 kbps
  }

  /**
   * Get MIME type for output format
   */
  private getMimeType(outputFormat: string): string {
    const format = outputFormat.replace('video/', '');
    
    switch (format) {
      case 'webm':
        return 'video/webm;codecs=vp9';
      case 'mp4':
        return 'video/mp4;codecs=avc1.42E01E';
      default:
        return 'video/webm;codecs=vp9';
    }
  }

  /**
   * Check if the compressor is supported
   */
  checkBrowserSupport(): boolean {
    return 'MediaRecorder' in window && 'HTMLCanvasElement' in window;
  }

  /**
   * Cancel compression (placeholder for compatibility)
   */
  async cancelCompression(): Promise<void> {
    // Canvas-based compression is typically fast, so cancellation is less critical
    console.log('Compression cancellation requested');
  }
}

// Export singleton instance
export default new WebCodecsVideoCompressor();