/**
 * Modern mobile-optimized photo input component using shadcn/ui
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Image, X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  resizeImage, 
  shouldResizeImage, 
  isValidImageFile, 
  createImageURL, 
  revokeImageURL 
} from '@/utils/imageUtils';

interface ModernPhotoInputProps {
  value?: File | null;
  onChange: (photo: File | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ModernPhotoInput({ 
  value, 
  onChange, 
  disabled = false, 
  className = '' 
}: ModernPhotoInputProps) {
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
      let processedFile: File = file;
      
      if (shouldResizeImage(file)) {
        try {
          const resizedBlob = await resizeImage(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.8,
            format: 'image/jpeg'
          });
          // Convert blob back to File
          processedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });
        } catch (resizeError) {
          console.warn('Failed to resize image, using original:', resizeError);
          // Continue with original file if resize fails
        }
      }

      onChange(processedFile);
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
    <div className={cn("space-y-4", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Photo preview or upload area */}
      {previewUrl ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Photo preview"
                className="w-full h-48 sm:h-64 object-cover"
              />
              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                onClick={handleRemovePhoto}
                disabled={disabled || isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Processing image...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Add a photo of the cat</p>
                    <p className="text-xs text-muted-foreground">
                      Take a photo or choose from your gallery
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons - only show when no photo is selected */}
      {!value && !isProcessing && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraCapture}
            disabled={disabled}
            className="h-12 flex flex-col gap-1 py-2"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Camera</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGallerySelect}
            disabled={disabled}
            className="h-12 flex flex-col gap-1 py-2"
          >
            <Image className="h-5 w-5" />
            <span className="text-xs">Gallery</span>
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {error}
        </div>
      )}
    </div>
  );
}