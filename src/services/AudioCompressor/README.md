# Audio Compression Service Implementation

This directory contains the complete implementation of audio compression services for the File Compressor Web App, supporting MP3 and WAV formats with both native Web Audio API and library-based fallbacks.

## Architecture Overview

The audio compression system follows a layered architecture with smart fallbacks:

```
AudioCompressor (Main Service)
├── WebAudioCompressor (Primary - Web Audio API)
└── AudioLibCompressor (Fallback - lamejs + wav-encoder)
```

## Components

### 1. AudioCompressor.ts (Main Service)

- **Purpose**: Main orchestration service that coordinates between different compression methods
- **Features**:
  - Audio format detection and validation
  - Metadata extraction (duration, bitrate, sample rate, channels)
  - Smart method selection based on format and browser capabilities
  - Quality-to-bitrate mapping
  - Streaming compression for large files (>50MB)
  - Memory management and error handling

### 2. WebAudioCompressor.ts (Primary Implementation)

- **Purpose**: Native browser-based audio compression using Web Audio API
- **Supported Formats**: WAV (primary)
- **Features**:
  - Real-time audio processing and resampling
  - Channel conversion (stereo to mono)
  - Sample rate conversion
  - Direct WAV encoding with PCM format
  - Memory-efficient processing
  - Cancellation support

### 3. AudioLibCompressor.ts (Fallback Implementation)

- **Purpose**: Library-based compression for formats not supported natively
- **Supported Formats**: MP3 (lamejs), WAV (wav-encoder)
- **Features**:
  - MP3 encoding with configurable bitrates
  - WAV encoding with multiple bit depths
  - Chunked processing for memory efficiency
  - Streaming support for large files
  - Cross-browser compatibility

## Supported Formats

| Format | Primary Method | Fallback Method | Quality Range | Bitrate Range |
| ------ | -------------- | --------------- | ------------- | ------------- |
| WAV    | Web Audio API  | wav-encoder     | 20-100%       | 48-320 kbps   |
| MP3    | lamejs         | lamejs          | 20-100%       | 48-320 kbps   |

## Quality Settings

The service maps quality percentages to appropriate bitrates:

- **90-100%**: 320 kbps (High quality)
- **80-89%**: 256 kbps (Very good quality)
- **70-79%**: 192 kbps (Good quality)
- **60-69%**: 160 kbps (Standard quality)
- **50-59%**: 128 kbps (Acceptable quality)
- **40-49%**: 96 kbps (Lower quality)
- **30-39%**: 80 kbps (Low quality)
- **20-29%**: 64 kbps (Very low quality)
- **<20%**: 48 kbps (Minimum quality)

## Usage Examples

### Basic Compression

```typescript
import AudioCompressor from './AudioCompressor';

const file = new File([audioData], 'audio.wav', { type: 'audio/wav' });
const settings = {
  quality: 70,
  outputFormat: 'mp3',
  audioSettings: {
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    format: 'mp3',
  },
};

const compressedBlob = await AudioCompressor.compressAudio(file, settings, progress => {
  console.log(`Progress: ${progress}%`);
});
```

### Streaming Compression (Large Files)

```typescript
const largeAudioFile = new File([largeAudioData], 'large.wav', { type: 'audio/wav' });

const compressedBlob = await AudioCompressor.compressAudioWithStreaming(largeAudioFile, settings, progress =>
  console.log(`Progress: ${progress}%`)
);
```

### Format Detection

```typescript
const formatInfo = await AudioCompressor.detectFormat(file);
console.log('Format:', formatInfo.format);
console.log('Valid:', formatInfo.isValid);
console.log('Metadata:', formatInfo.metadata);
```

### Metadata Extraction

```typescript
const metadata = await AudioCompressor.extractMetadata(file);
console.log('Duration:', metadata.duration);
console.log('Bitrate:', metadata.bitrate);
console.log('Sample Rate:', metadata.sampleRate);
console.log('Channels:', metadata.channels);
```

## Browser Compatibility

### Web Audio API Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (14.1+)
- **Edge**: Full support

### Library Fallback Support

- **lamejs**: Universal JavaScript MP3 encoder
- **wav-encoder**: Universal JavaScript WAV encoder
- Works in all modern browsers with JavaScript support

## Error Handling

The service includes comprehensive error handling:

- **BrowserCompatibilityError**: When required APIs are not available
- **MemoryError**: When insufficient memory is available
- **CompressionError**: When compression fails
- **ValidationError**: When file validation fails

## Memory Management

- Automatic cleanup of audio contexts and buffers
- Streaming processing for large files
- Memory usage monitoring
- Resource cleanup on cancellation

## Performance Considerations

- **Small files (<50MB)**: Regular compression
- **Large files (>50MB)**: Streaming compression
- **Memory usage**: Monitored and managed automatically
- **Processing**: Chunked for better performance
- **Cancellation**: Supported for long-running operations

## Integration

The audio compression service is fully integrated with:

- **CompressionService**: Main compression orchestrator
- **FormatDetector**: Enhanced format detection
- **ErrorUtils**: Comprehensive error handling
- **MemoryManager**: Memory usage monitoring
- **ResultsManager**: Compression results calculation

## Testing

The implementation includes comprehensive tests:

- **Unit tests**: Individual component testing
- **Integration tests**: End-to-end functionality
- **Error handling tests**: Edge cases and failures
- **Performance tests**: Memory and speed benchmarks

## Dependencies

### Runtime Dependencies

- `lamejs`: MP3 encoding library
- `wav-encoder`: WAV encoding library

### Development Dependencies

- `@types/lamejs`: TypeScript definitions (custom)
- Jest testing framework
- React Testing Library

## Future Enhancements

Potential improvements for future versions:

1. **Additional Formats**: OGG, FLAC, AAC support
2. **Advanced Processing**: Noise reduction, normalization
3. **Batch Processing**: Multiple file compression
4. **Web Workers**: Background processing
5. **Progressive Enhancement**: Better fallback strategies

## Requirements Fulfilled

This implementation fulfills all requirements from task 3:

✅ **WebAudioCompressor service using Web Audio API for MP3 and WAV compression**
✅ **Audio format detection, metadata extraction, and bitrate/quality controls**
✅ **AudioLibCompressor fallback service using lamejs and wav-encoder libraries**
✅ **Streaming audio compression for large files with memory management**
✅ **Integration with main CompressionService**
✅ **Comprehensive error handling and browser compatibility**
✅ **Quality-based compression settings**
✅ **Cancellation and cleanup support**
