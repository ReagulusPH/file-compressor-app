import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock lazy-loaded components to prevent skeleton loading
jest.mock('./components/Header', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="header">
      <h1>File Compressor</h1>
    </div>
  ),
}));

jest.mock('./components/ImageCompressorDemo', () => ({
  __esModule: true,
  default: () => <div data-testid="main-content">Image Compressor Demo</div>,
}));

jest.mock('./components/Feedback/ToastContainer', () => ({
  __esModule: true,
  default: () => <div data-testid="toast-container"></div>,
}));

jest.mock('./components/Feedback/BrowserCompatibilityMessage', () => ({
  __esModule: true,
  default: () => <div data-testid="browser-compatibility"></div>,
}));

jest.mock('./components/Feedback/PrivacyMessage', () => ({
  __esModule: true,
  default: () => <div data-testid="privacy-message"></div>,
}));

// Mock SecureProcessing
jest.mock('./utils/security/SecureProcessing', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    isSecure: jest.fn(() => true),
    cleanup: jest.fn(),
  },
}));

test('renders the File Compressor header', async () => {
  render(<App />);

  // Wait for lazy-loaded components to render
  await waitFor(() => {
    const headerElement = screen.getByText('File Compressor');
    expect(headerElement).toBeInTheDocument();
  });
});
