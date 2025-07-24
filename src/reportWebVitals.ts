const reportWebVitals = (onPerfEntry?: any) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then((webVitals) => {
      if (webVitals.onCLS) webVitals.onCLS(onPerfEntry);
      if (webVitals.onFCP) webVitals.onFCP(onPerfEntry);
      if (webVitals.onLCP) webVitals.onLCP(onPerfEntry);
      if (webVitals.onTTFB) webVitals.onTTFB(onPerfEntry);
      // onFID might not be available in newer versions
      if (webVitals.onINP) webVitals.onINP(onPerfEntry);
    });
  }
};

export default reportWebVitals;