/**
 * NetworkMonitor
 *
 * Utility to monitor and prevent unwanted network requests
 * Ensures that file data is not sent to any external servers
 * Extended to monitor document and audio processing libraries
 */

interface NetworkMonitorOptions {
  /**
   * Whether to log blocked requests to console
   */
  logBlocked?: boolean;

  /**
   * Domains that are allowed for API requests (if any)
   */
  allowedDomains?: string[];

  /**
   * Whether to monitor compression library network activity
   */
  monitorLibraries?: boolean;
}

/**
 * Network request tracking for compression libraries
 */
interface LibraryNetworkActivity {
  libraryName: string;
  requestCount: number;
  blockedRequests: string[];
  allowedRequests: string[];
  lastActivity: Date;
}

/**
 * Compression libraries that should not make network requests
 */
const MONITORED_LIBRARIES = [
  'pdf-lib',
  'pizzip', 
  'docx',
  'lamejs',
  'wav-encoder',
  'jszip',
  'utif',
] as const;

/**
 * NetworkMonitor class
 * Monitors and prevents unwanted network requests
 * Extended with compression library monitoring
 */
class NetworkMonitor {
  private isActive: boolean = false;
  private originalFetch: typeof fetch;
  private originalXHR: typeof XMLHttpRequest;
  private options: NetworkMonitorOptions = {
    logBlocked: false,
    allowedDomains: [],
    monitorLibraries: true,
  };
  private libraryActivity: Map<string, LibraryNetworkActivity> = new Map();
  private blockedRequestCount: number = 0;

  constructor() {
    // Store original implementations
    this.originalFetch = window.fetch;
    this.originalXHR = window.XMLHttpRequest;
  }

  /**
   * Start monitoring network requests
   * @param options - Configuration options
   */
  public start(options: NetworkMonitorOptions = {}): void {
    if (this.isActive) return;

    this.options = { ...this.options, ...options };
    this.isActive = true;

    // Initialize library activity tracking
    if (this.options.monitorLibraries) {
      this.initializeLibraryMonitoring();
    }

    // Override fetch API
    window.fetch = this.createSecureFetch();

    // Override XMLHttpRequest
    window.XMLHttpRequest = this.createSecureXHR();

    console.log('🔒 Network monitoring started for compression libraries');
  }

  /**
   * Stop monitoring network requests
   */
  public stop(): void {
    if (!this.isActive) return;

    // Restore original implementations
    window.fetch = this.originalFetch;
    window.XMLHttpRequest = this.originalXHR;

    // Clear library activity tracking
    this.libraryActivity.clear();
    this.blockedRequestCount = 0;

    this.isActive = false;

    console.log('🔒 Network monitoring stopped');
  }

  /**
   * Initialize library activity monitoring
   */
  private initializeLibraryMonitoring(): void {
    for (const library of MONITORED_LIBRARIES) {
      this.libraryActivity.set(library, {
        libraryName: library,
        requestCount: 0,
        blockedRequests: [],
        allowedRequests: [],
        lastActivity: new Date(),
      });
    }
  }

  /**
   * Detect which library might be making a request based on stack trace
   * @param error - Error object with stack trace
   * @returns Library name or null if not detected
   */
  private detectRequestingLibrary(error?: Error): string | null {
    if (!error || !error.stack) return null;

    const stack = error.stack.toLowerCase();
    
    for (const library of MONITORED_LIBRARIES) {
      if (stack.includes(library) || stack.includes(library.replace('-', ''))) {
        return library;
      }
    }

    // Check for common library patterns in stack trace
    if (stack.includes('pdf') || stack.includes('document')) return 'pdf-lib';
    if (stack.includes('zip') || stack.includes('archive')) return 'jszip';
    if (stack.includes('audio') || stack.includes('mp3')) return 'lamejs';
    if (stack.includes('wav') || stack.includes('encoder')) return 'wav-encoder';
    if (stack.includes('tiff') || stack.includes('utif')) return 'utif';

    return null;
  }

  /**
   * Track library network activity
   * @param library - Library name
   * @param url - Request URL
   * @param blocked - Whether the request was blocked
   */
  private trackLibraryActivity(library: string, url: string, blocked: boolean): void {
    const activity = this.libraryActivity.get(library);
    if (!activity) return;

    activity.requestCount++;
    activity.lastActivity = new Date();

    if (blocked) {
      activity.blockedRequests.push(url);
      this.blockedRequestCount++;
      
      if (this.options.logBlocked) {
        console.warn(`🚫 Blocked network request from ${library}:`, url);
      }
    } else {
      activity.allowedRequests.push(url);
      
      if (this.options.logBlocked) {
        console.log(`✅ Allowed network request from ${library}:`, url);
      }
    }
  }

