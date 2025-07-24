# File Compressor

A comprehensive client-side file compression web application that processes multiple file formats directly in the browser using native APIs and smart fallbacks. Complete privacy with zero server uploads.

## 🚀 Key Features

### Multi-Format Support
- **Images** - JPEG, PNG, WebP, GIF, BMP, TIFF compression
- **Videos** - MP4, WebM, AVI, MOV optimization  
- **Audio** - MP3, WAV, OGG compression and format conversion
- **Documents** - PDF optimization, Office files (DOCX, XLSX, PPTX)
- **Archives** - APK analysis and optimization

### Advanced Compression Technology
- **Canvas-based Image Processing** - HTML5 Canvas API for predictable results
- **MediaRecorder Video Compression** - Native browser video processing
- **Web Audio API** - Real-time audio processing and encoding
- **Smart Fallbacks** - Library-based compression when native methods unavailable
- **Memory Management** - Efficient processing of large files with cleanup

### User Experience
- **100% Client-Side** - All processing happens locally in your browser
- **Light/Dark Theme** - System preference detection with manual toggle
- **Drag & Drop Interface** - Intuitive file upload with progress indicators
- **Batch Processing** - Handle multiple files simultaneously
- **Real-time Preview** - See compression results before download

## 🛠️ Quick Start

```bash
# Install dependencies
npm install

# Development (recommended - includes SharedArrayBuffer headers for FFmpeg)
node dev-server.js          # Proxy server with proper headers
open http://localhost:3001   # Main app with full feature support

# Alternative development
npm start                   # Standard React dev server (limited video support)
open http://localhost:3000   # Basic features only

# Production
npm run build              # Build for production
npm run serve              # Serve production build locally

# Code Quality
npm test                   # Run test suite
npm run lint               # Check code quality
npm run format             # Format code with Prettier
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d

# Check status
docker ps
docker-compose logs -f
```

## 🔧 How It Works

### Image Compression
1. **Primary**: HTML5 Canvas API
   - Load image into canvas element
   - Resize based on quality (60% = 85% dimensions)
   - Export with controlled quality and format conversion
2. **Fallback**: browser-image-compression library for unsupported formats

### Video Compression  
1. **Primary**: MediaRecorder API + Canvas
   - Extract frames and re-encode with Canvas
   - Adjust bitrate based on quality (60% = 1.5 Mbps)
   - Output optimized MP4/WebM
2. **Fallback**: FFmpeg.js WebAssembly for complex operations

### Audio Processing
1. **Primary**: Web Audio API
   - Decode audio using AudioContext
   - Process and re-encode with lamejs (MP3) or wav-encoder
   - Real-time format conversion and compression
2. **Fallback**: File-based processing for unsupported formats

### Document Optimization
1. **PDF**: pdf-lib for structure optimization and image compression
2. **Office Files**: Extract, compress media assets, repackage with JSZip
3. **Archives**: Analyze APK structure and optimize resources

## 🌐 Browser Support

### Native API Support
- **Canvas API** - All modern browsers (Chrome, Firefox, Safari, Edge)
- **MediaRecorder** - Chrome 47+, Firefox 25+, Safari 14.1+
- **Web Audio API** - Chrome 14+, Firefox 25+, Safari 6+
- **File API** - All modern browsers

### Fallback Libraries
- **FFmpeg.js** - Requires SharedArrayBuffer (Chrome 68+, Firefox 79+)
- **browser-image-compression** - Universal browser support
- **pdf-lib** - All modern browsers with ES6 support

### Recommended Setup
- **Development**: Use `node dev-server.js` for full feature support
- **Production**: Deploy with proper CORS headers for SharedArrayBuffer

## 🏗️ Architecture

```
src/
├── components/                    # React UI components
│   ├── Header/                   # App header + theme toggle
│   ├── ImageCompressorDemo/      # Main compression interface
│   ├── FileUpload/              # Drag-drop file selection
│   ├── CompressionSettings/     # Quality controls
│   ├── ProcessingQueue/         # Progress indicators
│   └── ResultsPanel/           # Download + statistics
├── services/                     # Compression engines
│   ├── ImageCompressor/
│   │   ├── CanvasImageCompressor.ts   # Primary (Canvas API)
│   │   └── ImageCompressor.ts         # Fallback (library)
│   ├── VideoCompressor/
│   │   ├── WebCodecsVideoCompressor.ts # Primary (MediaRecorder)
│   │   ├── OptimizedVideoCompressor.ts # Enhanced FFmpeg
│   │   └── VideoCompressor.ts         # Fallback (FFmpeg)
│   ├── AudioCompressor/
│   │   ├── WebAudioCompressor.ts      # Primary (Web Audio API)
│   │   └── AudioLibCompressor.ts      # Fallback (libraries)
│   ├── DocumentCompressor/
│   │   ├── PDFCompressor.ts           # PDF optimization
│   │   └── OfficeCompressor.ts        # Office file processing
│   └── ArchiveCompressor/
│       └── APKCompressor.ts           # APK analysis
├── context/                      # React context providers
│   ├── ThemeContext.tsx         # Theme management
│   └── AppContext.tsx           # Global state
├── utils/                       # Utility functions
│   ├── memory/                  # Memory management
│   ├── security/               # Secure processing
│   └── errors/                 # Error handling
└── tests/                       # Test suites
    ├── e2e/                     # End-to-end tests
    ├── performance/             # Performance benchmarks
    └── browser-compatibility/   # Cross-browser testing
```

## 📊 Current Status

- ✅ **Production Ready** - Fully functional multi-format compression
- ✅ **Comprehensive Testing** - Unit, integration, and E2E test coverage
- ✅ **Cross-Browser Support** - Tested on Chrome, Firefox, Safari, Edge
- ✅ **Docker Ready** - Container deployment with nginx optimization
- ✅ **Memory Efficient** - Proper cleanup and resource management
- ✅ **Privacy Focused** - 100% client-side processing, no data uploads
- ✅ **Accessible** - WCAG AA compliance with keyboard navigation
- ✅ **Theme Support** - Light/dark mode with system preference detection

## 🚀 Deployment

### Local Development
```bash
git clone https://github.com/yourusername/file-compressor-app.git
cd file-compressor-app
npm install
node dev-server.js
```

### Production Deployment
```bash
# Docker deployment
docker-compose up -d

# Manual deployment
npm run build
npm run serve
```

### Server Requirements
- **Headers**: `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` for FFmpeg support
- **HTTPS**: Required for some Web APIs in production
- **Memory**: 2GB+ recommended for large file processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.