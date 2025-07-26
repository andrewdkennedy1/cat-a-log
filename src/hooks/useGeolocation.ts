/**
 * Custom hook for managing device geolocation with IP fallback
 */
import { useState, useEffect, useCallback } from 'react';

// Interface for the IP geolocation API response
interface IpGeolocationResponse {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country_name: string;
  postal: string;
  ip: string;
}

// Updated GeolocationState to include the fallback indicator
interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  supported: boolean;
  usingIpGeolocation?: boolean; // Flag to indicate if fallback is used
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000, // 1 minute
    watch = false
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
    supported: 'geolocation' in navigator,
    usingIpGeolocation: false
  });

  // Fallback function to get location via IP address
  const getIpGeolocation = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error('IP geolocation request failed');
      }
      const data: IpGeolocationResponse = await response.json();

      const coords: GeolocationCoordinates = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 5000, // IP accuracy is low, estimate 5km
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: function() { return this },
      };

      // Create a GeolocationPosition-like object from the IP info
      const position: GeolocationPosition = {
        coords: coords,
        timestamp: Date.now(),
        toJSON: function() { return {coords: this.coords, timestamp: this.timestamp}},
      };

      setState(prev => ({
        ...prev,
        position,
        loading: false,
        usingIpGeolocation: true,
      }));

    } catch (error) {
       const newError: GeolocationPositionError = {
            code: 2, // POSITION_UNAVAILABLE
            message: error instanceof Error ? error.message : 'IP Geolocation failed',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
       }
       setState(prev => ({ ...prev, error: newError, loading: false }));
    }
  }, []);


  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      // If geolocation is not supported, try IP fallback immediately
      getIpGeolocation();
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const positionOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          position,
          error: null,
          loading: false,
          usingIpGeolocation: false
        }));
      },
      () => {
        // If standard geolocation fails, try the IP fallback
        getIpGeolocation();
      },
      positionOptions
    );
  }, [enableHighAccuracy, timeout, maximumAge, getIpGeolocation]);

  // Watch position if requested (IP fallback doesn't apply to watch)
  useEffect(() => {
    if (!watch || !navigator.geolocation) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    const positionOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          position,
          error: null,
          loading: false,
          usingIpGeolocation: false
        }));
      },
      (error) => {
        // Don't use IP fallback for watch, as it's static
        setState(prev => ({
          ...prev,
          error,
          loading: false
        }));
      },
      positionOptions
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watch, enableHighAccuracy, timeout, maximumAge]);

  // Helper functions
  const getCoordinates = useCallback((): [number, number] | null => {
    if (!state.position) return null;
    return [state.position.coords.latitude, state.position.coords.longitude];
  }, [state.position]);

  const getAccuracy = useCallback((): number | null => {
    return state.position?.coords.accuracy || null;
  }, [state.position]);

  const isHighAccuracy = useCallback((): boolean => {
    const accuracy = getAccuracy();
    return accuracy !== null && accuracy <= 50; // Within 50 meters
  }, [getAccuracy]);

  // Check if device is mobile
  const isMobile = useCallback((): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  return {
    ...state,
    getCurrentPosition,
    getCoordinates,
    getAccuracy,
    isHighAccuracy,
    isMobile: isMobile()
  };
}