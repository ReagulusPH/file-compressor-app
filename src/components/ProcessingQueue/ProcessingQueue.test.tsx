import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProcessingQueue, { QueueItem } from './ProcessingQueue';

// Mock file data
const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File([], name, { type });
  Object.defineProperty(file, 'size', {
    get() {
      return size;
    },
  });
  return file;
};

describe('ProcessingQueue Component', () => {
  const mockOnCancelItem = jest.fn();
  const mockOnCancelAll = jest.fn();

  const mockItems: QueueItem[] = [
    {
      id: '1',
      file: createMockFile('image1.jpg', 'image/jpeg', 1024 * 1024),
      status: 'waiting',
      progress: 0,
    },
    {
      id: '2',
      file: createMockFile('image2.jpg', 'image/jpeg', 2 * 1024 * 1024),
      status: 'processing',
      progress: 50,
    },
    {
      id: '3',
      file: createMockFile('image3.jpg', 'image/jpeg', 3 * 1024 * 1024),
      status: 'complete',
      progress: 100,
    },
    {
      id: '4',
      file: createMockFile('image4.jpg', 'image/jpeg', 4 * 1024 * 1024),
      status: 'error',
      progress: 30,
      error: 'Failed to process file',
    },
  ];

  beforeEach(() => {
    mockOnCancelItem.mockClear();
    mockOnCancelAll.mockClear();
  });

  test('renders the queue with items', () => {
    render(
      <ProcessingQueue
        items={mockItems}
        onCancelItem={mockOnCancelItem}
        isProcessing={true}
        onCancelAll={mockOnCancelAll}
      />
    );

    // Check if all items are rendered
    expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    expect(screen.getByText('image2.jpg')).toBeInTheDocument();
    expect(screen.getByText('image3.jpg')).toBeInTheDocument();
    expect(screen.getByText('image4.jpg')).toBeInTheDocument();

    // Check if file sizes are displayed
    expect(screen.getByText('(1.00 MB)')).toBeInTheDocument();
    expect(screen.getByText('(2.00 MB)')).toBeInTheDocument();

    // Check if error message is displayed
    expect(screen.getByText('Error: Failed to process file')).toBeInTheDocument();
  });

  test('displays empty state when no items', () => {
    render(
      <ProcessingQueue
        items={[]}
        onCancelItem={mockOnCancelItem}
        isProcessing={false}
        onCancelAll={mockOnCancelAll}
      />
    );

    expect(screen.getByText('No files in the processing queue')).toBeInTheDocument();
  });

  test('calculates and displays overall progress', () => {
    render(
      <ProcessingQueue
        items={mockItems}
        onCancelItem={mockOnCancelItem}
        isProcessing={true}
        onCancelAll={mockOnCancelAll}
      />
    );

    // Overall progress should be the average of all item progress values
    // (0 + 50 + 100 + 30) / 4 = 45
    const overallProgress = screen.getByText('45%');
    expect(overallProgress).toBeInTheDocument();

    // Check if progress bars have correct aria attributes
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '45'); // Overall progress
  });

  test('calls onCancelItem when cancel button is clicked', () => {
    render(
      <ProcessingQueue
        items={mockItems}
        onCancelItem={mockOnCancelItem}
        isProcessing={true}
        onCancelAll={mockOnCancelAll}
      />
    );

    // Find cancel buttons (should be 2 - one for 'waiting' and one for 'processing')
    const cancelButtons = screen.getAllByRole('button', { name: /Cancel processing/ });
    expect(cancelButtons).toHaveLength(2);

    // Click the first cancel button
    fireEvent.click(cancelButtons[0]);
    expect(mockOnCancelItem).toHaveBeenCalledWith('1');
  });

  test('calls onCancelAll when cancel all button is clicked', () => {
    render(
      <ProcessingQueue
        items={mockItems}
        onCancelItem={mockOnCancelItem}
        isProcessing={true}
        onCancelAll={mockOnCancelAll}
      />
    );

    const cancelAllButton = screen.getByText('Cancel All');
    fireEvent.click(cancelAllButton);
    expect(mockOnCancelAll).toHaveBeenCalled();
  });

  test('does not show cancel all button when not processing', () => {
    render(
      <ProcessingQueue
        items={mockItems}
        onCancelItem={mockOnCancelItem}
        isProcessing={false}
        onCancelAll={mockOnCancelAll}
      />
    );

    expect(screen.queryByText('Cancel All')).not.toBeInTheDocument();
  });

  test('shows different status icons for different statuses', () => {
    render(
      <ProcessingQueue
        items={mockItems}
        onCancelItem={mockOnCancelItem}
        isProcessing={true}
        onCancelAll={mockOnCancelAll}
      />
    );

    expect(screen.getByLabelText('Waiting')).toBeInTheDocument();
    expect(screen.getByLabelText('Processing')).toBeInTheDocument();
    expect(screen.getByLabelText('Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('Error')).toBeInTheDocument();
  });
});
