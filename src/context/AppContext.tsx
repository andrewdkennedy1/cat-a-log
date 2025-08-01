/**
 * Global application state management using React Context and useReducer
 */

import { createContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppState, UserPreferences } from '../types';
import { storageService } from '../services/StorageService';
import type { AppAction } from './AppActions';

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
    preferences: defaultPreferences,
    googleDriveService: undefined,
    googleDriveStatus: 'uninitialized'
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

    case 'SET_GOOGLE_DRIVE_SERVICE':
      return {
        ...state,
        user: {
          ...state.user,
          googleDriveService: action.payload,
          googleDriveStatus: action.payload ? 'initialized' : 'uninitialized'
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
  dispatch: (action: AppAction) => void;
  showSnackbar: (message: string, type?: 'success' | 'error') => void;
}

// Create context
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
  showSnackbar: (message: string, type?: 'success' | 'error') => void;
}

export function AppProvider({ children, showSnackbar }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load encounters from storage on app initialization
  useEffect(() => {
    const loadEncounters = async () => {
      try {
        console.log('AppContext: Loading encounters from storage...');
        const encounters = await storageService.getEncounters();
        console.log('AppContext: Loaded encounters:', encounters.length, encounters);
        dispatch({ type: 'SET_ENCOUNTERS', payload: encounters });
      } catch (error) {
        console.error('Failed to load encounters from storage:', error);
        showSnackbar('Failed to load encounters.', 'error');
      }
    };
    loadEncounters();
  }, [showSnackbar]);

  // Enhanced dispatch that also saves to storage
  const enhancedDispatch = (action: AppAction) => {
    // First update the state
    dispatch(action);

    // Then save to storage for persistence (async, but don't block UI)
    (async () => {
      try {
        switch (action.type) {
          case 'ADD_ENCOUNTER':
            await storageService.saveEncounter(action.payload);
            break;
          case 'UPDATE_ENCOUNTER':
            await storageService.updateEncounter(action.payload.id, action.payload.updates);
            break;
          case 'DELETE_ENCOUNTER':
            await storageService.deleteEncounter(action.payload);
            break;
          // No storage action needed for other types
        }
      } catch (error) {
        console.error('Failed to save to storage:', error);
        showSnackbar('Failed to save data.', 'error');
      }
    })();
  };

  return (
    <AppContext.Provider value={{ state, dispatch: enhancedDispatch, showSnackbar }}>
      {children}
    </AppContext.Provider>
  );
}

