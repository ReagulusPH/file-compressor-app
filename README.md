# File Compressor

A client-side file compression web application that compresses images and videos directly in the browser using native browser APIs. Complete privacy with zero server uploads.

## Key Features

- **Canvas-based Image Compression** - HTML5 Canvas API for predictable results
- **MediaRecorder Video Compression** - Native browser video processing
- **Smart Fallbacks** - Library-based compression if native methods fail
- **100% Client-Side** - All processing happens locally in your browser
- **Light/Dark Theme** - System preference detection with manual toggle
- **Drag & Drop Interface** - Intuitive file upload with progress indicators

## Quick Start

```bash
# Install dependencies
npm install

# Start development (use port 3001 for video compression support)
node dev-server.js          # Proxy with SharedArrayBuffer headers
open http://localhost:3001   # Main app

# Testing
npm test                    # Run test suite
npm run lint               # Check code quality
npm run build              # Production build
```

## How It Works

### Image Compression
1. Load image into HTML5 Canvas
2. Resize based on quality setting (60% = 85% dimensions)
3. Export as JPEG/PNG/WebP with controlled quality
4. Fallback to browser-image-compression library if needed

### Video Compression  
1. Capture video frames using Canvas + MediaRecorder API
2. Adjust bitrate based on quality (60% = 1.5 Mbps)
3. Output MP4/WebM with codec optimization
4. Fallback to FFmpeg.js if MediaRecorder unavailable

## Browser Support

- **Canvas API** - All modern browsers
- **MediaRecorder** - Chrome, Firefox, Safari 14.1+
- **Fallbacks** - browser-image-compression, FFmpeg.js with SharedArrayBuffer

## Architecture

```
src/
├── components/           # React components
├── services/            # Compression services
│   ├── ImageCompressor/
│   │   ├── CanvasImageCompressor.ts    # Primary (Canvas API)
│   │   └── ImageCompressor.ts          # Fallback (library)
│   └── VideoCompressor/
│       ├── WebCodecsVideoCompressor.ts # Primary (MediaRecorder)
│       └── VideoCompressor.ts          # Fallback (FFmpeg)
├── context/             # React context (Theme, App state)
└── utils/              # Utilities (memory, security, errors)
```

## Current Status

- ✅ **Production Ready** - Fully functional with comprehensive testing
- ✅ **97% Test Coverage** - Comprehensive unit, integration, and E2E tests
- ✅ **Cross-Browser** - Tested on Chrome, Firefox, Safari, Edge
- ✅ **Accessible** - WCAG AA compliance verified