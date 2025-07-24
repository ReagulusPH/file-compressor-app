import React, { useState, useEffect, Suspense } from 'react';
import { FileModel, CompressionSettings, CompressionMode } from '../../types';
import { lazyLoadComponent } from '../../utils/lazyLoad';
import { useAppContext } from '../../context/AppContext';
import { 
  SUPPORTED_IMAGE_TYPES, 
  SUPPORTED_VIDEO_TYPES, 
  SUPPORTED_AUDIO_TYPES, 
  SUPPORTED_DOCUMENT_TYPES, 
  SUPPORTED_ARCHIVE_TYPES,
  SUPPORTED_FILE_TYPES 
} from '../../utils/errors/ErrorUtils';
import compressionService from '../../services/CompressionService';

// Lazy load components
const FileUpload = lazyLoadComponent(() => import('../FileUpload'));
const CompressionModeSelector = lazyLoadComponent(() => import('../CompressionModeSelector'));
const CompressionSettingsComponent = lazyLoadComponent(() => import('../CompressionSettings'));
const ProcessingQueue = lazyLoadComponent(() => import('../ProcessingQueue'));
const ResultsPanel = lazyLoadComponent(() => import('../ResultsPanel'));

// Skeleton UI components
const SkeletonFileUpload: React.FC = () => (
  <div className="skeleton-file-upload">
    <div
      className="skeleton-dropzone"
      style={{
        height: '200px',
        border: '2px dashed #ccc',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
      }}
    >
      <div
        className="skeleton-text"
        style={{
          width: '150px',
          height: '24px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
        }}
      ></div>
    </div>
  </div>
);

