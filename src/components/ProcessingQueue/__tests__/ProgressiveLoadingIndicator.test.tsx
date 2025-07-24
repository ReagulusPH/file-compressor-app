import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressiveLoadingIndicator from '../ProgressiveLoadingIndicator';
import { FileModel } from '../../../types';

describe('ProgressiveLoadingIndicator', () => {
  const createMockFileModel = (overrides: Partial<FileModel> = {}): FileModel => ({
    id: 'test-file-1',
    originalFile: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
    settings: { quality: 80 },
    status: 'processing',
    progress: 50,
    startTime: Date.now() - 5000, // 5 seconds ago
    detectedFormat: {
      type: 'document',
      format: 'pdf',
      mimeType: 'application/pdf',
      supportLevel: 'library',
    },
    processingMethod: 'library',
    ...overrides,
  });

  it('renders processing indicator with correct phase', () => {
    const fileModel = createMockFileModel({ progress: 50 });
    
    render(<ProgressiveLoadingIndicator fileModel={fileModel} />);

    expect(screen.getByText('Compressing')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/optimizing document content/i)).toBeInTheDocument();
  });

  it('shows different phases based on progress', () => {
    // Test initialization phase
    const initModel = createMockFileModel({ progress: 5 });
    const { rerender } = render(<ProgressiveLoadingIndicator fileModel={initModel} />);
    expect(screen.getByText('Initializing')).toBeInTheDocument();

    // Test analysis phase
    const analysisModel = createMockFileModel({ progress: 15 });
    rerender(<ProgressiveLoadingIndicator fileModel={analysisModel} />);
    expect(screen.getByText('Analyzing')).toBeInTheDocument();

    // Test validation phase
    const validationModel = createMockFileModel({ progress: 25 });
    rerender(<ProgressiveLoadingIndicator fileModel={validationModel} />);
    expect(screen.getByText('Validating')).toBeInTheDocument();

    // Test finalization phase
    const finalizationModel = createMockFileModel({ progress: 90 });
    rerender(<ProgressiveLoadingIndicator fileModel={finalizationModel} />);
    expect(screen.getByText('Finalizing')).toBeInTheDocument();
  });

  it('shows format-specific descriptions for different file types', () => {
    // Test image format
    const imageModel = createMockFileModel({
      progress: 15,
      detectedFormat: {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        supportLevel: 'native',
      },
    });
    const { rerender } = render(<ProgressiveLoadingIndicator fileModel={imageModel} />);
    expect(screen.getByText(/analyzing image dimensions/i)).toBeInTheDocument();

    // Test video format
    const videoModel = createMockFileModel({
      progress: 15,
      detectedFormat: {
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        supportLevel: 'native',
      },
    });
    rerender(<ProgressiveLoadingIndicator fileModel={videoModel} />);
    expect(screen.getByText(/analyzing video codec/i)).toBeInTheDocument();

    // Test audio format
    const audioModel = createMockFileModel({
      progress: 15,
      detectedFormat: {
        type: 'audio',
        format: 'mp3',
        mimeType: 'audio/mpeg',
        supportLevel: 'native',
      },
    });
    rerender(<ProgressiveLoadingIndicator fileModel={audioModel} />);
    expect(screen.getByText(/analyzing audio format/i)).toBeInTheDocument();

    // Test archive format
    const archiveModel = createMockFileModel({
      progress: 15,
      detectedFormat: {
        type: 'archive',
        format: 'apk',
        mimeType: 'application/vnd.android.package-archive',
        supportLevel: 'library',
      },
    });
    rerender(<ProgressiveLoadingIndicator fileModel={archiveModel} />);
    expect(screen.getByText(/analyzing archive structure/i)).toBeInTheDocument();
  });

  it('displays format details when enabled', () => {
    const fileModel = createMockFileModel();
    
    render(<ProgressiveLoadingIndicator fileModel={fileModel} showPhaseDetails={true} />);

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('via library')).toBeInTheDocument();
  });

  it('hides format details when disabled', () => {
    const fileModel = createMockFileModel();
    
    render(<ProgressiveLoadingIndicator fileModel={fileModel} showPhaseDetails={false} />);

    expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    expect(screen.queryByText('via library')).not.toBeInTheDocument();
  });

  it('shows error state correctly', () => {
    const errorModel = createMockFileModel({
      status: 'error',
      error: 'Processing failed',
    });
    
    render(<ProgressiveLoadingIndicator fileModel={errorModel} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Processing failed')).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('shows complete state correctly', () => {
    const completeModel = createMockFileModel({
      status: 'complete',
      progress: 100,
    });
    
    render(<ProgressiveLoadingIndicator fileModel={completeModel} />);

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('File compressed successfully')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('displays time estimation during processing', () => {
    const fileModel = createMockFileModel({
      status: 'processing',
      progress: 50,
      startTime: Date.now() - 10000, // 10 seconds ago
    });
    
    render(<ProgressiveLoadingIndicator fileModel={fileModel} />);

    // Should show time remaining
    expect(screen.getByText(/remaining/i)).toBeInTheDocument();
    // Should show speed indicator
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it('shows progress bars correctly', () => {
    const fileModel = createMockFileModel({ progress: 75 });
    
    render(<ProgressiveLoadingIndicator fileModel={fileModel} />);

    // Check that progress is displayed
    expect(screen.getByText('75%')).toBeInTheDocument();
    
    // Check that progress bars exist
    const progressFills = document.querySelectorAll('.progress-fill');
    expect(progressFills.length).toBeGreaterThan(0);
    
    // Check that main progress bar has correct width
    const mainProgressFill = progressFills[0] as HTMLElement;
    expect(mainProgressFill).toHaveStyle({ width: '75%' });
  });

  it('handles missing format information gracefully', () => {
    const fileModel = createMockFileModel({
      detectedFormat: undefined,
    });
    
    render(<ProgressiveLoadingIndicator fileModel={fileModel} />);

    // Should still render without crashing
    expect(screen.getByText(/compressing file data/i)).toBeInTheDocument();
  });

  it('shows speed indicator based on processing time', () => {
    const fastModel = createMockFileModel({
      startTime: Date.now() - 1000, // 1 second ago
      progress: 50,
      originalFile: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
    });
    
    render(<ProgressiveLoadingIndicator fileModel={fastModel} />);

    // Should show some speed indicator
    expect(screen.getByText(/fast|normal|slow|processing/i)).toBeInTheDocument();
  });
});