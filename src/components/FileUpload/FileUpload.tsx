import React, { useState, useRef, useCallback } from 'react';
import './FileUpload.css';

/**
 * Props for the FileUpload component
 */
interface FileUploadProps {
  /**
   * Callback function called when files are selected
   */
  onFilesSelected: (files: File[]) => void;

  /**
   * Array of accepted file types (e.g., ['image/jpeg', 'image/png'])
   */
  acceptedFileTypes: string[];

  /**
   * Maximum file size in bytes
   */
  maxFileSize: number;

  /**
   * Whether multiple files can be selected
   */
  multiple: boolean;
}

/**
 * FileUpload component with drag-and-drop functionality
 */
const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  acceptedFileTypes,
  maxFileSize,
  multiple,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validates files based on type and size
   */
  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const validFiles: File[] = [];
      const newErrors: string[] = [];

      Array.from(files).forEach(file => {
        // Check file type
        if (!acceptedFileTypes.includes(file.type)) {
          newErrors.push(`"${file.name}" is not a supported file type.`);
          return;
        }

        // Check file size (only if a reasonable limit is set)
        if (maxFileSize < Number.MAX_SAFE_INTEGER && file.size > maxFileSize) {
          const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
          newErrors.push(`"${file.name}" exceeds the maximum file size of ${maxSizeMB}MB.`);
          return;
        }

        validFiles.push(file);
      });

      if (newErrors.length > 0) {
        setErrors(newErrors);
      }

      return validFiles;
    },
    [acceptedFileTypes, maxFileSize]
  );

  /**
   * Handles file drop event
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        const filesToProcess = multiple ? droppedFiles : [droppedFiles[0]];
        const validFiles = validateFiles(filesToProcess);

        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
          setErrors([]);
        }
      }
    },
    [multiple, onFilesSelected, validateFiles]
  );

  /**
   * Handles drag over event
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * Handles drag leave event
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Handles file input change event
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const selectedFiles = Array.from(e.target.files);
        const filesToProcess = multiple ? selectedFiles : [selectedFiles[0]];
        const validFiles = validateFiles(filesToProcess);

        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
          setErrors([]);
        }

        // Reset the file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [multiple, onFilesSelected, validateFiles]
  );

  /**
   * Triggers file input click
   */
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Gets the accepted file types string for the file input
   */
  const getAcceptString = () => {
    return acceptedFileTypes.join(',');
  };

  /**
   * Gets file type icons based on accepted file types
   */
  const getFileTypeIcons = () => {
    const icons = [];

    if (acceptedFileTypes.some(type => type.includes('image'))) {
      icons.push(
        <span key="image" className="file-type-icon">
          🖼️
        </span>
      );
    }

    if (acceptedFileTypes.some(type => type.includes('video'))) {
      icons.push(
        <span key="video" className="file-type-icon">
          🎬
        </span>
      );
    }

    if (acceptedFileTypes.some(type => type.includes('audio'))) {
      icons.push(
        <span key="audio" className="file-type-icon">
          🎵
        </span>
      );
    }

    if (acceptedFileTypes.some(type => type.includes('application/pdf') || type.includes('document') || type.includes('officedocument') || type.includes('opendocument'))) {
      icons.push(
        <span key="document" className="file-type-icon">
          📄
        </span>
      );
    }

    if (acceptedFileTypes.some(type => type.includes('application/vnd.android.package-archive'))) {
      icons.push(
        <span key="archive" className="file-type-icon">
          📦
        </span>
      );
    }

    return icons;
  };

  // Detect if device is touch-enabled
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Check for touch device on component mount
  React.useEffect(() => {
    const isTouchEnabled =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    setIsTouchDevice(isTouchEnabled);
  }, []);

  return (
    <div className="file-upload-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${isTouchDevice ? 'touch-device' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleButtonClick}
        onTouchEnd={isTouchDevice ? handleButtonClick : undefined}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
      >
        <div className="drop-zone-content">
          <div className="file-type-icons">{getFileTypeIcons()}</div>
          <p className="drop-zone-text">
            {isTouchDevice ? 'Tap to select files' : 'Drag and drop your files here'}
          </p>
          <p className="drop-zone-subtext">
            {isTouchDevice ? 'Select from your device' : 'or click to browse'}
          </p>
          <button className="browse-button touch-target">Select Files</button>
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            onChange={handleFileInputChange}
            accept={getAcceptString()}
            multiple={multiple}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="error-container" role="alert">
          {errors.map((error, index) => (
            <p key={index} className="error-message">
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
