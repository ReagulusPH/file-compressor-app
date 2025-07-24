/**
 * FileHandler service
 * Responsible for file validation, preparation, and routing to appropriate compressor
 */

import { FileModel } from '../../types';
import {
  validateFile,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_ARCHIVE_TYPES,
  formatErrorMessage,
} from '../../utils/errors/ErrorUtils';
import {
  UnsupportedFileTypeError,
  CompressionError,
  MemoryError,
} from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';
import FormatDetector from '../FormatDetector';
import { FormatInfo } from '../../types';

/**
 * FileHandler service interface
 */
export interface FileHandlerService {
  validateFile(file: File): Promise<{ valid: boolean; error?: string; formatInfo?: FormatInfo }>;
  prepareFileForCompression(file: File): Promise<ArrayBuffer>;
  prepareFileForStreamProcessing(file: File): Promise<File>;
  determineCompressor(file: File): Promise<'video' | 'image' | 'audio' | 'document' | 'archive' | null>;
  shouldUseStreamProcessing(file: File): boolean;
  detectFormat(file: File): Promise<FormatInfo | null>;
}

/**
 * FileHandler service implementation
 */
export class FileHandler implements FileHandlerService {
  // Size threshold for stream processing (10MB)
  private readonly STREAM_PROCESSING_THRESHOLD = 10 * 1024 * 1024;

  /**
   * Validates a file based on type, size, and format detection
   * @param file - The file to validate
   * @returns Promise with validation result, optional error message, and format info
   */
  async validateFile(file: File): Promise<{ valid: boolean; error?: string; formatInfo?: FormatInfo }> {
    try {
      // First, detect the format using the enhanced FormatDetector
      const formatInfo = await FormatDetector.detectFormat(file);
      
      if (!formatInfo) {
        throw new UnsupportedFileTypeError(file.type);
      }
      
      // Use the utility function to validate the file
      validateFile(file);
      
      return { 
        valid: true, 
        formatInfo 
      };
    } catch (error) {
      // Format the error message for display
      return {
        valid: false,
        error: formatErrorMessage(error as Error),
      };
    }
  }

  /**
   * Determines if a file should be processed using stream processing
   * based on file size and current memory conditions
   * @param file - The file to check
   * @returns True if stream processing should be used
   */
  shouldUseStreamProcessing(file: File): boolean {
    // Always use stream processing for large files
    if (file.size > this.STREAM_PROCESSING_THRESHOLD) {
      return true;
    }

    // Check current memory conditions
    const memoryStats = MemoryManager.getMemoryStats();
    if (memoryStats && memoryStats.usagePercentage > 0.5) {
      // Use stream processing if memory usage is already high
      return true;
    }

    return false;
  }

  /**
   * Prepares a file for compression by reading it as ArrayBuffer
   * @param file - The file to prepare
   * @returns Promise resolving to ArrayBuffer
   */
  async prepareFileForCompression(file: File): Promise<ArrayBuffer> {
    try {
      // Validate the file first
      validateFile(file);

      // Check memory before loading the file
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available to process this file');
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new CompressionError('Failed to read file as ArrayBuffer'));
          }
        };

        reader.onerror = event => {
          reject(
            new CompressionError(`Error reading file: ${reader.error?.message || 'Unknown error'}`)
          );
        };

        reader.readAsArrayBuffer(file);
      });
    } catch (error) {
      // Re-throw the error to be handled by the caller
      throw error;
    }
  }

  /**
   * Prepares a file for stream processing
   * This method validates the file but doesn't load it into memory
   * @param file - The file to prepare
   * @returns Promise resolving to the validated File object
   */
  async prepareFileForStreamProcessing(file: File): Promise<File> {
    try {
      // Validate the file first
      validateFile(file);

      // Check memory before proceeding
      if (!MemoryManager.checkMemory()) {
        throw new MemoryError('Not enough memory available to process this file');
      }

      return file;
    } catch (error) {
      // Re-throw the error to be handled by the caller
      throw error;
    }
  }

  /**
   * Detect format using the enhanced FormatDetector
   * @param file - The file to analyze
   * @returns Promise with detected format info or null
   */
  async detectFormat(file: File): Promise<FormatInfo | null> {
    return await FormatDetector.detectFormat(file);
  }

  /**
   * Determines which compressor to use based on file type using enhanced detection
   * @param file - The file to process
   * @returns Promise with compressor type or null if unsupported
   */
  async determineCompressor(file: File): Promise<'video' | 'image' | 'audio' | 'document' | 'archive' | null> {
    const formatInfo = await this.detectFormat(file);
    
    if (!formatInfo) {
      return null;
    }
    
    return formatInfo.type;
  }

  /**
   * Routes a file to the appropriate compressor
   * Enhanced to support all new file types
   * @param fileModel - The file model to process
   * @returns Promise resolving to updated file model
   */
  async routeToCompressor(fileModel: FileModel): Promise<FileModel> {
    try {
      const compressorType = await this.determineCompressor(fileModel.originalFile);

      if (!compressorType) {
        throw new UnsupportedFileTypeError(fileModel.originalFile.type);
      }

      // Update status to processing
      const updatedModel = {
        ...fileModel,
        status: 'processing' as const,
        startTime: Date.now(),
      };

      // Route to appropriate compressor based on file type
      switch (compressorType) {
        case 'image':
          // Image compressor will be used in the component that consumes this service
          return updatedModel;
        case 'video':
          // Video compressor will be implemented in a future task
          return updatedModel;
        case 'audio':
          // Audio compressor will be implemented in a future task
          return updatedModel;
        case 'document':
          // Document compressor will be implemented in a future task
          return updatedModel;
        case 'archive':
          // Archive compressor will be implemented in a future task
          return updatedModel;
        default:
          throw new UnsupportedFileTypeError(fileModel.originalFile.type);
      }
    } catch (error) {
      // Handle the error and update the file model
      return {
        ...fileModel,
        status: 'error' as const,
        error: formatErrorMessage(error as Error),
      };
    }
  }
}

// Export singleton instance
export default new FileHandler();
