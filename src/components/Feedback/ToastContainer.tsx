import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Toast, { ToastProps } from './Toast';
import EnhancedToast, { EnhancedToastProps } from './EnhancedToast';
import './Toast.css';

export interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  error?: Error;
  onRetry?: () => void;
  showRecoveryActions?: boolean;
  useEnhanced?: boolean;
}

export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

/**
 * ToastContainer component
 * Manages multiple toast notifications with enhanced error handling
 */
const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<(ToastProps | EnhancedToastProps)[]>([]);

  // Remove a toast by ID
  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Add a new toast
  const addToast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      setToasts(prevToasts => {
        // If we have reached the maximum number of toasts, remove the oldest one
        const updatedToasts = prevToasts.length >= maxToasts ? prevToasts.slice(1) : prevToasts;

        const newToast = options.useEnhanced ? {
          id,
          message: options.message,
          type: options.type,
          duration: options.duration,
          error: options.error,
          onRetry: options.onRetry,
          showRecoveryActions: options.showRecoveryActions,
          onClose: removeToast,
        } as EnhancedToastProps : {
          id,
          message: options.message,
          type: options.type,
          duration: options.duration,
          onClose: removeToast,
        } as ToastProps;

        return [
          ...updatedToasts,
          newToast,
        ];
      });

      return id;
    },
    [maxToasts, removeToast]
  );

  // Expose the addToast method globally
  useEffect(() => {
    (window as any).showToast = addToast;

    return () => {
      delete (window as any).showToast;
    };
  }, [addToast]);

  // Position class
  const positionClass = `toast-container toast-${position}`;

  // Create portal for toast container
  return ReactDOM.createPortal(
    <div className={positionClass}>
      {toasts.map(toast => {
        // Check if this is an enhanced toast
        const isEnhanced = 'error' in toast || 'onRetry' in toast || 'showRecoveryActions' in toast;
        
        return isEnhanced ? (
          <EnhancedToast key={toast.id} {...(toast as EnhancedToastProps)} />
        ) : (
          <Toast key={toast.id} {...(toast as ToastProps)} />
        );
      })}
    </div>,
    document.body
  );
};

export default ToastContainer;
