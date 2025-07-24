/**
 * Error utilities for the File Compressor Web App
 */
import {
  BrowserCompatibilityError,
  MemoryError,
  UnsupportedFileTypeError,
  FileSizeError,
  CompressionError,
  DocumentError,
  DocumentCorruptedError,
  DocumentEncryptedError,
  DocumentFormatError,
  AudioError,
  AudioDecodeError,
  ArchiveError,
  APKSignatureError,
  ArchiveCorruptedError,
  ArchiveCompatibilityError,
  ArchiveIntegrityError,
} from './ErrorTypes';

/**
 * Maximum file size in bytes (removed limit for better user experience)
 */
export const MAX_FILE_SIZE = Number.MAX_SAFE_INTEGER;

/**
 * Supported image file types
 */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];

/**
 * Supported video file types
 */
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/avi',
  'video/quicktime',
  'video/x-matroska',
];

/**
 * Supported audio file types
 */
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav'];

/**
 * Supported document file types
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
];

/**
 * Supported archive file types
 */
export const SUPPORTED_ARCHIVE_TYPES = ['application/vnd.android.package-archive'];

/**
 * All supported file types
 */
export const SUPPORTED_FILE_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_ARCHIVE_TYPES,
];

/**
 * Check if the browser supports required features
 * @returns An object containing compatibility information
 */
export const checkBrowserCompatibility = (): {
  isCompatible: boolean;
  errors: BrowserCompatibilityError[];
} => {
  const errors: BrowserCompatibilityError[] = [];

  // Check for File API support
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    errors.push(new BrowserCompatibilityError('File API'));
  }

  // Check for Canvas API support (for image compression)
  if (!document.createElement('canvas').getContext) {
    errors.push(new BrowserCompatibilityError('Canvas API'));
  }

  // Check for Web Workers support
  if (!window.Worker) {
    errors.push(new BrowserCompatibilityError('Web Workers'));
  }

  // Check for IndexedDB support (for storing temporary results)
  if (!window.indexedDB) {
    errors.push(new BrowserCompatibilityError('IndexedDB'));
  }

  return {
    isCompatible: errors.length === 0,
    errors,
  };
};

/**
 * Validate a file for processing
 * @param file The file to validate
 * @returns True if the file is valid, throws an error otherwise
 */
export const validateFile = (file: File): boolean => {
  // Check file type
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    throw new UnsupportedFileTypeError(file.type);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new FileSizeError(file.size, MAX_FILE_SIZE);
  }

  return true;
};

/**
 * Monitor memory usage during processing
 * @returns An object with memory information and a cleanup function
 */
export const monitorMemory = (): {
  checkMemory: () => boolean;
  cleanup: () => void;
} => {
  let memoryWarningIssued = false;

  // Check if performance.memory is available (Chrome only)
  const hasMemoryAPI = !!(
    window.performance &&
    (window.performance as any).memory &&
    (window.performance as any).memory.usedJSHeapSize
  );

  const checkMemory = (): boolean => {
    if (!hasMemoryAPI) {
      return true; // Can't check memory, assume it's fine
    }

    const memory = (window.performance as any).memory;
    const usedHeapPercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

    // If using more than 80% of available heap, issue a warning
    if (usedHeapPercentage > 0.8 && !memoryWarningIssued) {
      memoryWarningIssued = true;
      // Memory usage is high. Consider processing smaller files or fewer files at once.
      return false;
    }

    return true;
  };

  const cleanup = () => {
    // Reset warning flag
    memoryWarningIssued = false;

    // Suggest garbage collection (not guaranteed to run)
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        // Failed to run garbage collection
      }
    }
  };

  return { checkMemory, cleanup };
};

/**
 * Format an error message for display
 * @param error The error to format
 * @returns A user-friendly error message
 */