const SkeletonSettings: React.FC = () => (
  <div
    className="skeleton-settings"
    style={{
      padding: '16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
    }}
  >
    <div
      className="skeleton-title"
      style={{
        width: '120px',
        height: '24px',
        backgroundColor: '#e0e0e0',
        borderRadius: '4px',
        marginBottom: '16px',
      }}
    ></div>
    <div
      className="skeleton-slider"
      style={{
        width: '100%',
        height: '16px',
        backgroundColor: '#e0e0e0',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    ></div>
    <div
      className="skeleton-options"
      style={{
        display: 'flex',
        gap: '8px',
      }}
    >
      <div
        style={{ width: '80px', height: '32px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}
      ></div>
      <div
        style={{ width: '80px', height: '32px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}
      ></div>
    </div>
  </div>
);

/**
 * ImageCompressorDemo component
 * Main component for the image compression demo
 */
const ImageCompressorDemo: React.FC = () => {
  const { state, setCompressionMode } = useAppContext();
  const [files, setFiles] = useState<FileModel[]>([]);
  const [, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionSettings, setCompressionSettings] = useState<CompressionSettings>({
    quality: 60, // Default balanced quality
    outputFormat: state.compressionMode === 'image' ? 'image/jpeg' : 'video/mp4',
  });

  // Get accepted file types based on compression mode
  const getAcceptedFileTypes = () => {
    switch (state.compressionMode) {
      case 'image':
        return SUPPORTED_IMAGE_TYPES;
      case 'video':
        return SUPPORTED_VIDEO_TYPES;
      case 'audio':
        return SUPPORTED_AUDIO_TYPES;
      case 'document':
        return SUPPORTED_DOCUMENT_TYPES;
      case 'archive':
        return SUPPORTED_ARCHIVE_TYPES;
      default:
        // Support all formats for unified mode
        return SUPPORTED_FILE_TYPES;
    }
  };

  // Simulate loading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Update compression settings when mode changes
  useEffect(() => {
    let defaultOutputFormat = 'image/jpeg';
    
    switch (state.compressionMode) {
      case 'image':
        defaultOutputFormat = 'image/jpeg';
        break;
      case 'video':
        defaultOutputFormat = 'video/mp4';
        break;
      case 'audio':
        defaultOutputFormat = 'audio/mpeg';
        break;
      case 'document':
        defaultOutputFormat = 'application/pdf';
        break;
      case 'archive':
        defaultOutputFormat = 'application/vnd.android.package-archive';
        break;
      default:
        defaultOutputFormat = 'image/jpeg';
    }
    
    setCompressionSettings(prev => ({
      ...prev,
      outputFormat: defaultOutputFormat,
    }));
    // Clear files when switching modes
    setFiles([]);
  }, [state.compressionMode]);

  // Handle file upload
  const handleFilesSelected = (selectedFiles: File[]) => {
    // Create file models from selected files
    const newFileModels: FileModel[] = selectedFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      originalFile: file,
      settings: {
        quality: compressionSettings.quality,
        outputFormat: compressionSettings.outputFormat,
      },
      status: 'waiting',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFileModels]);
  };

  // Handle compression settings change
  const handleSettingsChange = (newSettings: CompressionSettings) => {
    setCompressionSettings(newSettings);
    // Update existing files with new settings
    setFiles(prev =>
      prev.map(file => ({
        ...file,
        settings: {
          ...file.settings,
          ...newSettings,
        },
      }))
    );
  };

  // Start compression process
  const handleStartCompression = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);

    // Set start time for all files that are about to be processed
    const startTime = Date.now();
    setFiles(prev =>
      prev.map(f => 
        f.status === 'waiting' 
          ? { ...f, startTime, status: 'processing' as const }
          : f
      )
    );

    try {
      // Process files using the actual compression service
      const updatedFiles = await compressionService.processBatch(
        files.filter(f => f.status === 'waiting'),
        (id: string, progress: number) => {
          // Update individual file progress
          setFiles(prev =>
            prev.map(f => (f.id === id ? { ...f, progress, status: 'processing' as const } : f))
          );
        },
        (batchProgress: number) => {
          // Overall batch progress can be used for UI feedback if needed
          // console.log(`Batch progress: ${batchProgress}%`);
        }
      );

      // Update files with compression results
      setFiles(prev =>
        prev.map(file => {
          const updatedFile = updatedFiles.find(uf => uf.id === file.id);
          return updatedFile || file;
        })
      );
    } catch (error) {
      // console.error('Compression failed:', error);
      // Mark all processing files as error
      setFiles(prev =>
        prev.map(f =>
          f.status === 'processing'
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Compression failed',
              }
            : f
        )
      );
    }

    setIsProcessing(false);
  };

  // Cancel item from queue
  const handleCancelItem = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Cancel all processing
  const handleCancelAll = () => {
    compressionService.cancelAllProcessing();
    setIsProcessing(false);
    // Remove all files that are waiting or processing, keep completed ones
    setFiles(prev => prev.filter(f => f.status === 'complete'));
  };

  // Handle compression mode change
  const handleModeChange = (mode: CompressionMode) => {
    setCompressionMode(mode);
  };

  return (
    <div className="image-compressor-demo">
      <Suspense fallback={<div>Loading mode selector...</div>}>
        <CompressionModeSelector
          currentMode={state.compressionMode}
          onModeChange={handleModeChange}
          disabled={isProcessing}
        />
      </Suspense>

      <Suspense fallback={<SkeletonFileUpload />}>
        <FileUpload
          onFilesSelected={handleFilesSelected}
          acceptedFileTypes={getAcceptedFileTypes()}
          maxFileSize={Number.MAX_SAFE_INTEGER}
          multiple={true}
        />
      </Suspense>

      {files.length > 0 && (
        <div className="queue-container" style={{ marginTop: '16px' }}>
          <Suspense fallback={<div>Loading queue...</div>}>
            <ProcessingQueue
              fileModels={files}
              isProcessing={isProcessing}
              onCancelItem={handleCancelItem}
              onCancelAll={handleCancelAll}
              showPhaseDetails={true}
              useEnhancedIndicators={true}
            />
          </Suspense>
        </div>
      )}

      {files.length > 0 && (
        <div
          className="convert-button-container"
          style={{ marginTop: '24px', textAlign: 'center' }}
        >
          <button
            className="convert-button"
            onClick={handleStartCompression}
            disabled={isProcessing || files.every(f => f.status === 'complete')}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: isProcessing ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            {isProcessing ? 'Processing...' : 'Start Compression'}
          </button>
        </div>
      )}

      <div className="settings-container" style={{ marginTop: '24px' }}>
        <Suspense fallback={<SkeletonSettings />}>
          <CompressionSettingsComponent
            fileTypes={
              files.length > 0 ? files.map(f => f.originalFile.type) : getAcceptedFileTypes()
            }
            settings={compressionSettings}
            onSettingsChange={handleSettingsChange}
          />
        </Suspense>
      </div>

      {files.some(file => file.status === 'complete') && (
        <div className="results-container" style={{ marginTop: '24px' }}>
          <Suspense fallback={<div>Loading results...</div>}>
            <ResultsPanel
              results={files
                .filter(file => file.status === 'complete' && file.result)
                .map(file => ({
                  id: file.id,
                  originalFile: {
                    name: file.originalFile.name,
                    size: file.originalFile.size,
                    type: file.originalFile.type,
                  },
                  compressedFile: {
                    blob: file.result!.compressedFile.blob,
                    size: file.result!.compressedFile.size,
                    type: file.originalFile.type,
                  },
                  compressionRatio: file.result!.compressionRatio,
                  processingTime: file.result!.processingTime,
                  method: file.result!.method || 'unknown',
                }))}
              onDownload={(id: string) => {
                const file = files.find(f => f.id === id);
                if (file?.result?.compressedFile?.blob) {
                  // Create proper filename with extension based on output format
                  const extension =
                    file.result.compressedFile.type.split('/')[1] || 'bin';
                  const baseName =
                    file.originalFile.name.split('.').slice(0, -1).join('.') || 'compressed';
                  const fileName = `${baseName}_compressed.${extension}`;

                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(file.result.compressedFile.blob);
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

                  // Clean up the URL object
                  setTimeout(() => URL.revokeObjectURL(link.href), 100);
                }
              }}
              onDownloadAll={() => {
                files
                  .filter(f => f.status === 'complete' && f.result?.compressedFile?.blob)
                  .forEach(file => {
                    // Create proper filename with extension based on output format
                    const extension =
                      file.result!.compressedFile.type.split('/')[1] || 'bin';
                    const baseName =
                      file.originalFile.name.split('.').slice(0, -1).join('.') || 'compressed';
                    const fileName = `${baseName}_compressed.${extension}`;
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(file.result!.compressedFile.blob);
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Clean up the URL object
                    setTimeout(() => URL.revokeObjectURL(link.href), 100);
                  });
              }}
              onCompressMore={() => {
                setFiles([]);
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default ImageCompressorDemo;
