import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock ReactDOM.createPortal
jest.mock('react-dom', () => {
  return {
    ...jest.requireActual('react-dom'),
    createPortal: (element: React.ReactNode) => element,
  };
});

describe('Modal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders correctly when open', () => {
    render(
      <Modal isOpen={true} title="Test Modal" onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} title="Test Modal" onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <Modal isOpen={true} title="Test Modal" onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );

    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders with different types', () => {
    const { rerender } = render(
      <Modal isOpen={true} title="Error Modal" onClose={mockOnClose} type="error">
        <p>Error content</p>
      </Modal>
    );

    expect(document.querySelector('.modal-error')).toBeInTheDocument();

    rerender(
      <Modal isOpen={true} title="Warning Modal" onClose={mockOnClose} type="warning">
        <p>Warning content</p>
      </Modal>
    );

    expect(document.querySelector('.modal-warning')).toBeInTheDocument();

    rerender(
      <Modal isOpen={true} title="Info Modal" onClose={mockOnClose} type="info">
        <p>Info content</p>
      </Modal>
    );

    expect(document.querySelector('.modal-info')).toBeInTheDocument();
  });

  it('renders custom actions', () => {
    render(
      <Modal
        isOpen={true}
        title="Test Modal"
        onClose={mockOnClose}
        actions={
          <>
            <button className="cancel-button">Cancel</button>
            <button className="confirm-button">Confirm</button>
          </>
        }
      >
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('renders correctly in light theme', () => {
    // Set light theme
    document.documentElement.removeAttribute('data-theme');

    render(
      <ThemeProvider>
        <Modal isOpen={true} title="Light Theme Modal" onClose={mockOnClose}>
          <p>Light theme content</p>
        </Modal>
      </ThemeProvider>
    );

    expect(screen.getByText('Light Theme Modal')).toBeInTheDocument();
    expect(document.querySelector('.modal')).toBeInTheDocument();
  });

  it('renders correctly in dark theme', () => {
    // Set dark theme
    document.documentElement.setAttribute('data-theme', 'dark');

    render(
      <ThemeProvider>
        <Modal isOpen={true} title="Dark Theme Modal" onClose={mockOnClose} type="error">
          <p>Dark theme content</p>
        </Modal>
      </ThemeProvider>
    );

    expect(screen.getByText('Dark Theme Modal')).toBeInTheDocument();
    expect(document.querySelector('.modal-error')).toBeInTheDocument();

    // Clean up
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies correct CSS variables for theme colors', () => {
    render(
      <Modal isOpen={true} title="CSS Variables Test" onClose={mockOnClose} type="warning">
        <p>Testing CSS variables</p>
      </Modal>
    );

    const modal = document.querySelector('.modal');
    const modalWarning = document.querySelector('.modal-warning');

    expect(modal).toBeInTheDocument();
    expect(modalWarning).toBeInTheDocument();
  });
});
