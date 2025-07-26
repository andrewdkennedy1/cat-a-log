import { useState } from 'react';
import type { FC } from 'react';
import { Map } from './Map';
import type { CatEncounter } from '../types';

const ExampleUsage: FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<CatEncounter | null>(null);

  // Sample encounters for demonstration - clustered around different areas
  const sampleEncounters: CatEncounter[] = [
    // Central Park area cluster
    {
      id: '1',
      lat: 40.7829,
      lng: -73.9654,
      dateTime: '2024-01-15T10:30:00Z',
      catColor: 'orange',
      coatLength: 'Shorthair',
      catType: 'domestic',
      behavior: 'friendly',
      comment: 'Very friendly orange tabby cat near Central Park',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      lat: 40.7831,
      lng: -73.9656,
      dateTime: '2024-01-16T14:15:00Z',
      catColor: 'black',
      coatLength: 'Shorthair',
      catType: 'stray',
      behavior: 'shy',
      comment: 'Black cat hiding under a park bench',
      createdAt: '2024-01-16T14:15:00Z',
      updatedAt: '2024-01-16T14:15:00Z'
    },
    {
      id: '3',
      lat: 40.7825,
      lng: -73.9650,
      dateTime: '2024-01-17T09:45:00Z',
      catColor: 'white',
      coatLength: 'Shorthair',
      catType: 'domestic',
      behavior: 'playful',
      comment: 'White cat playing with fallen leaves',
      createdAt: '2024-01-17T09:45:00Z',
      updatedAt: '2024-01-17T09:45:00Z'
    },
    // Times Square area cluster
    {
      id: '4',
      lat: 40.7589,
      lng: -73.9851,
      dateTime: '2024-01-18T16:20:00Z',
      catColor: 'gray',
      coatLength: 'Shorthair',
      catType: 'stray',
      behavior: 'curious',
      comment: 'Gray cat watching street performers',
      createdAt: '2024-01-18T16:20:00Z',
      updatedAt: '2024-01-18T16:20:00Z'
    },
    {
      id: '5',
      lat: 40.7590,
      lng: -73.9853,
      dateTime: '2024-01-19T12:10:00Z',
      catColor: 'calico',
      coatLength: 'Shorthair',
      catType: 'domestic',
      behavior: 'sleepy',
      comment: 'Calico cat napping in a shop window',
      createdAt: '2024-01-19T12:10:00Z',
      updatedAt: '2024-01-19T12:10:00Z'
    },
    // Brooklyn Bridge area
    {
      id: '6',
      lat: 40.7061,
      lng: -73.9969,
      dateTime: '2024-01-20T08:30:00Z',
      catColor: 'brown',
      coatLength: 'Shorthair',
      catType: 'stray',
      behavior: 'hungry',
      comment: 'Brown tabby looking for food near the bridge',
      createdAt: '2024-01-20T08:30:00Z',
      updatedAt: '2024-01-20T08:30:00Z'
    },
    // Single encounter to show individual marker
    {
      id: '7',
      lat: 40.7505,
      lng: -73.9934,
      dateTime: '2024-01-21T15:45:00Z',
      catColor: 'tuxedo',
      coatLength: 'Shorthair',
      catType: 'domestic',
      behavior: 'friendly',
      comment: 'Tuxedo cat with white paws and chest',
      photoBlobId: 'photo-123', // Example photo reference
      createdAt: '2024-01-21T15:45:00Z',
      updatedAt: '2024-01-21T15:45:00Z'
    }
  ];

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    console.log('Location selected:', { lat, lng });
  };

  const handleEncounterSelect = (encounter: CatEncounter) => {
    setSelectedEncounter(encounter);
    console.log('Encounter selected:', encounter);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <h1>CAT-a-log Map Example</h1>
        <p>Click or long-press on the map to select a location. Click on paw markers to view encounter details.</p>
        <p><strong>Clustering:</strong> When zoomed out, nearby encounters are grouped into clusters. Zoom in or click clusters to see individual markers.</p>
        
        {selectedLocation && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#d4edda', borderRadius: '4px' }}>
            <strong>Selected Location:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </div>
        )}
        
        {selectedEncounter && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#cce5ff', borderRadius: '4px' }}>
            <strong>Selected Encounter:</strong> {selectedEncounter.catColor} {selectedEncounter.catType} - {selectedEncounter.behavior}
            {selectedEncounter.comment && <div><em>{selectedEncounter.comment}</em></div>}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1 }}>
        <Map
          encounters={sampleEncounters}
          onLocationSelect={handleLocationSelect}
          onEncounterSelect={handleEncounterSelect}
          center={[40.7505, -73.9934]} // Times Square area
          zoom={14}
        />
      </div>
    </div>
  );
};

export default ExampleUsage;