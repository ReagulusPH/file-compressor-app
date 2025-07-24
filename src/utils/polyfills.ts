/**
 * Initialize polyfills for broader browser compatibility
 */
export function initPolyfills(): void {
  // SharedArrayBuffer polyfill for FFmpeg
  if (typeof SharedArrayBuffer === 'undefined') {
    // For browsers that don't support SharedArrayBuffer
    // This is mainly for Safari and some older browsers
    console.warn('SharedArrayBuffer not supported. FFmpeg fallback may have limited functionality.');
  }

  // Canvas toBlob polyfill for older browsers
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (callback: BlobCallback, type?: string, quality?: any) {
        const canvas = this;
        setTimeout(() => {
          const dataURL = canvas.toDataURL(type, quality);
          const binStr = atob(dataURL.split(',')[1]);
          const len = binStr.length;
          const arr = new Uint8Array(len);

          for (let i = 0; i < len; i++) {
            arr[i] = binStr.charCodeAt(i);
          }

          callback(new Blob([arr], { type: type || 'image/png' }));
        });
      },
    });
  }

  // MediaRecorder polyfill check
  if (!window.MediaRecorder) {
    console.warn('MediaRecorder not supported. Video compression will use FFmpeg fallback.');
  }
}
