import React from 'react';
import { FileModel } from '../../types';
import './ProgressiveLoadingIndicator.css';

export interface ProgressiveLoadingIndicatorProps {
  fileModel: FileModel;
  showPhaseDetails?: boolean;
}

/**
 * Progressive loading indicator that shows different phases of compression
 */
const ProgressiveLoadingIndicator: React.FC<ProgressiveLoadingIndicatorProps> = ({
  fileModel,
  showPhaseDetails = true,
}) => {
  // Determine current phase based on progress and file type
  const getCurrentPhase = (): {
    phase: string;
    description: string;
    icon: string;
  } => {
    const { progress, detectedFormat, status } = fileModel;
    
    if (status === 'error') {
      return {
        phase: 'Error',
        description: 'Processing failed',
        icon: '❌',
      };
    }

    if (status === 'complete') {
      return {
        phase: 'Complete',
        description: 'File compressed successfully',
        icon: '✅',
      };
    }

    const formatType = detectedFormat?.type || 'unknown';

    // Phase determination based on progress and format
    if (progress < 10) {
      return {
        phase: 'Initializing',
        description: 'Preparing file for compression',
        icon: '🔄',
      };
    }

    if (progress < 20) {
      return {
        phase: 'Analyzing',
        description: getAnalysisDescription(formatType),
        icon: '🔍',
      };
    }

    if (progress < 30) {
      return {
        phase: 'Validating',
        description: getValidationDescription(formatType),
        icon: '✓',
      };
    }

    if (progress < 80) {
      return {
        phase: 'Compressing',
        description: getCompressionDescription(formatType),
        icon: '⚡',
      };
    }

    if (progress < 95) {
      return {
        phase: 'Finalizing',
        description: getFinalizationDescription(formatType),
        icon: '🔧',
      };
    }

    return {
      phase: 'Completing',
      description: 'Preparing compressed file',
      icon: '📦',
    };
  };

  const getAnalysisDescription = (formatType: string): string => {
    switch (formatType) {
      case 'image':
        return 'Analyzing image dimensions and format';
      case 'video':
        return 'Analyzing video codec and properties';
      case 'audio':
        return 'Analyzing audio format and metadata';
      case 'document':
        return 'Analyzing document structure and content';
      case 'archive':
        return 'Analyzing archive structure and entries';
      default:
        return 'Analyzing file format and properties';
    }
  };

  const getValidationDescription = (formatType: string): string => {
    switch (formatType) {
      case 'image':
        return 'Validating image integrity';
      case 'video':
        return 'Validating video stream';
      case 'audio':
        return 'Validating audio stream';
      case 'document':
        return 'Validating document structure';
      case 'archive':
        return 'Validating archive integrity';
      default:
        return 'Validating file integrity';
    }
  };

  const getCompressionDescription = (formatType: string): string => {
    switch (formatType) {
      case 'image':
        return 'Compressing image data';
      case 'video':
        return 'Re-encoding video stream';
      case 'audio':
        return 'Compressing audio stream';
      case 'document':
        return 'Optimizing document content';
      case 'archive':
        return 'Compressing archive contents';
      default:
        return 'Compressing file data';
    }
  };

  const getFinalizationDescription = (formatType: string): string => {
    switch (formatType) {
      case 'image':
        return 'Optimizing image output';
      case 'video':
        return 'Finalizing video encoding';
      case 'audio':
        return 'Finalizing audio encoding';
      case 'document':
        return 'Rebuilding document structure';
      case 'archive':
        return 'Validating compressed archive';
      default:
        return 'Finalizing compression';
    }
  };

  const currentPhase = getCurrentPhase();
  const { progress } = fileModel;

  // Calculate phase progress (0-100 within current phase)
  const getPhaseProgress = (): number => {
    if (progress < 10) return (progress / 10) * 100;
    if (progress < 20) return ((progress - 10) / 10) * 100;
    if (progress < 30) return ((progress - 20) / 10) * 100;
    if (progress < 80) return ((progress - 30) / 50) * 100;
    if (progress < 95) return ((progress - 80) / 15) * 100;
    return ((progress - 95) / 5) * 100;
  };

  const phaseProgress = getPhaseProgress();

  return (
    <div 
      className="progressive-loading-indicator"
      data-status={fileModel.status}
      data-format={fileModel.detectedFormat?.type || 'unknown'}
    >
      <div className="file-info">
        <div className="file-name">{fileModel.originalFile.name}</div>
        <div className="file-size">
          ({(fileModel.originalFile.size / (1024 * 1024)).toFixed(2)} MB)
        </div>
      </div>
      <div className="progress-header">
        <div className="progress-icon">{currentPhase.icon}</div>
        <div className="progress-info">
          <div className="progress-phase">{currentPhase.phase}</div>
          {showPhaseDetails && (
            <div className="progress-description">{currentPhase.description}</div>
          )}
        </div>
        <div className="progress-percentage">{Math.round(progress)}%</div>
      </div>

      <div className="progress-bars">
        {/* Overall progress bar */}
        <div className="progress-bar overall-progress">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Phase progress bar */}
        {showPhaseDetails && fileModel.status === 'processing' && (
          <div className="progress-bar phase-progress">
            <div
              className="progress-fill phase-fill"
              style={{ width: `${phaseProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Format-specific details */}
      {showPhaseDetails && fileModel.detectedFormat && (
        <div className="format-details">
          <span className="format-type">
            {fileModel.detectedFormat.format.toUpperCase()}
          </span>
          {fileModel.processingMethod && (
            <span className="processing-method">
              via {fileModel.processingMethod}
            </span>
          )}
        </div>
      )}

      {/* Time estimation - only show for processing files with start time */}
      {fileModel.status === 'processing' && fileModel.startTime && (
        <TimeEstimation
          startTime={fileModel.startTime}
          progress={progress}
          fileSize={fileModel.originalFile.size}
          formatType={fileModel.detectedFormat?.type}
        />
      )}
    </div>
  );
};

/**
 * Time estimation component
 */
interface TimeEstimationProps {
  startTime: number;
  progress: number;
  fileSize: number;
  formatType?: string;
}

const TimeEstimation: React.FC<TimeEstimationProps> = ({
  startTime,
  progress,
  fileSize,
  formatType,
}) => {
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  
  // Update current time every 100ms for smooth real-time elapsed time display
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  const elapsed = Math.max(0, currentTime - startTime);
  
  // Format elapsed time in hr:min:sec:ms format
  const formatElapsedTime = (): string => {
    const totalMs = Math.max(0, elapsed);
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
    const ms = Math.floor((totalMs % 1000) / 10); // Show centiseconds for better precision
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };
  
  // Estimate remaining time based on current progress
  const estimateRemainingTime = (): string => {
    if (progress <= 1 || elapsed < 1000) return 'Calculating...';
    if (progress >= 99) return 'Almost done';
    
    const estimatedTotal = (elapsed / progress) * 100;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    if (remaining < 1000) return 'Almost done';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `~${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `~${minutes}m ${seconds}s remaining`;
    } else {
      return `~${seconds}s remaining`;
    }
  };

  // Get processing speed indicator
  const getSpeedIndicator = (): string => {
    const mbPerSecond = (fileSize / (1024 * 1024)) / (elapsed / 1000);
    
    if (mbPerSecond > 10) return '🚀 Fast';
    if (mbPerSecond > 2) return '⚡ Normal';
    if (mbPerSecond > 0.5) return '🐌 Slow';
    return '⏳ Processing';
  };

  return (
    <div className="time-estimation">
      <span className="elapsed-time">⏱️ {formatElapsedTime()}</span>
      <span className="time-remaining">{estimateRemainingTime()}</span>
      <span className="speed-indicator">{getSpeedIndicator()}</span>
    </div>
  );
};

export default ProgressiveLoadingIndicator;