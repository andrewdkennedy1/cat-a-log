/**
 * Tests for useUI hook
 */

import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { useUI } from '../useUI';

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('useUI', () => {
  describe('Initial State', () => {
    it('should have correct initial UI state', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      expect(result.current.selectedEncounter).toBeUndefined();
      expect(result.current.mapCenter).toEqual([40.7128, -74.0060]);
      expect(result.current.mapZoom).toBe(13);
      expect(result.current.isFormOpen).toBe(false);
      expect(result.current.syncStatus).toBe('idle');
    });

    it('should have correct computed state', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.hasSyncError).toBe(false);
      expect(result.current.isIdle).toBe(true);
    });
  });

  describe('Selected Encounter Actions', () => {
    it('should select encounter', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      act(() => {
        result.current.selectEncounter('encounter-1');
      });
      
      expect(result.current.selectedEncounter).toBe('encounter-1');
    });

    it('should clear selected encounter', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      // First select an encounter
      act(() => {
        result.current.selectEncounter('encounter-1');
      });
      
      expect(result.current.selectedEncounter).toBe('encounter-1');
      
      // Then clear it
      act(() => {
        result.current.clearSelectedEncounter();
      });
      
      expect(result.current.selectedEncounter).toBeUndefined();
    });
  });

  describe('Map State Actions', () => {
    it('should set map center', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      const newCenter: [number, number] = [51.5074, -0.1278]; // London
      
      act(() => {
        result.current.setMapCenter(newCenter);
      });
      
      expect(result.current.mapCenter).toEqual(newCenter);
    });

    it('should set map zoom', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      act(() => {
        result.current.setMapZoom(15);
      });
      
      expect(result.current.mapZoom).toBe(15);
    });

    it('should set map view (center and zoom together)', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      const newCenter: [number, number] = [48.8566, 2.3522]; // Paris
      const newZoom = 12;
      
      act(() => {
        result.current.setMapView(newCenter, newZoom);
      });
      
      expect(result.current.mapCenter).toEqual(newCenter);
      expect(result.current.mapZoom).toBe(newZoom);
    });
  });

  describe('Form Modal Actions', () => {
    it('should open form', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      expect(result.current.isFormOpen).toBe(false);
      
      act(() => {
        result.current.openForm();
      });
      
      expect(result.current.isFormOpen).toBe(true);
    });

    it('should close form', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      // First open the form
      act(() => {
        result.current.openForm();
      });
      
      expect(result.current.isFormOpen).toBe(true);
      
      // Then close it
      act(() => {
        result.current.closeForm();
      });
      
      expect(result.current.isFormOpen).toBe(false);
    });

    it('should toggle form', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      expect(result.current.isFormOpen).toBe(false);
      
      // Toggle to open
      act(() => {
        result.current.toggleForm();
      });
      
      expect(result.current.isFormOpen).toBe(true);
      
      // Toggle to close
      act(() => {
        result.current.toggleForm();
      });
      
      expect(result.current.isFormOpen).toBe(false);
    });
  });

  describe('Sync Status Actions', () => {
    it('should set sync status', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      act(() => {
        result.current.setSyncStatus('syncing');
      });
      
      expect(result.current.syncStatus).toBe('syncing');
      expect(result.current.isSyncing).toBe(true);
      expect(result.current.isIdle).toBe(false);
      
      act(() => {
        result.current.setSyncStatus('error');
      });
      
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.hasSyncError).toBe(true);
      expect(result.current.isSyncing).toBe(false);
    });

    it('should start sync', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      act(() => {
        result.current.startSync();
      });
      
      expect(result.current.syncStatus).toBe('syncing');
      expect(result.current.isSyncing).toBe(true);
    });

    it('should finish sync', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      // Start sync first
      act(() => {
        result.current.startSync();
      });
      
      expect(result.current.isSyncing).toBe(true);
      
      // Finish sync
      act(() => {
        result.current.finishSync();
      });
      
      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isSyncing).toBe(false);
    });

    it('should error sync', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      act(() => {
        result.current.errorSync();
      });
      
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.hasSyncError).toBe(true);
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('Computed State', () => {
    it('should update computed state based on sync status', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      
      // Initial state
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.hasSyncError).toBe(false);
      
      // Syncing state
      act(() => {
        result.current.setSyncStatus('syncing');
      });
      
      expect(result.current.isIdle).toBe(false);
      expect(result.current.isSyncing).toBe(true);
      expect(result.current.hasSyncError).toBe(false);
      
      // Error state
      act(() => {
        result.current.setSyncStatus('error');
      });
      
      expect(result.current.isIdle).toBe(false);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.hasSyncError).toBe(true);
      
      // Back to idle
      act(() => {
        result.current.setSyncStatus('idle');
      });
      
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.hasSyncError).toBe(false);
    });
  });

  describe('Hook Stability', () => {
    it('should maintain function references between renders', () => {
      const { result, rerender } = renderHook(() => useUI(), { wrapper });
      
      const firstRenderFunctions = {
        selectEncounter: result.current.selectEncounter,
        setMapCenter: result.current.setMapCenter,
        openForm: result.current.openForm,
        setSyncStatus: result.current.setSyncStatus
      };
      
      rerender();
      
      expect(result.current.selectEncounter).toBe(firstRenderFunctions.selectEncounter);
      expect(result.current.setMapCenter).toBe(firstRenderFunctions.setMapCenter);
      expect(result.current.openForm).toBe(firstRenderFunctions.openForm);
      expect(result.current.setSyncStatus).toBe(firstRenderFunctions.setSyncStatus);
    });
  });
});