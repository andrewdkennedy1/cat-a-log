/**
 * Global application state management using React Context and useReducer
 */

import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode, Dispatch } from 'react';
import type { CatEncounter, UserPreferences, AppState } from '../types';
import { storageService } from '../services/StorageService';

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
  | { type: 'UPDATE_USER_PREFERENCES'; payload: Partial<UserPreferences> };

// Default user preferences
const defaultPreferences: UserPreferences = {
  defaultMapCenter: [40.7128, -74.0060], // New York City as default
  defaultMapZoom: 13,
  autoSync: true,
  photoQuality: 'medium',
  theme: 'auto',
  customCatColors: [],
  customCoatLengths: [],
  customCatTypes: [],
  customBehaviors: []
};

// Initial state
const initialState: AppState = {
  encounters: [],
  user: {
    isAuthenticated: false,
    googleToken: undefined,
    preferences: defaultPreferences
  },
  ui: {
    selectedEncounter: undefined,
    mapCenter: defaultPreferences.defaultMapCenter,
    mapZoom: defaultPreferences.defaultMapZoom,
    isFormOpen: false,
    syncStatus: 'idle',
    isOnline: true,
    showOfflineMessage: false
  }
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Encounter actions
    case 'SET_ENCOUNTERS':
      return {
        ...state,
        encounters: action.payload
      };

    case 'ADD_ENCOUNTER':
      return {
        ...state,
        encounters: [...state.encounters, action.payload]
      };

    case 'UPDATE_ENCOUNTER': {
      const { id, updates } = action.payload;
      return {
        ...state,
        encounters: state.encounters.map(encounter =>
          encounter.id === id
            ? { ...encounter, ...updates, updatedAt: new Date().toISOString() }
            : encounter
        )
      };
    }

    case 'DELETE_ENCOUNTER':
      return {
        ...state,
        encounters: state.encounters.filter(encounter => encounter.id !== action.payload),
        ui: {
          ...state.ui,
          selectedEncounter: state.ui.selectedEncounter === action.payload
            ? undefined
            : state.ui.selectedEncounter
        }
      };

    // UI state actions
    case 'SET_SELECTED_ENCOUNTER':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedEncounter: action.payload
        }
      };

    case 'SET_MAP_CENTER':
      return {
        ...state,
        ui: {
          ...state.ui,
          mapCenter: action.payload
        }
      };

    case 'SET_MAP_ZOOM':
      return {
        ...state,
        ui: {
          ...state.ui,
          mapZoom: action.payload
        }
      };

    case 'SET_FORM_OPEN':
      return {
        ...state,
        ui: {
          ...state.ui,
          isFormOpen: action.payload
        }
      };

    case 'SET_SYNC_STATUS':
      return {
        ...state,
        ui: {
          ...state.ui,
          syncStatus: action.payload
        }
      };

    // User actions
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        user: {
          ...state.user,
          isAuthenticated: action.payload
        }
      };

    case 'SET_GOOGLE_TOKEN':
      return {
        ...state,
        user: {
          ...state.user,
          googleToken: action.payload
        }
      };

    case 'SET_USER_PREFERENCES':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: action.payload
        },
        ui: {
          ...state.ui,
          mapCenter: action.payload.defaultMapCenter,
          mapZoom: action.payload.defaultMapZoom
        }
      };

    case 'UPDATE_USER_PREFERENCES': {
      const updatedPreferences = {
        ...state.user.preferences,
        ...action.payload
      };
      return {
        ...state,
        user: {
          ...state.user,
          preferences: updatedPreferences
        },
        ui: {
          ...state.ui,
          mapCenter: action.payload.defaultMapCenter || state.ui.mapCenter,
          mapZoom: action.payload.defaultMapZoom || state.ui.mapZoom
        }
      };
    }

    default:
      return state;
  }
}

// Context type
interface AppContextType {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  showSnackbar: (message: string, type?: 'success' | 'error') => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
  showSnackbar: (message: string, type?: 'success' | 'error') => void;
}

export function AppProvider({ children, showSnackbar }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const loadEncounters = async () => {
      try {
        const encounters = await storageService.getEncounters();
        dispatch({ type: 'SET_ENCOUNTERS', payload: encounters });
      } catch (error) {
        console.error('Failed to load encounters from storage:', error);
        showSnackbar('Failed to load encounters.', 'error');
      }
    };
    loadEncounters();
  }, [dispatch, showSnackbar]);

  return (
    <AppContext.Provider value={{ state, dispatch, showSnackbar }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}