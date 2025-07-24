import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUpload from './FileUpload';

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

describe('FileUpload Component', () => {
  const mockOnFilesSelected = jest.fn();
  const defaultProps = {
    onFilesSelected: mockOnFilesSelected,
    acceptedFileTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
  };

  beforeEach(() => {
    mockOnFilesSelected.mockClear();
  });

  test('renders the drag-and-drop zone with instructions', () => {
    render(<FileUpload {...defaultProps} />);

    expect(screen.getByText('Drag and drop your files here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Select Files')).toBeInTheDocument();
  });

  test('displays file type icons based on accepted types', () => {
    render(<FileUpload {...defaultProps} />);

    // Check if both image and video icons are present
    const fileTypeIcons = document.querySelectorAll('.file-type-icon');
    expect(fileTypeIcons.length).toBe(2); // One for image, one for video
  });

  test('handles file selection through input', () => {
    render(<FileUpload {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);

    // Mock the FileList
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
    });

    fireEvent.change(fileInput);

    expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile]);
  });

  test('validates file type and shows error for invalid type', () => {
    render(<FileUpload {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = createMockFile('test.txt', 'text/plain', 1024);

    // Mock the FileList
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
    });

    fireEvent.change(fileInput);

    expect(mockOnFilesSelected).not.toHaveBeenCalled();
    expect(screen.getByText('"test.txt" is not a supported file type.')).toBeInTheDocument();
  });

  test('validates file size and shows error for oversized files', () => {
    render(<FileUpload {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const oversizedFile = createMockFile('large.jpg', 'image/jpeg', 200 * 1024 * 1024); // 200MB

    // Mock the FileList
    Object.defineProperty(fileInput, 'files', {
      value: [oversizedFile],
    });

    fireEvent.change(fileInput);

    expect(mockOnFilesSelected).not.toHaveBeenCalled();
    expect(
      screen.getByText('"large.jpg" exceeds the maximum file size of 100MB.')
    ).toBeInTheDocument();
  });

  test('handles drag over event', () => {
    render(<FileUpload {...defaultProps} />);

    const dropZone = screen.getByText('Drag and drop your files here').closest('.drop-zone');
    expect(dropZone).not.toHaveClass('dragging');

    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('dragging');

    fireEvent.dragLeave(dropZone!);
    expect(dropZone).not.toHaveClass('dragging');
  });

  test('respects multiple prop when set to false', () => {
    render(<FileUpload {...defaultProps} multiple={false} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.multiple).toBe(false);

    const file1 = createMockFile('test1.jpg', 'image/jpeg', 1024);
    const file2 = createMockFile('test2.jpg', 'image/jpeg', 1024);

    // Mock the FileList
    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2],
    });

    fireEvent.change(fileInput);

    // Should only select the first file when multiple is false
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file1]);
  });
});
