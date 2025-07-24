import React, { Suspense, useEffect, useState } from 'react';
import './App.css';
import { lazyLoadComponent, preload } from './utils/lazyLoad';
import SecureProcessing from './utils/security/SecureProcessing';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';

// Preload components
preload(() => import('./components/Header'));
preload(() => import('./components/ImageCompressorDemo'));
preload(() => import('./components/Feedback/BrowserCompatibilityMessage'));
preload(() => import('./components/Feedback/PrivacyMessage'));

// Lazy load components
const Header = lazyLoadComponent(() => import('./components/Header'));
const ImageCompressorDemo = lazyLoadComponent(() => import('./components/ImageCompressorDemo'));
const ToastContainer = lazyLoadComponent(() => import('./components/Feedback/ToastContainer'));
const BrowserCompatibilityMessage = lazyLoadComponent(
  () => import('./components/Feedback/BrowserCompatibilityMessage')
);
const PrivacyMessage = lazyLoadComponent(() => import('./components/Feedback/PrivacyMessage'));

// Skeleton UI components
const SkeletonHeader: React.FC = () => (
  <header
    className="skeleton-header"
    style={{
      height: '64px',
      backgroundColor: 'var(--color-surface)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      boxShadow: 'var(--shadow-sm)',
      borderBottom: '1px solid var(--color-border)',
    }}
  >
    <div
      className="skeleton-logo"
      style={{
        width: '180px',
        height: '32px',
        backgroundColor: 'var(--color-skeleton)',
        borderRadius: '4px',
      }}
    ></div>
  </header>
);

const SkeletonContent: React.FC = () => (
  <div
    className="skeleton-content"
    style={{
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}
  >
    <div
      className="skeleton-dropzone"
      style={{
        height: '200px',
        border: '2px dashed var(--color-border)',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--color-surface)',
        marginBottom: '24px',
      }}
    >
      <div
        className="skeleton-text"
        style={{
          width: '200px',
          height: '24px',
          backgroundColor: 'var(--color-skeleton)',
          borderRadius: '4px',
        }}
      ></div>
    </div>

    <div
      className="skeleton-settings"
      style={{
        padding: '16px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="skeleton-title"
        style={{
          width: '120px',
          height: '24px',
          backgroundColor: 'var(--color-skeleton)',
          borderRadius: '4px',
          marginBottom: '16px',
        }}
      ></div>
      <div
        className="skeleton-slider"
        style={{
          width: '100%',
          height: '16px',
          backgroundColor: 'var(--color-skeleton)',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      ></div>
    </div>
  </div>
);

/**
 * Main App component for the File Compressor Web App
 * This will serve as the entry point for our application
 */
function App() {
  const [, setIsLoading] = useState(true);

  // Simulate initial loading state and initialize secure processing
  useEffect(() => {
    // Show skeleton UI for at least 800ms for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    // Fix for mobile viewport height (addresses mobile browser address bar issues)
    const setVhProperty = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set the property initially and on resize
    setVhProperty();
    window.addEventListener('resize', setVhProperty);

    // Initialize secure processing environment
    SecureProcessing.initialize({
      monitorNetwork: true,
      logBlocked: false, // Reduce console noise - warnings are expected for library validation
      validateLibraries: true,
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', setVhProperty);

      // Clean up secure processing environment
      SecureProcessing.cleanup();
    };
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <div className="App">
          <Suspense fallback={<SkeletonHeader />}>
            <Header title="File Compressor" />
          </Suspense>

          <main>
            <Suspense fallback={<SkeletonContent />}>
              <ImageCompressorDemo />
            </Suspense>

            <Suspense fallback={null}>
              <PrivacyMessage className="container" />
            </Suspense>
          </main>

          <Suspense fallback={null}>
            <ToastContainer position="bottom-right" maxToasts={3} />
          </Suspense>

          <Suspense fallback={null}>
            <BrowserCompatibilityMessage />
          </Suspense>
        </div>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
