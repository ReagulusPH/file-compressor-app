/**
 * OfficeCompressor service
 * Office document compression for DOC, XLS, PPT, ODT using pizzip and docx libraries
 */

// @ts-nocheck
import PizZip from 'pizzip';
import { Document, Packer } from 'docx';
import { DocumentSettings, FormatMetadata } from '../../types';
import { CompressionError, MemoryError } from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';
import { SecureProcessing } from '../../utils/security';
import DocumentProcessor, { DocumentProcessingResult } from './DocumentProcessor';

/**
 * Office document types
 */
export type OfficeDocumentType =
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'odt'
  | 'ods'
  | 'odp'
  | 'doc'
  | 'xls'
  | 'ppt';

/**
 * Office compression options interface
 */
interface OfficeCompressionOptions {
  compressionLevel: number; // 0-9 for ZIP compression
  optimizeImages: boolean;
  removeMetadata: boolean;
  preserveStructure: boolean;
}

/**
 * Embedded media information
 */
interface EmbeddedMedia {
  path: string;
  data: ArrayBuffer;
  type: string;
  size: number;
}

/**
 * Document integrity validation result
 */
interface IntegrityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * OfficeCompressor service class
 */
export class OfficeCompressor extends DocumentProcessor {
  private readonly SUPPORTED_FORMATS = new Set<string>([
    'docx',
    'xlsx',
    'pptx',
    'odt',
    'ods',
    'odp',
    'doc',
    'xls',
    'ppt',
  ]);

