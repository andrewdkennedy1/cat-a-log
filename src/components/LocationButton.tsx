/**
 * Location button component for centering map on user's current location
 */

import { useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';

interface LocationButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
  className?: string;
}

export function LocationButton({ onLocationFound, className = '' }: LocationButtonProps) {
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

  // Don't show the button if geolocation is not supported
  if (!supported) {
    return null;
  }

  return (
    <button
      onClick={handleLocationClick}
      disabled={isLocating}
      className={`location-button ${className}`}
      title="Center map on your location"
      style={{
        position: 'absolute',
        top: '80px',
        right: '10px',
        width: '40px',
        height: '40px',
        borderRadius: '4px',
        border: '2px solid rgba(0,0,0,0.2)',
        backgroundColor: '#fff',
        cursor: isLocating ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        zIndex: 1000,
        boxShadow: '0 1px 5px rgba(0,0,0,0.4)'
      }}
    >
      {isLocating ? '⟳' : '📍'}
    </button>
  );
}