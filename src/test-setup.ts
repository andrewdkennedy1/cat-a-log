/**
 * Test setup for Vitest
 * Configures fake-indexeddb for testing IndexedDB operations
 */

import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock navigator.storage for storage quota tests
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: () => Promise.resolve({
      usage: 1024 * 1024, // 1MB
      quota: 10 * 1024 * 1024 // 10MB
    })
  },
  writable: true
});

// Mock FileReader for blob operations
global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL(blob: Blob) {
    // Simulate async operation
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }, 0);
  }
} as any;

// Mock fetch for base64 to blob conversion
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    return Promise.resolve({
      blob: () => Promise.resolve(blob)
    });
  }
  return Promise.reject(new Error('Not implemented'));
});