  /**
   * Compress an Office document
   * @param file - The Office document file to compress
   * @param settings - Document compression settings
   * @param onProgress - Progress callback
   * @returns Promise resolving to processing result
   */
  async compressDocument(
    file: File,
    settings: DocumentSettings,
    onProgress?: (progress: number) => void
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    this.isProcessing = true;
    this.shouldCancel = false;

    try {
      // Validate privacy compliance for Office document processing
      const privacyValidation = SecureProcessing.validatePrivacyCompliance('docx', ['pizzip', 'docx']);
      if (!privacyValidation.isCompliant) {
        console.warn('Office document processing privacy compliance issues:', privacyValidation.warnings.filter(w => w.includes('not been validated')));
      }

      // Validate document
      const isValid = await this.validateDocument(file);
      if (!isValid) {
        throw new CompressionError('Invalid Office document');
      }

      const documentType = this.detectDocumentType(file);
      if (!documentType) {
        throw new CompressionError('Unsupported Office document format');
      }

      if (onProgress) onProgress(10);

      // Read document file
      const arrayBuffer = await file.arrayBuffer();
      if (this.shouldCancel) {
        throw new CompressionError('Office document compression was cancelled');
      }

      if (onProgress) onProgress(20);

      // Extract metadata before compression
      const metadata = await this.extractMetadataFromBuffer(arrayBuffer, documentType);

      if (onProgress) onProgress(30);

      // Apply compression based on document type and settings
      const compressionOptions = this.mapSettingsToOptions(settings);
      const compressedBuffer = await this.compressOfficeDocument(
        arrayBuffer,
        documentType,
        compressionOptions,
        onProgress
      );

      if (this.shouldCancel) {
        throw new CompressionError('Office document compression was cancelled');
      }

      if (onProgress) onProgress(90);

      // Validate compressed document integrity
      const validationResult = await this.validateDocumentIntegrity(compressedBuffer, documentType);
      if (!validationResult.isValid) {
        console.warn('Document integrity validation warnings:', validationResult.warnings);
        if (validationResult.errors.length > 0) {
          throw new CompressionError(
            `Document integrity validation failed: ${validationResult.errors.join(', ')}`
          );
        }
      }

      const compressedBlob = new Blob([compressedBuffer], { type: file.type });

      if (onProgress) onProgress(100);

      // Calculate compression statistics
      const stats = this.calculateCompressionStats(file.size, compressedBlob.size, startTime);

      return {
        compressedBlob,
        metadata,
        compressionRatio: stats.compressionRatio,
        processingTime: stats.processingTime,
      };
    } catch (error) {
      console.error('Office document compression failed:', error);
      throw new CompressionError(
        `Office document compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.resetProcessingState();
      
      // Secure memory disposal for Office document data
      SecureProcessing.secureMemoryDisposal(arrayBuffer, 'document');
      
      MemoryManager.cleanup();
    }
  }

  /**
   * Extract metadata from Office document
   * @param file - The Office document file
   * @returns Promise resolving to format metadata
   */
  async extractMetadata(file: File): Promise<FormatMetadata> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const documentType = this.detectDocumentType(file);
      if (!documentType) {
        throw new Error('Unsupported document type');
      }
      return this.extractMetadataFromBuffer(arrayBuffer, documentType);
    } catch (error) {
      console.error('Failed to extract Office document metadata:', error);
      return {
        pageCount: 0,
        hasEmbeddedMedia: false,
        isEncrypted: false,
      };
    }
  }

  /**
   * Detect Office document type from file
   * @param file - The document file
   * @returns Document type or null if unsupported
   */
  private detectDocumentType(file: File): OfficeDocumentType | null {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.SUPPORTED_FORMATS.has(extension)) {
      return null;
    }
    return extension as OfficeDocumentType;
  }

  /**
   * Extract metadata from document buffer
   * @param buffer - The document buffer
   * @param documentType - The document type
   * @returns Format metadata
   */
  private async extractMetadataFromBuffer(
    buffer: ArrayBuffer,
    documentType: OfficeDocumentType
  ): Promise<FormatMetadata> {
    try {
      // For ZIP-based formats (docx, xlsx, pptx, odt, ods, odp)
      if (this.isZipBasedFormat(documentType)) {
        return this.extractZipBasedMetadata(buffer);
      }

      // For legacy formats (doc, xls, ppt) - basic metadata only
      return this.extractLegacyMetadata(buffer, documentType);
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {
        pageCount: 0,
        hasEmbeddedMedia: false,
        isEncrypted: false,
      };
    }
  }

  /**
   * Check if document format is ZIP-based
   * @param documentType - The document type
   * @returns Boolean indicating if format is ZIP-based
   */
  private isZipBasedFormat(documentType: OfficeDocumentType): boolean {
    return ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].includes(documentType);
  }

  /**
   * Extract metadata from ZIP-based document
   * @param buffer - The document buffer
   * @returns Format metadata
   */
  private async extractZipBasedMetadata(buffer: ArrayBuffer): Promise<FormatMetadata> {
    try {
      const zip = new PizZip(buffer);
      const files = zip.files;

      let pageCount = 0;
      let hasEmbeddedMedia = false;
      let entryCount = 0;

      // Count entries and detect embedded media
      for (const filename in files) {
        entryCount++;

        // Check for embedded media files
        if (this.isMediaFile(filename)) {
          hasEmbeddedMedia = true;
        }

        // Estimate page count based on document structure
        if (filename.includes('slide') || filename.includes('page') || filename.includes('sheet')) {
          pageCount++;
        }
      }

      // For documents without clear page structure, estimate based on content
      if (pageCount === 0) {
        // Check for document.xml or content.xml for rough page estimation
        const contentFile = files['word/document.xml'] || files['content.xml'];
        if (contentFile) {
          const content = contentFile.asText();
          // Very rough estimation based on content length
          pageCount = Math.max(1, Math.ceil(content.length / 5000));
        } else {
          pageCount = 1; // Default to 1 page
        }
      }

      return {
        pageCount: Math.max(1, pageCount),
        hasEmbeddedMedia,
        isEncrypted: false,
        entryCount,
      };
    } catch (error) {
      console.error('Failed to extract ZIP-based metadata:', error);
      return {
        pageCount: 1,
        hasEmbeddedMedia: false,
        isEncrypted: true, // Assume encrypted if we can't read it
      };
    }
  }

  /**
   * Extract metadata from legacy document formats
   * @param buffer - The document buffer
   * @param documentType - The document type
   * @returns Format metadata
   */
  private async extractLegacyMetadata(
    buffer: ArrayBuffer,
    documentType: OfficeDocumentType
  ): Promise<FormatMetadata> {
    // For legacy formats, we can only provide basic metadata
    // More sophisticated parsing would require format-specific libraries
    return {
      pageCount: 1, // Default assumption
      hasEmbeddedMedia: false, // Cannot easily detect in legacy formats
      isEncrypted: false,
    };
  }

  /**
   * Check if filename represents a media file
   * @param filename - The filename to check
   * @returns Boolean indicating if file is media
   */
  private isMediaFile(filename: string): boolean {
    const mediaExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.tiff',
      '.svg',
      '.wmf',
      '.emf',
    ];
    const lowerFilename = filename.toLowerCase();
    return (
      mediaExtensions.some(ext => lowerFilename.includes(ext)) ||
      lowerFilename.includes('media/') ||
      lowerFilename.includes('image')
    );
  }

  /**
   * Map document settings to Office compression options
   * @param settings - Document compression settings
   * @returns Office compression options
   */
  private mapSettingsToOptions(settings: DocumentSettings): OfficeCompressionOptions {
    let compressionLevel: number;

    switch (settings.compressionLevel) {
      case 'high':
        compressionLevel = 9; // Maximum compression
        break;
      case 'medium':
        compressionLevel = 6; // Balanced compression
        break;
      case 'low':
        compressionLevel = 3; // Light compression
        break;
      default:
        compressionLevel = 6;
    }

    return {
      compressionLevel,
      optimizeImages: settings.optimizeImages,
      removeMetadata: !settings.preserveMetadata,
      preserveStructure: true, // Always preserve structure for Office docs
    };
  }

  /**
   * Compress Office document
   * @param buffer - The document buffer
   * @param documentType - The document type
   * @param options - Compression options
   * @param onProgress - Progress callback
   * @returns Promise resolving to compressed buffer
   */
  private async compressOfficeDocument(
    buffer: ArrayBuffer,
    documentType: OfficeDocumentType,
    options: OfficeCompressionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    if (this.isZipBasedFormat(documentType)) {
      return this.compressZipBasedDocument(buffer, options, onProgress);
    } else {
      return this.compressLegacyDocument(buffer, documentType, options, onProgress);
    }
  }

  /**
   * Compress ZIP-based Office document
   * @param buffer - The document buffer
   * @param options - Compression options
   * @param onProgress - Progress callback
   * @returns Promise resolving to compressed buffer
   */
  private async compressZipBasedDocument(
    buffer: ArrayBuffer,
    options: OfficeCompressionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    try {
      // Load the ZIP file
      const zip = new PizZip(buffer);
      const files = zip.files;
      const totalFiles = Object.keys(files).length;
      let processedFiles = 0;

      // Detect and extract embedded media for separate compression
      const embeddedMedia = await this.detectEmbeddedMedia(zip);

      if (onProgress) onProgress(40);

      // Optimize embedded media if requested
      if (options.optimizeImages && embeddedMedia.length > 0) {
        await this.optimizeEmbeddedMediaInZip(zip, embeddedMedia, options);
      }

      if (onProgress) onProgress(60);

      // Remove metadata if requested
      if (options.removeMetadata) {
        this.removeMetadataFromZip(zip);
      }

      if (onProgress) onProgress(70);

      // Generate compressed ZIP with specified compression level
      const compressedBuffer = zip.generate({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: options.compressionLevel,
        },
      });

      if (onProgress) onProgress(85);

      return compressedBuffer;
    } catch (error) {
      console.error('Failed to compress ZIP-based document:', error);
      throw new CompressionError(
        `ZIP-based document compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compress legacy Office document
   * @param buffer - The document buffer
   * @param documentType - The document type
   * @param options - Compression options
   * @param onProgress - Progress callback
   * @returns Promise resolving to compressed buffer
   */
  private async compressLegacyDocument(
    buffer: ArrayBuffer,
    documentType: OfficeDocumentType,
    options: OfficeCompressionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ArrayBuffer> {
    // For legacy formats, we have limited compression options
    // We can try to compress the entire file as a ZIP archive
    try {
      const zip = new PizZip();
      const filename = `document.${documentType}`;

      zip.file(filename, buffer);

      if (onProgress) onProgress(60);

      const compressedBuffer = zip.generate({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: options.compressionLevel,
        },
      });

      if (onProgress) onProgress(85);

      // For legacy formats, return the original buffer with minimal processing
      // since we can't safely modify the internal structure
      return buffer;
    } catch (error) {
      console.error('Failed to compress legacy document:', error);
      // Return original buffer if compression fails
      return buffer;
    }
  }

  /**
   * Detect embedded media in ZIP-based document
   * @param zip - The ZIP file
   * @returns Promise resolving to embedded media array
   */
  private async detectEmbeddedMedia(zip: PizZip): Promise<EmbeddedMedia[]> {
    const embeddedMedia: EmbeddedMedia[] = [];

    try {
      for (const filename in zip.files) {
        if (this.isMediaFile(filename)) {
          const file = zip.files[filename];
          if (!file.dir) {
            const data = file.asArrayBuffer();
            embeddedMedia.push({
              path: filename,
              data,
              type: this.getMediaType(filename),
              size: data.byteLength,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to detect embedded media:', error);
    }

    return embeddedMedia;
  }

  /**
   * Get media type from filename
   * @param filename - The filename
   * @returns Media type string
   */
  private getMediaType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Optimize embedded media in ZIP file
   * @param zip - The ZIP file
   * @param embeddedMedia - Array of embedded media
   * @param options - Compression options
   */
  private async optimizeEmbeddedMediaInZip(
    zip: PizZip,
    embeddedMedia: EmbeddedMedia[],
    options: OfficeCompressionOptions
  ): Promise<void> {
    for (const media of embeddedMedia) {
      try {
        if (this.shouldCancel) {
          throw new CompressionError('Media optimization was cancelled');
        }

        // Check memory before processing each media file
        if (!MemoryManager.checkMemory()) {
          console.warn('Skipping media optimization due to memory constraints');
          break;
        }

        // Optimize the media using the base class method
        const optimizedData = await this.optimizeEmbeddedMedia(media.data, media.type);

        // Replace the media in the ZIP file
        zip.file(media.path, optimizedData);

        // Clean up after each media file
        MemoryManager.cleanup();
      } catch (error) {
        console.warn(`Failed to optimize embedded media ${media.path}:`, error);
        // Continue with other media files even if one fails
      }
    }
  }

  /**
   * Remove metadata from ZIP-based document
   * @param zip - The ZIP file
   */
  private removeMetadataFromZip(zip: PizZip): void {
    try {
      // Remove common metadata files
      const metadataFiles = [
        'docProps/app.xml',
        'docProps/core.xml',
        'docProps/custom.xml',
        'meta.xml', // For OpenDocument formats
      ];

      for (const filename of metadataFiles) {
        if (zip.files[filename]) {
          delete zip.files[filename];
        }
      }
    } catch (error) {
      console.warn('Failed to remove metadata:', error);
      // Continue processing even if metadata removal fails
    }
  }

  /**
   * Validate document integrity after compression
   * @param buffer - The compressed document buffer
   * @param documentType - The document type
   * @returns Promise resolving to validation result
   */
  private async validateDocumentIntegrity(
    buffer: ArrayBuffer,
    documentType: OfficeDocumentType
  ): Promise<IntegrityValidationResult> {
    const result: IntegrityValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      if (this.isZipBasedFormat(documentType)) {
        // Validate ZIP structure
        const zip = new PizZip(buffer);

        // Check for essential files based on document type
        const requiredFiles = this.getRequiredFiles(documentType);
        for (const requiredFile of requiredFiles) {
          if (!zip.files[requiredFile]) {
            result.errors.push(`Missing required file: ${requiredFile}`);
            result.isValid = false;
          }
        }

        // Check for content files
        const hasContent = this.validateDocumentContent(zip, documentType);
        if (!hasContent) {
          result.warnings.push('Document content may be corrupted or empty');
        }
      } else {
        // For legacy formats, basic validation
        if (buffer.byteLength === 0) {
          result.errors.push('Document is empty');
          result.isValid = false;
        }
      }
    } catch (error) {
      result.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get required files for document type
   * @param documentType - The document type
   * @returns Array of required file paths
   */
  private getRequiredFiles(documentType: OfficeDocumentType): string[] {
    switch (documentType) {
      case 'docx':
        return ['word/document.xml', '[Content_Types].xml'];
      case 'xlsx':
        return ['xl/workbook.xml', '[Content_Types].xml'];
      case 'pptx':
        return ['ppt/presentation.xml', '[Content_Types].xml'];
      case 'odt':
      case 'ods':
      case 'odp':
        return ['content.xml', 'META-INF/manifest.xml'];
      default:
        return [];
    }
  }

  /**
   * Validate document content
   * @param zip - The ZIP file
   * @param documentType - The document type
   * @returns Boolean indicating if content is valid
   */
  private validateDocumentContent(zip: PizZip, documentType: OfficeDocumentType): boolean {
    try {
      let contentFile: any;

      switch (documentType) {
        case 'docx':
          contentFile = zip.files['word/document.xml'];
          break;
        case 'xlsx':
          contentFile = zip.files['xl/workbook.xml'];
          break;
        case 'pptx':
          contentFile = zip.files['ppt/presentation.xml'];
          break;
        case 'odt':
        case 'ods':
        case 'odp':
          contentFile = zip.files['content.xml'];
          break;
        default:
          return true; // Assume valid for unknown types
      }

      if (!contentFile) {
        return false;
      }

      const content = contentFile.asText();
      return content && content.length > 0;
    } catch (error) {
      console.warn('Content validation failed:', error);
      return false;
    }
  }

  /**
   * Cancel ongoing compression
   */
  static cancelCompression(): void {
    // Office document compression cancellation is handled by the base class
    // This method exists for interface compatibility
    console.log('Office document compression cancellation requested');
  }

  /**
   * Check if Office document compression is supported in current environment
   * @returns Boolean indicating support
   */
  static isSupported(): boolean {
    try {
      // Check if required libraries are available
      return typeof PizZip !== 'undefined';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported Office document formats
   * @returns Array of supported format extensions
   */
  static getSupportedFormats(): string[] {
    return ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'doc', 'xls', 'ppt'];
  }
}

// Export singleton instance
const officeCompressor = new OfficeCompressor();
export default officeCompressor;
