import React, { useEffect, useState } from 'react';
import './Toast.css';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

/**
 * Toast notification component
 * Displays a temporary notification message
 */
const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onClose }) => {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  // Handle automatic closing after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  // Handle animation end
  const handleAnimationEnd = () => {
    if (exiting) {
      setVisible(false);
      onClose(id);
    }
  };

  // Handle manual close
  const handleClose = () => {
    setExiting(true);
  };

  if (!visible) return null;

  return (
    <div
      className={`toast toast-${type} ${exiting ? 'toast-exit' : 'toast-enter'}`}
      onAnimationEnd={handleAnimationEnd}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-icon">
        {type === 'success' && <span>✓</span>}
        {type === 'error' && <span>✕</span>}
        {type === 'warning' && <span>!</span>}
        {type === 'info' && <span>i</span>}
      </div>
      <div className="toast-content">
        <p>{message}</p>
      </div>
      <button className="toast-close" onClick={handleClose} aria-label="Close notification">
        ✕
      </button>
    </div>
  );
};

export default Toast;
