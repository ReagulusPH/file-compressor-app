/**
 * Comprehensive Canvas API mocking utilities for testing
 */

export interface MockCanvasContext {
  fillRect: jest.Mock;
  clearRect: jest.Mock;
  getImageData: jest.Mock;
  putImageData: jest.Mock;
  createImageData: jest.Mock;
  setTransform: jest.Mock;
  drawImage: jest.Mock;
  save: jest.Mock;
  fillText: jest.Mock;
  restore: jest.Mock;
  beginPath: jest.Mock;
  moveTo: jest.Mock;
  lineTo: jest.Mock;
  closePath: jest.Mock;
  stroke: jest.Mock;
  translate: jest.Mock;
  scale: jest.Mock;
  rotate: jest.Mock;
  arc: jest.Mock;
  fill: jest.Mock;
  measureText: jest.Mock;
  transform: jest.Mock;
  rect: jest.Mock;
  clip: jest.Mock;
  canvas: HTMLCanvasElement;
}

export interface MockCanvas extends HTMLCanvasElement {
  getContext: jest.Mock;
  toBlob: jest.Mock;
  toDataURL: jest.Mock;
  width: number;
  height: number;
}

/**
 * Creates a mock canvas with proper context methods
 */
export const createMockCanvas = (width = 100, height = 100): { canvas: MockCanvas; context: MockCanvasContext } => {
  const canvas = document.createElement('canvas') as MockCanvas;
  canvas.width = width;
  canvas.height = height;

  const context: MockCanvasContext = {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    canvas,
  };

  canvas.getContext = jest.fn(() => context);
  canvas.toBlob = jest.fn((callback, type = 'image/png', quality = 0.92) => {
    // Simulate successful blob creation
    const blob = new Blob(['mock-canvas-data'], { type });
    if (callback) {
      setTimeout(() => callback(blob), 0);
    }
  });
  canvas.toDataURL = jest.fn(() => 'data:image/png;base64,mock-data');

  return { canvas, context };
};

/**
 * Creates a mock Image element
 */
export const createMockImage = (width = 100, height = 100): HTMLImageElement => {
  // Create a basic object instead of using the Image constructor to avoid recursion
  const img = {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    complete: true,
    onload: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    src: '',
  } as HTMLImageElement;

  // Mock the onload behavior
  setTimeout(() => {
    if (img.onload) {
      img.onload({} as Event);
    }
  }, 0);

  return img;
};

/**
 * Sets up global Canvas API mocks
 */
export const setupCanvasMocks = () => {
  // Mock HTMLCanvasElement.getContext
  HTMLCanvasElement.prototype.getContext = jest.fn(function (this: HTMLCanvasElement, contextType) {
    if (contextType === '2d') {
      const { context } = createMockCanvas(this.width || 100, this.height || 100);
      return context;
    }
    return null;
  }) as any;

  // Mock HTMLCanvasElement.toBlob
  HTMLCanvasElement.prototype.toBlob = jest.fn(function (callback, type = 'image/png', quality = 0.92) {
    const blob = new Blob(['mock-canvas-data'], { type });
    if (callback) {
      setTimeout(() => callback(blob), 0);
    }
  });

  // Mock HTMLCanvasElement.toDataURL
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock-data');

  // Mock createImageBitmap
  global.createImageBitmap = jest.fn(() =>
    Promise.resolve({
      width: 100,
      height: 100,
      close: jest.fn(),
    })
  );

  // Mock Image constructor
  global.Image = jest.fn(() => createMockImage()) as any;
};

/**
 * Resets all Canvas API mocks
 */
export const resetCanvasMocks = () => {
  if (HTMLCanvasElement.prototype.getContext && jest.isMockFunction(HTMLCanvasElement.prototype.getContext)) {
    (HTMLCanvasElement.prototype.getContext as jest.Mock).mockClear();
  }
  if (HTMLCanvasElement.prototype.toBlob && jest.isMockFunction(HTMLCanvasElement.prototype.toBlob)) {
    (HTMLCanvasElement.prototype.toBlob as jest.Mock).mockClear();
  }
  if (HTMLCanvasElement.prototype.toDataURL && jest.isMockFunction(HTMLCanvasElement.prototype.toDataURL)) {
    (HTMLCanvasElement.prototype.toDataURL as jest.Mock).mockClear();
  }
  if (global.createImageBitmap && jest.isMockFunction(global.createImageBitmap)) {
    (global.createImageBitmap as jest.Mock).mockClear();
  }
};
