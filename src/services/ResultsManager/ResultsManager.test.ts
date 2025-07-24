import { ResultsManager } from './ResultsManager';
import { CompressionResult } from '../../types';

describe('ResultsManager', () => {
  let resultsManager: ResultsManager;
  let mockResult: CompressionResult;

  beforeEach(() => {
    // Create a new ResultsManager instance for each test
    resultsManager = new ResultsManager();

    // Create a mock compression result
    mockResult = {
      id: 'test-id',
      originalFile: {
        name: 'test-image.jpg',
        size: 1024000, // 1MB
        type: 'image/jpeg',
      },
      compressedFile: {
        blob: new Blob(['mock data'], { type: 'image/jpeg' }),
        size: 512000, // 500KB
        type: 'image/jpeg',
      },
      compressionRatio: 50,
      processingTime: 1.5,
      method: 'CanvasImageCompressor',
    };
  });

  describe('Result storage', () => {
    it('should store and retrieve a result', () => {
      resultsManager.storeResult(mockResult);
      const retrievedResult = resultsManager.getResult(mockResult.id);
      expect(retrievedResult).toEqual(mockResult);
    });

    it('should return undefined for non-existent result', () => {
      const retrievedResult = resultsManager.getResult('non-existent-id');
      expect(retrievedResult).toBeUndefined();
    });

    it('should get all stored results', () => {
      const mockResult2 = { ...mockResult, id: 'test-id-2' };
      resultsManager.storeResult(mockResult);
      resultsManager.storeResult(mockResult2);

      const allResults = resultsManager.getAllResults();
      expect(allResults).toHaveLength(2);
      expect(allResults).toContainEqual(mockResult);
      expect(allResults).toContainEqual(mockResult2);
    });

    it('should clear all results', () => {
      resultsManager.storeResult(mockResult);
      resultsManager.clearResults();

      const allResults = resultsManager.getAllResults();
      expect(allResults).toHaveLength(0);
    });

    it('should remove a specific result', () => {
      const mockResult2 = { ...mockResult, id: 'test-id-2' };
      resultsManager.storeResult(mockResult);
      resultsManager.storeResult(mockResult2);

      const removed = resultsManager.removeResult(mockResult.id);
      expect(removed).toBe(true);

      const allResults = resultsManager.getAllResults();
      expect(allResults).toHaveLength(1);
      expect(allResults[0]).toEqual(mockResult2);
    });

    it('should return false when removing non-existent result', () => {
      const removed = resultsManager.removeResult('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Compression statistics', () => {
    it('should calculate compression ratio correctly', () => {
      const ratio = resultsManager.calculateCompressionRatio(1000, 500);
      expect(ratio).toBe(50); // 500/1000 * 100 = 50%
    });

    it('should throw error when calculating ratio with zero original size', () => {
      expect(() => {
        resultsManager.calculateCompressionRatio(0, 500);
      }).toThrow('Original size must be greater than zero');
    });

    it('should calculate size reduction correctly', () => {
      const reduction = resultsManager.calculateSizeReduction(1000, 500);
      expect(reduction).toBe(50); // (1000-500)/1000 * 100 = 50%
    });

    it('should throw error when calculating reduction with zero original size', () => {
      expect(() => {
        resultsManager.calculateSizeReduction(0, 500);
      }).toThrow('Original size must be greater than zero');
    });

    it('should calculate processing time correctly', () => {
      const time = resultsManager.calculateProcessingTime(1000, 3500);
      expect(time).toBe(2.5); // (3500-1000)/1000 = 2.5 seconds
    });

    it('should throw error when end time is less than start time', () => {
      expect(() => {
        resultsManager.calculateProcessingTime(3500, 1000);
      }).toThrow('End time must be greater than or equal to start time');
    });
  });

  describe('File size formatting', () => {
    it('should format bytes correctly', () => {
      expect(resultsManager.formatFileSize(500)).toBe('500.00 B');
    });

    it('should format kilobytes correctly', () => {
      expect(resultsManager.formatFileSize(1536)).toBe('1.50 KB');
    });

    it('should format megabytes correctly', () => {
      expect(resultsManager.formatFileSize(1572864)).toBe('1.50 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(resultsManager.formatFileSize(1610612736)).toBe('1.50 GB');
    });

    it('should throw error for negative file size', () => {
      expect(() => {
        resultsManager.formatFileSize(-100);
      }).toThrow('File size cannot be negative');
    });
  });

  describe('Download functionality', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock document methods
      document.createElement = jest.fn().mockImplementation(tag => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: jest.fn(),
          };
        }
        return {};
      });
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      // Mock setTimeout
      jest.useFakeTimers();
    });

    it('should create download URL for blob', () => {
      const blob = new Blob(['test']);
      const url = resultsManager.createDownloadURL(blob);

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(url).toBe('mock-url');
    });

    it('should trigger file download', () => {
      const blob = new Blob(['test']);
      const fileName = 'test-file.jpg';

      resultsManager.downloadFile(blob, fileName);

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();

      // Advance timers to check URL revocation
      jest.advanceTimersByTime(100);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should throw error when trying to download all with no results', async () => {
      await expect(resultsManager.downloadAllAsZip()).rejects.toThrow('No results to download');
    });
  });
});
