/**
 * Integration tests for EncounterManager component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { EncounterManager } from '../EncounterManager';
import { storageService } from '../../services/StorageService';
import type { CatEncounter } from '../../types';

// Mock the storage service
vi.mock('../../services/StorageService', () => ({
  storageService: {
    getEncounters: vi.fn(),
    saveEncounter: vi.fn(),
    deleteEncounter: vi.fn(),
    getPhoto: vi.fn()
  }
}));

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn(),
      addLayer: vi.fn(),
      on: vi.fn(),
      remove: vi.fn(),
      getCenter: vi.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
      getZoom: vi.fn(() => 13)
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn()
    })),
    markerClusterGroup: vi.fn(() => ({
      clearLayers: vi.fn(),
      addLayer: vi.fn()
    })),
    marker: vi.fn(() => ({
      bindPopup: vi.fn(),
      on: vi.fn()
    })),
    divIcon: vi.fn(),
    DomEvent: {
      stopPropagation: vi.fn()
    }
  }
}));

// Mock leaflet.markercluster
vi.mock('leaflet.markercluster', () => ({}));

const mockStorageService = storageService as any;

import { AppProvider } from '../../context/AppContext';

const mockShowSnackbar = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AppProvider showSnackbar={mockShowSnackbar}>
      {ui}
    </AppProvider>
  );
};

describe('EncounterManager Integration', () => {
  const mockEncounter: CatEncounter = {
    id: 'test-id',
    lat: 40.7128,
    lng: -74.0060,
    dateTime: '2024-01-15T10:30:00.000Z',
    catColor: 'Orange',
    catType: 'Tabby',
    behavior: 'Friendly',
    comment: 'Very cute cat!',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageService.getEncounters.mockResolvedValue([mockEncounter]);
    mockStorageService.getPhoto.mockResolvedValue(null);
    mockStorageService.saveEncounter.mockResolvedValue(undefined);
    mockStorageService.deleteEncounter.mockResolvedValue(undefined);

    // Mock FileReader
    const mockFileReader = {
      readAsText: vi.fn().mockImplementation(function(this: any, file: File) {
        this.onload({ target: { result: '{"encounters": [], "photos": {}}' } });
      }),
      onload: vi.fn(),
    };
    vi.stubGlobal('FileReader', vi.fn(() => mockFileReader));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the encounter manager with map and add button', async () => {
    renderWithProviders(<EncounterManager />);
    
    // Should load encounters on mount
    await waitFor(() => {
      expect(mockStorageService.getEncounters).toHaveBeenCalled();
    });
    
    // Should show the add cat button
    expect(screen.getByTitle('Log Cat Encounter')).toBeInTheDocument();
  });

  it('opens form when add button is clicked', async () => {
    renderWithProviders(<EncounterManager />);
    
    await waitFor(() => {
      expect(mockStorageService.getEncounters).toHaveBeenCalled();
    });
    
    // Click add button
    fireEvent.click(screen.getByTitle('Log Cat Encounter'));
    
    // Form should open
    expect(screen.getByText('Log Cat Encounter')).toBeInTheDocument();
  });

  it('handles encounter deletion with confirmation', async () => {
    // Need to mock the Map component to trigger the delete action
    vi.mock('../Map', () => ({
      Map: ({ onEncounterDelete }: { onEncounterDelete: (e: CatEncounter) => void }) => (
        <button onClick={() => onEncounterDelete(mockEncounter)}>Delete Encounter</button>
      )
    }));

    renderWithProviders(<EncounterManager />);

    await waitFor(() => {
      expect(screen.getByText('Delete Encounter')).toBeInTheDocument();
    });

    // Click the delete button
    fireEvent.click(screen.getByText('Delete Encounter'));

    // Confirmation dialog should appear
    expect(screen.getByText('Are you sure you want to delete this encounter?')).toBeInTheDocument();

    // Click confirm
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockStorageService.deleteEncounter).toHaveBeenCalledWith('test-id');
    });
  });

  it('opens settings modal and handles preference changes', async () => {
    renderWithProviders(<EncounterManager />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Click the settings button
    fireEvent.click(screen.getByText('Settings'));

    // Settings modal should appear
    expect(screen.getByText('Theme')).toBeInTheDocument();

    // Change the theme
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });

    // The component should call the dispatch function with the correct action
    // This is a bit tricky to test without exposing the dispatch function,
    // but we can check if the snackbar appears
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith('Settings saved.');
    });
  });

  it('handles data export', async () => {
    renderWithProviders(<EncounterManager />);

    await waitFor(() => {
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    // Click the export button
    fireEvent.click(screen.getByText('Export Data'));

    // We can't easily test the download functionality, but we can check if the snackbar appears
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith('Data exported successfully.');
    });
  });

  it('handles data import', async () => {
    renderWithProviders(<EncounterManager />);

    await waitFor(() => {
      expect(screen.getByTestId('import-input')).toBeInTheDocument();
    });

    const file = new File(['{"encounters": [], "photos": {}}'], 'test.json', { type: 'application/json' });
    const input = screen.getByTestId('import-input');

    await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith('Data imported successfully.');
    });
  });
});

vi.mock('../Map', () => ({
  Map: ({ onEncounterDelete, onEncounterEdit, onEncounterSelect, onLocationSelect }: any) => (
    <div>
      <button onClick={() => onEncounterDelete(mockEncounter)}>Delete Encounter</button>
      <button onClick={() => onEncounterEdit(mockEncounter)}>Edit Encounter</button>
      <button onClick={() => onEncounterSelect(mockEncounter)}>Select Encounter</button>
      <button onClick={() => onLocationSelect(40, -74)}>Select Location</button>
    </div>
  )
}));

vi.mock('../DataManagement', () => ({
  DataManagement: ({ onExport, onImport }: any) => (
    <div>
      <button onClick={onExport}>Export Data</button>
      <label htmlFor="import-file">
        Import Data
        <input
          id="import-file"
          type="file"
          data-testid="import-input"
          onChange={onImport}
        />
      </label>
    </div>
  )
}));
    renderWithProviders(<EncounterManager />);
    
    // Should load encounters on mount
    await waitFor(() => {
      expect(mockStorageService.getEncounters).toHaveBeenCalled();
    });
    
    // Should show the add cat button
    expect(screen.getByTitle('Log Cat Encounter')).toBeInTheDocument();
  });