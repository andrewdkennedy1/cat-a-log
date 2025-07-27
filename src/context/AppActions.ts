/**
 * Action types for the app reducer
 */

import type { CatEncounter, UserPreferences } from '../types';
import { GoogleDriveService } from '@/services/GoogleDriveService';

// Action types for the reducer
export type AppAction =
  // Encounter actions
  | { type: 'SET_ENCOUNTERS'; payload: CatEncounter[] }
  | { type: 'ADD_ENCOUNTER'; payload: CatEncounter }
  | { type: 'UPDATE_ENCOUNTER'; payload: { id: string; updates: Partial<CatEncounter> } }
  | { type: 'DELETE_ENCOUNTER'; payload: string }
  // UI state actions
  | { type: 'SET_SELECTED_ENCOUNTER'; payload: string | undefined }
  | { type: 'SET_MAP_CENTER'; payload: [number, number] }
  | { type: 'SET_MAP_ZOOM'; payload: number }
  | { type: 'SET_FORM_OPEN'; payload: boolean }
  | { type: 'SET_SYNC_STATUS'; payload: 'idle' | 'syncing' | 'error' }
  // User actions
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_GOOGLE_TOKEN'; payload: string | undefined }
  | { type: 'SET_USER_PREFERENCES'; payload: UserPreferences }
  | { type: 'UPDATE_USER_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_GOOGLE_DRIVE_SERVICE'; payload: GoogleDriveService | undefined };