/**
 * Format Compatibility Display Component
 * Shows comprehensive compatibility information for specific formats
 */

import React, { useState, useEffect } from 'react';
import CompatibilityWarning from './CompatibilityWarning';
import { EnhancedBrowserCapabilityDetector, type EnhancedCapabilityResult } from '../../utils/enhancedBrowserCapabilities';
import type { FormatInfo } from '../../types';
import './FormatCompatibilityDisplay.css';

/**
 * Props for the FormatCompatibilityDisplay component
 */
interface FormatCompatibilityDisplayProps {
  /**
   * The format to display compatibility information for
   */
  formatInfo: FormatInfo;

  /**
   * Optional file size for more accurate analysis
   */
  fileSize?: number;

  /**
   * Whether to show detailed technical information
   */
  showTechnicalDetails?: boolean;

  /**
   * Whether to show performance profile
   */
  showPerformanceProfile?: boolean;

  /**
   * Whether warnings can be dismissed
   */
  dismissibleWarnings?: boolean;

  /**
   * Callback when a warning is dismissed
   */
  onWarningDismiss?: (warningIndex: number) => void;

  /**
   * Whether to show fallback chain information
   */
  showFallbackChain?: boolean;

  /**
   * Compact mode for smaller displays
   */
  compact?: boolean;
}

/**
 * FormatCompatibilityDisplay component
 */
