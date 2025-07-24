import React from 'react';
import { CompressionMode } from '../../types';
import './CompressionModeSelector.css';

interface CompressionModeSelectorProps {
  currentMode: CompressionMode;
  onModeChange: (mode: CompressionMode) => void;
  disabled?: boolean;
}

const CompressionModeSelector: React.FC<CompressionModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
}) => {
  const modes: Array<{
    key: CompressionMode;
    label: string;
    icon: string;
    description: string;
  }> = [
    {
      key: 'image',
      label: 'Images',
      icon: '🖼️',
      description: 'JPEG, PNG, WebP, TIFF',
    },
    {
      key: 'video',
      label: 'Videos',
      icon: '🎬',
      description: 'MP4, WebM, AVI, MOV, MKV',
    },
    {
      key: 'audio',
      label: 'Audio',
      icon: '🎵',
      description: 'MP3, WAV',
    },
    {
      key: 'document',
      label: 'Documents',
      icon: '📄',
      description: 'PDF, DOC, XLS, PPT, ODT',
    },
    {
      key: 'archive',
      label: 'Archives',
      icon: '📦',
      description: 'APK files',
    },
  ];

  return (
    <div className="compression-mode-selector">
      <h3 className="mode-selector-title">Select File Type</h3>
      <div className="mode-options">
        {modes.map((mode) => (
          <button
            key={mode.key}
            className={`mode-option ${currentMode === mode.key ? 'active' : ''}`}
            onClick={() => onModeChange(mode.key)}
            disabled={disabled}
            aria-label={`Select ${mode.label} compression mode`}
          >
            <div className="mode-icon">{mode.icon}</div>
            <div className="mode-content">
              <div className="mode-label">{mode.label}</div>
              <div className="mode-description">{mode.description}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="mode-info">
        <p className="mode-info-text">
          All file processing happens locally in your browser for complete privacy.
        </p>
      </div>
    </div>
  );
};

export default CompressionModeSelector;