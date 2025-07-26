import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { MapProps, CatEncounter } from '../types';
import { useUI } from '../hooks/useUI';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { EncounterInfoCard } from './EncounterInfoCard';
import { storageService } from '../services/StorageService';

// Declare global window functions for popup buttons
declare global {
  interface Window {
    editEncounter: (id: string) => void;
    deleteEncounter: (id: string) => void;
  }
}

// Color mapping for cat colors to marker colors
const COLOR_MAP: Record<string, string> = {
  'black': '#2c2c2c',
  'white': '#f8f8f8',
  'gray': '#808080',
  'orange': '#ff8c00',
  'brown': '#8b4513',
  'calico': '#d2691e',
  'tabby': '#cd853f',
  'siamese': '#f5deb3',
  'tuxedo': '#2f4f4f',
  'tortoiseshell': '#8b4513',
  'other': '#9370db'
};

// Create custom paw-shaped marker icon
const createPawIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 32 : 24;
  const pawSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g fill="${color}" stroke="#fff" stroke-width="1">
        <!-- Main paw pad -->
        <ellipse cx="12" cy="16" rx="4" ry="3"/>
        <!-- Toe pads -->
        <circle cx="8" cy="10" r="2"/>
        <circle cx="12" cy="8" r="2"/>
        <circle cx="16" cy="10" r="2"/>
        <circle cx="10" cy="12" r="1.5"/>
        <circle cx="14" cy="12" r="1.5"/>
      </g>
    </svg>
  `;
  
  return L.divIcon({
    html: pawSvg,
    className: 'paw-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
};

interface ExtendedMapProps extends MapProps {
  onEncounterEdit?: (encounter: CatEncounter) => void;
  onEncounterDelete?: (encounter: CatEncounter) => void;
}

export const Map: React.FC<ExtendedMapProps> = ({
  encounters,
  onLocationSelect,
  onEncounterSelect,
  onEncounterEdit,
  onEncounterDelete,
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 13
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);
  const { selectedEncounter, setMapCenter, setMapZoom } = useUI();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [encounterToDelete, setEncounterToDelete] = useState<CatEncounter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load photo thumbnail for encounter
  const loadPhotoThumbnail = useCallback(async (encounter: CatEncounter) => {
    if (!encounter.photoBlobId || photoUrls[encounter.photoBlobId]) {
      return;
    }

    try {
      // Get actual photo from storage service
      const blob = await storageService.getPhoto(encounter.photoBlobId);
      if (!blob) return;
      // Create object URL for the blob
      const photoUrl = URL.createObjectURL(blob);
      
      setPhotoUrls(prev => ({
        ...prev,
        [encounter.photoBlobId!]: photoUrl
      }));
      
      // Cleanup URL when component unmounts or photo changes
      return () => {
        URL.revokeObjectURL(photoUrl);
      };
    } catch (error) {
      console.error('Failed to load photo thumbnail:', error);
    }
  }, [photoUrls]);

  // Handle encounter edit
  const handleEncounterEdit = useCallback((encounter: CatEncounter) => {
    if (onEncounterEdit) {
      onEncounterEdit(encounter);
    }
  }, [onEncounterEdit]);

  // Handle encounter delete confirmation
  const handleEncounterDelete = useCallback((encounter: CatEncounter) => {
    setEncounterToDelete(encounter);
    setDeleteDialogOpen(true);
  }, []);

  // Confirm deletion
  const confirmDelete = useCallback(async () => {
    if (!encounterToDelete || !onEncounterDelete) return;

    setIsDeleting(true);
    try {
      await onEncounterDelete(encounterToDelete);
      setDeleteDialogOpen(false);
      setEncounterToDelete(null);
    } catch (error) {
      console.error('Failed to delete encounter:', error);
      // Could show error message to user here
    } finally {
      setIsDeleting(false);
    }
  }, [encounterToDelete, onEncounterDelete]);

  // Cancel deletion
  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setEncounterToDelete(null);
  }, []);

  // Create popup content with EncounterInfoCard
  const createPopupContent = useCallback((encounter: CatEncounter) => {
    const container = document.createElement('div');
    container.style.minWidth = '250px';

    // Render the EncounterInfoCard React component into the container
    const root = ReactDOM.createRoot(container);
    root.render(
      <EncounterInfoCard
        encounter={encounter}
        onEdit={handleEncounterEdit}
        onDelete={handleEncounterDelete}
        className="map-popup-card"
      />
    );

    return container;
  }, [handleEncounterEdit, handleEncounterDelete]);

  // Handle map view changes for persistence
  const handleMapMoveEnd = useCallback(() => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      const zoom = mapInstanceRef.current.getZoom();
      setMapCenter([center.lat, center.lng]);
      setMapZoom(zoom);
    }
  }, [setMapCenter, setMapZoom]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster group
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50
    });

    map.addLayer(markers);

    // Add map move end handler for persistence
    map.on('moveend', handleMapMoveEnd);

    // Add long-press handler for mobile
    let longPressTimer: NodeJS.Timeout;
    let longPressTriggered = false;

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      longPressTriggered = false;
      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }, 500); // 500ms for long press
    };

    const handleTouchStart = (e: L.LeafletEvent) => {
      const touchEvent = e as L.LeafletMouseEvent; // Touch events have latlng in Leaflet
      if (touchEvent.latlng) {
        longPressTriggered = false;
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          onLocationSelect(touchEvent.latlng.lat, touchEvent.latlng.lng);
        }, 500);
      }
    };

    const handlePressEnd = () => {
      clearTimeout(longPressTimer);
    };

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (longPressTriggered) {
        L.DomEvent.stopPropagation(e);
        return;
      }
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    };

    map.on('mousedown', handleMouseDown);
    map.on('touchstart', handleTouchStart);
    map.on('mouseup touchend mousemove', handlePressEnd);
    map.on('click', handleClick);

    mapInstanceRef.current = map;
    markersRef.current = markers;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = null;
    };
    // The map should only be initialized once.
    // `center` and `zoom` are only used for the initial view.
    // `onLocationSelect` and `handleMapMoveEnd` should be stable callbacks.
  }, [onLocationSelect, handleMapMoveEnd]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (mapInstanceRef.current) {
      const currentCenter = mapInstanceRef.current.getCenter();
      const currentZoom = mapInstanceRef.current.getZoom();

      // Prevent re-running setView if the map is already at the correct position.
      // This is crucial to break the infinite loop:
      // setView -> moveend event -> handleMapMoveEnd -> setMapCenter -> re-render -> useEffect -> setView
      if (currentZoom !== zoom || currentCenter.lat !== center[0] || currentCenter.lng !== center[1]) {
        mapInstanceRef.current.setView(center, zoom);
      }
    }
  }, [center, zoom]);

  // Load photo thumbnails for encounters with photos
  useEffect(() => {
    encounters.forEach(encounter => {
      if (encounter.photoBlobId) {
        loadPhotoThumbnail(encounter);
      }
    });
  }, [encounters, loadPhotoThumbnail]);

  // Update markers when encounters change
  useEffect(() => {
    if (!markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Add markers for each encounter
    encounters.forEach((encounter) => {
      const color = COLOR_MAP[encounter.catColor.toLowerCase()] || COLOR_MAP.other;
      const isSelected = selectedEncounter === encounter.id;
      const icon = createPawIcon(color, isSelected);

      const marker = L.marker([encounter.lat, encounter.lng], { icon });

      // Create popup content with photo thumbnail
      const popupContent = createPopupContent(encounter);
      marker.bindPopup(popupContent);

      // Add click handler
      marker.on('click', () => {
        onEncounterSelect(encounter);
      });

      markersRef.current!.addLayer(marker);
    });
  }, [encounters, selectedEncounter, onEncounterSelect, createPopupContent]);

  // Global functions for popup buttons
  useEffect(() => {
    window.editEncounter = (encounterId: string) => {
      const encounter = encounters.find(e => e.id === encounterId);
      if (encounter) {
        handleEncounterEdit(encounter);
      }
    };

    window.deleteEncounter = (encounterId: string) => {
      const encounter = encounters.find(e => e.id === encounterId);
      if (encounter) {
        handleEncounterDelete(encounter);
      }
    };

    return () => {
      // Remove the functions from the window object when the component unmounts
      // to prevent memory leaks and unexpected behavior.
      // No-op assignments are a safe way to handle this.
      window.editEncounter = () => {};
      window.deleteEncounter = () => {};
    };
  }, [encounters, handleEncounterEdit, handleEncounterDelete]);

  // Cleanup photo URLs when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all photo URLs to prevent memory leaks
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoUrls]);

  return (
    <div className="map-container">
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        encounterInfo={encounterToDelete ? {
          catColor: encounterToDelete.catColor,
          catType: encounterToDelete.catType,
          dateTime: encounterToDelete.dateTime
        } : null}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Map;