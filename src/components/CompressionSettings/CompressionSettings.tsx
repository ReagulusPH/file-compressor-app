import React, { useState, useEffect } from 'react';
import './CompressionSettings.css';
import { TIFFSettings, AudioSettings as AudioSettingsType, DocumentSettings as DocumentSettingsType, ArchiveSettings as ArchiveSettingsType } from '../../types';
import AudioSettings from './AudioSettings';
import DocumentSettings from './DocumentSettings';
import ArchiveSettings from './ArchiveSettings';

/**
 * Compression settings interface
 */
export interface CompressionSettings {
  /**
   * Compression quality (0-100)
   */
  quality: number;

  /**
   * Output format for the compressed file
   */
  outputFormat: string;

  /**
   * Video resolution options (only applicable for video files)
   */
  resolution?: {
    width: number;
    height: number;
  };

  /**
   * TIFF-specific settings
   */
  tiffSettings?: TIFFSettings;

  /**
   * Audio-specific settings
   */
  audioSettings?: AudioSettingsType;

  /**
   * Document-specific settings
   */
  documentSettings?: DocumentSettingsType;

  /**
   * Archive-specific settings
   */
  archiveSettings?: ArchiveSettingsType;
}

/**
 * Props for the CompressionSettings component
 */
interface CompressionSettingsProps {
  /**
   * Array of file types being compressed
   */
  fileTypes: string[];

  /**
   * Current compression settings
   */
  settings: CompressionSettings;

  /**
   * Callback function called when settings change
   */
  onSettingsChange: (settings: CompressionSettings) => void;
}

/**
 * Available output formats based on file type
 */
const OUTPUT_FORMATS = {
  image: ['jpeg', 'png', 'webp'],
  tiff: ['jpeg', 'png', 'webp'], // TIFF can be converted to these formats
  video: ['mp4', 'webm'],
  audio: ['mp3', 'wav', 'ogg'],
  document: ['pdf', 'docx', 'xlsx', 'pptx'],
  archive: ['apk', 'zip'],
};

/**
 * Available video resolutions
 */
const VIDEO_RESOLUTIONS = [
  { label: 'Original', width: 0, height: 0 },
  { label: '4K (3840x2160)', width: 3840, height: 2160 },
  { label: '1080p (1920x1080)', width: 1920, height: 1080 },
  { label: '720p (1280x720)', width: 1280, height: 720 },
  { label: '480p (854x480)', width: 854, height: 480 },
  { label: '360p (640x360)', width: 640, height: 360 },
];

/**
 * CompressionSettings component for configuring compression options
 */