export const formatErrorMessage = (error: Error): string => {
  if (error instanceof UnsupportedFileTypeError) {
    return `Unsupported file type. Please upload images (JPEG, PNG, WebP, TIFF), videos (MP4, WebM, AVI, MOV, MKV), audio (MP3, WAV), documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT), or APK files.`;
  }

  if (error instanceof FileSizeError) {
    return `File is too large for your device's available memory.`;
  }

  if (error instanceof BrowserCompatibilityError) {
    return `Your browser doesn't support ${error.message.split('support ')[1]}. Please try a modern browser like Chrome, Firefox, or Edge.`;
  }

  if (error instanceof MemoryError) {
    return `Not enough memory to process this file. Try a smaller file or close other tabs and applications.`;
  }

  if (error instanceof CompressionError) {
    return `Compression failed: ${error.message.split('Compression failed: ')[1]}`;
  }

  if (error instanceof DocumentCorruptedError) {
    return `Document appears to be corrupted or invalid. Please try a different file.`;
  }

  if (error instanceof DocumentEncryptedError) {
    return `Document is password protected and cannot be processed. Please remove password protection first.`;
  }

  if (error instanceof DocumentFormatError) {
    return error.message;
  }

  if (error instanceof DocumentError) {
    return `Document processing failed: ${error.message.split('Document processing failed: ')[1]}`;
  }

  if (error instanceof AudioDecodeError) {
    return `Audio file cannot be decoded. The file may be corrupted or use an unsupported codec.`;
  }

  if (error instanceof AudioError) {
    return `Audio processing failed: ${error.message.split('Audio processing failed: ')[1]}`;
  }

  if (error instanceof APKSignatureError) {
    return `APK signature validation failed. The compressed APK may not install correctly.`;
  }

  if (error instanceof ArchiveCorruptedError) {
    return `Archive file appears to be corrupted or invalid. Please try a different file.`;
  }

  if (error instanceof ArchiveCompatibilityError) {
    return `Archive compression may affect compatibility: ${error.message.split('Archive compatibility issue: ')[1]}`;
  }

  if (error instanceof ArchiveIntegrityError) {
    return `Archive integrity validation failed. The compressed archive may be corrupted.`;
  }

  if (error instanceof ArchiveError) {
    return `Archive processing failed: ${error.message.split('Archive processing failed: ')[1]}`;
  }

  // Generic error message
  return `An error occurred: ${error.message}`;
};

/**
 * Get error severity level
 * @param error The error to check
 * @returns The severity level: 'critical', 'warning', or 'info'
 */
export const getErrorSeverity = (error: Error): 'critical' | 'warning' | 'info' => {
  if (error instanceof BrowserCompatibilityError || error instanceof MemoryError) {
    return 'critical';
  }

  if (error instanceof CompressionError) {
    return 'warning';
  }

  if (error instanceof DocumentCorruptedError || error instanceof DocumentEncryptedError) {
    return 'critical';
  }

  if (error instanceof DocumentError || error instanceof AudioError || error instanceof ArchiveError) {
    return 'warning';
  }

  if (error instanceof APKSignatureError || error instanceof ArchiveIntegrityError) {
    return 'warning';
  }

  if (error instanceof ArchiveCorruptedError) {
    return 'critical';
  }

  if (error instanceof ArchiveCompatibilityError) {
    return 'warning';
  }

  return 'info';
};

/**
 * Get format-specific troubleshooting guide URL
 * @param error The error to get guide for
 * @returns URL to troubleshooting guide or null
 */
export const getTroubleshootingGuide = (error: Error): string | null => {
  if (error instanceof DocumentError) {
    return '#/help/document-compression';
  }
  if (error instanceof AudioError) {
    return '#/help/audio-compression';
  }
  if (error instanceof ArchiveError) {
    return '#/help/archive-compression';
  }
  if (error instanceof BrowserCompatibilityError) {
    return '#/help/browser-compatibility';
  }
  if (error instanceof MemoryError) {
    return '#/help/memory-optimization';
  }
  return null;
};

/**
 * Get recovery actions for an error
 * @param error The error to get recovery actions for
 * @returns Object with immediate and alternative recovery actions
 */
export const getRecoveryActions = (error: Error): {
  immediate: string[];
  alternative: string[];
  preventive: string[];
} => {
  const immediate: string[] = [];
  const alternative: string[] = [];
  const preventive: string[] = [];

  if (error instanceof UnsupportedFileTypeError) {
    immediate.push('Check supported formats: JPEG, PNG, WebP, TIFF, MP4, WebM, AVI, MOV, MKV, MP3, WAV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, APK');
    alternative.push('Convert file to supported format using another tool');
    alternative.push('Try uploading a different file');
    preventive.push('Verify file format before uploading');
  }

  if (error instanceof FileSizeError) {
    immediate.push('Close other browser tabs to free memory');
    immediate.push('Try a smaller file');
    alternative.push('Split large files into smaller parts');
    alternative.push('Use a device with more memory');
    preventive.push('Check file size before uploading (recommended < 100MB)');
  }

  if (error instanceof MemoryError) {
    immediate.push('Close other applications');
    immediate.push('Restart browser');
    immediate.push('Try processing fewer files at once');
    alternative.push('Use a device with more RAM');
    alternative.push('Process files individually instead of batch');
    preventive.push('Monitor memory usage in browser task manager');
  }

  if (error instanceof DocumentCorruptedError) {
    immediate.push('Try opening document in its native application');
    immediate.push('Re-download or re-create the document');
    alternative.push('Save document in different format');
    alternative.push('Try a different document file');
    preventive.push('Verify document integrity before compression');
  }

  if (error instanceof DocumentEncryptedError) {
    immediate.push('Remove password protection from document');
    immediate.push('Save document without encryption');
    alternative.push('Use unprotected version of document');
    preventive.push('Prepare unencrypted versions for compression');
  }

  if (error instanceof AudioDecodeError) {
    immediate.push('Try converting to MP3 or WAV format');
    immediate.push('Test audio file in media player');
    alternative.push('Use different audio file');
    alternative.push('Re-encode audio with standard codec');
    preventive.push('Use standard audio formats (MP3, WAV)');
  }

  if (error instanceof APKSignatureError) {
    immediate.push('Use lower compression settings');
    immediate.push('Enable "Preserve structure" option');
    alternative.push('Test compressed APK before distribution');
    alternative.push('Use specialized APK compression tools');
    preventive.push('Backup original APK before compression');
  }

  if (error instanceof BrowserCompatibilityError) {
    immediate.push('Update browser to latest version');
    immediate.push('Try Chrome, Firefox, or Edge');
    alternative.push('Use different device/browser');
    preventive.push('Check browser compatibility before processing');
  }

  return { immediate, alternative, preventive };
};

