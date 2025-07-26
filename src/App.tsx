import { AppProvider } from './context/AppContext';
import { ModernApp } from './components/modern/ModernApp';
import { AuthHandler } from './components/AuthHandler';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <AppProvider showSnackbar={() => {}}>
        <AuthHandler />
        <ModernApp />
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
