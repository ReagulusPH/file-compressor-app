james# Technology Stack

## Core Technologies
- **React 19.1.0** + **TypeScript 4.9.5** + **Create React App 5.0.1**
- **Canvas API** - Primary image compression (native browser API)
- **MediaRecorder API** - Primary video compression (Canvas + MediaRecorder)
- **browser-image-compression** - Image fallback library
- **@ffmpeg/ffmpeg** - Video fallback library (WebAssembly)

## Development Setup
```bash
npm start          # React dev server (localhost:3000)
node dev-server.js # Proxy with SharedArrayBuffer headers (localhost:3001) ← USE THIS
npm test           # Run tests
npm run build      # Production build
npm run lint       # Check code quality
```

## Architecture Principles
1. **Native APIs First**: Canvas/MediaRecorder for reliability
2. **Smart Fallbacks**: Libraries if native methods fail
3. **Client-side Only**: 100% privacy, no server uploads
4. **Memory Efficient**: Proper cleanup and resource management
5. **Theme Support**: Light/dark mode with CSS variables

## Key Implementation Details

### Image Compression (Canvas API)
```typescript
// 60% quality = 85% dimensions + 65% canvas quality
const scaleFactor = calculateScaleFactor(quality);
canvas.toBlob(callback, format, quality/100);
```

### Video Compression (MediaRecorder API)  
```typescript
// 60% quality = 70% dimensions + 1.5 Mbps bitrate
const stream = canvas.captureStream(30);
const mediaRecorder = new MediaRecorder(stream, { videoBitsPerSecond: bitrate });
```

### Smart Fallback Pattern
```typescript
try {
  const result = await CanvasImageCompressor.compressImage(file, settings);
} catch (error) {
  const result = await ImageCompressor.compressImage(fileBuffer, settings);
}
```

## Browser Compatibility
- **Primary**: Canvas API (all modern), MediaRecorder (Chrome, Firefox, Safari 14.1+)
- **Fallback**: browser-image-compression, FFmpeg.js with SharedArrayBuffer