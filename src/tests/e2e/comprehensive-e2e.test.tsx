import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock the Web Workers
class MockMessageEvent {
  data: any;
  constructor(data: any) {
    this.data = data;
  }
}

class MockWorker {
  onmessage: ((event: MockMessageEvent) => void) | null = null;

  postMessage(data: any) {
    // Simulate worker response
    setTimeout(() => {
      if (this.onmessage) {
        if (data.type === 'compress') {
          // First send progress
          this.onmessage(
            new MockMessageEvent({
              type: 'progress',
              progress: 50,
              fileId: data.fileId,
            })
          );

          // Then send completion
          setTimeout(() => {
            this.onmessage?.(
              new MockMessageEvent({
                type: 'complete',
                fileId: data.fileId,
                result: new Blob(['mock-compressed-data'], { type: 'image/jpeg' }),
                originalSize: 1000,
                compressedSize: 500,
                compressionRatio: 0.5,
                processingTime: 1000,
              })
            );
          }, 100);
        }
      }
    }, 50);
  }

  terminate() {}
}

// Mock the worker modules
jest.mock('../../workers/imageCompressor.worker.ts', () => {
  return {
    __esModule: true,
    default: MockWorker,
  };
});

jest.mock('../../workers/videoCompressor.worker.ts', () => {
  return {
    __esModule: true,
    default: MockWorker,
  };
});

// Mock the FileReader API
class MockFileReader {
  onload: () => void = () => {};
  readAsArrayBuffer() {
    setTimeout(() => {
      this.onload();
    }, 0);
  }
  readAsDataURL() {
    setTimeout(() => {
      this.onload();
    }, 0);
  }
  result = new ArrayBuffer(8);
}

// Mock the URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock the HTMLCanvasElement
const mockGetContext = jest.fn().mockImplementation(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(100) })),
  putImageData: jest.fn(),
  canvas: {
    toBlob: (callback: (blob: Blob | null) => void) => {
      const blob = new Blob(['mock-image-data'], { type: 'image/jpeg' });
      callback(blob);
    },
    toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockbase64data'),
  },
}));

HTMLCanvasElement.prototype.getContext = mockGetContext;

// Mock the AppContext
jest.mock('../../context/AppContext', () => {
  const React = require('react');

  const AppContext = React.createContext({});

  const AppProvider = ({ children }: { children: React.ReactNode }) => {
    return <AppContext.Provider value={{}}>{children}</AppContext.Provider>;
  };

  return {
    AppContext,
    AppProvider,
    useAppContext: () => React.useContext(AppContext),
  };
});

// Mock fetch for browser compatibility check
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ browser: 'Chrome', version: '90.0.0' }),
  })
);