  /**
   * Check if a URL is allowed based on configuration
   * @param url - URL to check
   * @param requestingLibrary - Library making the request (if known)
   * @returns Whether the URL is allowed
   */
  private isAllowedUrl(url: string, requestingLibrary?: string): boolean {
    try {
      // Allow relative URLs (same origin)
      if (url.startsWith('/')) {
        if (requestingLibrary) {
          this.trackLibraryActivity(requestingLibrary, url, false);
        }
        return true;
      }

      const urlObj = new URL(url);

      // Special handling for compression libraries - they should not make external requests
      if (requestingLibrary && MONITORED_LIBRARIES.includes(requestingLibrary as any)) {
        // Compression libraries should only access same-origin resources
        const isSameOrigin = urlObj.origin === window.location.origin;
        this.trackLibraryActivity(requestingLibrary, url, !isSameOrigin);
        
        if (!isSameOrigin) {
          console.error(`🚨 Security violation: ${requestingLibrary} attempted external request to ${url}`);
          return false;
        }
        
        return true;
      }

      // Check if domain is in allowed list
      if (this.options.allowedDomains && this.options.allowedDomains.length > 0) {
        const isAllowed = this.options.allowedDomains.some(
          domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        
        if (requestingLibrary) {
          this.trackLibraryActivity(requestingLibrary, url, !isAllowed);
        }
        
        return isAllowed;
      }

      // By default, only allow same-origin requests
      const isSameOrigin = urlObj.origin === window.location.origin;
      
      if (requestingLibrary) {
        this.trackLibraryActivity(requestingLibrary, url, !isSameOrigin);
      }
      
      return isSameOrigin;
    } catch (error) {
      // If URL parsing fails, block the request
      if (requestingLibrary) {
        this.trackLibraryActivity(requestingLibrary, url, true);
      }
      return false;
    }
  }

  /**
   * Create a secure version of the fetch API
   * @returns Secure fetch function
   */
  private createSecureFetch(): typeof fetch {
    const self = this;
    const originalFetch = this.originalFetch;

    return function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Detect requesting library from stack trace
      const requestingLibrary = self.detectRequestingLibrary(new Error());

      if (!self.isAllowedUrl(url, requestingLibrary || undefined)) {
        const errorMessage = requestingLibrary 
          ? `Network request blocked for security reasons (from ${requestingLibrary}): ${url}`
          : `Network request blocked for security reasons: ${url}`;
          
        return Promise.reject(new Error(errorMessage));
      }

      return originalFetch.call(window, input, init);
    };
  }

  /**
   * Create a secure version of XMLHttpRequest
   * @returns Secure XMLHttpRequest constructor
   */
  private createSecureXHR(): typeof XMLHttpRequest {
    const self = this;
    const OriginalXHR = this.originalXHR;

    // Create a new constructor that extends the original
    const SecureXHR = function (this: XMLHttpRequest) {
      const xhr = new OriginalXHR();
      const originalOpen = xhr.open;

      // Override open method to check URL
      xhr.open = function (method: string, url: string, ...args: any[]): void {
        // Detect requesting library from stack trace
        const requestingLibrary = self.detectRequestingLibrary(new Error());
        
        if (!self.isAllowedUrl(url, requestingLibrary || undefined)) {
          const errorMessage = requestingLibrary 
            ? `Network request blocked for security reasons (from ${requestingLibrary}): ${url}`
            : `Network request blocked for security reasons: ${url}`;
            
          throw new Error(errorMessage);
        }

        return originalOpen.call(xhr, method, url, args[0], args[1]);
      };

      return xhr;
    } as unknown as typeof XMLHttpRequest;

    // Copy prototype and properties
    SecureXHR.prototype = OriginalXHR.prototype;

    return SecureXHR;
  }

  /**
   * Get the current status of the monitor
   * @returns Whether the monitor is active
   */
  public isMonitoring(): boolean {
    return this.isActive;
  }

  /**
   * Get library network activity report
   * @returns Map of library activity data
   */
  public getLibraryActivity(): Map<string, LibraryNetworkActivity> {
    return new Map(this.libraryActivity);
  }

  /**
   * Get network activity summary for a specific library
   * @param libraryName - Name of the library
   * @returns Library activity data or null if not found
   */
  public getLibraryActivitySummary(libraryName: string): LibraryNetworkActivity | null {
    return this.libraryActivity.get(libraryName) || null;
  }

  /**
   * Check if any compression libraries have made blocked requests
   * @returns Whether any libraries have been blocked
   */
  public hasBlockedLibraryRequests(): boolean {
    return this.blockedRequestCount > 0;
  }

  /**
   * Get total count of blocked requests
   * @returns Number of blocked requests
   */
  public getBlockedRequestCount(): number {
    return this.blockedRequestCount;
  }

  /**
   * Get security report for compression libraries
   * @returns Security report with violations and recommendations
   */
  public getSecurityReport(): {
    isSecure: boolean;
    violations: string[];
    recommendations: string[];
    libraryActivity: LibraryNetworkActivity[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];
    const libraryActivity: LibraryNetworkActivity[] = [];

    let isSecure = true;

    for (const [libraryName, activity] of this.libraryActivity) {
      libraryActivity.push({ ...activity });

      if (activity.blockedRequests.length > 0) {
        isSecure = false;
        violations.push(`${libraryName} attempted ${activity.blockedRequests.length} blocked network requests`);
        
        for (const blockedUrl of activity.blockedRequests) {
          violations.push(`  - Blocked request to: ${blockedUrl}`);
        }
      }

      if (activity.requestCount > 0) {
        recommendations.push(`Monitor ${libraryName} network activity (${activity.requestCount} total requests)`);
      }
    }

    if (isSecure) {
      recommendations.push('All compression libraries are operating securely without external network requests');
    } else {
      recommendations.push('Review compression library implementations for security compliance');
      recommendations.push('Consider using alternative libraries that do not require network access');
    }

    return {
      isSecure,
      violations,
      recommendations,
      libraryActivity,
    };
  }

  /**
   * Reset library activity tracking
   */
  public resetLibraryActivity(): void {
    for (const activity of this.libraryActivity.values()) {
      activity.requestCount = 0;
      activity.blockedRequests = [];
      activity.allowedRequests = [];
      activity.lastActivity = new Date();
    }
    this.blockedRequestCount = 0;
  }
}

// Export singleton instance
const networkMonitor = new NetworkMonitor();
export default networkMonitor;
