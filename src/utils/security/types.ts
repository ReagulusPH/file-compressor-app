/**
 * Security utility types
 * Type definitions for security and privacy validation
 */

/**
 * Library validation result interface
 */
export interface LibraryValidationResult {
  isSecure: boolean;
  warnings: string[];
  blockedFeatures: string[];
}

/**
 * Privacy validation result interface
 */
export interface PrivacyValidationResult {
  isCompliant: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Security report interface
 */
export interface SecurityReport {
  isSecure: boolean;
  violations: string[];
  recommendations: string[];
  libraryActivity: LibraryNetworkActivity[];
}

/**
 * Network activity tracking for compression libraries
 */
export interface LibraryNetworkActivity {
  libraryName: string;
  requestCount: number;
  blockedRequests: string[];
  allowedRequests: string[];
  lastActivity: Date;
}

/**
 * Supported data types for secure memory disposal
 */
export type SecureDataType = 'document' | 'audio' | 'image' | 'archive' | 'general';

/**
 * Compression library configuration
 */
export interface CompressionLibraryConfig {
  name: string;
  type: 'document' | 'audio' | 'archive' | 'image';
  allowedFeatures: string[];
  blockedFeatures: string[];
  networkSafe: boolean;
}