const FormatCompatibilityDisplay: React.FC<FormatCompatibilityDisplayProps> = ({
  formatInfo,
  fileSize = 0,
  showTechnicalDetails = false,
  showPerformanceProfile = false,
  dismissibleWarnings = false,
  onWarningDismiss,
  showFallbackChain = false,
  compact = false,
}) => {
  const [capabilities, setCapabilities] = useState<EnhancedCapabilityResult | null>(null);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCapabilities = async () => {
      setIsLoading(true);
      try {
        const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo, fileSize);
        setCapabilities(result);
      } catch (error) {
        console.error('Failed to load enhanced capabilities:', error);
        setCapabilities(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCapabilities();
  }, [formatInfo, fileSize]);

  const handleWarningDismiss = (warningIndex: number) => {
    setDismissedWarnings(prev => new Set(prev).add(warningIndex));
    onWarningDismiss?.(warningIndex);
  };

  if (isLoading) {
    return (
      <div className={`format-compatibility-display ${compact ? 'format-compatibility-display--compact' : ''}`}>
        <div className="format-compatibility-display__loading">
          <div className="loading-spinner" />
          <span>Analyzing browser compatibility...</span>
        </div>
      </div>
    );
  }

  if (!capabilities) {
    return (
      <div className={`format-compatibility-display ${compact ? 'format-compatibility-display--compact' : ''}`}>
        <div className="format-compatibility-display__error">
          <span className="error-icon">⚠️</span>
          <span>Unable to analyze compatibility for this format</span>
        </div>
      </div>
    );
  }

  const visibleWarnings = capabilities.compatibilityWarnings.filter(
    (_, index) => !dismissedWarnings.has(index)
  );

  return (
    <div className={`format-compatibility-display ${compact ? 'format-compatibility-display--compact' : ''}`}>
      {/* Format Header */}
      <div className="format-compatibility-display__header">
        <div className="format-compatibility-display__format-info">
          <span className="format-compatibility-display__format-icon">
            {getFormatIcon(formatInfo.type)}
          </span>
          <div className="format-compatibility-display__format-details">
            <h3 className="format-compatibility-display__format-name">
              {formatInfo.format.toUpperCase()} Format
            </h3>
            <p className="format-compatibility-display__format-type">
              {formatInfo.type} • {capabilities.supportInfo.supportLevel} support
            </p>
          </div>
        </div>
        
        <div className="format-compatibility-display__support-badge">
          <span className={`support-badge support-badge--${capabilities.supportInfo.supportLevel}`}>
            {getSupportLevelText(capabilities.supportInfo.supportLevel)}
          </span>
        </div>
      </div>

      {/* Performance Profile */}
      {showPerformanceProfile && (
        <div className="format-compatibility-display__performance">
          <h4 className="format-compatibility-display__section-title">Performance Profile</h4>
          <div className="performance-metrics">
            <div className="performance-metric">
              <span className="performance-metric__label">Speed:</span>
              <span className={`performance-metric__value performance-metric__value--${capabilities.performanceProfile.expectedSpeed}`}>
                {capabilities.performanceProfile.expectedSpeed}
              </span>
            </div>
            <div className="performance-metric">
              <span className="performance-metric__label">Memory:</span>
              <span className={`performance-metric__value performance-metric__value--${capabilities.performanceProfile.memoryUsage}`}>
                {capabilities.performanceProfile.memoryUsage}
              </span>
            </div>
            <div className="performance-metric">
              <span className="performance-metric__label">CPU:</span>
              <span className={`performance-metric__value performance-metric__value--${capabilities.performanceProfile.cpuIntensity}`}>
                {capabilities.performanceProfile.cpuIntensity}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Chain */}
      {showFallbackChain && capabilities.fallbackChain.length > 0 && (
        <div className="format-compatibility-display__fallback-chain">
          <h4 className="format-compatibility-display__section-title">Processing Methods</h4>
          <div className="fallback-chain">
            {capabilities.fallbackChain.map((method, index) => (
              <div key={index} className={`fallback-method ${index === 0 ? 'fallback-method--primary' : ''}`}>
                <span className="fallback-method__order">{index + 1}</span>
                <span className="fallback-method__name">{formatMethodName(method)}</span>
                {index === 0 && <span className="fallback-method__badge">Recommended</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compatibility Warnings */}
      {visibleWarnings.length > 0 && (
        <div className="format-compatibility-display__warnings">
          {!compact && (
            <h4 className="format-compatibility-display__section-title">
              Compatibility Information
            </h4>
          )}
          {visibleWarnings.map((warning, index) => (
            <CompatibilityWarning
              key={index}
              feature={warning.feature}
              type={warning.type}
              details={warning.details}
              suggestions={warning.suggestions}
              formatType={formatInfo.type}
              fallbackMethods={capabilities.fallbackChain}
              showTechnicalDetails={showTechnicalDetails}
              dismissible={dismissibleWarnings}
              onDismiss={() => handleWarningDismiss(index)}
            />
          ))}
        </div>
      )}

      {/* Technical Details */}
      {showTechnicalDetails && (
        <details className="format-compatibility-display__technical-details">
          <summary className="format-compatibility-display__technical-summary">
            Technical Details
          </summary>
          <div className="format-compatibility-display__technical-content">
            <div className="technical-detail">
              <strong>Browser:</strong> {capabilities.browserInfo.name} {capabilities.browserInfo.version}
            </div>
            <div className="technical-detail">
              <strong>Engine:</strong> {capabilities.browserInfo.engine}
            </div>
            <div className="technical-detail">
              <strong>Primary Method:</strong> {capabilities.supportInfo.primaryMethod}
            </div>
            <div className="technical-detail">
              <strong>Compressor:</strong> {formatInfo.compressor}
            </div>
            {capabilities.supportInfo.limitations.length > 0 && (
              <div className="technical-detail">
                <strong>Limitations:</strong>
                <ul>
                  {capabilities.supportInfo.limitations.map((limitation, index) => (
                    <li key={index}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* No Issues Message */}
      {visibleWarnings.length === 0 && capabilities.supportInfo.supportLevel === 'native' && (
        <div className="format-compatibility-display__success">
          <span className="success-icon">✅</span>
          <span>Full compatibility - no issues detected</span>
        </div>
      )}
    </div>
  );
};

/**
 * Get format icon based on type
 */
function getFormatIcon(type: string): string {
  switch (type) {
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
      return '📁';
  }
}

/**
 * Get user-friendly support level text
 */
function getSupportLevelText(level: string): string {
  switch (level) {
    case 'native':
      return 'Full Support';
    case 'library':
      return 'Library Support';
    case 'fallback':
      return 'Limited Support';
    case 'unsupported':
      return 'Not Supported';
    default:
      return 'Unknown';
  }
}

/**
 * Format method name for display
 */
function formatMethodName(method: string): string {
  if (method === 'native') return 'Native Browser APIs';
  if (method.startsWith('library:')) return method.replace('library:', '') + ' Library';
  if (method.startsWith('fallback:')) return method.replace('fallback:', '') + ' Fallback';
  return method;
}

export default FormatCompatibilityDisplay;