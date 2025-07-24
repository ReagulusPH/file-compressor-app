import React, { useEffect, useState } from 'react';
import { formatErrorMessage, getErrorSeverity, getRecoveryActions, getTroubleshootingGuide } from '../../utils/errors/ErrorUtils';
import './EnhancedToast.css';

export interface EnhancedToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  error?: Error;
  duration?: number;
  onClose: (id: string) => void;
  onRetry?: () => void;
  showRecoveryActions?: boolean;
}

/**
 * Enhanced Toast notification component with format-specific error handling
 */
const EnhancedToast: React.FC<EnhancedToastProps> = ({
  id,
  message,
  type,
  error,
  duration = 8000, // Longer duration for error messages
  onClose,
  onRetry,
  showRecoveryActions = true,
}) => {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Get error-specific information
  const severity = error ? getErrorSeverity(error) : 'info';
  const recoveryActions = error ? getRecoveryActions(error) : null;
  const troubleshootingGuide = error ? getTroubleshootingGuide(error) : null;
  const formattedMessage = error ? formatErrorMessage(error) : message;

  // Handle automatic closing with pause on hover
  useEffect(() => {
    if (type === 'error' || type === 'warning') {
      // Don't auto-close error/warning messages
      return;
    }

    const timer = setTimeout(() => {
      setExiting(true);
    }, duration);

    setAutoCloseTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [duration, type]);

  // Pause auto-close on hover
  const handleMouseEnter = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
  };

  // Resume auto-close on mouse leave
  const handleMouseLeave = () => {
    if (type !== 'error' && type !== 'warning' && !autoCloseTimer) {
      const timer = setTimeout(() => {
        setExiting(true);
      }, 2000); // Shorter duration after hover
      setAutoCloseTimer(timer);
    }
  };

  // Handle animation end
  const handleAnimationEnd = () => {
    if (exiting) {
      setVisible(false);
      onClose(id);
    }
  };

  // Handle manual close
  const handleClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
    setExiting(true);
  };

  // Handle retry action
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    handleClose();
  };

  // Handle troubleshooting guide
  const handleTroubleshootingGuide = () => {
    if (troubleshootingGuide) {
      // In a real app, this would navigate to the help section
      console.log('Navigate to:', troubleshootingGuide);
    }
  };

  if (!visible) return null;

  const toastClass = `enhanced-toast enhanced-toast-${type} enhanced-toast-${severity} ${
    exiting ? 'enhanced-toast-exit' : 'enhanced-toast-enter'
  } ${expanded ? 'enhanced-toast-expanded' : ''}`;

  return (
    <div
      className={toastClass}
      onAnimationEnd={handleAnimationEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="assertive"
    >
      <div className="enhanced-toast-header">
        <div className="enhanced-toast-icon">
          {type === 'success' && <span>✓</span>}
          {type === 'error' && <span>✕</span>}
          {type === 'warning' && <span>⚠</span>}
          {type === 'info' && <span>ℹ</span>}
        </div>
        <div className="enhanced-toast-content">
          <p className="enhanced-toast-message">{formattedMessage}</p>
        </div>
        <div className="enhanced-toast-actions">
          {(type === 'error' || type === 'warning') && recoveryActions && showRecoveryActions && (
            <button
              className="enhanced-toast-expand"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Hide recovery options' : 'Show recovery options'}
              title={expanded ? 'Hide recovery options' : 'Show recovery options'}
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
          {onRetry && (
            <button
              className="enhanced-toast-retry"
              onClick={handleRetry}
              aria-label="Retry operation"
              title="Retry operation"
            >
              ↻
            </button>
          )}
          <button
            className="enhanced-toast-close"
            onClick={handleClose}
            aria-label="Close notification"
            title="Close notification"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && recoveryActions && (
        <div className="enhanced-toast-recovery">
          {recoveryActions.immediate.length > 0 && (
            <div className="recovery-section">
              <h4>Quick Fixes:</h4>
              <ul>
                {recoveryActions.immediate.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {recoveryActions.alternative.length > 0 && (
            <div className="recovery-section">
              <h4>Alternative Solutions:</h4>
              <ul>
                {recoveryActions.alternative.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {recoveryActions.preventive.length > 0 && (
            <div className="recovery-section">
              <h4>Prevention Tips:</h4>
              <ul>
                {recoveryActions.preventive.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {troubleshootingGuide && (
            <div className="recovery-section">
              <button
                className="troubleshooting-guide-btn"
                onClick={handleTroubleshootingGuide}
              >
                📖 View Troubleshooting Guide
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedToast;