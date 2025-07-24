/**
 * Tests for ImageCompressor service
 */

// Mock browser-image-compression library BEFORE importing ImageCompressor
jest.mock('browser-image-compression');

// Setup comprehensive canvas mocks
import { setupCanvasMocks, createMockCanvas, createMockImage } from '../../mocks/canvasMock';

// Setup global canvas mocks first
setupCanvasMocks();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock createImageBitmap
const mockImageBitmap = {
  width: 100,
  height: 100,
  close: jest.fn(),
};

global.createImageBitmap = jest.fn(() => Promise.resolve(mockImageBitmap));

import { ImageCompressor } from './ImageCompressor';
import imageCompression from 'browser-image-compression';

// Type the mocked function
const mockedImageCompression = imageCompression as jest.MockedFunction<typeof imageCompression>;

describe('ImageCompressor', () => {
  
  let imageCompressor: ImageCompressor;
  let mockArrayBuffer: ArrayBuffer;

  beforeEach(() => {
    imageCompressor = new ImageCompressor();

    // Create a mock JPEG ArrayBuffer with signature
    const jpegSignature = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    ]);
    mockArrayBuffer = jpegSignature.buffer;

    // Reset mocks
    jest.clearAllMocks();

    // Reset createImageBitmap mock
    (global.createImageBitmap as jest.Mock).mockResolvedValue(mockImageBitmap);

    // Setup default mock implementation for imageCompression
    mockedImageCompression.mockImplementation(() => {
      return Promise.resolve(new File(['compressed'], 'compressed-image.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }));
    });
  });

  describe('compressImage', () => {
    it('should compress an image with default settings', async () => {
      const settings = {
        quality: 75,
        outputFormat: 'image/jpeg',
      };

      const result = await imageCompressor.compressImage(mockArrayBuffer, settings);

      expect(result).toBeDefined();
      expect(imageCompression).toHaveBeenCalled();

      // Check that imageCompression was called
      expect(imageCompression).toHaveBeenCalled();
    });

    it('should handle custom resolution settings', async () => {
      const settings = {
        quality: 75,
        outputFormat: 'image/jpeg',
        resolution: {
          width: 800,
          height: 600,
        },
      };

      await imageCompressor.compressImage(mockArrayBuffer, settings);

      // Check that imageCompression was called
      expect(imageCompression).toHaveBeenCalled();
    });

    it('should call convertFormat when output format differs from original', async () => {
      const settings = {
        quality: 75,
        outputFormat: 'image/png',
      };

      // Spy on convertFormat method
      const convertFormatSpy = jest
        .spyOn(imageCompressor, 'convertFormat')
        .mockResolvedValue(new Blob(['mocked-converted-data'], { type: 'image/png' }));

      await imageCompressor.compressImage(mockArrayBuffer, settings);

      expect(convertFormatSpy).toHaveBeenCalled();
      expect(convertFormatSpy.mock.calls[0][1]).toBe('image/png');
    });

    it('should handle progress updates', async () => {
      const settings = {
        quality: 75,
        outputFormat: 'image/jpeg',
      };

      const onProgress = jest.fn();

      await imageCompressor.compressImage(mockArrayBuffer, settings, onProgress);

      // Check that onProgress was passed to the compression options
      const callOptions = mockedImageCompression.mock.calls[0][1];
      expect(callOptions.onProgress).toBe(onProgress);
    });

    it('should throw an error when compression fails', async () => {
      const settings = {
        quality: 75,
        outputFormat: 'image/jpeg',
      };

      // Mock imageCompression to throw an error
      mockedImageCompression.mockRejectedValueOnce(new Error('Compression failed'));

      await expect(imageCompressor.compressImage(mockArrayBuffer, settings)).rejects.toThrow(
        'Failed to compress image: Compression failed'
      );
    });
  });

  describe('convertFormat', () => {
    let originalCreateElement: typeof document.createElement;
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;
    let mockImage: HTMLImageElement;

    beforeEach(() => {
      // Mock canvas and context
      mockContext = {
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D;

      mockCanvas = {
        getContext: jest.fn().mockReturnValue(mockContext),
        toBlob: jest.fn().mockImplementation(callback => {
          callback(new Blob(['mocked-blob-data'], { type: 'image/png' }));
        }),
        width: 0,
        height: 0,
      } as unknown as HTMLCanvasElement;

      // Mock Image
      mockImage = {
        onload: null,
        onerror: null,
        width: 100,
        height: 100,
        src: '',
      } as unknown as HTMLImageElement;

      // Mock document.createElement
      originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation(tagName => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Mock Image constructor
      global.Image = jest.fn().mockImplementation(() => mockImage);

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn().mockReturnValue('mocked-url');
    });

    afterEach(() => {
      // Restore original document.createElement
      document.createElement = originalCreateElement;
    });

    it('should convert image format correctly', async () => {
      const blob = new Blob(['test-data'], { type: 'image/jpeg' });
      const format = 'image/png';
      const quality = 0.8;

      const convertPromise = imageCompressor.convertFormat(blob, format, quality);

      // Simulate image load
      if (mockImage.onload) {
        mockImage.onload({} as Event);
      }

      const result = await convertPromise;

      expect(result).toBeInstanceOf(Blob);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), format, quality);
    });

    it('should handle errors when loading image fails', async () => {
      const blob = new Blob(['test-data'], { type: 'image/jpeg' });

      const convertPromise = imageCompressor.convertFormat(blob, 'image/png', 0.8);

      // Simulate image load error
      if (mockImage.onerror) {
        mockImage.onerror({} as Event);
      }

      await expect(convertPromise).rejects.toThrow('Failed to load image for format conversion');
    });

    it('should handle errors when canvas context is not available', async () => {
      const blob = new Blob(['test-data'], { type: 'image/jpeg' });

      // Mock getContext to return null
      (mockCanvas.getContext as jest.Mock).mockReturnValueOnce(null);

      const convertPromise = imageCompressor.convertFormat(blob, 'image/png', 0.8);

      // Simulate image load
      if (mockImage.onload) {
        mockImage.onload({} as Event);
      }

      await expect(convertPromise).rejects.toThrow('Failed to get canvas context');
    });

    it('should handle errors when toBlob returns null', async () => {
      const blob = new Blob(['test-data'], { type: 'image/jpeg' });

      // Mock toBlob to call callback with null
      (mockCanvas.toBlob as jest.Mock).mockImplementationOnce(callback => {
        callback(null);
      });

      const convertPromise = imageCompressor.convertFormat(blob, 'image/png', 0.8);

      // Simulate image load
      if (mockImage.onload) {
        mockImage.onload({} as Event);
      }

      await expect(convertPromise).rejects.toThrow('Failed to convert image format');
    });
  });
});
