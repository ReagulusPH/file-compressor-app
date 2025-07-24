import React, { useState, useMemo } from 'react';
import { resultsManager, BatchStatistics, FormatStatistics } from '../../services/ResultsManager/ResultsManager';
import { CompressionResult } from '../../types';
import './ResultsPanel.css';



/**
 * Props for the ResultsPanel component
 */
interface ResultsPanelProps {
  /**
   * Array of compression results
   */
  results: CompressionResult[];

  /**
   * Callback function called when a file is downloaded
   */
  onDownload: (id: string) => void;

  /**
   * Callback function called when all files are downloaded
   */
  onDownloadAll: () => void;

  /**
   * Callback function called when the user wants to compress more files
   */
  onCompressMore: () => void;
}

/**
 * Format filter options
 */
type FormatFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive';

/**
 * View mode options
 */
type ViewMode = 'list' | 'statistics';

/**
 * Enhanced ResultsPanel component for displaying multi-format compression results
 */
const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  onDownload,
  onDownloadAll,
  onCompressMore,
}) => {
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());

  // Store results in ResultsManager for statistics calculation
  React.useEffect(() => {
    // Clear previous results and store current ones
    resultsManager.clearResults();
    results.forEach(result => resultsManager.storeResult(result));
  }, [results]);

  // Calculate batch statistics
  const batchStatistics = useMemo<BatchStatistics>(() => {
    return resultsManager.calculateBatchStatistics();
  }, [results]);

  // Get unique format types for filter options
  const availableFormats = useMemo(() => {
    return resultsManager.getUniqueFormatTypes();
  }, [results]);

  // Filter results based on selected format
  const filteredResults = useMemo(() => {
    if (formatFilter === 'all') return results;
    return resultsManager.getResultsByFormat(formatFilter);
  }, [results, formatFilter]);
  /**
   * Format file size to human-readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Format processing time to hr:min:sec:ms format
   */
  const formatProcessingTime = (ms: number): string => {
    const totalMs = Math.max(0, ms);
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
    const centiseconds = Math.floor((totalMs % 1000) / 10);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`;
  };

  /**
   * Calculate total size reduction
   */
  const calculateTotalReduction = (): { original: number; compressed: number; ratio: number } => {
    const totalOriginal = results.reduce((sum, result) => sum + result.originalFile.size, 0);
    const totalCompressed = results.reduce((sum, result) => sum + result.compressedFile.size, 0);
    const ratio = Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100);

    return {
      original: totalOriginal,
      compressed: totalCompressed,
      ratio,
    };
  };

  /**
   * Check if the file is an image
   */
  const isImage = (type: string): boolean => {
    return type.startsWith('image/');
  };

  /**
   * Check if the file is a video
   */
  const isVideo = (type: string): boolean => {
    return type.startsWith('video/');
  };

  /**
   * Check if the file is a document
   */
  const isDocument = (type: string): boolean => {
    return type === 'application/pdf' || 
           type.includes('document') || 
           type.includes('spreadsheet') || 
           type.includes('presentation') ||
           type.includes('officedocument');
  };

  /**
   * Check if the file is an audio file
   */
  const isAudio = (type: string): boolean => {
    return type.startsWith('audio/');
  };

  /**
   * Create a download URL for a blob and trigger download
   */
  const downloadBlob = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);

    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  /**
   * Handle download of a single file
   */
  const handleDownload = (result: CompressionResult) => {
    // Create a download name with appropriate extension
    const extension = result.compressedFile.type.split('/')[1] || 'bin';
    const baseName = result.originalFile.name.split('.').slice(0, -1).join('.') || 'compressed';
    const fileName = `${baseName}_compressed.${extension}`;

    downloadBlob(result.compressedFile.blob, fileName);
    onDownload(result.id);
  };

  /**
   * Handle download of all files (with format organization)
   */
  const handleDownloadAll = async () => {
    try {
      await resultsManager.downloadAllAsZip('compressed_files.zip');
      onDownloadAll();
    } catch (error) {
      console.error('Failed to download all files:', error);
      // Fallback to individual downloads
      results.forEach(result => {
        const extension = result.compressedFile.type.split('/')[1] || 'bin';
        const baseName = result.originalFile.name.split('.').slice(0, -1).join('.') || 'compressed';
        const fileName = `${baseName}_compressed.${extension}`;
        downloadBlob(result.compressedFile.blob, fileName);
      });
      onDownloadAll();
    }
  };

  /**
   * Handle download by format type
   */
  const handleDownloadByFormat = async (formatType: string) => {
    try {
      await resultsManager.downloadByFormat(formatType);
    } catch (error) {
      console.error(`Failed to download ${formatType} files:`, error);
      // Fallback to individual downloads
      const formatResults = resultsManager.getResultsByFormat(formatType);
      formatResults.forEach(result => {
        const extension = result.compressedFile.type.split('/')[1] || 'bin';
        const baseName = result.originalFile.name.split('.').slice(0, -1).join('.') || 'compressed';
        const fileName = `${baseName}_compressed.${extension}`;
        downloadBlob(result.compressedFile.blob, fileName);
      });
    }
  };

  /**
   * Toggle expanded state for format statistics
   */
  const toggleStatsExpansion = (formatType: string) => {
    const newExpanded = new Set(expandedStats);
    if (newExpanded.has(formatType)) {
      newExpanded.delete(formatType);
    } else {
      newExpanded.add(formatType);
    }
    setExpandedStats(newExpanded);
  };

  const totalReduction = calculateTotalReduction();

  return (
    <div className="results-panel">
      <div className="results-header">
        <h2 className="results-title">Compression Results</h2>
        <div className="results-controls">
          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-mode-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
            <button
              className={`view-mode-button ${viewMode === 'statistics' ? 'active' : ''}`}
              onClick={() => setViewMode('statistics')}
            >
              Statistics
            </button>
          </div>

          {/* Format Filter */}
          {availableFormats.length > 1 && (
            <div className="format-filter">
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
                className="format-filter-select"
              >
                <option value="all">All Formats ({results.length})</option>
                {availableFormats.map(format => {
                  const count = resultsManager.getResultsByFormat(format).length;
                  return (
                    <option key={format} value={format}>
                      {format.charAt(0).toUpperCase() + format.slice(1)} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Download Actions */}
          <div className="results-actions">
            {formatFilter !== 'all' && (
              <button
                className="download-format-button"
                onClick={() => handleDownloadByFormat(formatFilter)}
                disabled={filteredResults.length === 0}
              >
                Download {formatFilter.charAt(0).toUpperCase() + formatFilter.slice(1)}
              </button>
            )}
            <button
              className="download-all-button"
              onClick={handleDownloadAll}
              disabled={results.length === 0}
            >
              Download All as ZIP
            </button>
            <button className="compress-more-button" onClick={onCompressMore}>
              Compress More Files
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Summary with Batch Statistics */}
      <div className="total-summary">
        <div className="summary-item">
          <span className="summary-label">Total Files:</span>
          <span className="summary-value">{batchStatistics.totalFiles}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Successful:</span>
          <span className="summary-value success">{batchStatistics.successfulFiles}</span>
        </div>
        {batchStatistics.failedFiles > 0 && (
          <div className="summary-item">
            <span className="summary-label">Failed:</span>
            <span className="summary-value error">{batchStatistics.failedFiles}</span>
          </div>
        )}
        <div className="summary-item">
          <span className="summary-label">Original Size:</span>
          <span className="summary-value">{formatFileSize(batchStatistics.totalOriginalSize)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Compressed Size:</span>
          <span className="summary-value">{formatFileSize(batchStatistics.totalCompressedSize)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Overall Reduction:</span>
          <span className="summary-value highlight">
            {Math.round(100 - batchStatistics.overallCompressionRatio)}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Time:</span>
          <span className="summary-value">{formatProcessingTime(batchStatistics.totalProcessingTime * 1000)}</span>
        </div>
      </div>

      {/* Statistics View */}
      {viewMode === 'statistics' && (
        <div className="statistics-view">
          <div className="statistics-header">
            <h3>Compression Statistics by Format</h3>
          </div>

          {/* Top Performing Formats */}
          {batchStatistics.topPerformingFormats.length > 0 && (
            <div className="top-performers">
              <h4>Best Compression Ratios</h4>
              <div className="performers-list">
                {batchStatistics.topPerformingFormats.map((performer, index) => (
                  <div key={performer.format} className="performer-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="format-name">{performer.format.toUpperCase()}</span>
                    <span className="compression-ratio">{Math.round(100 - performer.compressionRatio)}% reduction</span>
                    <span className="file-count">({performer.fileCount} files)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Format Breakdown */}
          <div className="format-breakdown">
            <h4>Format Details</h4>
            {Object.entries(batchStatistics.formatBreakdown).map(([formatType, stats]) => (
              <div key={formatType} className="format-stats-card">
                <div 
                  className="format-stats-header"
                  onClick={() => toggleStatsExpansion(formatType)}
                >
                  <h5>{formatType.toUpperCase()} Files</h5>
                  <div className="format-stats-summary">
                    <span>{stats.totalFiles} files</span>
                    <span>{Math.round(100 - stats.averageCompressionRatio)}% avg reduction</span>
                    <button className="expand-button">
                      {expandedStats.has(formatType) ? '−' : '+'}
                    </button>
                  </div>
                </div>

                {expandedStats.has(formatType) && (
                  <div className="format-stats-details">
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Total Files:</span>
                        <span className="stat-value">{stats.totalFiles}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Original Size:</span>
                        <span className="stat-value">{formatFileSize(stats.totalOriginalSize)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Compressed Size:</span>
                        <span className="stat-value">{formatFileSize(stats.totalCompressedSize)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Avg Processing Time:</span>
                        <span className="stat-value">{formatProcessingTime(stats.averageProcessingTime * 1000)}</span>
                      </div>
                    </div>

                    {/* Format-specific metrics */}
                    {formatType === 'image' && stats.formatSpecificMetrics.formatConversions && (
                      <div className="format-specific-metrics">
                        <h6>Format Conversions</h6>
                        <div className="conversions-list">
                          {Object.entries(stats.formatSpecificMetrics.formatConversions).map(([conversion, count]) => (
                            <div key={conversion} className="conversion-item">
                              <span className="conversion-text">{conversion}</span>
                              <span className="conversion-count">{count} files</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {formatType === 'audio' && (
                      <div className="format-specific-metrics">
                        {stats.formatSpecificMetrics.averageBitrateReduction && (
                          <div className="metric-item">
                            <span className="metric-label">Avg Bitrate Reduction:</span>
                            <span className="metric-value">
                              {Math.round(stats.formatSpecificMetrics.averageBitrateReduction)}%
                            </span>
                          </div>
                        )}
                        {stats.formatSpecificMetrics.qualityDistribution && (
                          <div className="quality-distribution">
                            <h6>Quality Distribution</h6>
                            {Object.entries(stats.formatSpecificMetrics.qualityDistribution).map(([range, count]) => (
                              <div key={range} className="quality-item">
                                <span className="quality-range">{range}</span>
                                <span className="quality-count">{count} files</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {formatType === 'document' && (
                      <div className="format-specific-metrics">
                        {stats.formatSpecificMetrics.totalPagesProcessed && (
                          <div className="metric-item">
                            <span className="metric-label">Total Pages Processed:</span>
                            <span className="metric-value">{stats.formatSpecificMetrics.totalPagesProcessed}</span>
                          </div>
                        )}
                        {stats.formatSpecificMetrics.totalImagesOptimized && (
                          <div className="metric-item">
                            <span className="metric-label">Images Optimized:</span>
                            <span className="metric-value">{stats.formatSpecificMetrics.totalImagesOptimized}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {formatType === 'archive' && (
                      <div className="format-specific-metrics">
                        {stats.formatSpecificMetrics.totalEntriesProcessed && (
                          <div className="metric-item">
                            <span className="metric-label">Total Entries Processed:</span>
                            <span className="metric-value">{stats.formatSpecificMetrics.totalEntriesProcessed}</span>
                          </div>
                        )}
                        {stats.formatSpecificMetrics.integritySuccessRate !== undefined && (
                          <div className="metric-item">
                            <span className="metric-label">Integrity Success Rate:</span>
                            <span className="metric-value">
                              {Math.round(stats.formatSpecificMetrics.integritySuccessRate)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      className="download-format-button-inline"
                      onClick={() => handleDownloadByFormat(formatType)}
                    >
                      Download {formatType.toUpperCase()} Files
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results List View */}
      {viewMode === 'list' && (
        <div className="results-list">
          {filteredResults.map(result => (
          <div key={result.id} className="result-item">
            <div className="result-header">
              <h3 className="file-name">{result.originalFile.name}</h3>
              <button
                className="download-button"
                onClick={() => handleDownload(result)}
                aria-label={`Download ${result.originalFile.name}`}
              >
                Download
              </button>
            </div>

            <div className="result-content">
              {result.previewUrl && (
                <div className="preview-container">
                  {isImage(result.originalFile.type) && (
                    <img
                      src={result.previewUrl}
                      alt={`Preview of ${result.originalFile.name}`}
                      className="preview-image"
                    />
                  )}
                  {isVideo(result.originalFile.type) && (
                    <video src={result.previewUrl} controls className="preview-video" />
                  )}
                </div>
              )}

              <div className="result-details">
                <div className="comparison">
                  <div className="comparison-item">
                    <span className="comparison-label">Original:</span>
                    <span className="comparison-value">
                      {formatFileSize(result.originalFile.size)}
                    </span>
                  </div>
                  <div className="comparison-arrow">→</div>
                  <div className="comparison-item">
                    <span className="comparison-label">Compressed:</span>
                    <span className="comparison-value">
                      {formatFileSize(result.compressedFile.size)}
                    </span>
                  </div>
                  <div className="comparison-ratio">
                    <span className="ratio-value">{result.compressionRatio}%</span>
                    <span className="ratio-label">reduction</span>
                  </div>
                </div>

                <div className="processing-info">
                  <div className="info-item">
                    <span className="info-label">Processing Time:</span>
                    <span className="info-value">
                      {formatProcessingTime(result.processingTime)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Output Format:</span>
                    <span className="info-value">
                      {result.compressedFile.type.split('/')[1].toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Format-specific information display */}
                {result.formatSpecificData && (
                  <div className="format-specific-info">
                    <h4 className="format-info-title">
                      {isDocument(result.originalFile.type) && 'Document Details'}
                      {isAudio(result.originalFile.type) && 'Audio Details'}
                      {result.originalFile.type === 'application/vnd.android.package-archive' && 'APK Details'}
                      {isImage(result.originalFile.type) && 'Image Details'}
                      {isVideo(result.originalFile.type) && 'Video Details'}
                    </h4>
                    <div className="format-info-grid">
                      {/* Document-specific data */}
                      {isDocument(result.originalFile.type) && (
                        <>
                          {result.formatSpecificData.pagesProcessed && (
                            <div className="info-item">
                              <span className="info-label">Pages Processed:</span>
                              <span className="info-value">{result.formatSpecificData.pagesProcessed}</span>
                            </div>
                          )}
                          {result.formatSpecificData.imagesOptimized && (
                            <div className="info-item">
                              <span className="info-label">Images Optimized:</span>
                              <span className="info-value">{result.formatSpecificData.imagesOptimized}</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Audio-specific data */}
                      {isAudio(result.originalFile.type) && (
                        <>
                          {result.formatSpecificData.finalBitrate && (
                            <div className="info-item">
                              <span className="info-label">Final Bitrate:</span>
                              <span className="info-value">{result.formatSpecificData.finalBitrate} kbps</span>
                            </div>
                          )}
                          {result.formatSpecificData.qualityScore && (
                            <div className="info-item">
                              <span className="info-label">Quality Score:</span>
                              <span className="info-value">
                                {result.formatSpecificData.qualityScore}/10
                                <span className="quality-indicator">
                                  {result.formatSpecificData.qualityScore >= 8 ? ' (High)' :
                                   result.formatSpecificData.qualityScore >= 6 ? ' (Medium)' :
                                   result.formatSpecificData.qualityScore >= 4 ? ' (Low)' : ' (Poor)'}
                                </span>
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Archive-specific data */}
                      {result.originalFile.type === 'application/vnd.android.package-archive' && (
                        <>
                          {result.formatSpecificData.entriesProcessed && (
                            <div className="info-item">
                              <span className="info-label">Entries Processed:</span>
                              <span className="info-value">{result.formatSpecificData.entriesProcessed}</span>
                            </div>
                          )}
                          {result.formatSpecificData.integrityVerified !== undefined && (
                            <div className="info-item">
                              <span className="info-label">Integrity Verified:</span>
                              <span className={`info-value ${result.formatSpecificData.integrityVerified ? 'success' : 'warning'}`}>
                                {result.formatSpecificData.integrityVerified ? 'Yes' : 'No'}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Compression method info */}
                      <div className="info-item">
                        <span className="info-label">Compression Method:</span>
                        <span className="info-value">{result.method || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {results.length === 0 && (
        <div className="no-results">
          <p>No compression results available yet.</p>
        </div>
      )}

      {/* No Filtered Results Message */}
      {results.length > 0 && filteredResults.length === 0 && formatFilter !== 'all' && (
        <div className="no-results">
          <p>No {formatFilter} files found in results.</p>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;
