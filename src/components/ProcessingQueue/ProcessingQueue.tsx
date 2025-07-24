import React from 'react';
import ProgressiveLoadingIndicator from './ProgressiveLoadingIndicator';
import { FileModel } from '../../types';
import './ProcessingQueue.css';

/**
 * Queue item interface representing a file in the processing queue
 */
export interface QueueItem {
  /**
   * Unique identifier for the queue item
   */
  id: string;

  /**
   * The file being processed
   */
  file: File;

  /**
   * Current status of the file in the queue
   */
  status: 'waiting' | 'processing' | 'complete' | 'error';

  /**
   * Progress percentage (0-100)
   */
  progress: number;

  /**
   * Error message if status is 'error'
   */
  error?: string;

  /**
   * File type for format-specific display
   */
  fileType?: 'image' | 'video' | 'audio' | 'document' | 'archive';

  /**
   * Format-specific progress information
   */
  formatSpecificProgress?: {
    // Audio-specific progress
    audioPhase?: 'decoding' | 'processing' | 'encoding';
    currentBitrate?: number;
    estimatedTimeRemaining?: number;

    // Video-specific progress
    videoPhase?: 'analyzing' | 'compressing' | 'finalizing';
    framesProcessed?: number;
    totalFrames?: number;

    // Document-specific progress
    documentPhase?: 'parsing' | 'optimizing' | 'rebuilding';
    pagesProcessed?: number;
    totalPages?: number;
  };
}

/**
 * Props for the ProcessingQueue component
 */
interface ProcessingQueueProps {
  /**
   * Array of items in the queue (legacy support)
   */
  items?: QueueItem[];

  /**
   * Array of file models in the queue (new enhanced format)
   */
  fileModels?: FileModel[];

  /**
   * Callback function called when an item is cancelled
   */
  onCancelItem: (id: string) => void;

  /**
   * Whether the queue is currently processing
   */
  isProcessing: boolean;

  /**
   * Callback function called when all processing is cancelled
   */
  onCancelAll: () => void;

  /**
   * Whether to show detailed phase information
   */
  showPhaseDetails?: boolean;

  /**
   * Whether to use enhanced progressive loading indicators
   */
  useEnhancedIndicators?: boolean;
}

/**
 * ProcessingQueue component for displaying and managing the queue of files being processed
 */
