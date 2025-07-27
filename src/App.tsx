import { AppProvider } from './context/AppContext';
import { ModernApp } from './components/modern/ModernApp';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css'

function AppContent() {
  return (
    <AppProvider showSnackbar={() => {}}>
      <ModernApp />
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
