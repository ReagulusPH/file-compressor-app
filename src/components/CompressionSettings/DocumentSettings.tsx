import React from 'react';
import { DocumentSettings as DocumentSettingsType } from '../../types';

/**
 * Props for the DocumentSettings component
 */
interface DocumentSettingsProps {
  /**
   * Current document settings
   */
  settings: DocumentSettingsType;

  /**
   * Callback function called when settings change
   */
  onSettingsChange: (settings: DocumentSettingsType) => void;

  /**
   * Whether the settings are disabled
   */
  disabled?: boolean;

  /**
   * Document metadata for context-aware settings
   */
  documentMetadata?: {
    pageCount?: number;
    hasEmbeddedMedia?: boolean;
    isEncrypted?: boolean;
    fileType?: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'odt';
  };
}

/**
 * DocumentSettings component for configuring document-specific compression options
 */
const DocumentSettings: React.FC<DocumentSettingsProps> = ({
  settings,
  onSettingsChange,
  disabled = false,
  documentMetadata,
}) => {
  /**
   * Handle compression level change
   */
  const handleCompressionLevelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const compressionLevel = event.target.value as 'low' | 'medium' | 'high';
    onSettingsChange({
      ...settings,
      compressionLevel,
    });
  };

  /**
   * Handle metadata preservation toggle
   */
  const handleMetadataPreservationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      preserveMetadata: event.target.checked,
    });
  };

  /**
   * Handle image optimization toggle
   */
  const handleImageOptimizationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      optimizeImages: event.target.checked,
    });
  };

  /**
   * Get compression level description
   */
  const getCompressionLevelDescription = (level: string): string => {
    switch (level) {
      case 'low':
        return 'Minimal compression, preserves quality and structure';
      case 'medium':
        return 'Balanced compression with good quality retention';
      case 'high':
        return 'Maximum compression, may affect quality';
      default:
        return '';
    }
  };

  /**
   * Get estimated compression ratio based on settings
   */
  const getEstimatedCompression = (): string => {
    let baseCompression = 0;
    
    switch (settings.compressionLevel) {
      case 'low':
        baseCompression = 15;
        break;
      case 'medium':
        baseCompression = 35;
        break;
      case 'high':
        baseCompression = 55;
        break;
    }

    // Adjust based on image optimization
    if (settings.optimizeImages && documentMetadata?.hasEmbeddedMedia) {
      baseCompression += 15;
    }

    // Adjust based on document type
    if (documentMetadata?.fileType === 'pdf') {
      baseCompression += 10; // PDFs typically compress better
    }

    return `${Math.min(baseCompression, 70)}%`;
  };

  return (
    <div className="document-settings">
      <div className="document-option">
        <label htmlFor="document-compression-level" className="document-label">
          Compression Level
          <span className="tooltip" data-tooltip="Higher levels provide better compression but may affect quality">
            ℹ️
          </span>
        </label>
        <select
          id="document-compression-level"
          value={settings.compressionLevel}
          onChange={handleCompressionLevelChange}
          className="document-select"
          disabled={disabled}
          aria-label="Document compression level"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <span className="compression-description">
          {getCompressionLevelDescription(settings.compressionLevel)}
        </span>
      </div>

      <div className="document-option">
        <label className="document-checkbox-label">
          <input
            type="checkbox"
            checked={settings.preserveMetadata}
            onChange={handleMetadataPreservationChange}
            className="document-checkbox"
            disabled={disabled}
          />
          Preserve document metadata
          <span className="tooltip" data-tooltip="Keep author, creation date, and other document properties">
            ℹ️
          </span>
        </label>
      </div>

      <div className="document-option">
        <label className="document-checkbox-label">
          <input
            type="checkbox"
            checked={settings.optimizeImages}
            onChange={handleImageOptimizationChange}
            className="document-checkbox"
            disabled={disabled || !documentMetadata?.hasEmbeddedMedia}
          />
          Optimize embedded images
          <span className="tooltip" data-tooltip="Compress images within the document for better size reduction">
            ℹ️
          </span>
        </label>
        {!documentMetadata?.hasEmbeddedMedia && (
          <span className="option-note">No embedded media detected</span>
        )}
      </div>

      {/* Document-specific warnings */}
      {documentMetadata?.isEncrypted && (
        <div className="document-warning" role="alert">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            Encrypted documents may have limited compression options
          </span>
        </div>
      )}

      {documentMetadata?.fileType === 'pdf' && settings.compressionLevel === 'high' && (
        <div className="document-warning" role="alert">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            High compression may affect PDF text readability
          </span>
        </div>
      )}

      {/* Document preview information */}
      <div className="document-preview">
        <h4 className="preview-title">Document Information</h4>
        <div className="preview-grid">
          {documentMetadata?.pageCount && (
            <div className="preview-item">
              <span className="preview-label">Pages:</span>
              <span className="preview-value">{documentMetadata.pageCount}</span>
            </div>
          )}
          {documentMetadata?.fileType && (
            <div className="preview-item">
              <span className="preview-label">Type:</span>
              <span className="preview-value">{documentMetadata.fileType.toUpperCase()}</span>
            </div>
          )}
          <div className="preview-item">
            <span className="preview-label">Estimated Compression:</span>
            <span className="preview-value highlight">{getEstimatedCompression()}</span>
          </div>
          {documentMetadata?.hasEmbeddedMedia && (
            <div className="preview-item">
              <span className="preview-label">Embedded Media:</span>
              <span className="preview-value">
                {settings.optimizeImages ? 'Will be optimized' : 'Will be preserved'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSettings;