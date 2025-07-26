/**
 * Tests for image processing utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resizeImage,
  generateThumbnail,
  shouldResizeImage,
  isValidImageFile,
  createImageURL,
  revokeImageURL,
  getImageDimensions
} from '../imageUtils';

// Mock Canvas API
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn((callback) => {
    const mockBlob = new Blob(['mock-image-data'], { type: 'image/jpeg' });
    callback(mockBlob);
  })
};

const mockImage = {
  width: 2000,
  height: 1500,
  onload: null as any,
  onerror: null as any,
  src: ''
};

// Mock DOM APIs
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tagName) => {
      if (tagName === 'canvas') return mockCanvas;
      if (tagName === 'img') return { ...mockImage };
      return {};
    })
  }
});

Object.defineProperty(global, 'Image', {
  value: vi.fn(() => ({ ...mockImage }))
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

describe('imageUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldResizeImage', () => {
    it('should return true for files larger than threshold', () => {
      const largeFile = new File([''], 'test.jpg', { 
        type: 'image/jpeg' 
      });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      
      expect(shouldResizeImage(largeFile)).toBe(true);
    });

    it('should return false for files smaller than threshold', () => {
      const smallFile = new File([''], 'test.jpg', { 
        type: 'image/jpeg' 
      });
      Object.defineProperty(smallFile, 'size', { value: 2 * 1024 * 1024 }); // 2MB
      
      expect(shouldResizeImage(smallFile)).toBe(false);
    });

    it('should use custom threshold', () => {
      const file = new File([''], 'test.jpg', { 
        type: 'image/jpeg' 
      });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      expect(shouldResizeImage(file, 500 * 1024)).toBe(true); // 500KB threshold
      expect(shouldResizeImage(file, 2 * 1024 * 1024)).toBe(false); // 2MB threshold
    });
  });

  describe('isValidImageFile', () => {
    it('should return true for valid image types', () => {
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const webpFile = new File([''], 'test.webp', { type: 'image/webp' });
      
      expect(isValidImageFile(jpegFile)).toBe(true);
      expect(isValidImageFile(pngFile)).toBe(true);
      expect(isValidImageFile(webpFile)).toBe(true);
    });

    it('should return false for invalid file types', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      
      expect(isValidImageFile(textFile)).toBe(false);
      expect(isValidImageFile(pdfFile)).toBe(false);
    });
  });

  describe('createImageURL and revokeImageURL', () => {
    it('should create and revoke object URLs', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      
      const url = createImageURL(blob);
      expect(url).toBe('blob:mock-url');
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      
      revokeImageURL(url);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    });
  });

  describe('resizeImage', () => {
    it('should resize image using canvas', async () => {
      const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock successful image load
      const imageInstance = { ...mockImage };
      vi.mocked(global.Image).mockReturnValue(imageInstance as any);
      
      const resizePromise = resizeImage(file);
      
      // Simulate image load
      setTimeout(() => {
        if (imageInstance.onload) {
          imageInstance.onload({} as any);
        }
      }, 0);
      
      const result = await resizePromise;
      
      expect(result).toBeInstanceOf(Blob);
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });

    it('should handle image load errors', async () => {
      const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
      
      const imageInstance = { ...mockImage };
      vi.mocked(global.Image).mockReturnValue(imageInstance as any);
      
      const resizePromise = resizeImage(file);
      
      // Simulate image error
      setTimeout(() => {
        if (imageInstance.onerror) {
          imageInstance.onerror({} as any);
        }
      }, 0);
      
      await expect(resizePromise).rejects.toThrow('Failed to load image');
    });

    it('should use custom resize options', async () => {
      const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
      
      const imageInstance = { ...mockImage };
      vi.mocked(global.Image).mockReturnValue(imageInstance as any);
      
      const resizePromise = resizeImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.9,
        format: 'image/png'
      });
      
      setTimeout(() => {
        if (imageInstance.onload) {
          imageInstance.onload({} as any);
        }
      }, 0);
      
      await resizePromise;
      
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/png',
        0.9
      );
    });
  });

  describe('generateThumbnail', () => {
    it('should generate square thumbnail', async () => {
      const blob = new Blob(['test-image'], { type: 'image/jpeg' });
      
      const imageInstance = { ...mockImage };
      vi.mocked(global.Image).mockReturnValue(imageInstance as any);
      
      const thumbnailPromise = generateThumbnail(blob, 100);
      
      setTimeout(() => {
        if (imageInstance.onload) {
          imageInstance.onload({} as any);
        }
      }, 0);
      
      const result = await thumbnailPromise;
      
      expect(result).toBeInstanceOf(Blob);
      expect(mockCanvas.width).toBe(100);
      expect(mockCanvas.height).toBe(100);
    });
  });

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
      
      const imageInstance = { ...mockImage, width: 1920, height: 1080 };
      vi.mocked(global.Image).mockReturnValue(imageInstance as any);
      
      const dimensionsPromise = getImageDimensions(file);
      
      setTimeout(() => {
        if (imageInstance.onload) {
          imageInstance.onload({} as any);
        }
      }, 0);
      
      const dimensions = await dimensionsPromise;
      
      expect(dimensions).toEqual({ width: 1920, height: 1080 });
    });

    it('should handle image load errors', async () => {
      const file = new File(['test-image'], 'test.jpg', { type: 'image/jpeg' });
      
      const imageInstance = { ...mockImage };
      vi.mocked(global.Image).mockReturnValue(imageInstance as any);
      
      const dimensionsPromise = getImageDimensions(file);
      
      setTimeout(() => {
        if (imageInstance.onerror) {
          imageInstance.onerror({} as any);
        }
      }, 0);
      
      await expect(dimensionsPromise).rejects.toThrow('Failed to load image');
    });
  });
});