/**
 * Toast Error Handler
 * Utility functions for showing format-specific error toasts with recovery actions
 */

import { ToastOptions } from '../../components/Feedback/ToastContainer';
import { formatErrorMessage, getErrorSeverity } from './ErrorUtils';

/**
 * Show an enhanced error toast with format-specific recovery actions
 * @param error - The error to display
 * @param onRetry - Optional retry callback
 * @param customMessage - Optional custom message override
 */
export const showErrorToast = (
  error: Error,
  onRetry?: () => void,
  customMessage?: string
): void => {
  const severity = getErrorSeverity(error);
  const message = customMessage || formatErrorMessage(error);
  
  const toastOptions: ToastOptions = {
    message,
    type: severity === 'critical' ? 'error' : 'warning',
    duration: severity === 'critical' ? 0 : 10000, // Critical errors don't auto-close
    error,
    onRetry,
    showRecoveryActions: true,
    useEnhanced: true,
  };

  // Use global toast function if available
  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  } else {
    console.error('Toast system not initialized:', error);
  }
};

/**
 * Show a success toast for compression completion
 * @param formatType - The format that was compressed
 * @param compressionRatio - The compression ratio achieved
 * @param processingTime - Time taken to process
 */
export const showSuccessToast = (
  formatType: string,
  compressionRatio: number,
  processingTime: number
): void => {
  const reductionPercent = Math.round((1 - compressionRatio) * 100);
  const timeSeconds = Math.round(processingTime / 1000);
  
  const message = `${formatType.toUpperCase()} compressed successfully! ${reductionPercent}% size reduction in ${timeSeconds}s`;
  
  const toastOptions: ToastOptions = {
    message,
    type: 'success',
    duration: 5000,
    useEnhanced: false, // Simple success toast
  };

  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  }
};

/**
 * Show a warning toast for format-specific issues
 * @param formatType - The format being processed
 * @param warning - The warning message
 * @param onRetry - Optional retry callback
 */
export const showWarningToast = (
  formatType: string,
  warning: string,
  onRetry?: () => void
): void => {
  const message = `${formatType.toUpperCase()} processing warning: ${warning}`;
  
  const toastOptions: ToastOptions = {
    message,
    type: 'warning',
    duration: 8000,
    onRetry,
    showRecoveryActions: false,
    useEnhanced: !!onRetry,
  };

  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  }
};

/**
 * Show an info toast for processing updates
 * @param formatType - The format being processed
 * @param info - The info message
 */
export const showInfoToast = (
  formatType: string,
  info: string
): void => {
  const message = `${formatType.toUpperCase()}: ${info}`;
  
  const toastOptions: ToastOptions = {
    message,
    type: 'info',
    duration: 4000,
    useEnhanced: false,
  };

  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  }
};

/**
 * Show a batch processing progress toast
 * @param completed - Number of files completed
 * @param total - Total number of files
 * @param currentFormat - Current format being processed
 */
export const showBatchProgressToast = (
  completed: number,
  total: number,
  currentFormat?: string
): void => {
  const progress = Math.round((completed / total) * 100);
  const formatInfo = currentFormat ? ` (processing ${currentFormat.toUpperCase()})` : '';
  const message = `Batch processing: ${completed}/${total} files complete (${progress}%)${formatInfo}`;
  
  const toastOptions: ToastOptions = {
    message,
    type: 'info',
    duration: 2000,
    useEnhanced: false,
  };

  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  }
};

/**
 * Show a memory warning toast
 * @param formatType - The format being processed
 * @param memoryUsage - Current memory usage percentage
 * @param onOptimize - Callback to optimize memory usage
 */
export const showMemoryWarningToast = (
  formatType: string,
  memoryUsage: number,
  onOptimize?: () => void
): void => {
  const message = `High memory usage (${memoryUsage}%) while processing ${formatType.toUpperCase()}. Consider processing smaller files.`;
  
  const toastOptions: ToastOptions = {
    message,
    type: 'warning',
    duration: 0, // Don't auto-close memory warnings
    onRetry: onOptimize,
    showRecoveryActions: true,
    useEnhanced: true,
  };

  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  }
};

/**
 * Show a browser compatibility warning toast
 * @param feature - The unsupported feature
 * @param formatType - The format being processed
 * @param fallbackAvailable - Whether a fallback is available
 */
export const showCompatibilityWarningToast = (
  feature: string,
  formatType: string,
  fallbackAvailable: boolean
): void => {
  const fallbackText = fallbackAvailable 
    ? ' Using fallback method.' 
    : ' Please try a different browser.';
  
  const message = `${feature} not supported for ${formatType.toUpperCase()} compression.${fallbackText}`;
  
  const toastOptions: ToastOptions = {
    message,
    type: 'warning',
    duration: 8000,
    showRecoveryActions: !fallbackAvailable,
    useEnhanced: !fallbackAvailable,
  };

  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  }
};

/**
 * Show a format detection toast
 * @param detectedFormat - The detected format
 * @param confidence - Detection confidence level
 */
export const showFormatDetectionToast = (
  detectedFormat: string,
  confidence: 'high' | 'medium' | 'low'
): void => {
  const confidenceText = confidence === 'high' ? '' : ` (${confidence} confidence)`;
  const message = `Detected format: ${detectedFormat.toUpperCase()}${confidenceText}`;
  
  const toastOptions: ToastOptions = {
    message,
    type: confidence === 'low' ? 'warning' : 'info',
    duration: 3000,
    useEnhanced: false,
  };

  if ((window as any).showToast) {
    (window as any).showToast(toastOptions);
  }
};

/**
 * Clear all toasts (useful for cleanup)
 */
export const clearAllToasts = (): void => {
  // This would need to be implemented in the ToastContainer
  // For now, we'll just log
  console.log('Clearing all toasts');
};

export default {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showInfoToast,
  showBatchProgressToast,
  showMemoryWarningToast,
  showCompatibilityWarningToast,
  showFormatDetectionToast,
  clearAllToasts,
};