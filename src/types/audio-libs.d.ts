/**
 * Type declarations for audio compression libraries
 */

declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  }
}

declare module 'wav-encoder' {
  interface EncodeOptions {
    sampleRate: number;
    float: boolean;
    bitDepth: number;
  }

  export function encode(
    audioData: {
      sampleRate: number;
      channelData: Float32Array[];
    },
    options?: Partial<EncodeOptions>
  ): Promise<ArrayBuffer>;
}
