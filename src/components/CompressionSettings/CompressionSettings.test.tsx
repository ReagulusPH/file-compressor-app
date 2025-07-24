import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompressionSettings from './CompressionSettings';
import { CompressionSettings as CompressionSettingsType } from './CompressionSettings';

describe('CompressionSettings Component', () => {
  const defaultSettings: CompressionSettingsType = {
    quality: 60,
    outputFormat: 'jpeg',
  };

  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    mockOnSettingsChange.mockClear();
  });

  test('renders with default compression option selected', () => {
    render(
      <CompressionSettings
        fileTypes={['image/jpeg']}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Check if the component renders with default compression selected
    const defaultRadio = screen.getByDisplayValue('default');
    expect(defaultRadio).toBeChecked();

    // Quality slider should not be visible in default mode
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  test('switches to custom compression mode', () => {
    render(
      <CompressionSettings
        fileTypes={['image/jpeg']}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Switch to custom mode
    const customRadio = screen.getByDisplayValue('custom');
    fireEvent.click(customRadio);

    // Quality slider should now be visible
    expect(screen.getByRole('slider')).toBeInTheDocument();
    // Check for the quality label in the current-quality span
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });

  test('adjusts quality slider in custom mode', () => {
    render(
      <CompressionSettings
        fileTypes={['image/jpeg']}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Switch to custom mode
    const customRadio = screen.getByDisplayValue('custom');
    fireEvent.click(customRadio);

    // Change quality slider
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '80' } });

    // Check if onSettingsChange was called with updated quality
    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      quality: 80,
    });
  });

  test('shows video resolution options for video files', () => {
    render(
      <CompressionSettings
        fileTypes={['video/mp4']}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Switch to custom mode
    const customRadio = screen.getByDisplayValue('custom');
    fireEvent.click(customRadio);

    // Video resolution options should be visible
    expect(screen.getByText('Video Resolution')).toBeInTheDocument();
    // Find the select element for video resolution
    const resolutionSelect = screen.getAllByRole('combobox')[1]; // Second combobox is resolution
    expect(resolutionSelect).toBeInTheDocument();
  });

  test('does not show video resolution options for image files', () => {
    render(
      <CompressionSettings
        fileTypes={['image/jpeg']}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Switch to custom mode
    const customRadio = screen.getByDisplayValue('custom');
    fireEvent.click(customRadio);

    // Video resolution options should not be visible
    expect(screen.queryByText('Video Resolution')).not.toBeInTheDocument();
  });

  test('changes output format', () => {
    render(
      <CompressionSettings
        fileTypes={['image/jpeg']}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Switch to custom mode
    const customRadio = screen.getByDisplayValue('custom');
    fireEvent.click(customRadio);

    // Change output format
    const formatSelect = screen.getByRole('combobox');
    fireEvent.change(formatSelect, { target: { value: 'png' } });

    // Check if onSettingsChange was called with updated format
    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      outputFormat: 'png',
    });
  });

  test('changes video resolution', () => {
    const videoSettings: CompressionSettingsType = {
      quality: 60,
      outputFormat: 'mp4',
    };

    render(
      <CompressionSettings
        fileTypes={['video/mp4']}
        settings={videoSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Switch to custom mode
    const customRadio = screen.getByDisplayValue('custom');
    fireEvent.click(customRadio);

    // Change resolution
    const resolutionSelect = screen.getAllByRole('combobox')[1]; // Second combobox is resolution
    fireEvent.change(resolutionSelect, { target: { value: '1920x1080' } });

    // Check if onSettingsChange was called with updated resolution
    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...videoSettings,
      resolution: {
        width: 1920,
        height: 1080,
      },
    });
  });

  test('resets to default quality when switching from custom to default', () => {
    const customSettings: CompressionSettingsType = {
      quality: 90,
      outputFormat: 'jpeg',
    };

    render(
      <CompressionSettings
        fileTypes={['image/jpeg']}
        settings={customSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Start in custom mode
    const customRadio = screen.getByDisplayValue('custom');
    fireEvent.click(customRadio);

    // Switch back to default
    const defaultRadio = screen.getByDisplayValue('default');
    fireEvent.click(defaultRadio);

    // Check if onSettingsChange was called with reset quality
    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...customSettings,
      quality: 60,
    });
  });
});
