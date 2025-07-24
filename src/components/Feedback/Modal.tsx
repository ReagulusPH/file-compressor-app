import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  type?: 'info' | 'warning' | 'error';
  actions?: React.ReactNode;
}

/**
 * Modal dialog component
 * Displays a modal dialog with customizable content and actions
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onClose,
  type = 'info',
  actions,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className={`modal modal-${type}`} ref={modalRef} aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="modal-content">{children}</div>
        <div className="modal-footer">
          {actions || (
            <button className="modal-button" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