const CompressionSettingsComponent: React.FC<CompressionSettingsProps> = ({
  fileTypes,
  settings,
  onSettingsChange,
}) => {
  const [isCustom, setIsCustom] = useState(false);
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [showTIFFOptions, setShowTIFFOptions] = useState(false);
  const [showAudioOptions, setShowAudioOptions] = useState(false);
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);
  const [showArchiveOptions, setShowArchiveOptions] = useState(false);
  const [documentMetadata, setDocumentMetadata] = useState<{
    pageCount?: number;
    hasEmbeddedMedia?: boolean;
    isEncrypted?: boolean;
    fileType?: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'odt';
  }>();
  const [archiveMetadata, setArchiveMetadata] = useState<{
    entryCount?: number;
    hasSignature?: boolean;
    compressionRatio?: number;
    fileType?: 'apk';
    originalSize?: number;
  }>();

  // Determine if we're dealing with video files, audio files, document files, archive files, and different image types
  useEffect(() => {
    const hasVideoFiles = fileTypes.some(type => type.startsWith('video/'));
    const hasAudioFiles = fileTypes.some(type => type.startsWith('audio/'));
    const hasDocumentFiles = fileTypes.some(type => 
      type === 'application/pdf' || 
      type.includes('document') || 
      type.includes('spreadsheet') || 
      type.includes('presentation') ||
      type.includes('officedocument')
    );
    const hasArchiveFiles = fileTypes.some(type => 
      type === 'application/vnd.android.package-archive' ||
      type === 'application/zip'
    );
    const hasImageFiles = fileTypes.some(
      type => type.startsWith('image/') && type !== 'image/tiff'
    );
    const hasTIFFFiles = fileTypes.some(type => type === 'image/tiff');

    let formats: string[] = [];
    if (hasVideoFiles) {
      formats = [...formats, ...OUTPUT_FORMATS.video];
      setShowVideoOptions(true);
    } else {
      setShowVideoOptions(false);
    }

    if (hasAudioFiles) {
      formats = [...formats, ...OUTPUT_FORMATS.audio];
      setShowAudioOptions(true);

      // Initialize audio settings if not present
      if (!settings.audioSettings) {
        onSettingsChange({
          ...settings,
          audioSettings: {
            bitrate: 128,
            sampleRate: 44100,
            channels: 2,
            format: 'mp3',
          },
        });
      }
    } else {
      setShowAudioOptions(false);
    }

    if (hasDocumentFiles) {
      formats = [...formats, ...OUTPUT_FORMATS.document];
      setShowDocumentOptions(true);

      // Initialize document settings if not present
      if (!settings.documentSettings) {
        onSettingsChange({
          ...settings,
          documentSettings: {
            compressionLevel: 'medium',
            preserveMetadata: true,
            optimizeImages: true,
          },
        });
      }

      // Set document metadata based on file types (simplified for demo)
      const documentType = fileTypes.find(type => 
        type === 'application/pdf' || 
        type.includes('document') || 
        type.includes('spreadsheet') || 
        type.includes('presentation') ||
        type.includes('officedocument')
      );
      
      if (documentType) {
        let fileType: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'odt' = 'pdf';
        if (documentType === 'application/pdf') fileType = 'pdf';
        else if (documentType.includes('wordprocessing')) fileType = 'docx';
        else if (documentType.includes('spreadsheet')) fileType = 'xlsx';
        else if (documentType.includes('presentation')) fileType = 'pptx';
        
        setDocumentMetadata({
          pageCount: Math.floor(Math.random() * 50) + 1, // Mock data
          hasEmbeddedMedia: Math.random() > 0.5, // Mock data
          isEncrypted: false, // Mock data
          fileType,
        });
      }
    } else {
      setShowDocumentOptions(false);
    }

    if (hasArchiveFiles) {
      formats = [...formats, ...OUTPUT_FORMATS.archive];
      setShowArchiveOptions(true);

      // Initialize archive settings if not present
      if (!settings.archiveSettings) {
        onSettingsChange({
          ...settings,
          archiveSettings: {
            compressionLevel: 6, // Balanced compression
            preserveStructure: true,
            validateIntegrity: true,
          },
        });
      }

      // Set archive metadata based on file types
      const archiveType = fileTypes.find(type => 
        type === 'application/vnd.android.package-archive' ||
        type === 'application/zip'
      );
      
      if (archiveType) {
        let fileType: 'apk' = 'apk';
        if (archiveType === 'application/vnd.android.package-archive') fileType = 'apk';
        
        setArchiveMetadata({
          entryCount: Math.floor(Math.random() * 1000) + 50, // Mock data
          hasSignature: fileType === 'apk' ? Math.random() > 0.3 : false, // Mock data - most APKs are signed
          compressionRatio: Math.random() * 0.3 + 0.1, // Mock data - 10-40% already compressed
          fileType,
          originalSize: Math.floor(Math.random() * 50000000) + 1000000, // Mock data - 1-50MB
        });
      }
    } else {
      setShowArchiveOptions(false);
    }

    if (hasImageFiles) {
      formats = [...formats, ...OUTPUT_FORMATS.image];
    }

    if (hasTIFFFiles) {
      formats = [...formats, ...OUTPUT_FORMATS.tiff];
      setShowTIFFOptions(true);

      // Initialize TIFF settings if not present
      if (!settings.tiffSettings) {
        onSettingsChange({
          ...settings,
          tiffSettings: {
            pageIndex: 0,
            preserveMetadata: true,
            convertToFormat: 'jpeg',
          },
        });
      }
    } else {
      setShowTIFFOptions(false);
    }

    // Remove duplicates
    setAvailableFormats(Array.from(new Set(formats)));

    // If no video files, reset resolution
    if (!hasVideoFiles && settings.resolution) {
      onSettingsChange({
        ...settings,
        resolution: undefined,
      });
    }

    // If no audio files, reset audio settings
    if (!hasAudioFiles && settings.audioSettings) {
      onSettingsChange({
        ...settings,
        audioSettings: undefined,
      });
    }

    // If no document files, reset document settings
    if (!hasDocumentFiles && settings.documentSettings) {
      onSettingsChange({
        ...settings,
        documentSettings: undefined,
      });
    }

    // If no archive files, reset archive settings
    if (!hasArchiveFiles && settings.archiveSettings) {
      onSettingsChange({
        ...settings,
        archiveSettings: undefined,
      });
    }
  }, [fileTypes, settings, onSettingsChange]);

  /**
   * Handle quality change
   */
  const handleQualityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const quality = parseInt(event.target.value, 10);
    onSettingsChange({
      ...settings,
      quality,
    });
  };

  /**
   * Handle output format change
   */
  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({
      ...settings,
      outputFormat: event.target.value,
    });
  };

  /**
   * Handle resolution change
   */
  const handleResolutionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedResolution = VIDEO_RESOLUTIONS.find(
      res => `${res.width}x${res.height}` === event.target.value
    );

    if (selectedResolution) {
      onSettingsChange({
        ...settings,
        resolution:
          selectedResolution.width === 0
            ? undefined
            : {
                width: selectedResolution.width,
                height: selectedResolution.height,
              },
      });
    }
  };

  /**
   * Toggle between default and custom compression
   */
  const handleCompressionTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isCustomCompression = event.target.value === 'custom';
    setIsCustom(isCustomCompression);

    // If switching to default, reset quality to 60 for balanced compression
    if (!isCustomCompression) {
      onSettingsChange({
        ...settings,
        quality: 60, // Balanced default quality
      });
    }
  };

  /**
   * Handle TIFF page index change
   */
  const handleTIFFPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const pageIndex = parseInt(event.target.value, 10);
    onSettingsChange({
      ...settings,
      tiffSettings: {
        ...settings.tiffSettings!,
        pageIndex,
      },
    });
  };

  /**
   * Handle TIFF metadata preservation toggle
   */
  const handleTIFFMetadataChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      tiffSettings: {
        ...settings.tiffSettings!,
        preserveMetadata: event.target.checked,
      },
    });
  };

  /**
   * Handle TIFF conversion format change
   */
  const handleTIFFFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const convertToFormat = event.target.value as 'jpeg' | 'png' | 'webp';
    onSettingsChange({
      ...settings,
      tiffSettings: {
        ...settings.tiffSettings!,
        convertToFormat,
      },
      outputFormat: convertToFormat, // Also update the main output format
    });
  };

  /**
   * Handle audio settings change
   */
  const handleAudioSettingsChange = (audioSettings: AudioSettingsType) => {
    onSettingsChange({
      ...settings,
      audioSettings,
      outputFormat: audioSettings.format, // Update main output format to match audio format
    });
  };

  /**
   * Handle document settings change
   */
  const handleDocumentSettingsChange = (documentSettings: DocumentSettingsType) => {
    onSettingsChange({
      ...settings,
      documentSettings,
    });
  };

  /**
   * Handle archive settings change
   */
  const handleArchiveSettingsChange = (archiveSettings: ArchiveSettingsType) => {
    onSettingsChange({
      ...settings,
      archiveSettings,
    });
  };

  /**
   * Get quality label based on current quality value
   */
  const getQualityLabel = (quality: number): string => {
    if (quality >= 80) return 'High Quality (Larger File)';
    if (quality >= 50) return 'Balanced';
    return 'Small Size (Lower Quality)';
  };

  return (
    <div className="compression-settings">
      <h2 className="settings-title">Compression Settings</h2>

      <div className="settings-section">
        <h3 className="section-title">Compression Type</h3>
        <div className="compression-type-toggle">
          <label className={`toggle-option ${!isCustom ? 'active' : ''}`}>
            <input
              type="radio"
              name="compressionType"
              value="default"
              checked={!isCustom}
              onChange={handleCompressionTypeChange}
            />
            <span className="toggle-label">Default</span>
            <span className="toggle-description">
              Balanced compression (moderate size reduction)
            </span>
          </label>

          <label className={`toggle-option ${isCustom ? 'active' : ''}`}>
            <input
              type="radio"
              name="compressionType"
              value="custom"
              checked={isCustom}
              onChange={handleCompressionTypeChange}
            />
            <span className="toggle-label">Custom</span>
            <span className="toggle-description">Adjust compression settings manually</span>
          </label>
        </div>
      </div>

      {isCustom && (
        <>
          <div className="settings-section">
            <h3 className="section-title">
              Quality
              <span className="tooltip" data-tooltip="Higher quality means larger file size">
                ℹ️
              </span>
            </h3>
            <div className="quality-slider-container">
              <input
                type="range"
                min="10"
                max="100"
                value={settings.quality}
                onChange={handleQualityChange}
                className="quality-slider"
                aria-label="Compression quality"
              />
              <div className="quality-labels">
                <span>Small Size</span>
                <span className="current-quality">
                  {getQualityLabel(settings.quality)} ({settings.quality}%)
                </span>
                <span>High Quality</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="section-title">
              Output Format
              <span
                className="tooltip"
                data-tooltip="Different formats have different compression characteristics"
              >
                ℹ️
              </span>
            </h3>
            <select
              value={settings.outputFormat}
              onChange={handleFormatChange}
              className="format-select"
              aria-label="Output format"
            >
              {availableFormats.map(format => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {showVideoOptions && (
            <div className="settings-section">
              <h3 className="section-title">
                Video Resolution
                <span className="tooltip" data-tooltip="Lower resolution means smaller file size">
                  ℹ️
                </span>
              </h3>
              <select
                value={
                  settings.resolution
                    ? `${settings.resolution.width}x${settings.resolution.height}`
                    : '0x0'
                }
                onChange={handleResolutionChange}
                className="resolution-select"
                aria-label="Video resolution"
              >
                {VIDEO_RESOLUTIONS.map(res => (
                  <option key={`${res.width}x${res.height}`} value={`${res.width}x${res.height}`}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showTIFFOptions && settings.tiffSettings && (
            <div className="settings-section">
              <h3 className="section-title">
                TIFF Options
                <span className="tooltip" data-tooltip="TIFF-specific compression settings">
                  ℹ️
                </span>
              </h3>

              <div className="tiff-options">
                <div className="tiff-option">
                  <label htmlFor="tiff-page-index" className="tiff-label">
                    Page Index (for multi-page TIFF):
                  </label>
                  <input
                    id="tiff-page-index"
                    type="number"
                    min="0"
                    value={settings.tiffSettings.pageIndex}
                    onChange={handleTIFFPageChange}
                    className="tiff-page-input"
                    aria-label="TIFF page index"
                  />
                </div>

                <div className="tiff-option">
                  <label className="tiff-checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.tiffSettings.preserveMetadata}
                      onChange={handleTIFFMetadataChange}
                      className="tiff-checkbox"
                    />
                    Preserve TIFF metadata
                  </label>
                </div>

                <div className="tiff-option">
                  <label htmlFor="tiff-convert-format" className="tiff-label">
                    Convert to format:
                  </label>
                  <select
                    id="tiff-convert-format"
                    value={settings.tiffSettings.convertToFormat}
                    onChange={handleTIFFFormatChange}
                    className="tiff-format-select"
                    aria-label="TIFF conversion format"
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {showAudioOptions && settings.audioSettings && (
            <div className="settings-section">
              <h3 className="section-title">
                Audio Options
                <span className="tooltip" data-tooltip="Audio-specific compression settings">
                  ℹ️
                </span>
              </h3>
              <AudioSettings
                settings={settings.audioSettings}
                onSettingsChange={handleAudioSettingsChange}
                disabled={false}
              />
            </div>
          )}

          {showDocumentOptions && settings.documentSettings && (
            <div className="settings-section">
              <h3 className="section-title">
                Document Options
                <span className="tooltip" data-tooltip="Document-specific compression settings">
                  ℹ️
                </span>
              </h3>
              <DocumentSettings
                settings={settings.documentSettings}
                onSettingsChange={handleDocumentSettingsChange}
                disabled={false}
                documentMetadata={documentMetadata}
              />
            </div>
          )}

          {showArchiveOptions && settings.archiveSettings && (
            <div className="settings-section">
              <h3 className="section-title">
                Archive Options
                <span className="tooltip" data-tooltip="Archive-specific compression settings with safety warnings">
                  ℹ️
                </span>
              </h3>
              <ArchiveSettings
                settings={settings.archiveSettings}
                onSettingsChange={handleArchiveSettingsChange}
                disabled={false}
                archiveMetadata={archiveMetadata}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompressionSettingsComponent;
