/**
 * Example usage of EncounterForm component
 */

import React, { useState } from 'react';
import { EncounterForm } from './EncounterForm';
import type { CatEncounter } from '../types';

export function EncounterFormExample() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [encounters, setEncounters] = useState<CatEncounter[]>([]);
  const [editingEncounter, setEditingEncounter] = useState<CatEncounter | undefined>();

  const mockLocation = { lat: 40.7128, lng: -74.0060 }; // New York City

  const handleSave = (encounter: CatEncounter) => {
    if (editingEncounter) {
      // Update existing encounter
      setEncounters(prev => 
        prev.map(e => e.id === encounter.id ? encounter : e)
      );
    } else {
      // Add new encounter
      setEncounters(prev => [...prev, encounter]);
    }
    
    setIsFormOpen(false);
    setEditingEncounter(undefined);
    console.log('Saved encounter:', encounter);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingEncounter(undefined);
  };

  const handleEdit = (encounter: CatEncounter) => {
    setEditingEncounter(encounter);
    setIsFormOpen(true);
  };

  const handleDelete = (encounterId: string) => {
    setEncounters(prev => prev.filter(e => e.id !== encounterId));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Cat Encounter Form Example</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="btn btn-primary"
        >
          ➕ Log Cat Encounter
        </button>
      </div>

      {encounters.length > 0 && (
        <div>
          <h2>Logged Encounters ({encounters.length})</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {encounters.map(encounter => (
              <div 
                key={encounter.id} 
                style={{ 
                  border: '1px solid #ccc', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: encounter.catColor.toLowerCase() }}>
                      {encounter.catColor} {encounter.catType}
                    </h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontStyle: 'italic' }}>
                      Behavior: {encounter.behavior}
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#666' }}>
                      {new Date(encounter.dateTime).toLocaleString()}
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#666' }}>
                      Location: {encounter.lat.toFixed(6)}, {encounter.lng.toFixed(6)}
                    </p>
                    {encounter.comment && (
                      <p style={{ margin: '0.5rem 0', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                        {encounter.comment}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEdit(encounter)}
                      className="btn btn-sm btn-secondary"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(encounter.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {encounters.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <p>No cat encounters logged yet.</p>
          <p>Click "Log Cat Encounter" to add your first encounter!</p>
        </div>
      )}

      <EncounterForm
        isOpen={isFormOpen}
        initialData={editingEncounter}
        location={editingEncounter ? undefined : mockLocation}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}