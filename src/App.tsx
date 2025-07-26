import { AppProvider } from './context/AppContext';
import { EncounterManager } from './components/EncounterManager';
import './App.css'

function App() {
  return (
    <AppProvider>
      <EncounterManager />
    </AppProvider>
  )
}

export default App
