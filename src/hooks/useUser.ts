/**
 * Custom hook for managing user state and preferences
 */

import { useCallback } from 'react';
import { useAppContext } from './useAppContext';
import type { UserPreferences } from '../types';
import { GoogleDriveService } from '@/services/GoogleDriveService';
import { syncService } from '@/services/SyncService';

export function useUser() {
  const { state, dispatch, showSnackbar } = useAppContext();

  // User state getters
  const isAuthenticated = state.user.isAuthenticated;
  const googleToken = state.user.googleToken;
  const preferences = state.user.preferences;
  const googleDriveService = state.user.googleDriveService;
  const googleDriveStatus = state.user.googleDriveStatus;

  // Authentication actions
  const setAuthenticated = useCallback((authenticated: boolean) => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: authenticated });
  }, [dispatch]);

  const login = useCallback(() => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: true });
  }, [dispatch]);

  const logout = useCallback(async () => {
    // Disconnect sync service
    syncService.disconnect();
    
    // Clear stored token
    localStorage.removeItem('googleToken');
    
    // Revoke Google token if it exists
    if (googleToken) {
      await GoogleDriveService.logout(googleToken);
    }
    
    dispatch({ type: 'SET_AUTHENTICATED', payload: false });
    dispatch({ type: 'SET_GOOGLE_TOKEN', payload: undefined });
    dispatch({ type: 'SET_GOOGLE_DRIVE_SERVICE', payload: undefined });
  }, [dispatch, googleToken]);

  // Google token actions
  const setGoogleToken = useCallback((token: string | undefined) => {
    dispatch({ type: 'SET_GOOGLE_TOKEN', payload: token });
  }, [dispatch]);

  const initializeGoogleDrive = useCallback(async (token: string) => {
    try {
      console.log('Initializing Google Drive service...');
      
      // Store token in localStorage for persistence
      localStorage.setItem('googleToken', token);
      
      const driveService = new GoogleDriveService(token);
      await driveService.init();
      dispatch({ type: 'SET_GOOGLE_DRIVE_SERVICE', payload: driveService });
      
      // Initialize sync service
      syncService.setDriveService(driveService);
      syncService.setAutoSync(preferences.autoSync);
      
      console.log('Google Drive service initialized successfully');
      showSnackbar('Google Drive connected successfully!', 'success');
    } catch (error) {
      console.error('Google Drive initialization failed:', error);
      
      // Clear everything on failure
      localStorage.removeItem('googleToken');
      setAuthenticated(false);
      
      let errorMessage = 'Failed to connect to Google Drive';
      if (error instanceof Error) {
        if (error.message.includes('invalid_token') || error.message.includes('unauthorized')) {
          errorMessage = 'Google token has expired. Please sign in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showSnackbar(errorMessage, 'error');
      dispatch({ type: 'SET_GOOGLE_DRIVE_SERVICE', payload: undefined });
      dispatch({ type: 'SET_GOOGLE_TOKEN', payload: undefined });
      
      // Re-throw to let caller handle
      throw error;
    }
  }, [dispatch, showSnackbar, preferences.autoSync, setAuthenticated]);

  // Preferences actions
  const setPreferences = useCallback((newPreferences: UserPreferences) => {
    dispatch({ type: 'SET_USER_PREFERENCES', payload: newPreferences });
  }, [dispatch]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: updates });
  }, [dispatch]);

  // Individual preference setters for convenience
  const setDefaultMapCenter = useCallback((center: [number, number]) => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { defaultMapCenter: center } });
  }, [dispatch]);

  const setDefaultMapZoom = useCallback((zoom: number) => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { defaultMapZoom: zoom } });
  }, [dispatch]);

  const setAutoSync = useCallback((autoSync: boolean) => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { autoSync } });
    syncService.setAutoSync(autoSync);
  }, [dispatch]);

  const setPhotoQuality = useCallback((quality: 'low' | 'medium' | 'high') => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { photoQuality: quality } });
  }, [dispatch]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'auto') => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { theme } });
  }, [dispatch]);

  // Restore Google token on app startup
  const restoreGoogleToken = useCallback(async () => {
    const storedToken = localStorage.getItem('googleToken');
    
    // Only restore if we have a stored token and no current token
    if (storedToken && !googleToken) {
      try {
        console.log('Restoring Google token from localStorage...');
        setGoogleToken(storedToken);
        setAuthenticated(true);
        await initializeGoogleDrive(storedToken);
        console.log('Google token restored successfully');
      } catch (error) {
        console.error('Failed to restore Google token:', error);
        // Clear everything on failure
        localStorage.removeItem('googleToken');
        setGoogleToken(undefined);
        setAuthenticated(false);
        dispatch({ type: 'SET_GOOGLE_DRIVE_SERVICE', payload: undefined });
      }
    } else if (storedToken && googleToken && !isAuthenticated) {
      // If we have both tokens but not authenticated, just set authenticated
      console.log('Token exists but not authenticated, setting authenticated state...');
      setAuthenticated(true);
    }
  }, [googleToken, isAuthenticated, setGoogleToken, initializeGoogleDrive, setAuthenticated, dispatch]);

  // Computed state
  const hasGoogleToken = !!googleToken;
  const hasGoogleDriveService = !!googleDriveService;
  const canSync = isAuthenticated && hasGoogleToken && hasGoogleDriveService && preferences.autoSync;

  return {
    // State
    isAuthenticated,
    googleToken,
    preferences,
    googleDriveService,
    googleDriveStatus,

    // Computed state
    hasGoogleToken,
    hasGoogleDriveService,
    canSync,

    // Authentication actions
    setAuthenticated,
    login,
    logout,
    setGoogleToken,
    initializeGoogleDrive,
    restoreGoogleToken,

    // Preferences actions
    setPreferences,
    updatePreferences,
    setDefaultMapCenter,
    setDefaultMapZoom,
    setAutoSync,
    setPhotoQuality,
    setTheme
  };
}