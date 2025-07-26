/**
 * Modern Location button component using shadcn/ui
 */

import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';

interface ModernLocationButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
  className?: string;
}

export function ModernLocationButton({ onLocationFound, className }: ModernLocationButtonProps) {
  const [isLocating, setIsLocating] = useState(false);
  const { getCurrentPosition, getCoordinates, supported } = useGeolocation();

  const handleLocationClick = async () => {
    if (!supported) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    try {
      await getCurrentPosition();
      const coordinates = getCoordinates();
      if (coordinates) {
        const [lat, lng] = coordinates;
        onLocationFound(lat, lng);
      }
    } catch (error) {
      console.error('Failed to get location:', error);
      alert('Failed to get your location. Please check your location permissions.');
    } finally {
      setIsLocating(false);
    }
  };

  if (!supported) {
    return null;
  }

  return (
    <Button
      onClick={handleLocationClick}
      disabled={isLocating}
      size="icon"
      variant="secondary"
      className={cn(
        "fixed top-20 right-4 z-[1000] h-11 w-11 rounded-lg shadow-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
      title="Center map on your location"
    >
      {isLocating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
    </Button>
  );
}