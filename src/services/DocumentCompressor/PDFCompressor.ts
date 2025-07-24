/**
 * PDFCompressor service
 * PDF compression and optimization using pdf-lib
 */

import { PDFDocument, PDFPage, PDFImage, PDFName } from 'pdf-lib';
import { DocumentSettings, FormatMetadata } from '../../types';
import { CompressionError, MemoryError } from '../../utils/errors/ErrorTypes';
import MemoryManager from '../../utils/memory/MemoryManager';
import SecureProcessing from '../../utils/security/SecureProcessing';
import DocumentProcessor, { DocumentProcessingResult } from './DocumentProcessor';

/**
 * PDF compression options interface
 */
interface PDFCompressionOptions {
  imageQuality: number;
  removeMetadata: boolean;
  optimizeImages: boolean;
  compressStreams: boolean;
}

/**
 * PDFCompressor service class
 */
export class PDFCompressor extends DocumentProcessor {
  /**
   * Compress a PDF document
   * @param file - The PDF file to compress
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
    let arrayBuffer: ArrayBuffer | null = null;

    try {
      // Validate privacy compliance for PDF processing
      const privacyValidation = SecureProcessing.validatePrivacyCompliance('pdf', ['pdf-lib']);
      if (!privacyValidation.isCompliant) {
        console.warn('PDF processing privacy compliance issues:', privacyValidation.warnings.filter(w => w.includes('not been validated')));
      }

      // Validate document
      const isValid = await this.validateDocument(file);
      if (!isValid) {
        throw new CompressionError('Invalid PDF document');
      }

      if (onProgress) onProgress(10);

      // Read PDF file
      arrayBuffer = await file.arrayBuffer();
      if (this.shouldCancel) {
        throw new CompressionError('PDF compression was cancelled');
      }

      if (onProgress) onProgress(20);

      // Load PDF document
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      if (this.shouldCancel) {
        throw new CompressionError('PDF compression was cancelled');
      }

      if (onProgress) onProgress(30);

      // Extract metadata before compression
      const metadata = await this.extractMetadataFromPDF(pdfDoc);

      // Apply compression based on settings
      const compressionOptions = this.mapSettingsToOptions(settings);
      await this.applyPDFCompression(pdfDoc, compressionOptions, onProgress);

      if (this.shouldCancel) {
        throw new CompressionError('PDF compression was cancelled');
      }

      if (onProgress) onProgress(90);

      // Save compressed PDF
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });

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
      console.error('PDF compression failed:', error);
      throw new CompressionError(
        `PDF compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.resetProcessingState();
      
      // Secure memory disposal for PDF data (only if arrayBuffer was created)
      if (arrayBuffer) {
        SecureProcessing.secureMemoryDisposal(arrayBuffer, 'document');
      }
      
      MemoryManager.cleanup();
    }
  }

  /**
   * Extract metadata from PDF document
   * @param file - The PDF file
   * @returns Promise resolving to format metadata
   */
  async extractMetadata(file: File): Promise<FormatMetadata> {
    let arrayBuffer: ArrayBuffer | null = null;
    try {
      arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      return this.extractMetadataFromPDF(pdfDoc);
    } catch (error) {
      console.error('Failed to extract PDF metadata:', error);
      return {
        pageCount: 0,
        hasEmbeddedMedia: false,
        isEncrypted: false,
      };
    } finally {
      // Clean up memory if arrayBuffer was created
      if (arrayBuffer) {
        SecureProcessing.secureMemoryDisposal(arrayBuffer, 'document');
      }
    }
  }

