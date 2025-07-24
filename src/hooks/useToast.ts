import { useCallback } from 'react';
import { ToastOptions } from '../components/Feedback/ToastContainer';

/**
 * Custom hook for using toast notifications
 */
const useToast = () => {
  /**
   * Show a toast notification
   * @param options Toast options
   * @returns Toast ID
   */
  const showToast = useCallback((options: ToastOptions): string => {
    // Access the global showToast function added by ToastContainer
    if (typeof window !== 'undefined' && (window as any).showToast) {
      return (window as any).showToast(options);
    }

    // Fallback if toast container is not mounted
    console.warn('Toast container not found. Make sure ToastContainer is mounted.');
    console.log(options.type, options.message);

    return '';
  }, []);

  /**
   * Show a success toast
   * @param message Toast message
   * @param duration Duration in milliseconds
   * @returns Toast ID
   */
  const showSuccess = useCallback(
    (message: string, duration?: number): string => {
      return showToast({ message, type: 'success', duration });
    },
    [showToast]
  );

  /**
   * Show an error toast
   * @param message Toast message
   * @param duration Duration in milliseconds
   * @returns Toast ID
   */
  const showError = useCallback(
    (message: string, duration?: number): string => {
      return showToast({ message, type: 'error', duration });
    },
    [showToast]
  );

  /**
   * Show a warning toast
   * @param message Toast message
   * @param duration Duration in milliseconds
   * @returns Toast ID
   */
  const showWarning = useCallback(
    (message: string, duration?: number): string => {
      return showToast({ message, type: 'warning', duration });
    },
    [showToast]
  );

  /**
   * Show an info toast
   * @param message Toast message
   * @param duration Duration in milliseconds
   * @returns Toast ID
   */
  const showInfo = useCallback(
    (message: string, duration?: number): string => {
      return showToast({ message, type: 'info', duration });
    },
    [showToast]
  );

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default useToast;
