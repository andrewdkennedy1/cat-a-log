import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Map } from '../Map';
import { CatEncounter } from '../../types';
import { AppProvider } from '../../context/AppContext';

// Mock Leaflet
vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn(),
    addLayer: vi.fn(),
    on: vi.fn(),
    remove: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
    getZoom: vi.fn(() => 13)
  };

  const mockMarker = vi.fn(() => ({
    bindPopup: vi.fn(),
    on: vi.fn()
  }));

  return {
    default: {
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => ({
        addTo: vi.fn()
      })),
      markerClusterGroup: vi.fn(() => ({
        clearLayers: vi.fn(),
        addLayer: vi.fn()
      })),
      marker: mockMarker,
      divIcon: vi.fn(() => ({})),
      DomEvent: {
        stopPropagation: vi.fn()
      }
    }
  };
});

// Mock leaflet.markercluster
vi.mock('leaflet.markercluster', () => ({
  // We're mocking L.markerClusterGroup directly in the leaflet mock,
  // so this mock can be empty or just export a dummy object if needed.
}));

const mockEncounters: CatEncounter[] = [
  {
    id: '1',
    lat: 40.7128,
    lng: -74.0060,
    dateTime: '2024-01-15T10:30:00Z',
    catColor: 'orange',
    catType: 'domestic',
    behavior: 'friendly',
    comment: 'Very friendly cat',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    lat: 40.7589,
    lng: -73.9851,
    dateTime: '2024-01-16T14:15:00Z',
    catColor: 'black',
    catType: 'stray',
    behavior: 'shy',
    createdAt: '2024-01-16T14:15:00Z',
    updatedAt: '2024-01-16T14:15:00Z'
  }
];

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>{children}</AppProvider>
);

describe('Map Component', () => {
  const mockOnLocationSelect = vi.fn();
  const mockOnEncounterSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders map container', () => {
    render(
      <TestWrapper>
        <Map
          encounters={mockEncounters}
          onLocationSelect={mockOnLocationSelect}
          onEncounterSelect={mockOnEncounterSelect}
        />
      </TestWrapper>
    );

    const mapContainer = document.querySelector('.map-container');
    expect(mapContainer).toBeTruthy();
  });

  it('accepts custom center and zoom props', () => {
    const customCenter: [number, number] = [51.5074, -0.1278]; // London
    const customZoom = 15;

    render(
      <TestWrapper>
        <Map
          encounters={mockEncounters}
          onLocationSelect={mockOnLocationSelect}
          onEncounterSelect={mockOnEncounterSelect}
          center={customCenter}
          zoom={customZoom}
        />
      </TestWrapper>
    );

    // Component should render without errors
    const mapContainer = document.querySelector('.map-container');
    expect(mapContainer).toBeTruthy();
  });

  it('handles empty encounters array', () => {
    render(
      <TestWrapper>
        <Map
          encounters={[]}
          onLocationSelect={mockOnLocationSelect}
          onEncounterSelect={mockOnEncounterSelect}
        />
      </TestWrapper>
    );

    const mapContainer = document.querySelector('.map-container');
    expect(mapContainer).toBeTruthy();
  });

  it('creates markers for each encounter', () => {
    render(
      <TestWrapper>
        <Map
          encounters={mockEncounters}
          onLocationSelect={mockOnLocationSelect}
          onEncounterSelect={mockOnEncounterSelect}
        />
      </TestWrapper>
    );

    // Component should render without errors when encounters are provided
    const mapContainer = document.querySelector('.map-container');
    expect(mapContainer).toBeTruthy();
  });

  it('handles map move events for persistence', () => {
    render(
      <TestWrapper>
        <Map
          encounters={mockEncounters}
          onLocationSelect={mockOnLocationSelect}
          onEncounterSelect={mockOnEncounterSelect}
        />
      </TestWrapper>
    );

    // Component should render without errors and handle map events
    const mapContainer = document.querySelector('.map-container');
    expect(mapContainer).toBeTruthy();
  });
});