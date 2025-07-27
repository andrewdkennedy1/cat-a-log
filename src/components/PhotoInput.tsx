/**
 * PhotoInput - Component for photo capture, preview, and management
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  resizeImage, 
  shouldResizeImage, 
  isValidImageFile, 
  createImageURL, 
  revokeImageURL 
} from '../utils/imageUtils';

interface PhotoInputProps {
  value?: Blob | null;
  onChange: (photo: Blob | null) => void;
  disabled?: boolean;
  className?: string;
}

export function PhotoInput({ 
  value, 
  onChange, 
  disabled = false, 
  className = '' 
}: PhotoInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview URL when value changes
  useEffect(() => {
    if (value) {
      const url = createImageURL(value);
      setPreviewUrl(url);
      return () => revokeImageURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokeImageURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      if (!isValidImageFile(file)) {
        throw new Error('Please select a valid image file (JPEG, PNG, or WebP)');
      }

      // Check file size and resize if needed
      let processedBlob: Blob = file;
      
      if (shouldResizeImage(file)) {
        try {
          processedBlob = await resizeImage(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.8,
            format: 'image/jpeg'
          });
        } catch (resizeError) {
          console.warn('Failed to resize image, using original:', resizeError);
          // Continue with original file if resize fails
        }
      }

      onChange(processedBlob);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMessage);
      console.error('Photo processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  const handleRemovePhoto = useCallback(() => {
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  }, []);

  const handleGallerySelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className={`photo-input ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Photo preview or placeholder */}
      <div className="photo-preview-container">
        {previewUrl ? (
          <div className="photo-preview">
            <img
              src={previewUrl}
              alt="Photo preview"
              className="photo-preview-image"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="photo-remove-button"
              disabled={disabled || isProcessing}
              title="Remove photo"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="photo-placeholder">
            <div className="photo-placeholder-icon">📷</div>
            <div className="photo-placeholder-text">
              {isProcessing ? 'Processing...' : 'No photo selected'}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!value && (
        <div className="photo-actions">
          <button
            type="button"
            onClick={handleCameraCapture}
            disabled={disabled || isProcessing}
            className="btn btn-secondary photo-action-button"
          >
            📷 Camera
          </button>
          <button
            type="button"
            onClick={handleGallerySelect}
            disabled={disabled || isProcessing}
            className="btn btn-secondary photo-action-button"
          >
            🖼️ Gallery
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="photo-error">
          {error}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="photo-processing">
          Processing image...
        </div>
      )}
    </div>
  );
}