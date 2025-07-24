# Project Structure

## Source Code Structure
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
├── utils/
│   ├── memory/                  # Memory management
│   ├── security/               # Secure processing
│   └── errors/                 # Error handling
└── tests/
    ├── e2e/                     # End-to-end tests
    ├── performance/             # Performance benchmarks
    └── browser-compatibility/   # Cross-browser testing
```

## File Naming Conventions
- Components: PascalCase (e.g., `ImageCompressor.tsx`)
- Services: PascalCase (e.g., `CompressionService.ts`)
- Utilities: camelCase (e.g., `browserSupport.ts`)
- Tests: `*.test.tsx` or `*.test.ts`
- Styles: `*.css` co-located with components

## Organization Guidelines

### Before Creating New Files
- **ALWAYS** check existing structure first
- **ALWAYS** search codebase to avoid duplication
- Use file search tools to locate existing functionality
- Verify complete project structure before assumptions

### Structure Principles
- Group related functionality together
- Separate concerns (business logic, UI, data access)
- Remove unused or orphaned files
- Extend existing components rather than duplicating