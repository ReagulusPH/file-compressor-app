import React, { useState } from 'react';
import { ArchiveSettings as ArchiveSettingsType } from '../../types';
import Modal from '../Feedback/Modal';

/**
 * Props for the ArchiveSettings component
 */
interface ArchiveSettingsProps {
  /**
   * Current archive settings
   */
  settings: ArchiveSettingsType;

  /**
   * Callback function called when settings change
   */
  onSettingsChange: (settings: ArchiveSettingsType) => void;

  /**
   * Whether the settings are disabled
   */
  disabled?: boolean;

  /**
   * Archive metadata for context-aware settings
   */
  archiveMetadata?: {
    entryCount?: number;
    hasSignature?: boolean;
    compressionRatio?: number;
    fileType?: 'apk';
    originalSize?: number;
  };
}

/**
 * Compression level options with descriptions
 */
const COMPRESSION_LEVELS = [
  {
    value: 0,
    label: 'No Compression (Store Only)',
    description: 'Fastest, largest size',
  },
  {
    value: 1,
    label: 'Minimal Compression',
    description: 'Very fast, good for already compressed files',
  },
  {
    value: 3,
    label: 'Low Compression',
    description: 'Fast compression, moderate size reduction',
  },
  {
    value: 6,
    label: 'Balanced Compression',
    description: 'Good balance of speed and compression',
  },
  {
    value: 9,
    label: 'Maximum Compression',
    description: 'Slowest, smallest size',
  },
];

/**
 * ArchiveSettings component for configuring archive-specific compression options
 */
