import React from 'react';
import './CompatibilityWarning.css';

/**
 * Props for the CompatibilityWarning component
 */
interface CompatibilityWarningProps {
  /**
   * The feature that has compatibility issues
   */
  feature: string;

  /**
   * The type of compatibility issue
   */
  type: 'unsupported' | 'limited' | 'fallback';

  /**
   * Additional details about the compatibility issue
   */
  details?: string;

  /**
   * Suggested actions to resolve the issue
   */
  suggestions?: string[];

  /**
   * Whether the warning can be dismissed
   */
  dismissible?: boolean;

  /**
   * Callback when the warning is dismissed
   */
  onDismiss?: () => void;

  /**
   * Format type for context-specific styling and messaging
   */
  formatType?: 'image' | 'video' | 'audio' | 'document' | 'archive';

  /**
   * Available fallback methods
   */
  fallbackMethods?: string[];

  /**
   * Whether to show technical details
   */
  showTechnicalDetails?: boolean;
}

/**
 * CompatibilityWarning component for displaying browser compatibility issues
 */
const CompatibilityWarning: React.FC<CompatibilityWarningProps> = ({
  feature,
  type,
  details,
  suggestions = [],
  dismissible = false,
  onDismiss,
  formatType,
  fallbackMethods = [],
  showTechnicalDetails = false,
}) => {
  /**
   * Get the appropriate icon for the warning type
   */
  const getIcon = (): string => {
    switch (type) {
      case 'unsupported':
        return '❌';
      case 'limited':
        return '⚠️';
      case 'fallback':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  /**
   * Get the appropriate CSS class for the warning type
   */
  const getClassName = (): string => {
    const baseClass = 'compatibility-warning';
    switch (type) {
      case 'unsupported':
        return `${baseClass} ${baseClass}--error`;
      case 'limited':
        return `${baseClass} ${baseClass}--warning`;
      case 'fallback':
        return `${baseClass} ${baseClass}--info`;
      default:
        return `${baseClass} ${baseClass}--warning`;
    }
  };

  /**
   * Get the title for the warning type
   */
  const getTitle = (): string => {
    switch (type) {
      case 'unsupported':
        return `${feature} Not Supported`;
      case 'limited':
        return `Limited ${feature} Support`;
      case 'fallback':
        return `Using ${feature} Fallback`;
      default:
        return `${feature} Compatibility Issue`;
    }
  };

  /**
   * Get the default message for the warning type
   */
  const getDefaultMessage = (): string => {
    const formatContext = formatType ? ` for ${formatType} files` : '';
    
    switch (type) {
      case 'unsupported':
        return `Your browser does not support ${feature}${formatContext}. This feature will not be available.`;
      case 'limited':
        return `Your browser has limited support for ${feature}${formatContext}. Some features may not work as expected.`;
      case 'fallback':
        return `Your browser doesn't support native ${feature}${formatContext}. Using a fallback implementation.`;
      default:
        return `There may be compatibility issues with ${feature}${formatContext} in your browser.`;
    }
  };

  /**
   * Get format-specific icon
   */
  const getFormatIcon = (): string => {
    if (!formatType) return '';
    
    switch (formatType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      case 'archive':
        return '📦';
      default:
        return '';
    }
  };

  return (
    <div className={getClassName()} role="alert">
      <div className="compatibility-warning__header">
        <span className="compatibility-warning__icon">{getIcon()}</span>
        <h4 className="compatibility-warning__title">{getTitle()}</h4>
        {dismissible && onDismiss && (
          <button
            className="compatibility-warning__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss warning"
          >
            ✕
          </button>
        )}
      </div>

      <div className="compatibility-warning__content">
        <div className="compatibility-warning__message-container">
          {formatType && (
            <span className="compatibility-warning__format-icon">
              {getFormatIcon()}
            </span>
          )}
          <p className="compatibility-warning__message">
            {details || getDefaultMessage()}
          </p>
        </div>

        {fallbackMethods.length > 0 && type === 'fallback' && (
          <div className="compatibility-warning__fallback-methods">
            <p className="compatibility-warning__fallback-title">
              <strong>Available methods:</strong>
            </p>
            <ul className="compatibility-warning__fallback-list">
              {fallbackMethods.map((method, index) => (
                <li key={index} className="compatibility-warning__fallback-method">
                  {method}
                </li>
              ))}
            </ul>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="compatibility-warning__suggestions">
            <p className="compatibility-warning__suggestions-title">
              <strong>Suggestions:</strong>
            </p>
            <ul className="compatibility-warning__suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="compatibility-warning__suggestion">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showTechnicalDetails && (
          <details className="compatibility-warning__technical-details">
            <summary className="compatibility-warning__technical-summary">
              Technical Details
            </summary>
            <div className="compatibility-warning__technical-content">
              <p><strong>Format Type:</strong> {formatType || 'Unknown'}</p>
              <p><strong>Support Level:</strong> {type}</p>
              <p><strong>Primary Method:</strong> {fallbackMethods[0] || 'None available'}</p>
              {fallbackMethods.length > 1 && (
                <p><strong>Fallback Methods:</strong> {fallbackMethods.slice(1).join(', ')}</p>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default CompatibilityWarning;