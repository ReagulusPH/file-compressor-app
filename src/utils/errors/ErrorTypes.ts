/**
 * Error types for the File Compressor Web App
 */

/**
 * Base error class for the application
 */
export class CompressorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompressorError';
  }
}

/**
 * Error thrown when file validation fails
 */
export class ValidationError extends CompressorError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when file type is not supported
 */
export class UnsupportedFileTypeError extends ValidationError {
  constructor(fileType: string) {
    super(`Unsupported file type: ${fileType}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

/**
 * Error thrown when file size exceeds the limit
 */
export class FileSizeError extends ValidationError {
  constructor(fileSize: number, maxSize: number) {
    super(
      `File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed size (${maxSize / (1024 * 1024)} MB)`
    );
    this.name = 'FileSizeError';
  }
}

/**
 * Error thrown when compression fails
 */
export class CompressionError extends CompressorError {
  constructor(message: string) {
    super(`Compression failed: ${message}`);
    this.name = 'CompressionError';
  }
}

/**
 * Error thrown when browser compatibility issues are detected
 */
export class BrowserCompatibilityError extends CompressorError {
  constructor(feature: string) {
    super(`Your browser does not support ${feature}`);
    this.name = 'BrowserCompatibilityError';
  }
}

/**
 * Error thrown when memory issues are detected
 */
export class MemoryError extends CompressorError {
  constructor(message: string = 'Not enough memory to process the file') {
    super(message);
    this.name = 'MemoryError';
  }
}

/**
 * Error thrown when a worker operation fails
 */
export class WorkerError extends CompressorError {
  constructor(message: string) {
    super(`Worker operation failed: ${message}`);
    this.name = 'WorkerError';
  }
}

/**
 * Error thrown when a network operation fails
 */
export class NetworkError extends CompressorError {
  constructor(message: string) {
    super(`Network operation failed: ${message}`);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when document processing fails
 */
export class DocumentError extends CompressorError {
  constructor(message: string) {
    super(`Document processing failed: ${message}`);
    this.name = 'DocumentError';
  }
}

/**
 * Error thrown when document is corrupted or invalid
 */
export class DocumentCorruptedError extends DocumentError {
  constructor(fileType: string) {
    super(`The ${fileType} document appears to be corrupted or invalid`);
    this.name = 'DocumentCorruptedError';
  }
}

/**
 * Error thrown when document is password protected
 */
export class DocumentEncryptedError extends DocumentError {
  constructor(fileType: string) {
    super(`The ${fileType} document is password protected and cannot be processed`);
    this.name = 'DocumentEncryptedError';
  }
}

/**
 * Error thrown when document format is not supported
 */
export class DocumentFormatError extends DocumentError {
  constructor(format: string, supportedFormats: string[]) {
    super(`Document format '${format}' is not supported. Supported formats: ${supportedFormats.join(', ')}`);
    this.name = 'DocumentFormatError';
  }
}

/**
 * Error thrown when audio processing fails
 */
export class AudioError extends CompressorError {
  constructor(message: string) {
    super(`Audio processing failed: ${message}`);
    this.name = 'AudioError';
  }
}

/**
 * Error thrown when audio decoding fails
 */
export class AudioDecodeError extends AudioError {
  constructor(format: string) {
    super(`Failed to decode ${format} audio file. The file may be corrupted or use an unsupported codec`);
    this.name = 'AudioDecodeError';
  }
}

/**
 * Error thrown when archive processing fails
 */
export class ArchiveError extends CompressorError {
  constructor(message: string) {
    super(`Archive processing failed: ${message}`);
    this.name = 'ArchiveError';
  }
}

/**
 * Error thrown when APK signature is invalid
 */
export class APKSignatureError extends ArchiveError {
  constructor() {
    super('APK signature validation failed. The compressed APK may not install correctly');
    this.name = 'APKSignatureError';
  }
}

/**
 * Error thrown when archive structure is corrupted
 */
export class ArchiveCorruptedError extends ArchiveError {
  constructor(archiveType: string) {
    super(`The ${archiveType} archive appears to be corrupted or invalid`);
    this.name = 'ArchiveCorruptedError';
  }
}

/**
 * Error thrown when archive compression would break compatibility
 */
export class ArchiveCompatibilityError extends ArchiveError {
  constructor(message: string) {
    super(`Archive compatibility issue: ${message}`);
    this.name = 'ArchiveCompatibilityError';
  }
}

/**
 * Error thrown when archive integrity validation fails
 */
export class ArchiveIntegrityError extends ArchiveError {
  constructor() {
    super('Archive integrity validation failed after compression');
    this.name = 'ArchiveIntegrityError';
  }
}
