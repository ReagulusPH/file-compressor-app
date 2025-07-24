import React, { useState } from 'react';
import './PrivacyMessage.css';

interface PrivacyMessageProps {
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * PrivacyMessage Component
 *
 * Displays information about the application's privacy features,
 * emphasizing client-side processing and no server uploads.
 */
const PrivacyMessage: React.FC<PrivacyMessageProps> = ({ className = '' }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`privacy-message ${className}`}>
      <h3>
        <span className="privacy-message-icon" role="img" aria-label="privacy">
          🔒
        </span>
        Your Privacy is Protected
      </h3>

      <p>
        <strong>100% Client-Side Processing:</strong> All file compression happens directly in your
        browser. Your files never leave your device and are not uploaded to any server.
      </p>

      {!showDetails && (
        <button
          className="privacy-message-toggle"
          onClick={() => setShowDetails(true)}
          aria-expanded={showDetails}
        >
          Learn more about our privacy features
        </button>
      )}

      {showDetails && (
        <div className="privacy-message-details">
          <p>
            <strong>How it works:</strong> This application uses modern web technologies to compress
            your files directly in your browser. We use Web Workers to process files in the
            background without affecting your browsing experience.
          </p>

          <p>
            <strong>No data collection:</strong> We don't collect any information about your files
            or usage. There are no analytics, tracking, or cookies used in this application.
          </p>

          <p>
            <strong>Temporary storage:</strong> Your files are temporarily stored in your browser's
            memory during processing and are automatically cleared when you close the application or
            navigate away.
          </p>

          <p>
            <strong>Secure processing:</strong> All processing happens in an isolated environment
            within your browser, ensuring your data remains secure throughout the compression
            process.
          </p>

          <button
            className="privacy-message-toggle"
            onClick={() => setShowDetails(false)}
            aria-expanded={showDetails}
          >
            Show less
          </button>
        </div>
      )}

      <div className="privacy-message-footer">
        By using this application, you can be confident that your files remain private and secure.
      </div>
    </div>
  );
};

export default PrivacyMessage;
