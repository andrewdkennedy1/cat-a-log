/**
 * Tests for AppContext and reducer functionality
 */

import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { vi, describe, it, expect } from 'vitest';
import { AppProvider, useAppContext } from '../AppContext';
import type { CatEncounter, UserPreferences } from '../../types';

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider showSnackbar={vi.fn()}>{children}</AppProvider>
);

// Mock encounter data
const mockEncounter: CatEncounter = {
  id: 'test-id-1',
  lat: 40.7128,
  lng: -74.0060,
  dateTime: '2024-01-15T10:30:00.000Z',
  catColor: 'Black',
  catType: 'Domestic Shorthair',
  behavior: 'Friendly',
  comment: 'Very friendly cat',
  photoBlobId: 'photo-1',
  coatLength: 'short', // Added missing property
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:30:00.000Z'
};

const mockEncounter2: CatEncounter = {
  id: 'test-id-2',
  lat: 40.7589,
  lng: -73.9851,
  dateTime: '2024-01-16T14:20:00.000Z',
  catColor: 'Orange/Ginger',
  catType: 'Stray',
  behavior: 'Shy',
  coatLength: 'medium', // Added missing property
  createdAt: '2024-01-16T14:20:00.000Z',
  updatedAt: '2024-01-16T14:20:00.000Z'
};

