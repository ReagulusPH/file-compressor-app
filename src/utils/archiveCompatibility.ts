/**
 * Archive-specific browser compatibility utilities
 */

/**
 * Archive compression capabilities
 */
export interface ArchiveCapabilities {
  jsZip: boolean;
  webWorkers: boolean;
  arrayBuffer: boolean;
  fileReader: boolean;
  blob: boolean;
  streamingCompression: boolean;
  largeFileSupport: boolean;
}

/**
 * Archive compatibility warnings
 */
export interface ArchiveCompatibilityWarning {
  feature: string;
  type: 'unsupported' | 'limited' | 'fallback';
  message: string;
  suggestions: string[];
}

/**
 * Check browser capabilities for archive compression
 */
export const checkArchiveCapabilities = (): ArchiveCapabilities => {
  const capabilities: ArchiveCapabilities = {
    jsZip: true, // JSZip is a library, so it should work in most browsers
    webWorkers: typeof Worker !== 'undefined',
    arrayBuffer: typeof ArrayBuffer !== 'undefined',
    fileReader: typeof FileReader !== 'undefined',
    blob: typeof Blob !== 'undefined',
    streamingCompression: false,
    largeFileSupport: false,
  };

  // Check for streaming compression support (ReadableStream)
  capabilities.streamingCompression = typeof ReadableStream !== 'undefined' && typeof WritableStream !== 'undefined';

  // Check for large file support (based on available memory and 64-bit support)
  capabilities.largeFileSupport =
    capabilities.arrayBuffer &&
    capabilities.webWorkers &&
    // Check if we can create large ArrayBuffers (rough estimate)
    (() => {
      try {
        // Try to create a 100MB ArrayBuffer
        new ArrayBuffer(100 * 1024 * 1024);
        return true;
      } catch {
        return false;
      }
    })();

  return capabilities;
};

/**
 * Get archive compatibility warnings based on browser capabilities
 */
export const getArchiveCompatibilityWarnings = (
  capabilities: ArchiveCapabilities,
  fileSize?: number
): ArchiveCompatibilityWarning[] => {
  const warnings: ArchiveCompatibilityWarning[] = [];

  // Check for basic requirements
  if (!capabilities.fileReader) {
    warnings.push({
      feature: 'File Reading',
      type: 'unsupported',
      message: 'Your browser does not support file reading APIs required for archive compression.',
      suggestions: ['Update your browser to a modern version', 'Try using Chrome, Firefox, Safari, or Edge'],
    });
  }

  if (!capabilities.arrayBuffer) {
    warnings.push({
      feature: 'Binary Data Processing',
      type: 'unsupported',
      message: 'Your browser does not support binary data processing required for archive compression.',
      suggestions: ['Update your browser to a modern version', 'Archive compression will not be available'],
    });
  }

  if (!capabilities.blob) {
    warnings.push({
      feature: 'File Generation',
      type: 'unsupported',
      message: 'Your browser does not support file generation APIs required for creating compressed archives.',
      suggestions: ['Update your browser to a modern version', 'You will not be able to download compressed archives'],
    });
  }

  // Check for performance-related features
  if (!capabilities.webWorkers) {
    warnings.push({
      feature: 'Background Processing',
      type: 'limited',
      message:
        'Your browser does not support Web Workers. Archive compression may freeze the browser during processing.',
      suggestions: [
        'Update your browser to enable background processing',
        'Process smaller archives to avoid browser freezing',
        'Close other tabs while compressing archives',
      ],
    });
  }

  if (!capabilities.streamingCompression) {
    warnings.push({
      feature: 'Streaming Compression',
      type: 'fallback',
      message: 'Your browser has limited streaming support. Large archives will be processed in memory.',
      suggestions: [
        'Update your browser for better streaming support',
        'Process smaller archives to avoid memory issues',
        'Close other applications to free up memory',
      ],
    });
  }

  // Check for large file support
  if (fileSize && fileSize > 100 * 1024 * 1024) {
    // 100MB
    if (!capabilities.largeFileSupport) {
      warnings.push({
        feature: 'Large File Processing',
        type: 'limited',
        message:
          'Your browser may have difficulty processing large archives. The file may fail to compress or cause browser instability.',
        suggestions: [
          'Try processing smaller archive files',
          'Close other tabs and applications to free up memory',
          'Consider splitting large archives into smaller parts',
          'Use a device with more available memory',
        ],
      });
    }
  }

  return warnings;
};

/**
 * Get APK-specific compatibility warnings
 */
export const getAPKCompatibilityWarnings = (): ArchiveCompatibilityWarning[] => {
  const warnings: ArchiveCompatibilityWarning[] = [];

  // APK compression always has compatibility risks
  warnings.push({
    feature: 'APK Compression',
    type: 'limited',
    message:
      'APK compression may affect app functionality and installation. Compressed APKs should be thoroughly tested.',
    suggestions: [
      'Test compressed APKs on multiple devices before distribution',
      'Use lower compression levels for better compatibility',
      'Keep digital signatures intact by preserving archive structure',
      'Verify APK functionality after compression',
    ],
  });

  // Check for Android development context
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidDevice = userAgent.includes('android');

  if (isAndroidDevice) {
    warnings.push({
      feature: 'APK Testing on Android',
      type: 'fallback',
      message: 'You are on an Android device. You can test compressed APKs directly, but be cautious with system apps.',
      suggestions: [
        'Only test APKs from trusted sources',
        'Do not compress or test system APKs',
        'Create backups before installing compressed APKs',
        'Use developer options to allow installation from unknown sources',
      ],
    });
  }

  return warnings;
};

/**
 * Check if archive compression is supported for a specific file type
 */
export const isArchiveCompressionSupported = (mimeType: string, capabilities: ArchiveCapabilities): boolean => {
  // Basic requirements for any archive compression
  if (!capabilities.fileReader || !capabilities.arrayBuffer || !capabilities.blob) {
    return false;
  }

  // Check specific archive types
  switch (mimeType) {
    case 'application/vnd.android.package-archive': // APK
    case 'application/zip':
      return capabilities.jsZip;
    default:
      return false;
  }
};

/**
 * Get recommended compression settings based on browser capabilities
 */
export const getRecommendedArchiveSettings = (capabilities: ArchiveCapabilities, fileSize?: number) => {
  const settings = {
    compressionLevel: 6, // Balanced default
    preserveStructure: true,
    validateIntegrity: true,
    useWebWorker: capabilities.webWorkers,
    enableStreaming: capabilities.streamingCompression,
  };

  // Adjust settings based on capabilities
  if (!capabilities.webWorkers) {
    // Lower compression level to avoid freezing the browser
    settings.compressionLevel = Math.min(settings.compressionLevel, 3);
  }

  if (!capabilities.streamingCompression && fileSize && fileSize > 50 * 1024 * 1024) {
    // Use lower compression for large files without streaming
    settings.compressionLevel = Math.min(settings.compressionLevel, 1);
  }

  if (!capabilities.largeFileSupport && fileSize && fileSize > 100 * 1024 * 1024) {
    // Disable compression for very large files on limited browsers
    settings.compressionLevel = 0;
  }

  return settings;
};
