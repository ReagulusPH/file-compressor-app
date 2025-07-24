# Multi-Format File Compression - Design Document

## Overview

This design extends the existing file compressor architecture to support additional file formats (PDF, ODT, PPT, DOC, XLS, MP3, APK, WAV, TIFF) while maintaining the current app's privacy-first, client-side approach and existing user experience. The design follows the established pattern of native APIs first with library fallbacks, ensuring compatibility across browsers.

## Architecture

### Extended Service Layer Architecture

```
src/services/
├── CompressionService.ts           # Enhanced orchestration for all formats
├── ImageCompressor/
│   ├── CanvasImageCompressor.ts   # Extended for TIFF support
│   └── ImageCompressor.ts         # Fallback with TIFF support
├── VideoCompressor/               # Existing video compression
├── DocumentCompressor/            # NEW: Document format handling
│   ├── PDFCompressor.ts          # PDF-specific compression
│   ├── OfficeCompressor.ts       # DOC, XLS, PPT, ODT handling
│   └── DocumentProcessor.ts      # Common document operations
├── AudioCompressor/               # NEW: Audio format handling
│   ├── WebAudioCompressor.ts     # Web Audio API (primary)
│   └── AudioLibCompressor.ts     # Library fallback
├── ArchiveCompressor/             # NEW: APK and archive handling
│   └── APKCompressor.ts          # APK-specific compression
└── FormatDetector.ts             # NEW: Enhanced format detection
```

### Format Detection Strategy

```typescript
interface FormatInfo {
  type: 'image' | 'video' | 'document' | 'audio' | 'archive';
  format: string;
  mimeType: string;
  compressor: string;
  supportLevel: 'native' | 'library' | 'limited';
}

const FORMAT_MAP: Record<string, FormatInfo> = {
  // Existing formats
  'jpg': { type: 'image', format: 'jpeg', mimeType: 'image/jpeg', compressor: 'CanvasImageCompressor', supportLevel: 'native' },
  'png': { type: 'image', format: 'png', mimeType: 'image/png', compressor: 'CanvasImageCompressor', supportLevel: 'native' },
  
  // New formats
  'tiff': { type: 'image', format: 'tiff', mimeType: 'image/tiff', compressor: 'CanvasImageCompressor', supportLevel: 'library' },
  'pdf': { type: 'document', format: 'pdf', mimeType: 'application/pdf', compressor: 'PDFCompressor', supportLevel: 'library' },
  'mp3': { type: 'audio', format: 'mp3', mimeType: 'audio/mpeg', compressor: 'WebAudioCompressor', supportLevel: 'native' },
  'wav': { type: 'audio', format: 'wav', mimeType: 'audio/wav', compressor: 'WebAudioCompressor', supportLevel: 'native' },
  'apk': { type: 'archive', format: 'apk', mimeType: 'application/vnd.android.package-archive', compressor: 'APKCompressor', supportLevel: 'library' }
};
```

## Components and Interfaces

### Enhanced Compression Settings Component

```typescript
interface CompressionSettings {
  // Existing settings
  quality: number;
  outputFormat?: string;
  
  // New format-specific settings
  documentSettings?: {
    compressionLevel: 'low' | 'medium' | 'high';
    preserveMetadata: boolean;
    optimizeImages: boolean;
  };
  
  audioSettings?: {
    bitrate: number;
    sampleRate: number;
    channels: 1 | 2;
    format: 'mp3' | 'wav' | 'ogg';
  };
  
  archiveSettings?: {
    compressionLevel: number; // 0-9
    preserveStructure: boolean;
    validateIntegrity: boolean;
  };
}
```

### Format-Specific UI Components

```
src/components/
├── CompressionSettings/
│   ├── CompressionSettings.tsx    # Enhanced main component
│   ├── ImageSettings.tsx         # Existing image controls
│   ├── VideoSettings.tsx         # Existing video controls
│   ├── DocumentSettings.tsx      # NEW: Document-specific controls
│   ├── AudioSettings.tsx         # NEW: Audio-specific controls
│   └── ArchiveSettings.tsx       # NEW: Archive-specific controls
├── FormatIndicator/              # NEW: Shows detected format info
└── CompatibilityWarning/         # NEW: Browser capability warnings
```

## Data Models

### Enhanced File Processing Model

```typescript
interface ProcessingFile {
  id: string;
  file: File;
  originalSize: number;
  
  // Enhanced format detection
  detectedFormat: FormatInfo;
  processingMethod: 'native' | 'library' | 'fallback';
  
  // Format-specific metadata
  metadata?: {
    // Image metadata
    dimensions?: { width: number; height: number };
    colorSpace?: string;
    
    // Audio metadata
    duration?: number;
    bitrate?: number;
    sampleRate?: number;
    
    // Document metadata
    pageCount?: number;
    hasEmbeddedMedia?: boolean;
    
    // Archive metadata
    entryCount?: number;
    compressionRatio?: number;
  };
  
  // Processing state
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  result?: CompressedFile;
  error?: ProcessingError;
}
```

### Compression Result Model

```typescript
interface CompressedFile {
  blob: Blob;
  filename: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
  method: string;
  
  // Format-specific results
  formatSpecificData?: {
    // Audio results
    finalBitrate?: number;
    qualityScore?: number;
    
    // Document results
    pagesProcessed?: number;
    imagesOptimized?: number;
    
    // Archive results
    entriesProcessed?: number;
    integrityVerified?: boolean;
  };
}
```

