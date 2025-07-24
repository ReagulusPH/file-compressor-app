import React, { useEffect, useState } from 'react';
import {
  checkBrowserCompatibility,
  getBrowserCompatibilityMessage,
  getBrowserInfo,
  BrowserCompatibility,
} from '../../utils/browserSupport';
import './BrowserCompatibilityMessage.css';

/**
 * Props for the BrowserCompatibilityMessage component
 */
interface BrowserCompatibilityMessageProps {
  /**
   * Optional callback when the message is dismissed
   */
  onDismiss?: () => void;
}

/**
 * Component to display browser compatibility messages
 */
const BrowserCompatibilityMessage: React.FC<BrowserCompatibilityMessageProps> = ({ onDismiss }) => {
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);
  const [browserInfo, setBrowserInfo] = useState<{ name: string; version: string } | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check browser compatibility
    const compat = checkBrowserCompatibility();
    setCompatibility(compat);

    // Get browser info
    const info = getBrowserInfo();
    setBrowserInfo(info);

    // Check if the message was previously dismissed
    const dismissedStatus = localStorage.getItem('browser-compatibility-dismissed');
    if (dismissedStatus === 'true') {
      setDismissed(true);
    }
  }, []);

  // If compatible or already dismissed, don't show anything
  if (!compatibility || compatibility.isCompatible || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('browser-compatibility-dismissed', 'true');
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      className={`browser-compatibility-message ${compatibility.missingFeatures.length > 0 ? 'error' : 'warning'}`}
    >
      <div className="message-content">
        <div className="message-icon">{compatibility.missingFeatures.length > 0 ? '⚠️' : 'ℹ️'}</div>
        <div className="message-text">
          <p className="message-title">
            {compatibility.missingFeatures.length > 0
              ? 'Browser Compatibility Issue'
              : 'Browser Compatibility Warning'}
          </p>
          <p className="message-body">{getBrowserCompatibilityMessage(compatibility)}</p>
          {browserInfo && (
            <p className="browser-info">
              You're using {browserInfo.name} {browserInfo.version}
            </p>
          )}
        </div>
      </div>
      <button className="dismiss-button" onClick={handleDismiss} aria-label="Dismiss message">
        ✕
      </button>
    </div>
  );
};

export default BrowserCompatibilityMessage;
