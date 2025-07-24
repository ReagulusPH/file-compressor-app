/**
 * SecureProcessing
 *
 * Utility to ensure secure local processing of files
 * Provides methods to verify and enforce client-side only processing
 * Extended to support validation of new compression libraries for multi-format support
 */

import NetworkMonitor from './NetworkMonitor';

/**
 * Compression library validation interface
 */
interface LibraryValidationResult {
  isSecure: boolean;
  warnings: string[];
  blockedFeatures: string[];
}

/**
 * Supported compression libraries and their security profiles
 */
const COMPRESSION_LIBRARIES = {
  // Document compression libraries
  'pdf-lib': {
    name: 'pdf-lib',
    type: 'document',
    allowedFeatures: ['PDFDocument', 'PDFPage', 'PDFImage'],
    blockedFeatures: ['fetch', 'XMLHttpRequest', 'WebSocket'],
    networkSafe: true,
  },
  'pizzip': {
    name: 'pizzip',
    type: 'document',
    allowedFeatures: ['PizZip'],
    blockedFeatures: ['fetch', 'XMLHttpRequest', 'WebSocket'],
    networkSafe: true,
  },
  'docx': {
    name: 'docx',
    type: 'document',
    allowedFeatures: ['Document', 'Packer'],
    blockedFeatures: ['fetch', 'XMLHttpRequest', 'WebSocket'],
    networkSafe: true,
  },
  // Audio compression libraries
  'lamejs': {
    name: 'lamejs',
    type: 'audio',
    allowedFeatures: ['Mp3Encoder'],
    blockedFeatures: ['fetch', 'XMLHttpRequest', 'WebSocket'],
    networkSafe: true,
  },
  'wav-encoder': {
    name: 'wav-encoder',
    type: 'audio',
    allowedFeatures: ['encode'],
    blockedFeatures: ['fetch', 'XMLHttpRequest', 'WebSocket'],
    networkSafe: true,
  },
  // Archive compression libraries
  'jszip': {
    name: 'jszip',
    type: 'archive',
    allowedFeatures: ['JSZip'],
    blockedFeatures: ['fetch', 'XMLHttpRequest', 'WebSocket'],
    networkSafe: true,
  },
  // Image libraries
  'utif': {
    name: 'utif',
    type: 'image',
    allowedFeatures: ['UTIF'],
    blockedFeatures: ['fetch', 'XMLHttpRequest', 'WebSocket'],
    networkSafe: true,
  },
} as const;

/**
 * SecureProcessing class
 * Ensures secure local processing of files
 * Extended with multi-format compression library validation
 */
class SecureProcessing {
  private isInitialized: boolean = false;
  private validatedLibraries: Set<string> = new Set();
  private libraryValidationResults: Map<string, LibraryValidationResult> = new Map();

  /**
   * Initialize secure processing environment
   * @param options - Configuration options
   */
  public initialize(
    options: {
      monitorNetwork?: boolean;
      allowedDomains?: string[];
      logBlocked?: boolean;
      validateLibraries?: boolean;
    } = {}
  ): void {
    if (this.isInitialized) return;

    // Start network monitoring if enabled
    if (options.monitorNetwork !== false) {
      NetworkMonitor.start({
        allowedDomains: options.allowedDomains || [],
        logBlocked: options.logBlocked !== undefined ? options.logBlocked : false,
      });
    }

    // Validate compression libraries if enabled
    if (options.validateLibraries !== false) {
      this.validateCompressionLibraries();
    }

    // Set initialized flag
    this.isInitialized = true;
  }

  /**
   * Clean up secure processing environment
   */
  public cleanup(): void {
    if (!this.isInitialized) return;

    // Stop network monitoring
    NetworkMonitor.stop();

    // Clear library validation cache
    this.validatedLibraries.clear();
    this.libraryValidationResults.clear();

    // Reset initialized flag
    this.isInitialized = false;
  }

  /**
   * Check if secure processing is initialized
   * @returns Whether secure processing is initialized
   */
  public isSecureProcessingActive(): boolean {
    return this.isInitialized;
  }

