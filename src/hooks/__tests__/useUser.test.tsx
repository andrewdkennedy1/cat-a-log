/**
 * Tests for useUser hook
 */

import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { useUser } from '../useUser';
import type { UserPreferences } from '../../types';

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('useUser', () => {
  describe('Initial State', () => {
    it('should have correct initial user state', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.googleToken).toBeUndefined();
      expect(result.current.preferences).toEqual({
        defaultMapCenter: [40.7128, -74.0060],
        defaultMapZoom: 13,
        autoSync: true,
        photoQuality: 'medium',
        theme: 'auto',
        customCatColors: [],
        customCoatLengths: [],
        customCatTypes: [],
        customBehaviors: []
      });
    });

    it('should have correct computed state', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      expect(result.current.hasGoogleToken).toBe(false);
      expect(result.current.canSync).toBe(false);
    });
  });

  describe('Authentication Actions', () => {
    it('should set authenticated state', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.setAuthenticated(true);
      });
      
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should login', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.login();
      });
      
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should logout and clear token', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      // First login and set token
      act(() => {
        result.current.login();
        result.current.setGoogleToken('test-token');
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.googleToken).toBe('test-token');
      
      // Then logout
      act(() => {
        result.current.logout();
      });
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.googleToken).toBeUndefined();
    });

    it('should set Google token', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.setGoogleToken('test-token-123');
      });
      
      expect(result.current.googleToken).toBe('test-token-123');
      expect(result.current.hasGoogleToken).toBe(true);
    });
  });

  describe('Preferences Actions', () => {
    it('should set complete preferences', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      const newPreferences: UserPreferences = {
        defaultMapCenter: [51.5074, -0.1278], // London
        defaultMapZoom: 15,
        autoSync: false,
        photoQuality: 'high',
        theme: 'dark'
      };
      
      act(() => {
        result.current.setPreferences(newPreferences);
      });
      
      expect(result.current.preferences).toEqual(newPreferences);
    });

    it('should update preferences partially', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.updatePreferences({
          theme: 'light',
          photoQuality: 'low'
        });
      });
      
      expect(result.current.preferences.theme).toBe('light');
      expect(result.current.preferences.photoQuality).toBe('low');
      // Other preferences should remain unchanged
      expect(result.current.preferences.autoSync).toBe(true);
      expect(result.current.preferences.defaultMapZoom).toBe(13);
    });

    it('should set default map center', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      const newCenter: [number, number] = [48.8566, 2.3522]; // Paris
      
      act(() => {
        result.current.setDefaultMapCenter(newCenter);
      });
      
      expect(result.current.preferences.defaultMapCenter).toEqual(newCenter);
    });

    it('should set default map zoom', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.setDefaultMapZoom(16);
      });
      
      expect(result.current.preferences.defaultMapZoom).toBe(16);
    });

    it('should set auto sync', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.setAutoSync(false);
      });
      
      expect(result.current.preferences.autoSync).toBe(false);
    });

    it('should set photo quality', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.setPhotoQuality('high');
      });
      
      expect(result.current.preferences.photoQuality).toBe('high');
    });

    it('should set theme', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(result.current.preferences.theme).toBe('dark');
    });
  });

  describe('Computed State', () => {
    it('should compute hasGoogleToken correctly', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      expect(result.current.hasGoogleToken).toBe(false);
      
      act(() => {
        result.current.setGoogleToken('test-token');
      });
      
      expect(result.current.hasGoogleToken).toBe(true);
      
      act(() => {
        result.current.setGoogleToken(undefined);
      });
      
      expect(result.current.hasGoogleToken).toBe(false);
    });

    it('should compute canSync correctly', () => {
      const { result } = renderHook(() => useUser(), { wrapper });
      
      // Initially cannot sync (not authenticated, no token, but autoSync is true)
      expect(result.current.canSync).toBe(false);
      
      // Authenticate but no token
      act(() => {
        result.current.setAuthenticated(true);
      });
      
      expect(result.current.canSync).toBe(false);
      
      // Add token
      act(() => {
        result.current.setGoogleToken('test-token');
      });
      
      expect(result.current.canSync).toBe(true);
      
      // Disable auto sync
      act(() => {
        result.current.setAutoSync(false);
      });
      
      expect(result.current.canSync).toBe(false);
      
      // Re-enable auto sync
      act(() => {
        result.current.setAutoSync(true);
      });
      
      expect(result.current.canSync).toBe(true);
      
      // Logout
      act(() => {
        result.current.logout();
      });
      
      expect(result.current.canSync).toBe(false);
    });
  });

  describe('Hook Stability', () => {
    it('should maintain function references between renders', () => {
      const { result, rerender } = renderHook(() => useUser(), { wrapper });
      
      const firstRenderFunctions = {
        setAuthenticated: result.current.setAuthenticated,
        login: result.current.login,
        logout: result.current.logout,
        setGoogleToken: result.current.setGoogleToken,
        setPreferences: result.current.setPreferences,
        updatePreferences: result.current.updatePreferences
      };
      
      rerender();
      
      expect(result.current.setAuthenticated).toBe(firstRenderFunctions.setAuthenticated);
      expect(result.current.login).toBe(firstRenderFunctions.login);
      expect(result.current.logout).toBe(firstRenderFunctions.logout);
      expect(result.current.setGoogleToken).toBe(firstRenderFunctions.setGoogleToken);
      expect(result.current.setPreferences).toBe(firstRenderFunctions.setPreferences);
      expect(result.current.updatePreferences).toBe(firstRenderFunctions.updatePreferences);
    });
  });
});