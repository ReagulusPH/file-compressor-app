/**
 * VideoCompressor service index
 */

import VideoCompressor from './VideoCompressor';
import OptimizedVideoCompressor from './OptimizedVideoCompressor';

// Export the optimized version as the default
export default OptimizedVideoCompressor;

// Also export the original version for compatibility
export { VideoCompressor as LegacyVideoCompressor };