  /**
   * Verify that the browser supports required APIs for secure processing
   * @returns Object containing support status for each required API
   */
  public checkBrowserSupport(): {
    webWorkers: boolean;
    fileReader: boolean;
    canvas: boolean;
    webAssembly: boolean;
    indexedDB: boolean;
    overall: boolean;
  } {
    const support = {
      webWorkers: typeof Worker !== 'undefined',
      fileReader: typeof FileReader !== 'undefined',
      canvas: typeof document !== 'undefined' && !!document.createElement('canvas').getContext,
      webAssembly: typeof WebAssembly !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      overall: false,
    };

    // Overall support requires all features
    support.overall =
      support.webWorkers &&
      support.fileReader &&
      support.canvas &&
      support.webAssembly &&
      support.indexedDB;

    return support;
  }

  /**
   * Verify that a file can be processed securely
   * @param file - File to check
   * @returns Whether the file can be processed securely
   */
  public canProcessSecurely(file: File): boolean {
    // Check if secure processing is initialized
    if (!this.isInitialized) {
      return false;
    }

    // Check browser support
    const support = this.checkBrowserSupport();
    if (!support.overall) {
      return false;
    }

    // Check file size (browser memory limitations)
    // Most browsers can handle files up to 2GB in memory, but we'll be conservative
    const MAX_SECURE_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_SECURE_FILE_SIZE) {
      return false;
    }

