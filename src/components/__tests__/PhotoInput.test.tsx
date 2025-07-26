/**
 * Tests for PhotoInput component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotoInput } from '../PhotoInput';

// Mock image utilities
vi.mock('../../utils/imageUtils', () => ({
  resizeImage: vi.fn().mockResolvedValue(new Blob(['resized'], { type: 'image/jpeg' })),
  shouldResizeImage: vi.fn().mockReturnValue(false),
  isValidImageFile: vi.fn().mockReturnValue(true),
  createImageURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeImageURL: vi.fn()
}));

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

describe('PhotoInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render photo placeholder when no photo is selected', () => {
    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('No photo selected')).toBeInTheDocument();
    expect(screen.getByText('📷 Camera')).toBeInTheDocument();
    expect(screen.getByText('🖼️ Gallery')).toBeInTheDocument();
  });

  it('should render photo preview when photo is provided', () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
    
    render(
      <PhotoInput
        value={mockBlob}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByAltText('Photo preview')).toBeInTheDocument();
    expect(screen.getByTitle('Remove photo')).toBeInTheDocument();
    expect(screen.queryByText('📷 Camera')).not.toBeInTheDocument();
  });

  it('should handle photo removal', () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
    
    render(
      <PhotoInput
        value={mockBlob}
        onChange={mockOnChange}
      />
    );

    const removeButton = screen.getByTitle('Remove photo');
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('should handle file selection', async () => {
    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.any(Blob));
    });
  });

  it('should show error for invalid file types', async () => {
    const { isValidImageFile } = await import('../../utils/imageUtils');
    vi.mocked(isValidImageFile).mockReturnValue(false);

    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/Please select a valid image file/)).toBeInTheDocument();
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should handle image resizing when needed', async () => {
    const { shouldResizeImage, resizeImage, isValidImageFile } = await import('../../utils/imageUtils');
    vi.mocked(isValidImageFile).mockReturnValue(true);
    vi.mocked(shouldResizeImage).mockReturnValue(true);
    const mockResizedBlob = new Blob(['resized'], { type: 'image/jpeg' });
    vi.mocked(resizeImage).mockResolvedValue(mockResizedBlob);

    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(resizeImage).toHaveBeenCalledWith(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
        format: 'image/jpeg'
      });
      expect(mockOnChange).toHaveBeenCalledWith(mockResizedBlob);
    });
  });

  it('should show processing indicator during image processing', async () => {
    const { resizeImage, isValidImageFile, shouldResizeImage } = await import('../../utils/imageUtils');
    vi.mocked(isValidImageFile).mockReturnValue(true);
    vi.mocked(shouldResizeImage).mockReturnValue(true);
    
    // Make resizeImage take some time
    let resolveResize: (value: Blob) => void;
    const resizePromise = new Promise<Blob>((resolve) => {
      resolveResize = resolve;
    });
    vi.mocked(resizeImage).mockReturnValue(resizePromise);

    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    // Should show processing indicator
    await waitFor(() => {
      expect(screen.getByText('Processing image...')).toBeInTheDocument();
    });

    // Complete the resize
    resolveResize!(new Blob(['resized'], { type: 'image/jpeg' }));

    // Processing indicator should disappear
    await waitFor(() => {
      expect(screen.queryByText('Processing image...')).not.toBeInTheDocument();
    });
  });

  it('should disable buttons when disabled prop is true', () => {
    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const cameraButton = screen.getByText('📷 Camera');
    const galleryButton = screen.getByText('🖼️ Gallery');

    expect(cameraButton).toBeDisabled();
    expect(galleryButton).toBeDisabled();
  });

  it('should set capture attribute for camera button', () => {
    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    const cameraButton = screen.getByText('📷 Camera');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.click(cameraButton);

    expect(input.getAttribute('capture')).toBe('environment');
  });

  it('should remove capture attribute for gallery button', () => {
    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    const galleryButton = screen.getByText('🖼️ Gallery');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // First set capture attribute
    input.setAttribute('capture', 'environment');

    fireEvent.click(galleryButton);

    expect(input.hasAttribute('capture')).toBe(false);
  });

  it('should handle resize errors gracefully', async () => {
    const { shouldResizeImage, resizeImage, isValidImageFile } = await import('../../utils/imageUtils');
    vi.mocked(isValidImageFile).mockReturnValue(true);
    vi.mocked(shouldResizeImage).mockReturnValue(true);
    vi.mocked(resizeImage).mockRejectedValue(new Error('Resize failed'));

    render(
      <PhotoInput
        value={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    // Should still call onChange with original file when resize fails
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(file);
    });
  });
});