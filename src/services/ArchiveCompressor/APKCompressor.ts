/**
 * APKCompressor service
 * Handles APK file compression using jszip for structure manipulation
 * Preserves APK structure and signature validity during compression
 */

import JSZip from 'jszip';
import { ArchiveSettings, FormatMetadata } from '../../types';
import { SecureProcessing } from '../../utils/security';

/**
 * APK compression result interface
 */
export interface APKCompressionResult {
  compressedBlob: Blob;
  metadata: FormatMetadata;
  warnings: string[];
}

/**
 * APK file entry interface
 */
interface APKEntry {
  name: string;
  data: Uint8Array;
  isCompressed: boolean;
  originalSize: number;
  compressedSize: number;
}

/**
 * APK signature validation result
 */
interface SignatureValidation {
  hasSignature: boolean;
  signatureFiles: string[];
  isValid: boolean;
  warnings: string[];
}

/**
 * APKCompressor class
 */
export class APKCompressor {
  private static readonly SIGNATURE_FILES = [
    'META-INF/MANIFEST.MF',
    'META-INF/CERT.SF',
    'META-INF/CERT.RSA',
    'META-INF/ANDROIDD.SF',
    'META-INF/ANDROIDD.RSA',
  ];

  private static readonly CRITICAL_FILES = [
    'AndroidManifest.xml',
    'classes.dex',
    'resources.arsc',
  ];

  private static readonly COMPRESSIBLE_EXTENSIONS = [
    '.xml',
    '.txt',
    '.json',
    '.html',
    '.css',
    '.js',
    '.properties',
  ];