## Error Handling

### Format-Specific Error Types

```typescript
enum CompressionErrorType {
  // Existing errors
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  
  // New format-specific errors
  DOCUMENT_CORRUPTED = 'DOCUMENT_CORRUPTED',
  AUDIO_DECODE_FAILED = 'AUDIO_DECODE_FAILED',
  APK_SIGNATURE_INVALID = 'APK_SIGNATURE_INVALID',
  TIFF_LAYERS_UNSUPPORTED = 'TIFF_LAYERS_UNSUPPORTED',
  OFFICE_FORMAT_ENCRYPTED = 'OFFICE_FORMAT_ENCRYPTED'
}

interface ProcessingError {
  type: CompressionErrorType;
  message: string;
  formatSpecific?: boolean;
  recoverable?: boolean;
  suggestedAction?: string;
}
```

### Fallback Strategy

```typescript
class CompressionService {
  async compressFile(file: ProcessingFile, settings: CompressionSettings): Promise<CompressedFile> {
    const formatInfo = this.detectFormat(file);
    
    try {
      // Try primary method (native APIs or optimized libraries)
      return await this.tryPrimaryCompression(file, formatInfo, settings);
    } catch (primaryError) {
      console.warn(`Primary compression failed for ${formatInfo.format}:`, primaryError);
      
      try {
        // Try fallback method
        return await this.tryFallbackCompression(file, formatInfo, settings);
      } catch (fallbackError) {
        // Try basic compression as last resort
        return await this.tryBasicCompression(file, settings);
      }
    }
  }
}
```

## Testing Strategy

### Format-Specific Test Coverage

```typescript
// Test structure for each new format
describe('DocumentCompressor', () => {
  describe('PDF Compression', () => {
    it('should compress PDF while maintaining readability');
    it('should handle password-protected PDFs gracefully');
    it('should optimize embedded images in PDFs');
    it('should preserve PDF form fields');
  });
  
  describe('Office Document Compression', () => {
    it('should compress DOCX files without corruption');
    it('should handle embedded media in presentations');
    it('should preserve Excel formulas and formatting');
    it('should maintain ODT compatibility');
  });
});

describe('AudioCompressor', () => {
  it('should compress MP3 with configurable bitrate');
  it('should convert WAV to compressed formats');
  it('should maintain audio quality within acceptable limits');
  it('should handle large audio files with streaming');
});
```

### Browser Compatibility Testing

```typescript
// Enhanced compatibility testing matrix
const BROWSER_SUPPORT_MATRIX = {
  'PDF': {
    chrome: 'native',
    firefox: 'library',
    safari: 'library',
    edge: 'native'
  },
  'Audio': {
    chrome: 'native', // Web Audio API
    firefox: 'native',
    safari: 'limited', // Some restrictions
    edge: 'native'
  },
  'TIFF': {
    chrome: 'library',
    firefox: 'library',
    safari: 'library',
    edge: 'library'
  }
};
```

## Implementation Phases

### Phase 1: Foundation (TIFF Support)
- Extend existing image compression pipeline for TIFF
- Add TIFF format detection and validation
- Implement TIFF-to-other-format conversion
- Update UI to handle TIFF-specific options

### Phase 2: Audio Compression
- Implement Web Audio API-based compression
- Add audio format detection and metadata extraction
- Create audio-specific compression settings UI
- Add fallback audio compression libraries

### Phase 3: Document Compression
- Implement PDF compression using PDF-lib or similar
- Add Office document compression (ZIP-based approach)
- Create document-specific settings and validation
- Handle embedded media in documents

### Phase 4: Archive Compression
- Implement APK compression with structure preservation
- Add ZIP-based compression utilities
- Create archive integrity validation
- Add APK-specific warnings and safeguards

### Phase 5: Integration and Polish
- Integrate all formats into unified compression service
- Enhanced format detection and capability reporting
- Comprehensive error handling and user feedback
- Performance optimization and memory management

## Key Design Decisions

### 1. Maintain Existing Architecture
- Extend current service pattern rather than rebuilding
- Keep existing Canvas/MediaRecorder primary methods for images/videos
- Add new services following the same primary/fallback pattern

### 2. Library Selection Strategy
```typescript
// Prioritized library selection for each format
const COMPRESSION_LIBRARIES = {
  pdf: ['pdf-lib', 'PDFtk.js'], // Client-side PDF manipulation
  office: ['pizzip', 'docx'], // ZIP-based document handling  
  audio: ['lamejs', 'wav-encoder'], // Audio encoding libraries
  tiff: ['tiff.js', 'utif'], // TIFF parsing and conversion
  apk: ['jszip', 'node-stream-zip'] // ZIP manipulation for APK
};
```

### 3. Memory Management Strategy
- Implement streaming compression for large files
- Use Web Workers for CPU-intensive operations
- Add memory monitoring and cleanup for all new formats
- Implement chunked processing for documents and archives

### 4. Progressive Enhancement
- Detect browser capabilities for each format
- Gracefully degrade to available compression methods
- Provide clear feedback about compression limitations
- Maintain consistent UX across all supported formats

This design ensures that the multi-format compression feature integrates seamlessly with the existing application while providing robust support for the new file types through a combination of native browser APIs and carefully selected JavaScript libraries.