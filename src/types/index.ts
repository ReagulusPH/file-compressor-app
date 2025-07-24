/**
 * Core type definitions for the File Compressor Web App
 */

/**
 * Format information interface
 */
export interface FormatInfo {
  type: 'image' | 'video' | 'document' | 'audio' | 'archive';
  format: string;
  mimeType: string;
  compressor: string;
  supportLevel: 'native' | 'library' | 'limited';
  fileSignature?: number[];
}

/**
 * Format-specific metadata interface
 */
export interface FormatMetadata {
  // Image metadata
  dimensions?: { width: number; height: number };
  colorSpace?: string;

  // Audio metadata
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;

  // Document metadata
  pageCount?: number;
  hasEmbeddedMedia?: boolean;
  isEncrypted?: boolean;

  // Archive metadata
  entryCount?: number;
  compressionRatio?: number;
  hasSignature?: boolean;
}

/**
 * Processing file interface with enhanced format detection
 */
export interface ProcessingFile {
  id: string;
  file: File;
  originalSize: number;

  // Enhanced format detection
  detectedFormat: FormatInfo;
  processingMethod: 'native' | 'library' | 'fallback';

  // Format-specific metadata
  metadata?: FormatMetadata;

  // Processing state
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

/**
 * Compression mode type
 */
export type CompressionMode = 'image' | 'video' | 'audio' | 'document' | 'archive';

/**
 * Format-specific compression settings
 */
export interface DocumentSettings {
  compressionLevel: 'low' | 'medium' | 'high';
  preserveMetadata: boolean;
  optimizeImages: boolean;
}

export interface AudioSettings {
  bitrate: number;
  sampleRate: number;
  channels: 1 | 2;
  format: 'mp3' | 'wav' | 'ogg';
}

export interface ArchiveSettings {
  compressionLevel: number; // 0-9
  preserveStructure: boolean;
  validateIntegrity: boolean;
}

export interface TIFFSettings {
  pageIndex: number; // For multi-page TIFF files
  preserveMetadata: boolean;
  convertToFormat: 'jpeg' | 'png' | 'webp';
}

/**
 * Compression settings interface
 */
export interface CompressionSettings {
  quality: number; // 0-100
  outputFormat: string;
  resolution?: {
    width: number;
    height: number;
  };

  // New format-specific settings
  documentSettings?: DocumentSettings;
  audioSettings?: AudioSettings;
  archiveSettings?: ArchiveSettings;
  tiffSettings?: TIFFSettings;
}

/**
 * File model interface
 */
export interface FileModel {
  id: string;
  originalFile: File;
  settings: CompressionSettings;
  result?: CompressionResult;
  status: 'waiting' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;

  // Enhanced format detection
  detectedFormat?: FormatInfo;
  processingMethod?: 'native' | 'library' | 'fallback';
  formatMetadata?: FormatMetadata;
}

/**
 * Format-specific result data
 */
export interface FormatSpecificData {
  // Audio results
  finalBitrate?: number;
  qualityScore?: number;

  // Document results
  pagesProcessed?: number;
  imagesOptimized?: number;

  // Archive results
  entriesProcessed?: number;
  integrityVerified?: boolean;
}

/**
 * Compression result interface
 */
export interface CompressionResult {
  id: string;
  originalFile: {
    name: string;
    size: number;
    type: string;
  };
  compressedFile: {
    blob: Blob;
    size: number;
    type: string;
  };
  compressionRatio: number;
  processingTime: number;
  method: string;

  // Optional preview URL for images and videos
  previewUrl?: string;

  // Format-specific results
  formatSpecificData?: FormatSpecificData;
}

/**
 * Application state interface
 */
export interface AppState {
  files: Record<string, FileModel>;
  globalSettings: CompressionSettings;
  compressionMode: CompressionMode;
  isProcessing: boolean;
  activeFileId?: string;
  errors: Record<string, string>;
}
