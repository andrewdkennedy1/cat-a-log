import { AppProvider } from './context/AppContext';
import { ModernApp } from './components/modern/ModernApp';
import { AuthHandler } from './components/AuthHandler';
import ErrorBoundary from './components/ErrorBoundary';
import { useSnackbar } from './hooks/useSnackbar';
import { Snackbar } from './components/Snackbar';
import './App.css'

function AppContent() {
  const { snackbar, showSnackbar } = useSnackbar();

  return (
    <AppProvider showSnackbar={showSnackbar}>
      <AuthHandler />
      <ModernApp />
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => showSnackbar('', 'success')}
        />
      )}
    </AppProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
