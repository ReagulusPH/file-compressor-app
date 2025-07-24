import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AudioSettings from './AudioSettings';
import { AudioSettings as AudioSettingsType } from '../../types';

describe('AudioSettings Component', () => {
  const defaultSettings: AudioSettingsType = {
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    format: 'mp3',
  };

  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    mockOnSettingsChange.mockClear();
  });

  it('renders with default settings', () => {
    render(
      <AudioSettings settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
    );

    const bitrateSelect = screen.getByLabelText('Audio bitrate') as HTMLSelectElement;
    const sampleRateSelect = screen.getByLabelText('Audio sample rate') as HTMLSelectElement;
    const channelsSelect = screen.getByLabelText('Audio channels') as HTMLSelectElement;
    const formatSelect = screen.getByLabelText('Audio output format') as HTMLSelectElement;

    expect(bitrateSelect.value).toBe('128');
    expect(sampleRateSelect.value).toBe('44100');
    expect(channelsSelect.value).toBe('2');
    expect(formatSelect.value).toBe('mp3');
  });

  it('calls onSettingsChange when bitrate changes', () => {
    render(
      <AudioSettings settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
    );

    const bitrateSelect = screen.getByLabelText('Audio bitrate');
    fireEvent.change(bitrateSelect, { target: { value: '192' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      bitrate: 192,
    });
  });

  it('calls onSettingsChange when sample rate changes', () => {
    render(
      <AudioSettings settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
    );

    const sampleRateSelect = screen.getByLabelText('Audio sample rate');
    fireEvent.change(sampleRateSelect, { target: { value: '48000' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      sampleRate: 48000,
    });
  });

  it('calls onSettingsChange when channels change', () => {
    render(
      <AudioSettings settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
    );

    const channelsSelect = screen.getByLabelText('Audio channels');
    fireEvent.change(channelsSelect, { target: { value: '1' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      channels: 1,
    });
  });

  it('calls onSettingsChange when format changes', () => {
    render(
      <AudioSettings settings={defaultSettings} onSettingsChange={mockOnSettingsChange} />
    );

    const formatSelect = screen.getByLabelText('Audio output format');
    fireEvent.change(formatSelect, { target: { value: 'wav' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      format: 'wav',
    });
  });

  it('shows correct quality preview for different bitrates', () => {
    const lowBitrateSettings = { ...defaultSettings, bitrate: 64 };
    const { rerender } = render(
      <AudioSettings settings={lowBitrateSettings} onSettingsChange={mockOnSettingsChange} />
    );

    expect(screen.getByText('Suitable for voice recordings')).toBeInTheDocument();

    const highBitrateSettings = { ...defaultSettings, bitrate: 320 };
    rerender(
      <AudioSettings settings={highBitrateSettings} onSettingsChange={mockOnSettingsChange} />
    );

    expect(screen.getByText('Professional/audiophile quality')).toBeInTheDocument();
  });

  it('shows correct size reduction estimate for WAV format', () => {
    const wavSettings = { ...defaultSettings, format: 'wav' as const };
    render(<AudioSettings settings={wavSettings} onSettingsChange={mockOnSettingsChange} />);

    expect(screen.getByText('No compression (original size)')).toBeInTheDocument();
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <AudioSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        disabled={true}
      />
    );

    expect(screen.getByLabelText('Audio bitrate')).toBeDisabled();
    expect(screen.getByLabelText('Audio sample rate')).toBeDisabled();
    expect(screen.getByLabelText('Audio channels')).toBeDisabled();
    expect(screen.getByLabelText('Audio output format')).toBeDisabled();
  });
});