/**
 * Main application hook that combines all state management hooks
 */

import { useEncounters } from './useEncounters';
import { useUI } from './useUI';
import { useUser } from './useUser';
import { useAppContext } from '../context/AppContext';

export function useApp() {
  const { state } = useAppContext();
  const encounters = useEncounters();
  const ui = useUI();
  const user = useUser();

  return {
    // Raw state access (for debugging or advanced use cases)
    state,
    
    // Organized hooks
    encounters,
    ui,
    user
  };
}

// Re-export individual hooks for convenience
export { useEncounters } from './useEncounters';
export { useUI } from './useUI';
export { useUser } from './useUser';
export { useAppContext } from '../context/AppContext';