/**
 * Tests for FormatDetector service
 */

import FormatDetector from '../FormatDetector';

describe('FormatDetector', () => {
  describe('detectFromExtension', () => {
    it('should detect image formats correctly', () => {
      expect(FormatDetector.detectFromExtension('test.jpg')?.type).toBe('image');
      expect(FormatDetector.detectFromExtension('test.png')?.type).toBe('image');
      expect(FormatDetector.detectFromExtension('test.webp')?.type).toBe('image');
      expect(FormatDetector.detectFromExtension('test.tiff')?.type).toBe('image');
    });

    it('should detect video formats correctly', () => {
      expect(FormatDetector.detectFromExtension('test.mp4')?.type).toBe('video');
      expect(FormatDetector.detectFromExtension('test.webm')?.type).toBe('video');
      expect(FormatDetector.detectFromExtension('test.avi')?.type).toBe('video');
      expect(FormatDetector.detectFromExtension('test.mov')?.type).toBe('video');
      expect(FormatDetector.detectFromExtension('test.mkv')?.type).toBe('video');
    });

    it('should detect audio formats correctly', () => {
      expect(FormatDetector.detectFromExtension('test.mp3')?.type).toBe('audio');
      expect(FormatDetector.detectFromExtension('test.wav')?.type).toBe('audio');
    });

    it('should detect document formats correctly', () => {
      expect(FormatDetector.detectFromExtension('test.pdf')?.type).toBe('document');
      expect(FormatDetector.detectFromExtension('test.doc')?.type).toBe('document');
      expect(FormatDetector.detectFromExtension('test.docx')?.type).toBe('document');
      expect(FormatDetector.detectFromExtension('test.xls')?.type).toBe('document');
      expect(FormatDetector.detectFromExtension('test.xlsx')?.type).toBe('document');
      expect(FormatDetector.detectFromExtension('test.ppt')?.type).toBe('document');
      expect(FormatDetector.detectFromExtension('test.pptx')?.type).toBe('document');
      expect(FormatDetector.detectFromExtension('test.odt')?.type).toBe('document');
    });

    it('should detect archive formats correctly', () => {
      expect(FormatDetector.detectFromExtension('test.apk')?.type).toBe('archive');
    });

    it('should return null for unsupported formats', () => {
      expect(FormatDetector.detectFromExtension('test.xyz')).toBeNull();
      expect(FormatDetector.detectFromExtension('test')).toBeNull();
    });

    it('should handle case insensitive extensions', () => {
      expect(FormatDetector.detectFromExtension('test.JPG')?.type).toBe('image');
      expect(FormatDetector.detectFromExtension('test.PDF')?.type).toBe('document');
    });
  });

  describe('detectFromMimeType', () => {
    it('should detect formats from MIME types', () => {
      expect(FormatDetector.detectFromMimeType('image/jpeg')?.type).toBe('image');
      expect(FormatDetector.detectFromMimeType('video/mp4')?.type).toBe('video');
      expect(FormatDetector.detectFromMimeType('audio/mpeg')?.type).toBe('audio');
      expect(FormatDetector.detectFromMimeType('application/pdf')?.type).toBe('document');
      expect(FormatDetector.detectFromMimeType('application/vnd.android.package-archive')?.type).toBe('archive');
    });

    it('should return null for unsupported MIME types', () => {
      expect(FormatDetector.detectFromMimeType('application/unknown')).toBeNull();
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all formats when no type filter is provided', () => {
      const formats = FormatDetector.getSupportedFormats();
      expect(formats.length).toBeGreaterThan(0);
      expect(formats.some(f => f.type === 'image')).toBe(true);
      expect(formats.some(f => f.type === 'video')).toBe(true);
      expect(formats.some(f => f.type === 'audio')).toBe(true);
      expect(formats.some(f => f.type === 'document')).toBe(true);
      expect(formats.some(f => f.type === 'archive')).toBe(true);
    });

    it('should filter formats by type', () => {
      const imageFormats = FormatDetector.getSupportedFormats('image');
      expect(imageFormats.every(f => f.type === 'image')).toBe(true);
      expect(imageFormats.length).toBeGreaterThan(0);

      const videoFormats = FormatDetector.getSupportedFormats('video');
      expect(videoFormats.every(f => f.type === 'video')).toBe(true);
      expect(videoFormats.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedMimeTypes', () => {
    it('should return MIME types for all formats', () => {
      const mimeTypes = FormatDetector.getSupportedMimeTypes();
      expect(mimeTypes).toContain('image/jpeg');
      expect(mimeTypes).toContain('video/mp4');
      expect(mimeTypes).toContain('audio/mpeg');
      expect(mimeTypes).toContain('application/pdf');
      expect(mimeTypes).toContain('application/vnd.android.package-archive');
    });

    it('should filter MIME types by format type', () => {
      const imageMimeTypes = FormatDetector.getSupportedMimeTypes('image');
      expect(imageMimeTypes.every(mime => mime.startsWith('image/'))).toBe(true);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return extensions for all formats', () => {
      const extensions = FormatDetector.getSupportedExtensions();
      expect(extensions).toContain('jpg');
      expect(extensions).toContain('mp4');
      expect(extensions).toContain('mp3');
      expect(extensions).toContain('pdf');
      expect(extensions).toContain('apk');
    });

    it('should filter extensions by format type', () => {
      const imageExtensions = FormatDetector.getSupportedExtensions('image');
      expect(imageExtensions).toContain('jpg');
      expect(imageExtensions).toContain('png');
      expect(imageExtensions).not.toContain('mp4');
    });
  });

  describe('getProcessingMethod', () => {
    it('should return correct processing method based on support level', () => {
      const jpegFormat = FormatDetector.detectFromExtension('test.jpg');
      expect(FormatDetector.getProcessingMethod(jpegFormat!)).toBe('native');

      const pdfFormat = FormatDetector.detectFromExtension('test.pdf');
      expect(FormatDetector.getProcessingMethod(pdfFormat!)).toBe('library');
    });
  });
});