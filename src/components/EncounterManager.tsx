/**
 * EncounterManager - Main component that integrates map, form, and encounter management
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Map } from './Map';
import { EncounterForm } from './EncounterForm';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { DataManagement } from './DataManagement';
import { Settings } from './Settings';
import { useEncounters } from '../hooks/useEncounters';
import { useUI } from '../hooks/useUI';
import { storageService } from '../services/StorageService';
import type { CatEncounter, UserPreferences } from '../types';
import { useAppContext } from '../context/AppContext';

export function EncounterManager() {
  const { state, dispatch, showSnackbar } = useAppContext();
  const { 
    encounters, 
    addEncounter, 
    updateEncounter, 
    deleteEncounter,
    setEncounters 
  } = useEncounters();
  
  const { 
    mapCenter, 
    mapZoom, 
    isFormOpen,
    openForm,
    closeForm,
    selectedEncounter,
    selectEncounter
  } = useUI();

  const [formLocation, setFormLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [editingEncounter, setEditingEncounter] = useState<CatEncounter | undefined>();
  const [deletingEncounter, setDeletingEncounter] = useState<CatEncounter | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  // Load encounters from storage on mount
  useEffect(() => {
    const loadEncounters = async () => {
      try {
        const storedEncounters = await storageService.getEncounters();
        setEncounters(storedEncounters);
      } catch (error) {
        console.error('Failed to load encounters:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEncounters();
  }, [setEncounters]);

  // Handle location selection for new encounter
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setFormLocation({ lat, lng });
    setEditingEncounter(undefined);
    openForm();
  }, [openForm]);

  // Handle encounter selection (for viewing details)
  const handleEncounterSelect = useCallback((encounter: CatEncounter) => {
    selectEncounter(encounter.id);
  }, [selectEncounter]);

  // Handle encounter edit
  const handleEncounterEdit = useCallback((encounter: CatEncounter) => {
    setEditingEncounter(encounter);
    setFormLocation(undefined); // Clear location since we're editing
    openForm();
  }, [openForm]);

  // Initiate encounter deletion
  const initiateEncounterDelete = useCallback((encounter: CatEncounter) => {
    setDeletingEncounter(encounter);
  }, []);

  // Handle encounter deletion
  const handleEncounterDelete = useCallback(async () => {
    if (!deletingEncounter) return;

    setIsDeleting(true);
    try {
      // Delete from storage
      await storageService.deleteEncounter(deletingEncounter.id);
      
      // Update state
      deleteEncounter(deletingEncounter.id);
      
      // Clear selection if this encounter was selected
      if (selectedEncounter === deletingEncounter.id) {
        selectEncounter(undefined);
      }
      setDeletingEncounter(undefined);
      showSnackbar('Encounter deleted successfully.');
    } catch (error) {
      console.error('Failed to delete encounter:', error);
      showSnackbar('Failed to delete encounter.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingEncounter, deleteEncounter, selectedEncounter, selectEncounter, showSnackbar]);

  // Handle form save (create or update)
  const handleFormSave = useCallback(async (encounter: CatEncounter) => {
    try {
      // Save to storage
      await storageService.saveEncounter(encounter);
      
      if (editingEncounter) {
        // Update existing encounter
        updateEncounter(encounter.id, encounter);
        showSnackbar('Encounter updated successfully.');
      } else {
        // Add new encounter
        addEncounter(encounter);
        showSnackbar('Encounter added successfully.');
      }
      
      // Close form and clear state
      closeForm();
      setEditingEncounter(undefined);
      setFormLocation(undefined);
    } catch (error) {
      console.error('Failed to save encounter:', error);
      showSnackbar('Failed to save encounter.', 'error');
    }
  }, [editingEncounter, updateEncounter, addEncounter, closeForm, showSnackbar]);

  const handleExport = useCallback(async () => {
    try {
      const data = await storageService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cat-a-log-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSnackbar('Data exported successfully.');
    } catch (error) {
      console.error('Failed to export data:', error);
      showSnackbar('Failed to export data.', 'error');
    }
  }, [showSnackbar]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as string;
        await storageService.importData(data);
        const storedEncounters = await storageService.getEncounters();
        setEncounters(storedEncounters);
        showSnackbar('Data imported successfully.');
      } catch (error) {
        console.error('Failed to import data:', error);
        showSnackbar('Failed to import data.', 'error');
      }
    };
    reader.readAsText(file);
  }, [setEncounters, showSnackbar]);

  const handlePreferencesChange = useCallback((updates: Partial<UserPreferences>) => {
    dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: updates });
    showSnackbar('Settings saved.');
  }, [dispatch, showSnackbar]);

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    closeForm();
    setEditingEncounter(undefined);
    setFormLocation(undefined);
  }, [closeForm]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="encounter-manager" style={{ height: '100vh', position: 'relative' }}>
      {/* Map */}
      <Map
        encounters={encounters}
        onLocationSelect={handleLocationSelect}
        onEncounterSelect={handleEncounterSelect}
        onEncounterEdit={handleEncounterEdit}
        onEncounterDelete={initiateEncounterDelete}
        center={mapCenter}
        zoom={mapZoom}
      />

      {/* Encounter Form Modal */}
      <EncounterForm
        isOpen={isFormOpen}
        initialData={editingEncounter}
        location={formLocation}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingEncounter}
        encounterInfo={deletingEncounter
          ? { catColor: deletingEncounter.catColor, catType: deletingEncounter.catType, dateTime: deletingEncounter.dateTime }
          : null
        }
        onConfirm={handleEncounterDelete}
        onCancel={() => setDeletingEncounter(undefined)}
        isDeleting={isDeleting}
      />

      {/* Floating menu for export/import and settings */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000 }}>
        <button
          className="btn btn-secondary menu-button"
          onClick={() => setIsMenuOpen(prev => !prev)}
          title="Menu"
          style={{ width: '40px', height: '40px', padding: 0 }}
        >
          ☰
        </button>
        {isMenuOpen && (
          <div
            className="menu-popup"
            style={{
              position: 'absolute',
              bottom: '50px',
              left: 0,
              background: 'white',
              padding: '10px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            <DataManagement onExport={handleExport} onImport={handleImport} />
            <button
              className="btn btn-secondary"
              style={{ marginTop: '10px' }}
              onClick={() => {
                setIsSettingsOpen(true);
                setIsMenuOpen(false);
              }}
            >
              Settings
            </button>
          </div>
        )}
      </div>

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Settings
              preferences={state.user.preferences}
              onPreferencesChange={handlePreferencesChange}
              showSnackbar={showSnackbar}
            />
            <button onClick={() => setIsSettingsOpen(false)} className="btn btn-primary" style={{marginTop: '20px'}}>Close</button>
          </div>
        </div>
      )}

      {/* Add Cat Button */}
      <button
        className="add-cat-button"
        onClick={() => {
          // Open form without location (user will need to select on map)
          setFormLocation(undefined);
          setEditingEncounter(undefined);
          openForm();
        }}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Log Cat Encounter"
      >
        ➕
      </button>
    </div>
  );
}