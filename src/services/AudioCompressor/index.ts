/**
 * AudioCompressor module exports
 */

export { default as AudioCompressor } from './AudioCompressor';
export { default as WebAudioCompressor } from './WebAudioCompressor';
export { default as AudioLibCompressor } from './AudioLibCompressor';

// Re-export the main service as default
export { default } from './AudioCompressor';