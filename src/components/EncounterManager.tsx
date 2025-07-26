/**
 * EncounterManager - Main component that integrates map, form, and encounter management
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Map } from './Map';
import { EncounterForm } from './EncounterForm';
import { useEncounters } from '../hooks/useEncounters';
import { useUI } from '../hooks/useUI';
import { storageService } from '../services/StorageService';
import type { CatEncounter } from '../types';

export function EncounterManager() {
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

  // Load encounters from storage on mount
  useEffect(() => {
    const loadEncounters = async () => {
      try {
        const storedEncounters = await storageService.getEncounters();
        setEncounters(storedEncounters);
      } catch (error) {
        console.error('Failed to load encounters:', error);
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

  // Handle encounter deletion
  const handleEncounterDelete = useCallback(async (encounter: CatEncounter) => {
    try {
      // Delete from storage
      await storageService.deleteEncounter(encounter.id);
      
      // Update state
      deleteEncounter(encounter.id);
      
      // Clear selection if this encounter was selected
      if (selectedEncounter === encounter.id) {
        selectEncounter(undefined);
      }
    } catch (error) {
      console.error('Failed to delete encounter:', error);
      throw error; // Re-throw to let the UI handle the error
    }
  }, [deleteEncounter, selectedEncounter, selectEncounter]);

  // Handle form save (create or update)
  const handleFormSave = useCallback(async (encounter: CatEncounter) => {
    try {
      // Save to storage
      await storageService.saveEncounter(encounter);
      
      if (editingEncounter) {
        // Update existing encounter
        updateEncounter(encounter.id, encounter);
      } else {
        // Add new encounter
        addEncounter(encounter);
      }
      
      // Close form and clear state
      closeForm();
      setEditingEncounter(undefined);
      setFormLocation(undefined);
    } catch (error) {
      console.error('Failed to save encounter:', error);
      throw error; // Re-throw to let the form handle the error
    }
  }, [editingEncounter, updateEncounter, addEncounter, closeForm]);

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    closeForm();
    setEditingEncounter(undefined);
    setFormLocation(undefined);
  }, [closeForm]);

  return (
    <div className="encounter-manager" style={{ height: '100vh', position: 'relative' }}>
      {/* Map */}
      <Map
        encounters={encounters}
        onLocationSelect={handleLocationSelect}
        onEncounterSelect={handleEncounterSelect}
        onEncounterEdit={handleEncounterEdit}
        onEncounterDelete={handleEncounterDelete}
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