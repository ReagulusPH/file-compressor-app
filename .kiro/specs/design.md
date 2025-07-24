# File Compressor - Design Specification

## Architecture Overview

### Core Technology Stack
- **React 19.1.0** + **TypeScript 4.9.5** + **Create React App 5.0.1**
- **Native Browser APIs**: Canvas API (images), MediaRecorder API (videos)
- **Fallback Libraries**: browser-image-compression, @ffmpeg/ffmpeg
- **Theme System**: CSS variables with React Context

### Compression Strategy
```
PRIMARY METHODS (Native APIs):
├── Images: Canvas API → resize + toBlob() with quality control
└── Videos: Canvas + MediaRecorder → frame capture + bitrate control

FALLBACK METHODS (Libraries):
├── Images: browser-image-compression library
└── Videos: FFmpeg.js with SharedArrayBuffer
```

## Component Architecture

### Project Structure
```
src/
├── components/
│   ├── Header/                    # App header + theme toggle
│   ├── ImageCompressorDemo/       # Main compression interface
│   ├── FileUpload/               # Drag-drop file selection
│   ├── CompressionSettings/      # Quality controls
│   ├── ProcessingQueue/          # Progress indicators
│   ├── ResultsPanel/            # Download + statistics
│   └── ThemeToggle/             # Light/dark mode
├── services/
│   ├── CompressionService.ts           # Main orchestration
│   ├── ImageCompressor/
│   │   ├── CanvasImageCompressor.ts   # PRIMARY (Canvas API)
│   │   └── ImageCompressor.ts         # Fallback (library)
│   ├── VideoCompressor/
│   │   ├── WebCodecsVideoCompressor.ts # PRIMARY (MediaRecorder)
│   │   └── VideoCompressor.ts         # Fallback (FFmpeg)
│   └── ResultsManager/           # Results calculation
├── context/
│   ├── ThemeContext.tsx         # Theme management
│   └── AppContext.tsx           # Global state
└── utils/
    ├── memory/                  # Memory management
    ├── security/               # Secure processing
    └── errors/                 # Error handling
```

## Compression Implementation

### Image Compression (Canvas API)
```typescript
// Quality mapping: 60% input = 85% dimensions + 65% canvas quality
const scaleFactor = calculateScaleFactor(quality); // 60% → 0.85
const canvasQuality = quality / 100; // 60% → 0.65

canvas.width = Math.round(img.width * scaleFactor);
canvas.height = Math.round(img.height * scaleFactor);
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
canvas.toBlob(callback, outputFormat, canvasQuality);
```

### Video Compression (MediaRecorder API)
```typescript
// Quality mapping: 60% input = 70% dimensions + 1.5 Mbps bitrate
const scaleFactor = getScaleFactor(quality); // 60% → 0.7
const bitrate = getBitrate(quality); // 60% → 1500000

const stream = canvas.captureStream(30);
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: bitrate
});
```

### Smart Fallback System
```typescript
try {
  // Try native method first
  const result = await CanvasImageCompressor.compressImage(file, settings);
} catch (error) {
  console.warn('Canvas failed, trying library fallback:', error);
  // Fall back to library method
  const result = await ImageCompressor.compressImage(fileBuffer, settings);
}
```

## UI/UX Design

### Theme System
- **CSS Variables**: `--color-primary`, `--color-background`, etc.
- **Theme Detection**: System preference + localStorage persistence
- **Toggle Component**: Accessible theme switcher in header
- **All Components**: Support both light and dark modes

### User Flow
1. **Upload**: Drag-drop or click to select files
2. **Configure**: Choose compression type and quality
3. **Process**: Real-time progress with cancellation
4. **Download**: Individual or batch download with statistics

### Compression Settings
- **Default Mode**: 60% quality (balanced compression)
- **Custom Mode**: Quality slider 0-100% with real-time preview
- **Output Formats**: JPEG/PNG/WebP (images), MP4/WebM (videos)

## Development Setup

### Commands
```bash
npm start          # React dev server (port 3000)
node dev-server.js # Proxy with headers (port 3001) ← USE THIS
npm test           # Run tests
npm run build      # Production build
```

### Browser Compatibility
- **Primary Methods**: Canvas API (all modern), MediaRecorder (Chrome, Firefox, Safari 14.1+)
- **Fallback Methods**: browser-image-compression, FFmpeg.js with SharedArrayBuffer

## Key Design Principles

1. **Native APIs First**: More reliable than external libraries
2. **Smart Fallbacks**: Ensure compatibility across browsers
3. **Client-side Only**: Complete privacy with zero server uploads
4. **Memory Efficient**: Proper cleanup and resource management
5. **Progressive Enhancement**: Works across different browser capabilities