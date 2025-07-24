/**
 * Tests for enhanced FileHandler service
 */

import FileHandler from '../FileHandler/FileHandler';

// Mock FormatDetector
jest.mock('../FormatDetector', () => ({
  __esModule: true,
  default: {
    detectFormat: jest.fn(),
  },
}));

import FormatDetector from '../FormatDetector';

describe('FileHandler', () => {
  const mockFormatDetector = FormatDetector as jest.Mocked<typeof FormatDetector>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate supported image files', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      mockFormatDetector.detectFormat.mockResolvedValue({
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      });

      const result = await FileHandler.validateFile(mockFile);
      
      expect(result.valid).toBe(true);
      expect(result.formatInfo).toBeDefined();
      expect(result.formatInfo?.type).toBe('image');
    });

    it('should validate supported document files', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      mockFormatDetector.detectFormat.mockResolvedValue({
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      });

      const result = await FileHandler.validateFile(mockFile);
      
      expect(result.valid).toBe(true);
      expect(result.formatInfo).toBeDefined();
      expect(result.formatInfo?.type).toBe('document');
    });

    it('should reject unsupported files', async () => {
      const mockFile = new File(['test'], 'test.xyz', { type: 'application/unknown' });
      
      mockFormatDetector.detectFormat.mockResolvedValue(null);

      const result = await FileHandler.validateFile(mockFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.formatInfo).toBeUndefined();
    });
  });

  describe('determineCompressor', () => {
    it('should determine image compressor', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      mockFormatDetector.detectFormat.mockResolvedValue({
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      });

      const compressor = await FileHandler.determineCompressor(mockFile);
      expect(compressor).toBe('image');
    });

    it('should determine video compressor', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      
      mockFormatDetector.detectFormat.mockResolvedValue({
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      });

      const compressor = await FileHandler.determineCompressor(mockFile);
      expect(compressor).toBe('video');
    });

    it('should determine audio compressor', async () => {
      const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      
      mockFormatDetector.detectFormat.mockResolvedValue({
        type: 'audio',
        format: 'mp3',
        mimeType: 'audio/mpeg',
        compressor: 'WebAudioCompressor',
        supportLevel: 'native',
      });

      const compressor = await FileHandler.determineCompressor(mockFile);
      expect(compressor).toBe('audio');
    });

    it('should determine document compressor', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      mockFormatDetector.detectFormat.mockResolvedValue({
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      });

      const compressor = await FileHandler.determineCompressor(mockFile);
      expect(compressor).toBe('document');
    });

    it('should determine archive compressor', async () => {
      const mockFile = new File(['test'], 'test.apk', { type: 'application/vnd.android.package-archive' });
      
      mockFormatDetector.detectFormat.mockResolvedValue({
        type: 'archive',
        format: 'apk',
        mimeType: 'application/vnd.android.package-archive',
        compressor: 'APKCompressor',
        supportLevel: 'library',
      });

      const compressor = await FileHandler.determineCompressor(mockFile);
      expect(compressor).toBe('archive');
    });

    it('should return null for unsupported files', async () => {
      const mockFile = new File(['test'], 'test.xyz', { type: 'application/unknown' });
      
      mockFormatDetector.detectFormat.mockResolvedValue(null);

      const compressor = await FileHandler.determineCompressor(mockFile);
      expect(compressor).toBeNull();
    });
  });

  describe('detectFormat', () => {
    it('should call FormatDetector.detectFormat', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const expectedFormat = {
        type: 'image' as const,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native' as const,
      };
      
      mockFormatDetector.detectFormat.mockResolvedValue(expectedFormat);

      const result = await FileHandler.detectFormat(mockFile);
      
      expect(mockFormatDetector.detectFormat).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(expectedFormat);
    });
  });
});