  /**
   * Extract metadata from loaded PDF document
   * @param pdfDoc - The loaded PDF document
   * @returns Format metadata
   */
  private async extractMetadataFromPDF(pdfDoc: PDFDocument): Promise<FormatMetadata> {
    try {
      const pages = pdfDoc.getPages();
      const pageCount = pages.length;

      // Check for embedded media (images, etc.)
      let hasEmbeddedMedia = false;
      try {
        // Simple check for embedded images by looking at page resources
        for (const page of pages.slice(0, 5)) {
          // Check first 5 pages only for performance
          const resources = page.node.Resources();
          if (resources && resources.get(PDFName.of('XObject'))) {
            hasEmbeddedMedia = true;
            break;
          }
        }
      } catch (error) {
        // If we can't check for embedded media, assume false
        hasEmbeddedMedia = false;
      }

      return {
        pageCount,
        hasEmbeddedMedia,
        isEncrypted: false, // pdf-lib handles decryption automatically if possible
      };
    } catch (error) {
      console.error('Failed to extract PDF metadata:', error);
      return {
        pageCount: 0,
        hasEmbeddedMedia: false,
        isEncrypted: true, // Assume encrypted if we can't read it
      };
    }
  }

  /**
   * Map document settings to PDF compression options
   * @param settings - Document compression settings
   * @returns PDF compression options
   */
  private mapSettingsToOptions(settings: DocumentSettings): PDFCompressionOptions {
    let imageQuality: number;
    let compressStreams: boolean;

    switch (settings.compressionLevel) {
      case 'high':
        imageQuality = 0.9;
        compressStreams = true;
        break;
      case 'medium':
        imageQuality = 0.7;
        compressStreams = true;
        break;
      case 'low':
        imageQuality = 0.5;
        compressStreams = true;
        break;
      default:
        imageQuality = 0.7;
        compressStreams = true;
    }

    return {
      imageQuality,
      removeMetadata: !settings.preserveMetadata,
      optimizeImages: settings.optimizeImages,
      compressStreams,
    };
  }

  /**
   * Apply compression to PDF document
   * @param pdfDoc - The PDF document to compress
   * @param options - Compression options
   * @param onProgress - Progress callback
   */
  private async applyPDFCompression(
    pdfDoc: PDFDocument,
    options: PDFCompressionOptions,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // Remove metadata if requested
    if (options.removeMetadata) {
      try {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
      } catch (error) {
        // Ignore metadata removal errors
        console.warn('Failed to remove PDF metadata:', error);
      }
    }

    // Process pages for optimization
    if (options.optimizeImages && totalPages > 0) {
      for (let i = 0; i < totalPages; i++) {
        if (this.shouldCancel) {
          throw new CompressionError('PDF compression was cancelled');
        }

        // Check memory before processing each page
        if (!MemoryManager.checkMemory()) {
          throw new MemoryError('Insufficient memory for PDF processing');
        }

        const page = pages[i];
        await this.optimizePage(page, options);

        // Report progress (30% to 90% range for page processing)
        if (onProgress) {
          const pageProgress = 30 + Math.round(((i + 1) / totalPages) * 60);
          onProgress(pageProgress);
        }

        // Clean up after each page
        MemoryManager.cleanup();
      }
    }
  }

  /**
   * Optimize a single PDF page
   * @param page - The PDF page to optimize
   * @param options - Compression options
   */
  private async optimizePage(page: PDFPage, options: PDFCompressionOptions): Promise<void> {
    try {
      // For now, we'll implement basic optimization
      // More advanced optimization would require deeper pdf-lib integration
      
      // The main optimization happens during the save process with useObjectStreams: true
      // Additional optimizations could include:
      // - Image recompression (requires extracting and recompressing images)
      // - Font subsetting (pdf-lib handles this automatically)
      // - Content stream compression (handled by save options)
      
      // Placeholder for future image optimization
      if (options.optimizeImages) {
        // This would require extracting images, compressing them, and replacing them
        // For now, we rely on the PDF save options for compression
      }
    } catch (error) {
      console.warn('Failed to optimize PDF page:', error);
      // Continue processing other pages even if one fails
    }
  }

  /**
   * Cancel ongoing compression
   */
  static cancelCompression(): void {
    // PDF compression cancellation is handled by the base class
    // This method exists for interface compatibility
    console.log('PDF compression cancellation requested');
  }

  /**
   * Check if PDF compression is supported in current environment
   * @returns Boolean indicating support
   */
  static isSupported(): boolean {
    try {
      // Check if pdf-lib is available and basic features work
      return typeof PDFDocument !== 'undefined';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const pdfCompressor = new PDFCompressor();
export default pdfCompressor;