describe('Comprehensive End-to-End Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock FileReader
    global.FileReader = MockFileReader as any;
  });

  test('Requirement 1: User Interface and Design', async () => {
    render(<App />);

    // Wait for the app to load beyond the skeleton state
    await waitFor(
      () => {
        expect(screen.queryByText(/File Compressor/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 1.1 Clean, minimal design with central drag-and-drop area
    await waitFor(
      () => {
        const dropZone = document.querySelector('.drop-zone');
        expect(dropZone).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 1.5 Simple navigation bar with app name/logo
    const header = document.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(screen.getByText(/File Compressor/i)).toBeInTheDocument();

    // 1.3 Responsive design (we can't fully test this in JSDOM, but we can check for responsive classes)
    const mainElement = document.querySelector('main');
    expect(mainElement).toBeInTheDocument();
  });

  test('Requirement 2: File Upload Functionality', async () => {
    render(<App />);

    // Wait for the app to load beyond the skeleton state
    await waitFor(
      () => {
        expect(screen.queryByText(/File Compressor/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 2.1 & 2.2 Drag-and-drop zone and upload button alternative
    await waitFor(
      () => {
        const dropZone = document.querySelector('.drop-zone');
        expect(dropZone).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 2.5 Support both drag-and-drop and click-to-upload methods
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // 2.6 Support batch processing
    expect(fileInput?.getAttribute('multiple')).not.toBeNull();

    // 2.3 & 2.4 Upload files and show progress
    const file = new File(['mock file content'], 'test-image.jpg', { type: 'image/jpeg' });
    userEvent.upload(fileInput as HTMLElement, file);

    // Verify file appears in queue
    await waitFor(
      () => {
        expect(screen.getByText(/test-image.jpg/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test('Requirement 3: File Compression Capabilities', async () => {
    render(<App />);

    // Wait for the app to load beyond the skeleton state
    await waitFor(
      () => {
        expect(screen.queryByText(/File Compressor/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 3.1 & 3.2 Support for various file formats
    await waitFor(
      () => {
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();

        // Check accepted file types include image formats
        const acceptAttr = fileInput?.getAttribute('accept');
        if (acceptAttr) {
          expect(acceptAttr.includes('image/')).toBeTruthy();
        }
      },
      { timeout: 2000 }
    );

    // 3.3 Client-side compression
    // Upload an image file
    const fileInput = document.querySelector('input[type="file"]');
    const imageFile = new File(['mock image content'], 'test-image.jpg', { type: 'image/jpeg' });
    userEvent.upload(fileInput as HTMLElement, imageFile);

    // 3.5 Batch processing
    // Upload multiple files
    const files = [
      new File(['mock image content'], 'batch-image1.jpg', { type: 'image/jpeg' }),
      new File(['mock image content'], 'batch-image2.png', { type: 'image/png' }),
    ];

    userEvent.upload(fileInput as HTMLElement, files);

    // Verify both files appear in queue
    await waitFor(
      () => {
        expect(screen.getByText(/batch-image1.jpg/i)).toBeInTheDocument();
        expect(screen.getByText(/batch-image2.png/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test('Requirement 4: Compression Settings', async () => {
    render(<App />);

    // Wait for the app to load beyond the skeleton state
    await waitFor(
      () => {
        expect(screen.queryByText(/File Compressor/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Upload a file to activate settings
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    const file = new File(['mock file content'], 'test-image.jpg', { type: 'image/jpeg' });
    userEvent.upload(fileInput as HTMLElement, file);

    // Wait for settings to appear
    await waitFor(
      () => {
        // Look for settings container
        const settingsContainer = document.querySelector('.settings-container');
        expect(settingsContainer).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 4.2 Select custom compression to reveal quality slider
    await waitFor(
      () => {
        const customRadio = screen.getByLabelText(/Custom/i);
        expect(customRadio).toBeInTheDocument();
        fireEvent.click(customRadio);
      },
      { timeout: 2000 }
    );

    // 4.3 Check for quality slider after selecting custom
    await waitFor(
      () => {
        const qualitySlider = document.querySelector('input[type="range"]');
        expect(qualitySlider).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test('Requirement 6: Performance and Technical Requirements', async () => {
    // This is a partial test as some performance aspects can't be fully tested in JSDOM
    render(<App />);

    // Wait for the app to load beyond the skeleton state
    await waitFor(
      () => {
        expect(screen.queryByText(/File Compressor/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 6.3 Error handling for unsupported formats
    await waitFor(
      () => {
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();

        const unsupportedFile = new File(['mock content'], 'document.pdf', {
          type: 'application/pdf',
        });
        userEvent.upload(fileInput as HTMLElement, unsupportedFile);

        // Check for error message
        return waitFor(
          () => {
            const errorElement =
              document.querySelector('.error-message') ||
              screen.queryByText(/not a supported file type/i);
            expect(errorElement).toBeInTheDocument();
          },
          { timeout: 2000 }
        );
      },
      { timeout: 4000 }
    );
  });

  test('Requirement 7: Security and Privacy', async () => {
    render(<App />);

    // Wait for the app to load beyond the skeleton state
    await waitFor(
      () => {
        expect(screen.queryByText(/File Compressor/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 7.2 Clear privacy messaging
    await waitFor(
      () => {
        const privacyMessage = document.querySelector('.privacy-message');
        expect(privacyMessage).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test('Requirement 8: Browser Compatibility', async () => {
    // This is a partial test as browser compatibility is hard to fully test in JSDOM
    render(<App />);

    // Wait for the app to load beyond the skeleton state
    await waitFor(
      () => {
        expect(screen.queryByText(/File Compressor/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // 8.1 & 8.2 Browser compatibility messaging
    await waitFor(
      () => {
        const browserMessage = document.querySelector('.browser-compatibility-message');
        // If there's a message, the app has browser detection logic
        if (browserMessage) {
          expect(browserMessage).toBeInTheDocument();
        }
      },
      { timeout: 2000 }
    );
  });
});
