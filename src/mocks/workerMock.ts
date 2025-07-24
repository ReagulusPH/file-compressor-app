/**
 * Worker mocks for testing environment
 */

export function setupWorkerMocks(): void {
  // Mock Worker constructor
  global.Worker = class MockWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessageerror: ((event: MessageEvent) => void) | null = null;

    constructor(
      public url: string | URL,
      public options?: WorkerOptions
    ) {
      // Mock worker constructor
    }

    postMessage(message: any): void {
      // Mock postMessage - simulate async response
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data: { success: true } }));
        }
      }, 0);
    }

    terminate(): void {
      // Mock terminate
    }

    addEventListener(type: string, listener: EventListener): void {
      // Mock addEventListener
    }

    removeEventListener(type: string, listener: EventListener): void {
      // Mock removeEventListener
    }

    dispatchEvent(event: Event): boolean {
      return true;
    }
  } as any;

  // Mock SharedArrayBuffer if not available
  if (typeof SharedArrayBuffer === 'undefined') {
    global.SharedArrayBuffer = ArrayBuffer as any;
  }

  // Mock OffscreenCanvas for worker environments
  if (typeof OffscreenCanvas === 'undefined') {
    global.OffscreenCanvas = class MockOffscreenCanvas {
      width: number;
      height: number;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }

      getContext(contextId: string): any {
        return {
          drawImage: jest.fn(),
          getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
          putImageData: jest.fn(),
          canvas: this,
        };
      }

      transferToImageBitmap(): ImageBitmap {
        return {} as ImageBitmap;
      }
    } as any;
  }
}
