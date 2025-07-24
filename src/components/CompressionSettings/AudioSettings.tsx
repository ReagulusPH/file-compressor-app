import React from 'react';
import { AudioSettings as AudioSettingsType } from '../../types';

/**
 * Props for the AudioSettings component
 */
interface AudioSettingsProps {
  /**
   * Current audio settings
   */
  settings: AudioSettingsType;

  /**
   * Callback function called when settings change
   */
  onSettingsChange: (settings: AudioSettingsType) => void;

  /**
   * Whether the settings are disabled
   */
  disabled?: boolean;
}

/**
 * Available bitrate options for audio compression
 */
const BITRATE_OPTIONS = [
  { value: 64, label: '64 kbps (Low Quality)' },
  { value: 96, label: '96 kbps (Medium-Low)' },
  { value: 128, label: '128 kbps (Standard)' },
  { value: 160, label: '160 kbps (Good)' },
  { value: 192, label: '192 kbps (High)' },
  { value: 256, label: '256 kbps (Very High)' },
  { value: 320, label: '320 kbps (Maximum)' },
];

/**
 * Available sample rate options
 */
const SAMPLE_RATE_OPTIONS = [
  { value: 22050, label: '22.05 kHz (Low)' },
  { value: 44100, label: '44.1 kHz (CD Quality)' },
  { value: 48000, label: '48 kHz (Professional)' },
];

/**
 * Available audio formats
 */
const AUDIO_FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3 (Most Compatible)' },
  { value: 'wav', label: 'WAV (Uncompressed)' },
  { value: 'ogg', label: 'OGG (Open Source)' },
];

/**
 * AudioSettings component for configuring audio compression options
 */
const AudioSettings: React.FC<AudioSettingsProps> = ({
  settings,
  onSettingsChange,
  disabled = false,
}) => {
  /**
   * Handle bitrate change
   */
  const handleBitrateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const bitrate = parseInt(event.target.value, 10);
    onSettingsChange({
      ...settings,
      bitrate,
    });
  };

  /**
   * Handle sample rate change
   */
  const handleSampleRateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sampleRate = parseInt(event.target.value, 10);
    onSettingsChange({
      ...settings,
      sampleRate,
    });
  };

  /**
   * Handle channels change
   */
  const handleChannelsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const channels = parseInt(event.target.value, 10) as 1 | 2;
    onSettingsChange({
      ...settings,
      channels,
    });
  };

  /**
   * Handle format change
   */
  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const format = event.target.value as 'mp3' | 'wav' | 'ogg';
    onSettingsChange({
      ...settings,
      format,
    });
  };

  /**
   * Get estimated file size reduction based on settings
   */
  const getEstimatedReduction = (): string => {
    const { bitrate, format } = settings;

    if (format === 'wav') {
      return 'No compression (original size)';
    }

    if (bitrate <= 96) {
      return '70-80% size reduction';
    } else if (bitrate <= 160) {
      return '50-70% size reduction';
    } else if (bitrate <= 256) {
      return '30-50% size reduction';
    } else {
      return '10-30% size reduction';
    }
  };

  /**
   * Get quality description based on bitrate
   */
  const getQualityDescription = (): string => {
    const { bitrate } = settings;

    if (bitrate <= 96) {
      return 'Suitable for voice recordings';
    } else if (bitrate <= 160) {
      return 'Good for most music';
    } else if (bitrate <= 256) {
      return 'High quality music';
    } else {
      return 'Professional/audiophile quality';
    }
  };

  return (
    <div className="audio-settings">
      <div className="audio-option">
        <label htmlFor="audio-bitrate" className="audio-label">
          Bitrate:
          <span
            className="tooltip"
            data-tooltip="Higher bitrate means better quality but larger file size"
          >
            ℹ️
          </span>
        </label>
        <select
          id="audio-bitrate"
          value={settings.bitrate.toString()}
          onChange={handleBitrateChange}
          className="audio-select"
          disabled={disabled}
          aria-label="Audio bitrate"
        >
          {BITRATE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="audio-option">
        <label htmlFor="audio-sample-rate" className="audio-label">
          Sample Rate:
          <span className="tooltip" data-tooltip="Higher sample rate captures more audio detail">
            ℹ️
          </span>
        </label>
        <select
          id="audio-sample-rate"
          value={settings.sampleRate.toString()}
          onChange={handleSampleRateChange}
          className="audio-select"
          disabled={disabled}
          aria-label="Audio sample rate"
        >
          {SAMPLE_RATE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="audio-option">
        <label htmlFor="audio-channels" className="audio-label">
          Channels:
          <span className="tooltip" data-tooltip="Mono (1) or Stereo (2) audio">
            ℹ️
          </span>
        </label>
        <select
          id="audio-channels"
          value={settings.channels.toString()}
          onChange={handleChannelsChange}
          className="audio-select"
          disabled={disabled}
          aria-label="Audio channels"
        >
          <option value={1}>Mono (1 channel)</option>
          <option value={2}>Stereo (2 channels)</option>
        </select>
      </div>

      <div className="audio-option">
        <label htmlFor="audio-format" className="audio-label">
          Output Format:
          <span
            className="tooltip"
            data-tooltip="Different formats have different compression characteristics"
          >
            ℹ️
          </span>
        </label>
        <select
          id="audio-format"
          value={settings.format}
          onChange={handleFormatChange}
          className="audio-select"
          disabled={disabled}
          aria-label="Audio output format"
        >
          {AUDIO_FORMAT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="audio-preview">
        <div className="preview-item">
          <span className="preview-label">Estimated Size Reduction:</span>
          <span className="preview-value">{getEstimatedReduction()}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">Quality Level:</span>
          <span className="preview-value">{getQualityDescription()}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;