const ProcessingQueue: React.FC<ProcessingQueueProps> = ({
  items = [],
  fileModels = [],
  onCancelItem,
  isProcessing,
  onCancelAll,
  showPhaseDetails = true,
  useEnhancedIndicators = true,
}) => {
  /**
   * Convert legacy QueueItem format to FileModel format
   */
  const convertItemsToFileModels = (queueItems: QueueItem[]): FileModel[] => {
    return queueItems.map(item => ({
      id: item.id,
      originalFile: item.file,
      settings: { 
        quality: 80, 
        outputFormat: item.file.type // Use original file type as default
      },
      status: item.status === 'waiting' ? 'waiting' : item.status,
      progress: item.progress,
      error: item.error,
      detectedFormat: item.fileType ? {
        type: item.fileType,
        format: item.fileType,
        mimeType: item.file.type,
        compressor: 'auto',
        supportLevel: 'native' as const,
      } : undefined,
    }));
  };

  /**
   * Convert FileModel format to legacy QueueItem format
   */
  const convertFileModelToQueueItem = (fileModel: FileModel): QueueItem => {
    return {
      id: fileModel.id,
      file: fileModel.originalFile,
      status: fileModel.status,
      progress: fileModel.progress,
      error: fileModel.error,
      fileType: fileModel.detectedFormat?.type,
    };
  };

  // Use fileModels if available, otherwise convert items to fileModels format
  const displayItems = fileModels.length > 0 ? fileModels : convertItemsToFileModels(items);
  /**
   * Get the appropriate status icon based on item status and file type
   */
  const getStatusIcon = (status: QueueItem['status'], fileType?: QueueItem['fileType']) => {
    if (status === 'processing' && fileType) {
      switch (fileType) {
        case 'audio':
          return (
            <span className="status-icon processing audio" aria-label="Processing Audio">
              🎵
            </span>
          );
        case 'video':
          return (
            <span className="status-icon processing video" aria-label="Processing Video">
              🎬
            </span>
          );
        case 'image':
          return (
            <span className="status-icon processing image" aria-label="Processing Image">
              🖼️
            </span>
          );
        case 'document':
          return (
            <span className="status-icon processing document" aria-label="Processing Document">
              📄
            </span>
          );
        case 'archive':
          return (
            <span className="status-icon processing archive" aria-label="Processing Archive">
              📦
            </span>
          );
        default:
          break;
      }
    }

    switch (status) {
      case 'waiting':
        return (
          <span className="status-icon waiting" aria-label="Waiting">
            ⏱️
          </span>
        );
      case 'processing':
        return (
          <span className="status-icon processing" aria-label="Processing">
            ⚙️
          </span>
        );
      case 'complete':
        return (
          <span className="status-icon complete" aria-label="Complete">
            ✅
          </span>
        );
      case 'error':
        return (
          <span className="status-icon error" aria-label="Error">
            ❌
          </span>
        );
      default:
        return null;
    }
  };

  /**
   * Get format-specific progress description
   */
  const getProgressDescription = (item: QueueItem): string | null => {
    if (item.status !== 'processing' || !item.formatSpecificProgress) {
      return null;
    }

    const { formatSpecificProgress } = item;

    if (formatSpecificProgress.audioPhase) {
      switch (formatSpecificProgress.audioPhase) {
        case 'decoding':
          return 'Decoding audio...';
        case 'processing':
          return `Processing audio${formatSpecificProgress.currentBitrate ? ` (${formatSpecificProgress.currentBitrate} kbps)` : ''}...`;
        case 'encoding':
          return 'Encoding compressed audio...';
        default:
          return null;
      }
    }

    if (formatSpecificProgress.videoPhase) {
      switch (formatSpecificProgress.videoPhase) {
        case 'analyzing':
          return 'Analyzing video...';
        case 'compressing':
          return formatSpecificProgress.framesProcessed && formatSpecificProgress.totalFrames
            ? `Compressing (${formatSpecificProgress.framesProcessed}/${formatSpecificProgress.totalFrames} frames)...`
            : 'Compressing video...';
        case 'finalizing':
          return 'Finalizing video...';
        default:
          return null;
      }
    }

    if (formatSpecificProgress.documentPhase) {
      switch (formatSpecificProgress.documentPhase) {
        case 'parsing':
          return 'Parsing document structure...';
        case 'optimizing':
          return formatSpecificProgress.pagesProcessed && formatSpecificProgress.totalPages
            ? `Optimizing content (${formatSpecificProgress.pagesProcessed}/${formatSpecificProgress.totalPages} pages)...`
            : 'Optimizing document content...';
        case 'rebuilding':
          return 'Rebuilding compressed document...';
        default:
          return null;
      }
    }

    return null;
  };

  /**
   * Get estimated time remaining display
   */
  const getTimeRemainingDisplay = (item: QueueItem): string | null => {
    if (item.status !== 'processing' || !item.formatSpecificProgress?.estimatedTimeRemaining) {
      return null;
    }

    const seconds = item.formatSpecificProgress.estimatedTimeRemaining;
    if (seconds < 60) {
      return `~${Math.round(seconds)}s remaining`;
    } else if (seconds < 3600) {
      return `~${Math.round(seconds / 60)}m remaining`;
    } else {
      return `~${Math.round(seconds / 3600)}h remaining`;
    }
  };

  /**
   * Calculate the overall progress percentage
   */
  const calculateOverallProgress = (): number => {
    if (displayItems.length === 0) return 0;

    const totalProgress = displayItems.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(totalProgress / displayItems.length);
  };

  /**
   * Get the appropriate progress bar color based on status
   */
  const getProgressBarColor = (status: QueueItem['status']): string => {
    switch (status) {
      case 'waiting':
        return '#f1c40f'; // Yellow
      case 'processing':
        return '#3498db'; // Blue
      case 'complete':
        return '#2ecc71'; // Green
      case 'error':
        return '#e74c3c'; // Red
      default:
        return '#95a5a6'; // Gray
    }
  };

  const overallProgress = calculateOverallProgress();

  return (
    <div className="processing-queue">
      <div className="queue-header">
        <h2 className="queue-title">Processing Queue</h2>
        {displayItems.length > 1 && (isProcessing || displayItems.some(item => item.status === 'waiting' || item.status === 'processing')) && (
          <button
            className="cancel-all-button"
            onClick={onCancelAll}
            aria-label="Cancel all processing"
          >
            Cancel All
          </button>
        )}
      </div>

      {displayItems.length > 0 && (
        <div className="overall-progress">
          <div className="progress-info">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${overallProgress}%` }}
              role="progressbar"
              aria-valuenow={overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        </div>
      )}

      <div className="queue-list">
        {displayItems.map(fileModel => {
          if (useEnhancedIndicators) {
            // Use new progressive loading indicator
            return (
              <div key={fileModel.id} className="queue-item-enhanced">
                <ProgressiveLoadingIndicator
                  fileModel={fileModel}
                  showPhaseDetails={showPhaseDetails}
                />
                {(fileModel.status === 'waiting' || fileModel.status === 'processing') && (
                  <div className="item-actions">
                    <button
                      className="cancel-button"
                      onClick={() => onCancelItem(fileModel.id)}
                      aria-label={`Cancel processing ${fileModel.originalFile.name}`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          } else {
            // Use legacy queue item display
            const legacyItem = convertFileModelToQueueItem(fileModel);
            return (
              <div key={fileModel.id} className={`queue-item ${legacyItem.status}`}>
                <div className="item-header">
                  <div className="item-info">
                    {getStatusIcon(legacyItem.status, legacyItem.fileType)}
                    <span className="item-name">{legacyItem.file.name}</span>
                    <span className="item-size">
                      ({(legacyItem.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>

                  {(legacyItem.status === 'waiting' || legacyItem.status === 'processing') && (
                    <button
                      className="cancel-button"
                      onClick={() => onCancelItem(legacyItem.id)}
                      aria-label={`Cancel processing ${legacyItem.file.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {getProgressDescription(legacyItem) && (
                  <div className="format-progress-info">
                    <span className="progress-description">{getProgressDescription(legacyItem)}</span>
                    {getTimeRemainingDisplay(legacyItem) && (
                      <span className="time-remaining">{getTimeRemainingDisplay(legacyItem)}</span>
                    )}
                  </div>
                )}

                <div className="item-progress">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${legacyItem.progress}%`,
                        backgroundColor: getProgressBarColor(legacyItem.status),
                      }}
                      role="progressbar"
                      aria-valuenow={legacyItem.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <span className="progress-percentage">{legacyItem.progress}%</span>
                </div>

                {legacyItem.error && (
                  <div className="item-error" role="alert">
                    Error: {legacyItem.error}
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>

      {displayItems.length === 0 && (
        <div className="empty-queue">
          <p>No files in the processing queue</p>
        </div>
      )}
    </div>
  );
};

export default ProcessingQueue;
