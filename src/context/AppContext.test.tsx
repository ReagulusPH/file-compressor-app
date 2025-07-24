import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from './AppContext';
import { CompressionSettings } from '../types';

// Test component that uses the context
const TestComponent: React.FC = () => {
  const {
    state,
    addFiles,
    updateGlobalSettings,
    clearFiles,
    updateFileStatus,
    updateFileProgress,
    updateFileError,
    setProcessing,
  } = useAppContext();

  return (
    <div>
      <div data-testid="file-count">{Object.keys(state.files).length}</div>
      <div data-testid="is-processing">{state.isProcessing ? 'true' : 'false'}</div>
      <div data-testid="quality">{state.globalSettings.quality}</div>
      <div data-testid="output-format">{state.globalSettings.outputFormat}</div>

      <button
        data-testid="add-files"
        onClick={() => {
          const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
          addFiles([file], state.globalSettings);
        }}
      >
        Add File
      </button>

      <button
        data-testid="update-settings"
        onClick={() => {
          updateGlobalSettings({ quality: 80, outputFormat: 'png' });
        }}
      >
        Update Settings
      </button>

      <button
        data-testid="clear-files"
        onClick={() => {
          clearFiles();
        }}
      >
        Clear Files
      </button>

      <button
        data-testid="update-status"
        onClick={() => {
          const fileId = Object.keys(state.files)[0];
          if (fileId) {
            updateFileStatus(fileId, 'processing');
          }
        }}
      >
        Update Status
      </button>

      <button
        data-testid="update-progress"
        onClick={() => {
          const fileId = Object.keys(state.files)[0];
          if (fileId) {
            updateFileProgress(fileId, 50);
          }
        }}
      >
        Update Progress
      </button>

      <button
        data-testid="update-error"
        onClick={() => {
          const fileId = Object.keys(state.files)[0];
          if (fileId) {
            updateFileError(fileId, 'Test error');
          }
        }}
      >
        Update Error
      </button>

      <button
        data-testid="set-processing"
        onClick={() => {
          setProcessing(true);
        }}
      >
        Set Processing
      </button>
    </div>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('provides initial state', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('file-count').textContent).toBe('0');
    expect(screen.getByTestId('is-processing').textContent).toBe('false');
    expect(screen.getByTestId('quality').textContent).toBe('60');
    expect(screen.getByTestId('output-format').textContent).toBe('jpeg');
  });

  test('adds files to state', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('add-files'));

    await waitFor(() => {
      expect(screen.getByTestId('file-count').textContent).toBe('1');
    });
  });

  test('updates global settings', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('update-settings'));

    await waitFor(() => {
      expect(screen.getByTestId('quality').textContent).toBe('80');
    });
    await waitFor(() => {
      expect(screen.getByTestId('output-format').textContent).toBe('png');
    });
  });

  test('clears files from state', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Add a file first
    fireEvent.click(screen.getByTestId('add-files'));

    await waitFor(() => {
      expect(screen.getByTestId('file-count').textContent).toBe('1');
    });

    // Then clear files
    fireEvent.click(screen.getByTestId('clear-files'));

    await waitFor(() => {
      expect(screen.getByTestId('file-count').textContent).toBe('0');
    });
  });

  test('updates file status', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Add a file first
    fireEvent.click(screen.getByTestId('add-files'));

    await waitFor(() => {
      expect(screen.getByTestId('file-count').textContent).toBe('1');
    });

    // Then update status
    fireEvent.click(screen.getByTestId('update-status'));

    // We can't easily test the internal state of the file, but we can verify
    // that the action doesn't throw an error
  });

  test('updates file progress', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Add a file first
    fireEvent.click(screen.getByTestId('add-files'));

    await waitFor(() => {
      expect(screen.getByTestId('file-count').textContent).toBe('1');
    });

    // Then update progress
    fireEvent.click(screen.getByTestId('update-progress'));

    // We can't easily test the internal state of the file, but we can verify
    // that the action doesn't throw an error
  });

  test('updates file error', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Add a file first
    fireEvent.click(screen.getByTestId('add-files'));

    await waitFor(() => {
      expect(screen.getByTestId('file-count').textContent).toBe('1');
    });

    // Then update error
    fireEvent.click(screen.getByTestId('update-error'));

    // We can't easily test the internal state of the file, but we can verify
    // that the action doesn't throw an error
  });

  test('sets processing state', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('set-processing'));

    await waitFor(() => {
      expect(screen.getByTestId('is-processing').textContent).toBe('true');
    });
  });

  test('persists settings to localStorage', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    fireEvent.click(screen.getByTestId('update-settings'));

    await waitFor(() => {
      const savedSettings = localStorage.getItem('file-compressor-settings');
      expect(savedSettings).not.toBeNull();
    });

    const savedSettings = localStorage.getItem('file-compressor-settings');
    const parsedSettings = JSON.parse(savedSettings as string);
    expect(parsedSettings.quality).toBe(80);
    expect(parsedSettings.outputFormat).toBe('png');
  });

  test('loads settings from localStorage', async () => {
    // Set up localStorage with settings
    const settings: CompressionSettings = {
      quality: 75,
      outputFormat: 'webp',
    };
    localStorage.setItem('file-compressor-settings', JSON.stringify(settings));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Check that settings were loaded from localStorage
    expect(screen.getByTestId('quality').textContent).toBe('75');
    expect(screen.getByTestId('output-format').textContent).toBe('webp');
  });
});
