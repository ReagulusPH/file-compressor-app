/**
 * Enhanced mock for @ffmpeg/ffmpeg to handle video compression tests
 */

const mockFS = {
  writeFile: jest.fn(),
  readFile: jest.fn(() => {
    // Return a proper Uint8Array with buffer property
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    return data;
  }),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  rmdir: jest.fn(),
  readdir: jest.fn(() => []),
  stat: jest.fn(() => ({ size: 1024 })),
};

const createMockFFmpeg = () => {
  console.log('createMockFFmpeg called');
  const mockInstance = {
    load: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockImplementation((...args) => {
      // Simulate progress updates
      if (mockInstance.progressCallback) {
        setTimeout(() => mockInstance.progressCallback({ ratio: 0.5 }), 10);
        setTimeout(() => mockInstance.progressCallback({ ratio: 1.0 }), 20);
      }
      return Promise.resolve();
    }),
    FS: jest.fn((operation, ...args) => {
      // Handle FS operations properly
      if (operation === 'writeFile') return mockFS.writeFile(...args);
      if (operation === 'readFile') return mockFS.readFile(...args);
      if (operation === 'unlink') return mockFS.unlink(...args);
      return mockFS[operation];
    }),
    isLoaded: jest.fn().mockReturnValue(true),
    setProgress: jest.fn(callback => {
      mockInstance.progressCallback = callback;
    }),
    setLogger: jest.fn(),
    exit: jest.fn(),
    progressCallback: null,
  };
  console.log('createMockFFmpeg returning:', mockInstance);
  return mockInstance;
};

const mockFFmpeg = createMockFFmpeg();

const createFFmpeg = jest.fn(() => {
  console.log('createFFmpeg called, returning mock');
  return createMockFFmpeg();
});
const fetchFile = jest.fn().mockImplementation(async (input) => {
  // fetchFile should return a Uint8Array that can be used by FFmpeg
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  return new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
});

// Export both CommonJS and ES module formats
module.exports = {
  createFFmpeg,
  fetchFile,
  mockFFmpeg,
  mockFS,
  createMockFFmpeg,
};

// ES module exports for modern imports
module.exports.default = {
  createFFmpeg,
  fetchFile,
};
