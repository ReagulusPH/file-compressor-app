import React from 'react';
import Modal from '../Feedback/Modal';
import './FormatHelpModal.css';

export interface FormatHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'document' | 'audio' | 'archive' | 'browser-compatibility' | 'memory-optimization' | null;
}

/**
 * Format-specific help modal with troubleshooting guides
 */
const FormatHelpModal: React.FC<FormatHelpModalProps> = ({
  isOpen,
  onClose,
  format,
}) => {
  if (!format) return null;

  const getHelpContent = () => {
    switch (format) {
      case 'document':
        return <DocumentHelpContent />;
      case 'audio':
        return <AudioHelpContent />;
      case 'archive':
        return <ArchiveHelpContent />;
      case 'browser-compatibility':
        return <BrowserCompatibilityHelpContent />;
      case 'memory-optimization':
        return <MemoryOptimizationHelpContent />;
      default:
        return <div>Help content not available</div>;
    }
  };

  const getTitle = () => {
    switch (format) {
      case 'document':
        return 'Document Compression Help';
      case 'audio':
        return 'Audio Compression Help';
      case 'archive':
        return 'Archive Compression Help';
      case 'browser-compatibility':
        return 'Browser Compatibility Help';
      case 'memory-optimization':
        return 'Memory Optimization Help';
      default:
        return 'Help';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
    >
      <div className="help-content">
        {getHelpContent()}
      </div>
    </Modal>
  );
};

/**
 * Document compression help content
 */
const DocumentHelpContent: React.FC = () => (
  <div className="help-section">
    <h3>📄 Document Compression</h3>
    <p>Compress PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, and ODT files while maintaining document integrity.</p>
    
    <div className="help-subsection">
      <h4>Supported Formats</h4>
      <ul>
        <li><strong>PDF:</strong> Portable Document Format files</li>
        <li><strong>Microsoft Office:</strong> DOC, DOCX, XLS, XLSX, PPT, PPTX</li>
        <li><strong>OpenDocument:</strong> ODT (OpenDocument Text)</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Common Issues & Solutions</h4>
      
      <div className="issue-solution">
        <h5>🔒 Password-Protected Documents</h5>
        <p><strong>Problem:</strong> Document is encrypted and cannot be processed.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Remove password protection in the original application</li>
          <li>Save document without encryption</li>
          <li>Use "Save As" to create an unprotected copy</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>💥 Corrupted Documents</h5>
        <p><strong>Problem:</strong> Document appears to be corrupted or invalid.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Try opening the document in its native application</li>
          <li>Use document repair tools in Office applications</li>
          <li>Re-download or re-create the document</li>
          <li>Save in a different format (e.g., DOCX to PDF)</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>📊 Large Documents</h5>
        <p><strong>Problem:</strong> Document is too large for processing.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Split large documents into smaller sections</li>
          <li>Remove or compress embedded images first</li>
          <li>Use "Medium" or "Low" compression settings</li>
          <li>Close other browser tabs to free memory</li>
        </ul>
      </div>
    </div>

    <div className="help-subsection">
      <h4>Compression Settings</h4>
      <ul>
        <li><strong>Low:</strong> Minimal compression, preserves quality</li>
        <li><strong>Medium:</strong> Balanced compression and quality</li>
        <li><strong>High:</strong> Maximum compression, may affect quality</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Best Practices</h4>
      <ul>
        <li>Always backup original documents before compression</li>
        <li>Test compressed documents in their target applications</li>
        <li>Use "Preserve Metadata" for documents with important properties</li>
        <li>Enable "Optimize Images" for documents with many pictures</li>
      </ul>
    </div>
  </div>
);

/**
 * Audio compression help content
 */
const AudioHelpContent: React.FC = () => (
  <div className="help-section">
    <h3>🎵 Audio Compression</h3>
    <p>Compress MP3 and WAV audio files while maintaining acceptable audio quality.</p>
    
    <div className="help-subsection">
      <h4>Supported Formats</h4>
      <ul>
        <li><strong>MP3:</strong> MPEG Audio Layer III</li>
        <li><strong>WAV:</strong> Waveform Audio File Format</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Common Issues & Solutions</h4>
      
      <div className="issue-solution">
        <h5>🎧 Audio Decode Errors</h5>
        <p><strong>Problem:</strong> Audio file cannot be decoded or is corrupted.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Test audio file in a media player first</li>
          <li>Convert to standard MP3 or WAV format</li>
          <li>Re-encode audio with standard codecs</li>
          <li>Try a different audio file</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>🔊 Quality Issues</h5>
        <p><strong>Problem:</strong> Compressed audio quality is poor.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Increase bitrate setting (128kbps or higher)</li>
          <li>Use higher quality setting (70% or above)</li>
          <li>Keep original sample rate (44.1kHz)</li>
          <li>Maintain stereo channels for music</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>📁 Large Audio Files</h5>
        <p><strong>Problem:</strong> Audio file is too large for processing.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Use streaming compression for files over 50MB</li>
          <li>Lower bitrate settings (96kbps or 128kbps)</li>
          <li>Convert stereo to mono for voice recordings</li>
          <li>Split long audio into shorter segments</li>
        </ul>
      </div>
    </div>

    <div className="help-subsection">
      <h4>Quality Settings Guide</h4>
      <ul>
        <li><strong>320kbps:</strong> Highest quality (90%+ setting)</li>
        <li><strong>192kbps:</strong> Good quality (70-80% setting)</li>
        <li><strong>128kbps:</strong> Standard quality (50-60% setting)</li>
        <li><strong>96kbps:</strong> Lower quality (30-40% setting)</li>
        <li><strong>64kbps:</strong> Voice/speech only (20-30% setting)</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Best Practices</h4>
      <ul>
        <li>Use MP3 for music, WAV for high-quality audio</li>
        <li>Test compressed audio before using</li>
        <li>Keep original files as backup</li>
        <li>Use appropriate bitrate for content type</li>
      </ul>
    </div>
  </div>
);

/**
 * Archive compression help content
 */
const ArchiveHelpContent: React.FC = () => (
  <div className="help-section">
    <h3>📦 Archive Compression</h3>
    <p>Compress APK files while preserving application functionality and integrity.</p>
    
    <div className="help-subsection">
      <h4>Supported Formats</h4>
      <ul>
        <li><strong>APK:</strong> Android Package files</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Common Issues & Solutions</h4>
      
      <div className="issue-solution">
        <h5>🔐 Signature Validation Errors</h5>
        <p><strong>Problem:</strong> APK signature validation failed after compression.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Use lower compression settings (level 1-3)</li>
          <li>Enable "Preserve Structure" option</li>
          <li>Test APK installation after compression</li>
          <li>Consider using specialized APK tools</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>💥 Corrupted Archives</h5>
        <p><strong>Problem:</strong> APK appears corrupted or invalid.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Verify original APK works correctly</li>
          <li>Re-download APK from trusted source</li>
          <li>Check APK with antivirus software</li>
          <li>Try different compression level</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>⚠️ Compatibility Issues</h5>
        <p><strong>Problem:</strong> Compressed APK may not work on all devices.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Use conservative compression settings</li>
          <li>Test on multiple Android versions</li>
          <li>Enable integrity validation</li>
          <li>Keep original APK as backup</li>
        </ul>
      </div>
    </div>

    <div className="help-subsection">
      <h4>Compression Levels</h4>
      <ul>
        <li><strong>Level 1-3:</strong> Safe compression, preserves compatibility</li>
        <li><strong>Level 4-6:</strong> Balanced compression and safety</li>
        <li><strong>Level 7-9:</strong> Maximum compression, test thoroughly</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>⚠️ Important Warnings</h4>
      <div className="warning-box">
        <ul>
          <li>Always backup original APK files</li>
          <li>Test compressed APKs before distribution</li>
          <li>Compression may break app signatures</li>
          <li>Some apps may not work after compression</li>
          <li>Use at your own risk for production apps</li>
        </ul>
      </div>
    </div>
  </div>
);

/**
 * Browser compatibility help content
 */
const BrowserCompatibilityHelpContent: React.FC = () => (
  <div className="help-section">
    <h3>🌐 Browser Compatibility</h3>
    <p>Ensure optimal compression performance across different browsers and devices.</p>
    
    <div className="help-subsection">
      <h4>Recommended Browsers</h4>
      <ul>
        <li><strong>Chrome 90+:</strong> Full feature support</li>
        <li><strong>Firefox 88+:</strong> Full feature support</li>
        <li><strong>Edge 90+:</strong> Full feature support</li>
        <li><strong>Safari 14.1+:</strong> Limited video compression</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Feature Support by Browser</h4>
      
      <div className="compatibility-table">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Chrome</th>
              <th>Firefox</th>
              <th>Safari</th>
              <th>Edge</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Image Compression</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
            </tr>
            <tr>
              <td>Video Compression</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>⚠️ Limited</td>
              <td>✅ Full</td>
            </tr>
            <tr>
              <td>Audio Compression</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
            </tr>
            <tr>
              <td>Document Compression</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
            </tr>
            <tr>
              <td>Archive Compression</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
              <td>✅ Full</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div className="help-subsection">
      <h4>Common Browser Issues</h4>
      
      <div className="issue-solution">
        <h5>🚫 SharedArrayBuffer Errors</h5>
        <p><strong>Problem:</strong> Video compression fails due to security restrictions.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Use HTTPS instead of HTTP</li>
          <li>Enable cross-origin isolation headers</li>
          <li>Use the development server (localhost:3001)</li>
          <li>Try a different browser</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>🔧 Web Workers Not Supported</h5>
        <p><strong>Problem:</strong> Browser doesn't support Web Workers.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Update browser to latest version</li>
          <li>Enable JavaScript in browser settings</li>
          <li>Try a modern browser (Chrome, Firefox, Edge)</li>
          <li>Check browser security settings</li>
        </ul>
      </div>
    </div>

    <div className="help-subsection">
      <h4>Performance Tips</h4>
      <ul>
        <li>Use Chrome or Firefox for best performance</li>
        <li>Enable hardware acceleration in browser settings</li>
        <li>Close unnecessary tabs to free memory</li>
        <li>Use latest browser version</li>
        <li>Ensure stable internet connection</li>
      </ul>
    </div>
  </div>
);

/**
 * Memory optimization help content
 */
const MemoryOptimizationHelpContent: React.FC = () => (
  <div className="help-section">
    <h3>🧠 Memory Optimization</h3>
    <p>Optimize memory usage for processing large files and prevent browser crashes.</p>
    
    <div className="help-subsection">
      <h4>Memory Requirements by Format</h4>
      <ul>
        <li><strong>Images:</strong> ~3x file size in memory</li>
        <li><strong>Videos:</strong> ~5x file size in memory</li>
        <li><strong>Audio:</strong> ~2x file size in memory</li>
        <li><strong>Documents:</strong> ~2x file size in memory</li>
        <li><strong>Archives:</strong> ~4x file size in memory</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Common Memory Issues</h4>
      
      <div className="issue-solution">
        <h5>💾 Out of Memory Errors</h5>
        <p><strong>Problem:</strong> Browser runs out of memory during processing.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Close other browser tabs and applications</li>
          <li>Process smaller files or fewer files at once</li>
          <li>Restart browser to clear memory</li>
          <li>Use a device with more RAM</li>
        </ul>
      </div>

      <div className="issue-solution">
        <h5>🐌 Slow Performance</h5>
        <p><strong>Problem:</strong> Processing is very slow or browser becomes unresponsive.</p>
        <p><strong>Solution:</strong></p>
        <ul>
          <li>Enable streaming compression for large files</li>
          <li>Reduce concurrent processing limit</li>
          <li>Use lower quality settings</li>
          <li>Process files individually instead of batch</li>
        </ul>
      </div>
    </div>

    <div className="help-subsection">
      <h4>Memory Optimization Tips</h4>
      <ul>
        <li><strong>File Size Limits:</strong>
          <ul>
            <li>Images: Recommended &lt; 50MB</li>
            <li>Videos: Recommended &lt; 200MB</li>
            <li>Audio: Recommended &lt; 100MB</li>
            <li>Documents: Recommended &lt; 50MB</li>
            <li>Archives: Recommended &lt; 100MB</li>
          </ul>
        </li>
        <li><strong>Batch Processing:</strong> Process max 2-3 files simultaneously</li>
        <li><strong>Browser Settings:</strong> Enable hardware acceleration</li>
        <li><strong>System Resources:</strong> Ensure 4GB+ RAM available</li>
      </ul>
    </div>

    <div className="help-subsection">
      <h4>Monitoring Memory Usage</h4>
      <p>You can monitor memory usage in your browser:</p>
      <ul>
        <li><strong>Chrome:</strong> Task Manager (Shift+Esc)</li>
        <li><strong>Firefox:</strong> about:memory</li>
        <li><strong>Edge:</strong> Task Manager (Shift+Esc)</li>
        <li><strong>Safari:</strong> Activity Monitor (macOS)</li>
      </ul>
    </div>
  </div>
);

export default FormatHelpModal;