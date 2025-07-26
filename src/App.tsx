import { AppProvider } from './context/AppContext';
import { EncounterManager } from './components/EncounterManager';
import { useOfflineStatus } from './hooks/useOfflineStatus';
import ErrorBoundary from './components/ErrorBoundary';
import { Snackbar } from './components/Snackbar';
import { useSnackbar } from './hooks/useSnackbar';
import './App.css'

function App() {
  const { isOffline } = useOfflineStatus();
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  return (
    <ErrorBoundary>
      <AppProvider showSnackbar={showSnackbar}>
        {isOffline && (
          <div className="offline-indicator">
            <p>You are currently offline. Some features may be unavailable.</p>
          </div>
        )}
        <EncounterManager />
        {snackbar && (
          <Snackbar
            message={snackbar.message}
            type={snackbar.type}
            onClose={hideSnackbar}
          />
        )}
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
