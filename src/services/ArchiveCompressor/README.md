# APK Archive Compression Service

## Overview

The APK Archive Compression Service provides client-side compression capabilities for Android APK files using the JSZip library. This service maintains APK structure integrity while applying compression to reduce file size.

## Features Implemented

### Core Functionality

- **APK Structure Manipulation**: Uses JSZip to read, modify, and repackage APK files
- **Signature Validation**: Detects and validates APK signatures (META-INF files)
- **Structure Preservation**: Maintains critical APK files and directory structure
- **Integrity Verification**: Validates APK structure before and after compression
- **Safety Warnings**: Provides detailed warnings about potential issues

### Compression Strategy

- **Selective Compression**: Applies compression based on file type and criticality
- **Critical File Protection**: Preserves AndroidManifest.xml, classes.dex, and resources.arsc
- **Smart File Handling**: Different compression levels for different file types
- **Fallback Methods**: Multiple compression approaches for different APK structures

### Safety Features

- **Signature Detection**: Identifies signed APKs and warns about potential signature invalidation
- **Structure Validation**: Ensures APK contains required files (AndroidManifest.xml, etc.)
- **Integrity Warnings**: Alerts users when compression might break functionality
- **Size Limits**: Warns about large files that may cause memory issues

## API Reference

### Main Methods

#### `compressAPK(file: File, settings: ArchiveSettings, onProgress?: (progress: number) => void): Promise<APKCompressionResult>`

Compresses an APK file with the specified settings.

**Parameters:**

- `file`: The APK file to compress
- `settings`: Compression settings including level, structure preservation, and integrity validation
- `onProgress`: Optional callback for progress updates (0-100)

**Returns:** Promise resolving to compression result with blob, metadata, and warnings

#### `validateAPKFile(file: File): Promise<{isValid: boolean, warnings: string[]}>`

Validates an APK file before compression.

**Parameters:**

- `file`: The APK file to validate

**Returns:** Promise resolving to validation result with status and warnings

#### `getSupportedFormats(): string[]`

Returns array of supported file formats.

**Returns:** `['apk']`

### Types

#### `ArchiveSettings`

```typescript
interface ArchiveSettings {
  compressionLevel: number; // 0-9
  preserveStructure: boolean;
  validateIntegrity: boolean;
}
```

#### `APKCompressionResult`

```typescript
interface APKCompressionResult {
  compressedBlob: Blob;
  metadata: FormatMetadata;
  warnings: string[];
}
```

## Integration

### CompressionService Integration

The APK compressor is integrated into the main CompressionService and automatically handles APK files when they are uploaded. The service:

1. Detects APK files using FormatDetector
2. Routes them to APKCompressor
3. Applies user-specified archive settings
4. Returns results with warnings and metadata

### Format Detection

APK files are detected by:

- File extension (.apk)
- MIME type (application/vnd.android.package-archive)
- ZIP file signature validation

## Usage Example

```typescript
import APKCompressor from './services/ArchiveCompressor/APKCompressor';

const settings = {
  compressionLevel: 6,
  preserveStructure: true,
  validateIntegrity: true,
};

const result = await APKCompressor.compressAPK(apkFile, settings, progress => {
  console.log(`Progress: ${progress}%`);
});

console.log(`Compressed ${result.metadata.entryCount} entries`);
console.log(`Warnings: ${result.warnings.join(', ')}`);
```

## Safety Considerations

### Signature Preservation

- Detects signed APKs and warns about potential signature invalidation
- Preserves META-INF directory structure
- Recommends re-signing after compression

### Structure Integrity

- Validates presence of critical Android files
- Maintains directory structure
- Warns about potential functionality issues

### Memory Management

- Processes files in chunks for large APKs
- Provides warnings for files over 100MB
- Cleans up temporary data after processing

## Testing

The service includes comprehensive tests:

- Unit tests for all core functionality
- Signature validation tests
- Structure preservation tests
- Error handling tests
- Edge case handling

## Limitations

1. **Signature Invalidation**: Compression may invalidate APK signatures
2. **Compatibility**: Some APK structures may not compress well
3. **Memory Usage**: Large APKs require significant memory for processing
4. **Browser Support**: Requires modern browsers with ZIP support

## Future Enhancements

1. **Advanced Compression**: Implement additional compression algorithms
2. **Signature Preservation**: Add signature re-application capabilities
3. **Streaming Processing**: Implement streaming for very large APKs
4. **Validation Enhancement**: Add more comprehensive APK validation
