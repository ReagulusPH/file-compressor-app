/**
 * DocumentCompressor module exports
 */

export { default as DocumentProcessor } from './DocumentProcessor';
export { default as PDFCompressor } from './PDFCompressor';
export { default as OfficeCompressor } from './OfficeCompressor';
export type { DocumentProcessingResult, DocumentChunk } from './DocumentProcessor';
export type { OfficeDocumentType } from './OfficeCompressor';