/**
 * Get suggested actions for an error
 * @param error The error to get suggestions for
 * @returns An array of suggested actions
 */
export const getErrorSuggestions = (error: Error): string[] => {
  if (error instanceof UnsupportedFileTypeError) {
    return [
      'Try uploading a supported file type (images: JPEG, PNG, WebP, TIFF; videos: MP4, WebM, AVI, MOV, MKV; audio: MP3, WAV; documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT; archives: APK).',
      'Convert your file to a supported format using another tool first.',
    ];
  }

  if (error instanceof FileSizeError) {
    return [
      'Try uploading a smaller file that fits in your device memory.',
      'Close other applications to free up memory.',
      'Split your file into smaller parts before uploading.',
    ];
  }

  if (error instanceof BrowserCompatibilityError) {
    return [
      'Try using a modern browser like Chrome, Firefox, or Edge.',
      'Update your current browser to the latest version.',
    ];
  }

  if (error instanceof MemoryError) {
    return [
      'Close other tabs and applications to free up memory.',
      'Try processing a smaller file or fewer files at once.',
      'Restart your browser to clear memory.',
    ];
  }

  if (error instanceof CompressionError) {
    return [
      'Try again with different compression settings.',
      'Try a different file format.',
      'Check if the file is corrupted.',
    ];
  }

  if (error instanceof DocumentCorruptedError) {
    return [
      'Try opening the document in its native application to verify it works.',
      'Try saving the document in a different format.',
      'Try a different document file.',
    ];
  }

  if (error instanceof DocumentEncryptedError) {
    return [
      'Remove password protection from the document.',
      'Save the document without encryption.',
      'Try a different document file.',
    ];
  }

  if (error instanceof DocumentError) {
    return [
      'Try again with different document compression settings.',
      'Try a different document format.',
      'Check if the document is valid and not corrupted.',
    ];
  }

  if (error instanceof AudioDecodeError) {
    return [
      'Try converting the audio file to MP3 or WAV format.',
      'Check if the audio file plays correctly in other applications.',
      'Try a different audio file.',
    ];
  }

  if (error instanceof AudioError) {
    return [
      'Try again with different audio compression settings.',
      'Try a different audio format.',
      'Check if the audio file is valid and not corrupted.',
    ];
  }

  if (error instanceof APKSignatureError) {
    return [
      'Use lower compression settings to preserve APK integrity.',
      'Test the compressed APK before distribution.',
      'Consider using specialized APK compression tools.',
    ];
  }

  if (error instanceof ArchiveCorruptedError) {
    return [
      'Try opening the archive in its native application to verify it works.',
      'Try downloading or obtaining the archive file again.',
      'Try a different archive file.',
    ];
  }

  if (error instanceof ArchiveCompatibilityError) {
    return [
      'Use lower compression settings to maintain compatibility.',
      'Enable "Preserve archive structure" option.',
      'Test the compressed archive on target devices.',
    ];
  }

  if (error instanceof ArchiveIntegrityError) {
    return [
      'Try again with lower compression settings.',
      'Enable integrity validation to catch issues early.',
      'Check if the original archive is valid.',
    ];
  }

  if (error instanceof ArchiveError) {
    return [
      'Try again with different compression settings.',
      'Check if the archive file is valid and not corrupted.',
      'Try a different archive file.',
    ];
  }

  return ['Try refreshing the page.', 'Try again later.'];
};
