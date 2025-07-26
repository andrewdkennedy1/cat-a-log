/**
 * Custom hook for managing UI state
 */

import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export function useUI() {
  const { state, dispatch } = useAppContext();

  // UI state getters
  const selectedEncounter = state.ui.selectedEncounter;
  const mapCenter = state.ui.mapCenter;
  const mapZoom = state.ui.mapZoom;
  const isFormOpen = state.ui.isFormOpen;
  const syncStatus = state.ui.syncStatus;

  // Selected encounter actions
  const selectEncounter = useCallback((encounterId: string | undefined) => {
    dispatch({ type: 'SET_SELECTED_ENCOUNTER', payload: encounterId });
  }, [dispatch]);

  const clearSelectedEncounter = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_ENCOUNTER', payload: undefined });
  }, [dispatch]);

  // Map state actions
  const setMapCenter = useCallback((center: [number, number]) => {
    dispatch({ type: 'SET_MAP_CENTER', payload: center });
  }, [dispatch]);

  const setMapZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_MAP_ZOOM', payload: zoom });
  }, [dispatch]);

  const setMapView = useCallback((center: [number, number], zoom: number) => {
    dispatch({ type: 'SET_MAP_CENTER', payload: center });
    dispatch({ type: 'SET_MAP_ZOOM', payload: zoom });
  }, [dispatch]);

  // Form modal actions
  const openForm = useCallback(() => {
    dispatch({ type: 'SET_FORM_OPEN', payload: true });
  }, [dispatch]);

  const closeForm = useCallback(() => {
    dispatch({ type: 'SET_FORM_OPEN', payload: false });
  }, [dispatch]);

  const toggleForm = useCallback(() => {
    dispatch({ type: 'SET_FORM_OPEN', payload: !isFormOpen });
  }, [dispatch, isFormOpen]);

  // Sync status actions
  const setSyncStatus = useCallback((status: 'idle' | 'syncing' | 'error') => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: status });
  }, [dispatch]);

  const startSync = useCallback(() => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
  }, [dispatch]);

  const finishSync = useCallback(() => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
  }, [dispatch]);

  const errorSync = useCallback(() => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
  }, [dispatch]);

  // Computed state
  const isSyncing = syncStatus === 'syncing';
  const hasSyncError = syncStatus === 'error';
  const isIdle = syncStatus === 'idle';

  return {
    // State
    selectedEncounter,
    mapCenter,
    mapZoom,
    isFormOpen,
    syncStatus,
    
    // Computed state
    isSyncing,
    hasSyncError,
    isIdle,
    
    // Actions
    selectEncounter,
    clearSelectedEncounter,
    setMapCenter,
    setMapZoom,
    setMapView,
    openForm,
    closeForm,
    toggleForm,
    setSyncStatus,
    startSync,
    finishSync,
    errorSync
  };
}