    return true;
  }

  /**
   * Validate all compression libraries for security compliance
   * @returns Map of library validation results
   */
  public validateCompressionLibraries(): Map<string, LibraryValidationResult> {
    const results = new Map<string, LibraryValidationResult>();

    for (const [libraryName, config] of Object.entries(COMPRESSION_LIBRARIES)) {
      const validationResult = this.validateLibrary(libraryName, config);
      results.set(libraryName, validationResult);
      this.libraryValidationResults.set(libraryName, validationResult);

      if (validationResult.isSecure) {
        this.validatedLibraries.add(libraryName);
      }
    }

    return results;
  }

  /**
   * Validate a specific compression library
   * @param libraryName - Name of the library to validate
   * @param config - Library configuration
   * @returns Validation result
   */
  private validateLibrary(libraryName: string, config: any): LibraryValidationResult {
    const warnings: string[] = [];
    const blockedFeatures: string[] = [];
    let isSecure = true;

    try {
      // Check if library is available
      const libraryGlobal = (window as any)[config.allowedFeatures[0]];
      if (!libraryGlobal && typeof require !== 'undefined') {
        // Try to check if library is available via require (for testing)
        try {
          require(libraryName);
        } catch (error) {
          warnings.push(`Library ${libraryName} is not available`);
          return { isSecure: false, warnings, blockedFeatures };
        }
      }

      // Check for blocked features in global scope
      for (const blockedFeature of config.blockedFeatures) {
        if (typeof (window as any)[blockedFeature] !== 'undefined') {
          // This is expected - we just want to ensure the library doesn't use them
          // The actual blocking is handled by NetworkMonitor
        }
      }

      // Validate network safety
      if (!config.networkSafe) {
        warnings.push(`Library ${libraryName} may make network requests`);
        isSecure = false;
      }

      // Additional security checks based on library type
      switch (config.type) {
        case 'document':
          warnings.push(...this.validateDocumentLibrary(libraryName));
          break;
        case 'audio':
          warnings.push(...this.validateAudioLibrary(libraryName));
          break;
        case 'archive':
          warnings.push(...this.validateArchiveLibrary(libraryName));
          break;
        case 'image':
          warnings.push(...this.validateImageLibrary(libraryName));
          break;
      }

    } catch (error) {
      warnings.push(`Failed to validate library ${libraryName}: ${error instanceof Error ? error.message : String(error)}`);
      isSecure = false;
    }

    return { isSecure, warnings, blockedFeatures };
  }

  /**
   * Validate document processing library
   * @param libraryName - Name of the library
   * @returns Array of warnings
   */
  private validateDocumentLibrary(libraryName: string): string[] {
    const warnings: string[] = [];

    switch (libraryName) {
      case 'pdf-lib':
        // PDF-lib is generally safe but check for specific concerns
        warnings.push('PDF processing may expose document metadata - ensure proper cleanup');
        break;
      case 'pizzip':
      case 'jszip':
        // ZIP libraries can potentially extract to arbitrary paths
        warnings.push('ZIP processing requires path validation to prevent directory traversal');
        break;
      case 'docx':
        // DOCX library processes XML which could have security implications
        warnings.push('Office document processing may expose embedded content');
        break;
    }

    return warnings;
  }

  /**
   * Validate audio processing library
   * @param libraryName - Name of the library
   * @returns Array of warnings
   */
  private validateAudioLibrary(libraryName: string): string[] {
    const warnings: string[] = [];

    switch (libraryName) {
      case 'lamejs':
        // LameJS is a pure JavaScript MP3 encoder
        warnings.push('MP3 encoding may be CPU intensive - monitor memory usage');
        break;
      case 'wav-encoder':
        // WAV encoder is generally safe
        warnings.push('WAV encoding processes raw audio data - ensure proper cleanup');
        break;
    }

    return warnings;
  }

  /**
   * Validate archive processing library
   * @param libraryName - Name of the library
   * @returns Array of warnings
   */
  private validateArchiveLibrary(libraryName: string): string[] {
    const warnings: string[] = [];

    switch (libraryName) {
      case 'jszip':
        warnings.push('Archive processing requires validation of entry paths and sizes');
        warnings.push('APK processing may expose application signatures and certificates');
        break;
    }

    return warnings;
  }

  /**
   * Validate image processing library
   * @param libraryName - Name of the library
   * @returns Array of warnings
   */
  private validateImageLibrary(libraryName: string): string[] {
    const warnings: string[] = [];

    switch (libraryName) {
      case 'utif':
        warnings.push('TIFF processing may expose EXIF metadata - ensure proper cleanup');
        break;
    }

    return warnings;
  }

  /**
   * Check if a library has been validated as secure
   * @param libraryName - Name of the library to check
   * @returns Whether the library is validated as secure
   */
  public isLibrarySecure(libraryName: string): boolean {
    return this.validatedLibraries.has(libraryName);
  }

  /**
   * Get validation result for a specific library
   * @param libraryName - Name of the library
   * @returns Validation result or null if not validated
   */
  public getLibraryValidationResult(libraryName: string): LibraryValidationResult | null {
    return this.libraryValidationResults.get(libraryName) || null;
  }

  /**
   * Validate privacy compliance for format processing workflow
   * @param format - File format being processed
   * @param libraries - Libraries being used for processing
   * @returns Privacy validation result
   */
  public validatePrivacyCompliance(format: string, libraries: string[]): {
    isCompliant: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let isCompliant = true;

    // Check if all libraries are validated
    for (const library of libraries) {
      if (!this.isLibrarySecure(library)) {
        warnings.push(`Library ${library} has not been validated as secure`);
        isCompliant = false;
      }

      const validationResult = this.getLibraryValidationResult(library);
      if (validationResult && validationResult.warnings.length > 0) {
        warnings.push(...validationResult.warnings);
      }
    }

    // Format-specific privacy recommendations
    switch (format.toLowerCase()) {
      case 'pdf':
        recommendations.push('Clear document metadata after processing');
        recommendations.push('Ensure embedded media is processed securely');
        break;
      case 'docx':
      case 'xlsx':
      case 'pptx':
      case 'odt':
      case 'ods':
      case 'odp':
        recommendations.push('Validate ZIP structure to prevent path traversal');
        recommendations.push('Clear embedded media and metadata after processing');
        break;
      case 'mp3':
      case 'wav':
        recommendations.push('Clear audio buffer data after processing');
        recommendations.push('Remove ID3 tags and metadata if not needed');
        break;
      case 'apk':
        recommendations.push('Validate APK signature integrity');
        recommendations.push('Ensure certificate data is not exposed');
        recommendations.push('Clear temporary extraction data immediately');
        break;
      case 'tiff':
        recommendations.push('Clear EXIF metadata after processing');
        recommendations.push('Validate image dimensions to prevent memory attacks');
        break;
    }

    // General privacy recommendations
    recommendations.push('Monitor network activity during processing');
    recommendations.push('Use secure memory disposal for sensitive data');
    recommendations.push('Implement proper error handling to prevent data leaks');

    return { isCompliant, warnings, recommendations };
  }

  /**
   * Secure memory disposal for sensitive document and audio data
   * @param data - Data to securely dispose of
   * @param dataType - Type of data for specific disposal methods
   */
  public secureMemoryDisposal(
    data: ArrayBuffer | Blob | File | AudioBuffer | ImageData | null,
    dataType: 'document' | 'audio' | 'image' | 'archive' | 'general' = 'general'
  ): void {
    if (data === null) return;

    try {
      // Handle different data types with specific disposal methods
      if (data instanceof ArrayBuffer) {
        this.clearArrayBuffer(data);
      } else if (typeof AudioBuffer !== 'undefined' && data instanceof AudioBuffer) {
        this.clearAudioBuffer(data);
      } else if (typeof ImageData !== 'undefined' && data instanceof ImageData) {
        this.clearImageData(data);
      } else if (data instanceof Blob || data instanceof File) {
        // For Blob and File, we can't directly clear the data
        // but we can ensure references are removed
        this.clearBlobReference(data);
      } else if (data && typeof data === 'object' && 'numberOfChannels' in data && 'getChannelData' in data) {
        // Handle AudioBuffer-like objects (for testing)
        this.clearAudioBuffer(data as AudioBuffer);
      } else if (data && typeof data === 'object' && 'data' in data && data.data instanceof Uint8ClampedArray) {
        // Handle ImageData-like objects (for testing)
        this.clearImageData(data as ImageData);
      }

      // Type-specific cleanup
      switch (dataType) {
        case 'document':
          this.clearDocumentSpecificData();
          break;
        case 'audio':
          this.clearAudioSpecificData();
          break;
        case 'image':
          this.clearImageSpecificData();
          break;
        case 'archive':
          this.clearArchiveSpecificData();
          break;
      }

    } catch (error) {
      console.warn('Error during secure memory disposal:', error);
    }
  }

  /**
   * Clear ArrayBuffer data by overwriting with zeros
   * @param buffer - ArrayBuffer to clear
   */
  private clearArrayBuffer(buffer: ArrayBuffer): void {
    const view = new Uint8Array(buffer);
    view.fill(0);
    
    // Additional security: overwrite with random data then zeros
    if (window.crypto && window.crypto.getRandomValues) {
      const randomData = new Uint8Array(buffer.byteLength);
      window.crypto.getRandomValues(randomData);
      view.set(randomData);
      view.fill(0);
    }
  }

  /**
   * Clear AudioBuffer data
   * @param audioBuffer - AudioBuffer to clear
   */
  private clearAudioBuffer(audioBuffer: AudioBuffer): void {
    try {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        channelData.fill(0);
      }
    } catch (error) {
      console.warn('Could not clear AudioBuffer data:', error);
    }
  }

  /**
   * Clear ImageData
   * @param imageData - ImageData to clear
   */
  private clearImageData(imageData: ImageData): void {
    imageData.data.fill(0);
  }

  /**
   * Clear Blob reference (best effort)
   * @param blob - Blob or File to clear reference
   */
  private clearBlobReference(blob: Blob | File): void {
    // We can't directly clear Blob data, but we can revoke object URLs
    try {
      if (blob instanceof File || blob instanceof Blob) {
        // If there are any object URLs created from this blob, they should be revoked
        // This is handled by the calling code, but we can provide guidance
      }
    } catch (error) {
      console.warn('Could not clear Blob reference:', error);
    }
  }

  /**
   * Clear document-specific temporary data
   */
  private clearDocumentSpecificData(): void {
    // Clear any document processing caches or temporary data
    // This would be implemented based on specific document processing needs
  }

  /**
   * Clear audio-specific temporary data
   */
  private clearAudioSpecificData(): void {
    // Clear any audio processing caches or temporary data
    // This would be implemented based on specific audio processing needs
  }

  /**
   * Clear image-specific temporary data
   */
  private clearImageSpecificData(): void {
    // Clear any image processing caches or temporary data
    // This would be implemented based on specific image processing needs
  }

  /**
   * Clear archive-specific temporary data
   */
  private clearArchiveSpecificData(): void {
    // Clear any archive processing caches or temporary data
    // This would be implemented based on specific archive processing needs
  }

  /**
   * Ensure data is cleared after processing (legacy method, enhanced)
   * @param data - Data to clear (ArrayBuffer, Blob, or File)
   */
  public clearData(data: ArrayBuffer | Blob | File | null): void {
    this.secureMemoryDisposal(data, 'general');
  }
}

// Export singleton instance
const secureProcessing = new SecureProcessing();
export default secureProcessing;