describe('AppContext', () => {
  describe('Initial State', () => {
    it('should provide initial state with empty encounters', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      expect(result.current.state.encounters).toEqual([]);
      expect(result.current.state.user.isAuthenticated).toBe(false);
      expect(result.current.state.user.googleToken).toBeUndefined();
      expect(result.current.state.ui.selectedEncounter).toBeUndefined();
      expect(result.current.state.ui.isFormOpen).toBe(false);
      expect(result.current.state.ui.syncStatus).toBe('idle');
    });

    it('should have default user preferences', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      const preferences = result.current.state.user.preferences;
      expect(preferences.defaultMapCenter).toEqual([40.7128, -74.0060]);
      expect(preferences.defaultMapZoom).toBe(13);
      expect(preferences.autoSync).toBe(true);
      expect(preferences.photoQuality).toBe('medium');
      expect(preferences.theme).toBe('auto');
    });
  });

  describe('Encounter Actions', () => {
    it('should add encounter', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ type: 'ADD_ENCOUNTER', payload: mockEncounter });
      });
      
      expect(result.current.state.encounters).toHaveLength(1);
      expect(result.current.state.encounters[0]).toEqual(mockEncounter);
    });

    it('should set encounters', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ 
          type: 'SET_ENCOUNTERS', 
          payload: [mockEncounter, mockEncounter2] 
        });
      });
      
      expect(result.current.state.encounters).toHaveLength(2);
      expect(result.current.state.encounters).toEqual([mockEncounter, mockEncounter2]);
    });

    it('should update encounter', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      // First add an encounter
      act(() => {
        result.current.dispatch({ type: 'ADD_ENCOUNTER', payload: mockEncounter });
      });
      
      // Then update it
      act(() => {
        result.current.dispatch({ 
          type: 'UPDATE_ENCOUNTER', 
          payload: { 
            id: 'test-id-1', 
            updates: { comment: 'Updated comment', behavior: 'Playful' } 
          } 
        });
      });
      
      const updatedEncounter = result.current.state.encounters[0];
      expect(updatedEncounter.comment).toBe('Updated comment');
      expect(updatedEncounter.behavior).toBe('Playful');
      expect(updatedEncounter.updatedAt).not.toBe(mockEncounter.updatedAt);
    });

    it('should delete encounter', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      // Add encounters
      act(() => {
        result.current.dispatch({ 
          type: 'SET_ENCOUNTERS', 
          payload: [mockEncounter, mockEncounter2] 
        });
      });
      
      // Delete one encounter
      act(() => {
        result.current.dispatch({ type: 'DELETE_ENCOUNTER', payload: 'test-id-1' });
      });
      
      expect(result.current.state.encounters).toHaveLength(1);
      expect(result.current.state.encounters[0].id).toBe('test-id-2');
    });

    it('should clear selected encounter when deleting it', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      // Add encounter and select it
      act(() => {
        result.current.dispatch({ type: 'ADD_ENCOUNTER', payload: mockEncounter });
        result.current.dispatch({ type: 'SET_SELECTED_ENCOUNTER', payload: 'test-id-1' });
      });
      
      expect(result.current.state.ui.selectedEncounter).toBe('test-id-1');
      
      // Delete the selected encounter
      act(() => {
        result.current.dispatch({ type: 'DELETE_ENCOUNTER', payload: 'test-id-1' });
      });
      
      expect(result.current.state.ui.selectedEncounter).toBeUndefined();
    });
  });

  describe('UI Actions', () => {
    it('should set selected encounter', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ type: 'SET_SELECTED_ENCOUNTER', payload: 'test-id-1' });
      });
      
      expect(result.current.state.ui.selectedEncounter).toBe('test-id-1');
    });

    it('should set map center and zoom', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ type: 'SET_MAP_CENTER', payload: [41.8781, -87.6298] });
        result.current.dispatch({ type: 'SET_MAP_ZOOM', payload: 15 });
      });
      
      expect(result.current.state.ui.mapCenter).toEqual([41.8781, -87.6298]);
      expect(result.current.state.ui.mapZoom).toBe(15);
    });

    it('should toggle form open state', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      expect(result.current.state.ui.isFormOpen).toBe(false);
      
      act(() => {
        result.current.dispatch({ type: 'SET_FORM_OPEN', payload: true });
      });
      
      expect(result.current.state.ui.isFormOpen).toBe(true);
    });

    it('should set sync status', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      });
      
      expect(result.current.state.ui.syncStatus).toBe('syncing');
      
      act(() => {
        result.current.dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      });
      
      expect(result.current.state.ui.syncStatus).toBe('error');
    });
  });

  describe('User Actions', () => {
    it('should set authentication state', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      });
      
      expect(result.current.state.user.isAuthenticated).toBe(true);
    });

    it('should set Google token', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ type: 'SET_GOOGLE_TOKEN', payload: 'test-token' });
      });
      
      expect(result.current.state.user.googleToken).toBe('test-token');
    });

    it('should set user preferences', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      const newPreferences: UserPreferences = {
        defaultMapCenter: [51.5074, -0.1278], // London
        defaultMapZoom: 12,
        autoSync: false,
        photoQuality: 'high',
        theme: 'dark',
        customCatColors: [], // Added missing property
        customCoatLengths: [], // Added missing property
        customCatTypes: [], // Added missing property
        customBehaviors: [], // Added missing property
      };
      
      act(() => {
        result.current.dispatch({ type: 'SET_USER_PREFERENCES', payload: newPreferences });
      });
      
      expect(result.current.state.user.preferences).toEqual(newPreferences);
      expect(result.current.state.ui.mapCenter).toEqual([51.5074, -0.1278]);
      expect(result.current.state.ui.mapZoom).toBe(12);
    });

    it('should update user preferences partially', () => {
      const { result } = renderHook(() => useAppContext(), { wrapper });
      
      act(() => {
        result.current.dispatch({ 
          type: 'UPDATE_USER_PREFERENCES', 
          payload: { theme: 'dark', photoQuality: 'high' } 
        });
      });
      
      expect(result.current.state.user.preferences.theme).toBe('dark');
      expect(result.current.state.user.preferences.photoQuality).toBe('high');
      // Other preferences should remain unchanged
      expect(result.current.state.user.preferences.autoSync).toBe(true);
      expect(result.current.state.user.preferences.defaultMapZoom).toBe(13);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useAppContext());
      }).toThrow('useAppContext must be used within an AppProvider');
      
      consoleSpy.mockRestore();
    });
  });
});