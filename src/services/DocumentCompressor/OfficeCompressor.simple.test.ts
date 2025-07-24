/**
 * Simple OfficeCompressor test to verify basic functionality
 */

import { OfficeCompressor } from './OfficeCompressor';

describe('OfficeCompressor Simple Test', () => {
  it('should be importable and have basic methods', () => {
    expect(OfficeCompressor).toBeDefined();
    expect(OfficeCompressor.isSupported).toBeDefined();
    expect(OfficeCompressor.getSupportedFormats).toBeDefined();
  });

  it('should report support correctly', () => {
    expect(OfficeCompressor.isSupported()).toBe(true);
  });

  it('should return supported formats', () => {
    const formats = OfficeCompressor.getSupportedFormats();
    
    expect(Array.isArray(formats)).toBe(true);
    expect(formats.length).toBeGreaterThan(0);
    expect(formats).toContain('docx');
    expect(formats).toContain('xlsx');
    expect(formats).toContain('pptx');
  });

  it('should create an instance', () => {
    const compressor = new OfficeCompressor();
    expect(compressor).toBeDefined();
    expect(typeof compressor.compressDocument).toBe('function');
    expect(typeof compressor.extractMetadata).toBe('function');
  });
});