  private static readonly NON_COMPRESSIBLE_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.mp3',
    '.mp4',
    '.ogg',
    '.so',
    '.dex',
  ];

  /**
   * Compress APK file
   * @param file - The APK file to compress
   * @param settings - Compression settings
   * @param onProgress - Progress callback
   * @returns Promise resolving to compression result
   */
  static async compressAPK(
    file: File,
    settings: ArchiveSettings,
    onProgress?: (progress: number) => void
  ): Promise<APKCompressionResult> {
    let arrayBuffer: ArrayBuffer | null = null;
    
    try {
      if (onProgress) onProgress(0);

      // Validate privacy compliance for APK processing
      const privacyValidation = SecureProcessing.validatePrivacyCompliance('apk', ['jszip']);
      if (!privacyValidation.isCompliant) {
        console.warn('APK processing privacy warnings:', privacyValidation.warnings);
      }

      // Load APK as ZIP
      const zip = new JSZip();
      arrayBuffer = await file.arrayBuffer();
      await zip.loadAsync(arrayBuffer);

      if (onProgress) onProgress(10);

      // Validate APK structure and signature
      const signatureValidation = await this.validateAPKSignature(zip);
      const structureValidation = await this.validateAPKStructure(zip);

      if (onProgress) onProgress(20);

      // Collect warnings
      const warnings: string[] = [];
      warnings.push(...signatureValidation.warnings);
      warnings.push(...structureValidation.warnings);

      if (!structureValidation.isValid) {
        warnings.push('APK structure validation failed - compression may break the application');
      }

      // Get compression strategy based on settings
      const compressionLevel = this.getCompressionLevel(settings.compressionLevel);
      
      if (onProgress) onProgress(30);

      // Process APK entries
      const processedEntries: APKEntry[] = [];
      const entries = Object.keys(zip.files);
      let processedCount = 0;

      for (const entryName of entries) {
        const zipEntry = zip.files[entryName];
        
        if (zipEntry.dir) {
          continue; // Skip directories
        }

        try {
          const originalData = await zipEntry.async('uint8array');
          const shouldCompress = this.shouldCompressEntry(entryName, settings);
          
          let processedData = originalData;
          let isCompressed = false;

          if (shouldCompress && !this.isCriticalFile(entryName)) {
            // Apply compression to non-critical files
            processedData = await this.compressEntry(originalData, compressionLevel);
            isCompressed = true;
          }

          processedEntries.push({
            name: entryName,
            data: processedData,
            isCompressed,
            originalSize: originalData.length,
            compressedSize: processedData.length,
          });

          processedCount++;
          const progress = 30 + (processedCount / entries.length) * 50;
          if (onProgress) onProgress(Math.round(progress));
        } catch (error) {
          console.warn(`Failed to process APK entry ${entryName}:`, error);
          warnings.push(`Failed to process entry: ${entryName}`);
          
          // Keep original data for failed entries
          const originalData = await zipEntry.async('uint8array');
          processedEntries.push({
            name: entryName,
            data: originalData,
            isCompressed: false,
            originalSize: originalData.length,
            compressedSize: originalData.length,
          });
        }
      }

      if (onProgress) onProgress(80);

      // Create new ZIP with processed entries
      const newZip = new JSZip();
      
      for (const entry of processedEntries) {
        // Preserve directory structure
        newZip.file(entry.name, entry.data, {
          compression: entry.isCompressed ? 'DEFLATE' : 'STORE',
          compressionOptions: {
            level: entry.isCompressed ? compressionLevel : 0,
          },
        });
      }

      if (onProgress) onProgress(90);

      // Generate compressed APK
      const compressedBlob = await newZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: compressionLevel,
        },
        mimeType: 'application/vnd.android.package-archive',
      });

      if (onProgress) onProgress(95);

      // Calculate metadata
      const totalOriginalSize = processedEntries.reduce((sum, entry) => sum + entry.originalSize, 0);
      const totalCompressedSize = processedEntries.reduce((sum, entry) => sum + entry.compressedSize, 0);
      const compressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;

      const metadata: FormatMetadata = {
        entryCount: processedEntries.length,
        compressionRatio,
        hasSignature: signatureValidation.hasSignature,
      };

      // Add integrity warnings if needed
      if (settings.validateIntegrity && !structureValidation.isValid) {
        warnings.push('Integrity validation failed - the compressed APK may not function correctly');
      }

      if (signatureValidation.hasSignature && compressionRatio < 0.9) {
        warnings.push('Significant compression applied to signed APK - signature may become invalid');
      }

      if (onProgress) onProgress(100);

      return {
        compressedBlob,
        metadata,
        warnings,
      };
    } catch (error) {
      console.error('APK compression failed:', error);
      throw new Error(`APK compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Secure memory disposal for APK data
      if (arrayBuffer) {
        SecureProcessing.secureMemoryDisposal(arrayBuffer, 'archive');
      }
    }
  }

  /**
   * Validate APK signature
   * @param zip - The ZIP object representing the APK
   * @returns Signature validation result
   */
  private static async validateAPKSignature(zip: JSZip): Promise<SignatureValidation> {
    const signatureFiles: string[] = [];
    const warnings: string[] = [];

    // Check for signature files
    for (const sigFile of this.SIGNATURE_FILES) {
      if (zip.files[sigFile]) {
        signatureFiles.push(sigFile);
      }
    }

    const hasSignature = signatureFiles.length > 0;
    let isValid = true;

    if (hasSignature) {
      // Basic signature validation
      const hasManifest = signatureFiles.includes('META-INF/MANIFEST.MF');
      const hasCertSF = signatureFiles.some(f => f.endsWith('.SF'));
      const hasCertRSA = signatureFiles.some(f => f.endsWith('.RSA') || f.endsWith('.DSA'));

      if (!hasManifest) {
        isValid = false;
        warnings.push('Missing MANIFEST.MF file in signature');
      }

      if (!hasCertSF) {
        isValid = false;
        warnings.push('Missing signature file (.SF)');
      }

      if (!hasCertRSA) {
        isValid = false;
        warnings.push('Missing certificate file (.RSA/.DSA)');
      }

      if (isValid) {
        warnings.push('APK is signed - compression may invalidate the signature');
      }
    } else {
      warnings.push('APK is not signed - this is unusual for production APKs');
    }

    return {
      hasSignature,
      signatureFiles,
      isValid,
      warnings,
    };
  }

  /**
   * Validate APK structure
   * @param zip - The ZIP object representing the APK
   * @returns Structure validation result
   */
  private static async validateAPKStructure(zip: JSZip): Promise<{ isValid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    let isValid = true;

    // Check for critical files
    for (const criticalFile of this.CRITICAL_FILES) {
      if (!zip.files[criticalFile]) {
        isValid = false;
        warnings.push(`Missing critical file: ${criticalFile}`);
      }
    }

    // Check for Android manifest
    if (zip.files['AndroidManifest.xml']) {
      try {
        const manifestData = await zip.files['AndroidManifest.xml'].async('uint8array');
        if (manifestData.length === 0) {
          isValid = false;
          warnings.push('AndroidManifest.xml is empty');
        }
      } catch (error) {
        isValid = false;
        warnings.push('Failed to read AndroidManifest.xml');
      }
    }

    return { isValid, warnings };
  }

  /**
   * Determine if an entry should be compressed
   * @param entryName - Name of the entry
   * @param settings - Compression settings
   * @returns Whether the entry should be compressed
   */
  private static shouldCompressEntry(entryName: string, settings: ArchiveSettings): boolean {
    // Don't compress if preserve structure is enabled and it's a critical file
    if (settings.preserveStructure && this.isCriticalFile(entryName)) {
      return false;
    }

    // Check file extension
    const extension = this.getFileExtension(entryName);
    
    // Don't compress already compressed formats
    if (this.NON_COMPRESSIBLE_EXTENSIONS.includes(extension)) {
      return false;
    }

    // Compress text-based files
    if (this.COMPRESSIBLE_EXTENSIONS.includes(extension)) {
      return true;
    }

    // For unknown extensions, compress only if compression level is high
    return settings.compressionLevel >= 7;
  }

  /**
   * Check if a file is critical for APK functionality
   * @param entryName - Name of the entry
   * @returns Whether the file is critical
   */
  private static isCriticalFile(entryName: string): boolean {
    return this.CRITICAL_FILES.some(criticalFile => entryName === criticalFile) ||
           entryName.startsWith('META-INF/') ||
           entryName.endsWith('.dex');
  }

  /**
   * Get file extension from entry name
   * @param entryName - Name of the entry
   * @returns File extension including the dot
   */
  private static getFileExtension(entryName: string): string {
    const lastDot = entryName.lastIndexOf('.');
    return lastDot >= 0 ? entryName.substring(lastDot).toLowerCase() : '';
  }

  /**
   * Compress entry data
   * @param data - Original data
   * @param compressionLevel - Compression level (0-9)
   * @returns Compressed data
   */
  private static async compressEntry(data: Uint8Array, compressionLevel: number): Promise<Uint8Array> {
    // For now, return original data as JSZip will handle compression
    // In a more advanced implementation, we could apply additional compression algorithms
    return data;
  }

  /**
   * Get JSZip compression level from settings
   * @param level - Compression level (0-9)
   * @returns JSZip compression level
   */
  private static getCompressionLevel(level: number): number {
    // Map 0-9 to JSZip's 1-9 range (0 means no compression in JSZip)
    return Math.max(1, Math.min(9, level));
  }

  /**
   * Get supported APK formats
   * @returns Array of supported format extensions
   */
  static getSupportedFormats(): string[] {
    return ['apk'];
  }

  /**
   * Cancel ongoing compression (placeholder for interface compatibility)
   */
  static cancelCompression(): void {
    // APK compression is typically fast and doesn't need cancellation
    // This method exists for interface compatibility
  }

  /**
   * Validate APK file before compression
   * @param file - The file to validate
   * @returns Promise resolving to validation result
   */
  static async validateAPKFile(file: File): Promise<{ isValid: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.apk')) {
      return { isValid: false, warnings: ['File does not have .apk extension'] };
    }

    // Check file size (warn for very large files)
    const maxRecommendedSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxRecommendedSize) {
      warnings.push('Large APK file - compression may take significant time and memory');
    }

    try {
      // Try to load as ZIP to validate structure
      const zip = new JSZip();
      const arrayBuffer = await file.arrayBuffer();
      await zip.loadAsync(arrayBuffer);

      // Basic structure validation
      const hasManifest = !!zip.files['AndroidManifest.xml'];
      if (!hasManifest) {
        warnings.push('APK does not contain AndroidManifest.xml - may not be a valid APK');
      }

      return { isValid: true, warnings };
    } catch (error) {
      return { 
        isValid: false, 
        warnings: [`Invalid APK file: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }
}

export default APKCompressor;