const ArchiveSettings: React.FC<ArchiveSettingsProps> = ({
  settings,
  onSettingsChange,
  disabled = false,
  archiveMetadata,
}) => {
  const [showIntegrityWarning, setShowIntegrityWarning] = useState(false);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);

  /**
   * Handle compression level change
   */
  const handleCompressionLevelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const compressionLevel = parseInt(event.target.value, 10);
    
    // Show warning for high compression levels on APK files
    if (archiveMetadata?.fileType === 'apk' && compressionLevel >= 6) {
      setShowIntegrityWarning(true);
    }
    
    onSettingsChange({
      ...settings,
      compressionLevel,
    });
  };

  /**
   * Handle structure preservation toggle
   */
  const handleStructurePreservationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const preserveStructure = event.target.checked;
    
    // Show warning if disabling structure preservation for APK
    if (archiveMetadata?.fileType === 'apk' && !preserveStructure) {
      setShowCompatibilityWarning(true);
    }
    
    onSettingsChange({
      ...settings,
      preserveStructure,
    });
  };

  /**
   * Handle integrity validation toggle
   */
  const handleIntegrityValidationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      validateIntegrity: event.target.checked,
    });
  };

  /**
   * Get compression level description
   */
  const getCompressionLevelDescription = (level: number): string => {
    const levelInfo = COMPRESSION_LEVELS.find(l => l.value === level);
    return levelInfo?.description || '';
  };

  /**
   * Get estimated compression ratio based on settings
   */
  const getEstimatedCompression = (): string => {
    const { compressionLevel } = settings;
    
    let baseCompression = 0;
    if (compressionLevel === 0) baseCompression = 0;
    else if (compressionLevel <= 1) baseCompression = 10;
    else if (compressionLevel <= 3) baseCompression = 25;
    else if (compressionLevel <= 6) baseCompression = 45;
    else baseCompression = 65;

    // APK files typically have lower compression ratios due to already compressed content
    if (archiveMetadata?.fileType === 'apk') {
      baseCompression = Math.floor(baseCompression * 0.6);
    }

    return `${Math.min(baseCompression, 70)}%`;
  };

  /**
   * Get processing time estimate
   */
  const getProcessingTimeEstimate = (): string => {
    const { compressionLevel } = settings;
    const entryCount = archiveMetadata?.entryCount || 1;
    
    let baseTime = 1; // seconds
    if (compressionLevel >= 6) baseTime = 3;
    else if (compressionLevel >= 3) baseTime = 2;
    
    // Scale with entry count
    const estimatedTime = baseTime * Math.log10(entryCount + 1);
    
    if (estimatedTime < 5) return 'A few seconds';
    if (estimatedTime < 30) return 'Less than 30 seconds';
    if (estimatedTime < 60) return 'About 1 minute';
    return 'Several minutes';
  };

  /**
   * Get compatibility warnings for APK files
   */
  const getAPKCompatibilityWarnings = (): string[] => {
    const warnings: string[] = [];
    
    if (archiveMetadata?.fileType === 'apk') {
      if (settings.compressionLevel >= 6) {
        warnings.push('High compression may cause installation failures on some devices');
      }
      
      if (!settings.preserveStructure) {
        warnings.push('Modifying APK structure may break digital signatures');
      }
      
      if (archiveMetadata.hasSignature && settings.compressionLevel > 3) {
        warnings.push('Signed APKs may become invalid with aggressive compression');
      }
    }
    
    return warnings;
  };

  return (
    <div className="archive-settings">
      <div className="archive-option">
        <label htmlFor="archive-compression-level" className="archive-label">
          Compression Level
          <span className="tooltip" data-tooltip="Higher levels provide better compression but take longer and may affect compatibility">
            ℹ️
          </span>
        </label>
        <select
          id="archive-compression-level"
          value={settings.compressionLevel.toString()}
          onChange={handleCompressionLevelChange}
          className="archive-select"
          disabled={disabled}
          aria-label="Archive compression level"
        >
          {COMPRESSION_LEVELS.map(level => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
        <span className="compression-description">
          {getCompressionLevelDescription(settings.compressionLevel)}
        </span>
      </div>

      <div className="archive-option">
        <label className="archive-checkbox-label">
          <input
            type="checkbox"
            checked={settings.preserveStructure}
            onChange={handleStructurePreservationChange}
            className="archive-checkbox"
            disabled={disabled}
          />
          Preserve archive structure
          <span className="tooltip" data-tooltip="Maintain original file organization and metadata (recommended for APK files)">
            ℹ️
          </span>
        </label>
      </div>

      <div className="archive-option">
        <label className="archive-checkbox-label">
          <input
            type="checkbox"
            checked={settings.validateIntegrity}
            onChange={handleIntegrityValidationChange}
            className="archive-checkbox"
            disabled={disabled}
          />
          Validate integrity after compression
          <span className="tooltip" data-tooltip="Verify the compressed archive is valid and can be extracted">
            ℹ️
          </span>
        </label>
      </div>

      {/* APK-specific warnings */}
      {archiveMetadata?.fileType === 'apk' && (
        <div className="apk-warnings">
          <div className="archive-warning" role="alert">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <span className="warning-title">APK Compression Notice</span>
              <span className="warning-text">
                Compressing APK files may affect installation and functionality. 
                Test compressed APKs thoroughly before distribution.
              </span>
            </div>
          </div>
          
          {getAPKCompatibilityWarnings().map((warning, index) => (
            <div key={index} className="archive-warning compatibility-warning" role="alert">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Archive preview information */}
      <div className="archive-preview">
        <h4 className="preview-title">Archive Information</h4>
        <div className="preview-grid">
          {archiveMetadata?.entryCount && (
            <div className="preview-item">
              <span className="preview-label">Entries:</span>
              <span className="preview-value">{archiveMetadata.entryCount.toLocaleString()}</span>
            </div>
          )}
          {archiveMetadata?.fileType && (
            <div className="preview-item">
              <span className="preview-label">Type:</span>
              <span className="preview-value">{archiveMetadata.fileType.toUpperCase()}</span>
            </div>
          )}
          <div className="preview-item">
            <span className="preview-label">Estimated Compression:</span>
            <span className="preview-value highlight">{getEstimatedCompression()}</span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Processing Time:</span>
            <span className="preview-value">{getProcessingTimeEstimate()}</span>
          </div>
          {archiveMetadata?.hasSignature && (
            <div className="preview-item">
              <span className="preview-label">Digital Signature:</span>
              <span className="preview-value warning">
                {settings.compressionLevel > 3 ? 'May be invalidated' : 'Should be preserved'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Integrity Warning Modal */}
      <Modal
        isOpen={showIntegrityWarning}
        title="High Compression Warning"
        type="warning"
        onClose={() => setShowIntegrityWarning(false)}
        actions={
          <div className="modal-actions">
            <button 
              className="modal-button secondary" 
              onClick={() => {
                setShowIntegrityWarning(false);
                onSettingsChange({
                  ...settings,
                  compressionLevel: 3, // Reset to safer level
                });
              }}
            >
              Use Safer Level
            </button>
            <button 
              className="modal-button primary" 
              onClick={() => setShowIntegrityWarning(false)}
            >
              Continue Anyway
            </button>
          </div>
        }
      >
        <div className="warning-modal-content">
          <p>
            <strong>High compression levels may cause issues with APK files:</strong>
          </p>
          <ul>
            <li>Installation may fail on some Android devices</li>
            <li>App may crash or behave unexpectedly</li>
            <li>Digital signatures may become invalid</li>
            <li>Play Store may reject the APK</li>
          </ul>
          <p>
            <strong>Recommendation:</strong> Use "Balanced Compression" or lower for APK files 
            unless you plan to thoroughly test the compressed APK.
          </p>
        </div>
      </Modal>

      {/* Compatibility Warning Modal */}
      <Modal
        isOpen={showCompatibilityWarning}
        title="Structure Modification Warning"
        type="warning"
        onClose={() => setShowCompatibilityWarning(false)}
        actions={
          <div className="modal-actions">
            <button 
              className="modal-button secondary" 
              onClick={() => {
                setShowCompatibilityWarning(false);
                onSettingsChange({
                  ...settings,
                  preserveStructure: true, // Reset to safer option
                });
              }}
            >
              Keep Structure
            </button>
            <button 
              className="modal-button primary" 
              onClick={() => setShowCompatibilityWarning(false)}
            >
              Continue Anyway
            </button>
          </div>
        }
      >
        <div className="warning-modal-content">
          <p>
            <strong>Modifying APK structure can cause serious issues:</strong>
          </p>
          <ul>
            <li>Digital signatures will be broken</li>
            <li>APK will not install without re-signing</li>
            <li>Android system may reject the modified APK</li>
            <li>App functionality may be compromised</li>
          </ul>
          <p>
            <strong>Recommendation:</strong> Keep "Preserve archive structure" enabled 
            for APK files to maintain compatibility.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ArchiveSettings;