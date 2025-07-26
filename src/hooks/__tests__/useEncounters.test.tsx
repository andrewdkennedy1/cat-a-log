/**
 * Tests for useEncounters hook
 */

import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { useEncounters } from '../useEncounters';
import type { CatEncounter } from '../../types';

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

// Mock encounter data
const mockEncounters: CatEncounter[] = [
  {
    id: 'encounter-1',
    lat: 40.7128,
    lng: -74.0060,
    dateTime: '2024-01-15T10:30:00.000Z',
    catColor: 'Black',
    catType: 'Domestic Shorthair',
    behavior: 'Friendly',
    comment: 'Very friendly cat',
    photoBlobId: 'photo-1',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z'
  },
  {
    id: 'encounter-2',
    lat: 40.7589,
    lng: -73.9851,
    dateTime: '2024-01-16T14:20:00.000Z',
    catColor: 'Orange/Ginger',
    catType: 'Stray',
    behavior: 'Shy',
    createdAt: '2024-01-16T14:20:00.000Z',
    updatedAt: '2024-01-16T14:20:00.000Z'
  },
  {
    id: 'encounter-3',
    lat: 40.7505,
    lng: -73.9934,
    dateTime: '2024-01-17T09:15:00.000Z',
    catColor: 'Black',
    catType: 'Pet (Outdoor)',
    behavior: 'Playful',
    photoBlobId: 'photo-2',
    createdAt: '2024-01-17T09:15:00.000Z',
    updatedAt: '2024-01-17T09:15:00.000Z'
  }
];

describe('useEncounters', () => {
  describe('Basic Operations', () => {
    it('should start with empty encounters', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      expect(result.current.encounters).toEqual([]);
    });

    it('should add encounter', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.addEncounter(mockEncounters[0]);
      });
      
      expect(result.current.encounters).toHaveLength(1);
      expect(result.current.encounters[0]).toEqual(mockEncounters[0]);
    });

    it('should set all encounters', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      expect(result.current.encounters).toHaveLength(3);
      expect(result.current.encounters).toEqual(mockEncounters);
    });

    it('should update encounter', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      // Set initial encounters
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      // Update encounter
      act(() => {
        result.current.updateEncounter('encounter-1', { 
          comment: 'Updated comment',
          behavior: 'Curious'
        });
      });
      
      const updatedEncounter = result.current.encounters.find(e => e.id === 'encounter-1');
      expect(updatedEncounter?.comment).toBe('Updated comment');
      expect(updatedEncounter?.behavior).toBe('Curious');
      expect(updatedEncounter?.updatedAt).not.toBe(mockEncounters[0].updatedAt);
    });

    it('should delete encounter', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      // Set initial encounters
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      // Delete encounter
      act(() => {
        result.current.deleteEncounter('encounter-2');
      });
      
      expect(result.current.encounters).toHaveLength(2);
      expect(result.current.encounters.find(e => e.id === 'encounter-2')).toBeUndefined();
    });

    it('should get encounter by ID', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      const encounter = result.current.getEncounterById('encounter-2');
      expect(encounter).toEqual(mockEncounters[1]);
      
      const nonExistent = result.current.getEncounterById('non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Filtering Operations', () => {
    beforeEach(() => {
      // This setup will be used by filtering tests
    });

    it('should filter encounters by color', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      const blackCats = result.current.getEncountersByColor('Black');
      expect(blackCats).toHaveLength(2);
      expect(blackCats.every(e => e.catColor === 'Black')).toBe(true);
      
      const orangeCats = result.current.getEncountersByColor('Orange/Ginger');
      expect(orangeCats).toHaveLength(1);
      expect(orangeCats[0].id).toBe('encounter-2');
    });

    it('should filter encounters by type', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      const strays = result.current.getEncountersByType('Stray');
      expect(strays).toHaveLength(1);
      expect(strays[0].id).toBe('encounter-2');
      
      const pets = result.current.getEncountersByType('Pet (Outdoor)');
      expect(pets).toHaveLength(1);
      expect(pets[0].id).toBe('encounter-3');
    });

    it('should filter encounters by behavior', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      const friendly = result.current.getEncountersByBehavior('Friendly');
      expect(friendly).toHaveLength(1);
      expect(friendly[0].id).toBe('encounter-1');
      
      const playful = result.current.getEncountersByBehavior('Playful');
      expect(playful).toHaveLength(1);
      expect(playful[0].id).toBe('encounter-3');
    });

    it('should filter encounters by date range', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      const jan16Only = result.current.getEncountersByDateRange(
        '2024-01-16T00:00:00.000Z',
        '2024-01-16T23:59:59.999Z'
      );
      expect(jan16Only).toHaveLength(1);
      expect(jan16Only[0].id).toBe('encounter-2');
      
      const jan15to16 = result.current.getEncountersByDateRange(
        '2024-01-15T00:00:00.000Z',
        '2024-01-16T23:59:59.999Z'
      );
      expect(jan15to16).toHaveLength(2);
    });

    it('should get encounters with photos', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      const withPhotos = result.current.getEncountersWithPhotos();
      expect(withPhotos).toHaveLength(2);
      expect(withPhotos.every(e => e.photoBlobId)).toBe(true);
      expect(withPhotos.map(e => e.id)).toEqual(['encounter-1', 'encounter-3']);
    });
  });

  describe('Sorting Operations', () => {
    it('should sort encounters by date (newest first)', () => {
      const { result } = renderHook(() => useEncounters(), { wrapper });
      
      act(() => {
        result.current.setEncounters(mockEncounters);
      });
      
      const sorted = result.current.getEncountersSortedByDate();
      expect(sorted).toHaveLength(3);
      expect(sorted[0].id).toBe('encounter-3'); // 2024-01-17
      expect(sorted[1].id).toBe('encounter-2'); // 2024-01-16
      expect(sorted[2].id).toBe('encounter-1'); // 2024-01-15
    });
  });

  describe('Hook Stability', () => {
    it('should maintain function references between renders', () => {
      const { result, rerender } = renderHook(() => useEncounters(), { wrapper });
      
      const firstRenderFunctions = {
        addEncounter: result.current.addEncounter,
        updateEncounter: result.current.updateEncounter,
        deleteEncounter: result.current.deleteEncounter,
        setEncounters: result.current.setEncounters
      };
      
      rerender();
      
      expect(result.current.addEncounter).toBe(firstRenderFunctions.addEncounter);
      expect(result.current.updateEncounter).toBe(firstRenderFunctions.updateEncounter);
      expect(result.current.deleteEncounter).toBe(firstRenderFunctions.deleteEncounter);
      expect(result.current.setEncounters).toBe(firstRenderFunctions.setEncounters);
    });
  });
});