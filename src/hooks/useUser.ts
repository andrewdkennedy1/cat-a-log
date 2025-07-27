/**
 * Custom hook for managing user state and preferences
 */

import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import type { UserPreferences } from '../types';
import { GoogleDriveService } from '@/services/GoogleDriveService';

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

  const logout = useCallback(() => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: false });
    dispatch({ type: 'SET_GOOGLE_TOKEN', payload: undefined });
    dispatch({ type: 'SET_GOOGLE_DRIVE_SERVICE', payload: undefined });
  }, [dispatch]);

  // Google token actions
  const setGoogleToken = useCallback((token: string | undefined) => {
    dispatch({ type: 'SET_GOOGLE_TOKEN', payload: token });
  }, [dispatch]);

  const initializeGoogleDrive = useCallback(async (token: string) => {
    try {
      const driveService = new GoogleDriveService(token);
      await driveService.init();
      dispatch({ type: 'SET_GOOGLE_DRIVE_SERVICE', payload: driveService });
      showSnackbar('Google Drive connected successfully!', 'success');
    } catch (error) {
      console.error(error);
      showSnackbar((error as Error).message, 'error');
      dispatch({ type: 'SET_GOOGLE_DRIVE_SERVICE', payload: undefined });
    }
  }, [dispatch, showSnackbar]);

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
  }, [dispatch]);

  const setPhotoQuality = useCallback((quality: 'low' | 'medium' | 'high') => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { photoQuality: quality } });
  }, [dispatch]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'auto') => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { theme } });
  }, [dispatch]);

  // Computed state
  const hasGoogleToken = !!googleToken;
  const canSync = isAuthenticated && hasGoogleToken && preferences.autoSync;

  return {
    // State
    isAuthenticated,
    googleToken,
    preferences,
    googleDriveService,
    googleDriveStatus,

    // Computed state
    hasGoogleToken,
    canSync,

    // Authentication actions
    setAuthenticated,
    login,
    logout,
    setGoogleToken,
    initializeGoogleDrive,

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