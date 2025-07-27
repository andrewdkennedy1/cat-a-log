/**
 * Custom hook for managing cat encounters
 */

import { useCallback } from 'react';
import { useAppContext } from './useAppContext';
import type { CatEncounter } from '../types';
import { syncService } from '@/services/SyncService';

export function useEncounters() {
  const { state, dispatch } = useAppContext();

  // Get all encounters
  const encounters = state.encounters;

  // Get encounter by ID
  const getEncounterById = useCallback((id: string): CatEncounter | undefined => {
    return encounters.find(encounter => encounter.id === id);
  }, [encounters]);

  // Add new encounter
  const addEncounter = useCallback((encounter: CatEncounter) => {
    dispatch({ type: 'ADD_ENCOUNTER', payload: encounter });
    // Sync to cloud if authenticated
    syncService.syncEncounter();
  }, [dispatch]);

  // Update existing encounter
  const updateEncounter = useCallback((id: string, updates: Partial<CatEncounter>) => {
    dispatch({ type: 'UPDATE_ENCOUNTER', payload: { id, updates } });
    // Sync to cloud if authenticated
    syncService.syncEncounter();
  }, [dispatch]);

  // Delete encounter
  const deleteEncounter = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ENCOUNTER', payload: id });
    // Sync will happen automatically on next sync cycle
  }, [dispatch]);

  // Set all encounters (for initial load or sync)
  const setEncounters = useCallback((encounters: CatEncounter[]) => {
    dispatch({ type: 'SET_ENCOUNTERS', payload: encounters });
  }, [dispatch]);

  // Get encounters by filters
  const getEncountersByColor = useCallback((color: string): CatEncounter[] => {
    return encounters.filter(encounter => encounter.catColor === color);
  }, [encounters]);

  const getEncountersByType = useCallback((type: string): CatEncounter[] => {
    return encounters.filter(encounter => encounter.catType === type);
  }, [encounters]);

  const getEncountersByBehavior = useCallback((behavior: string): CatEncounter[] => {
    return encounters.filter(encounter => encounter.behavior === behavior);
  }, [encounters]);

  // Get encounters within date range
  const getEncountersByDateRange = useCallback((startDate: string, endDate: string): CatEncounter[] => {
    return encounters.filter(encounter => {
      const encounterDate = new Date(encounter.dateTime);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return encounterDate >= start && encounterDate <= end;
    });
  }, [encounters]);

  // Get encounters sorted by date (newest first)
  const getEncountersSortedByDate = useCallback((): CatEncounter[] => {
    return [...encounters].sort((a, b) =>
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );
  }, [encounters]);

  // Get encounters with photos
  const getEncountersWithPhotos = useCallback((): CatEncounter[] => {
    return encounters.filter(encounter => encounter.photoBlobId);
  }, [encounters]);

  return {
    encounters,
    getEncounterById,
    addEncounter,
    updateEncounter,
    deleteEncounter,
    setEncounters,
    getEncountersByColor,
    getEncountersByType,
    getEncountersByBehavior,
    getEncountersByDateRange,
    getEncountersSortedByDate,
    getEncountersWithPhotos
  };
}