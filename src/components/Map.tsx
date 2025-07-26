import { useEffect, useRef, useState, useCallback, type FC } from 'react';
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

export const Map: FC<ExtendedMapProps> = ({
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
  const markersRef = useRef<L.LayerGroup<L.Marker> | null>(null);
  const { selectedEncounter } = useUI();
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
    container.style.padding = '8px';

    // Render the EncounterInfoCard React component into the container
    const root = ReactDOM.createRoot(container);
    root.render(
      <EncounterInfoCard
        encounter={encounter}
        onEdit={(enc) => onEncounterEdit?.(enc)}
        onDelete={(enc) => onEncounterDelete?.(enc)}
        className="map-popup-card"
      />
    );

    return container;
  }, [onEncounterEdit, onEncounterDelete]);


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

    // Use a regular layer group instead of clustering to prevent disappearing markers
    const markers = L.layerGroup();

    map.addLayer(markers);

    // Remove map move end handler to prevent re-render loops
    // map.on('moveend', handleMapMoveEnd);

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
      // Only trigger location selection if clicking on empty map area
      // Check if the click target is the map container itself (not a marker or other element)
      const target = e.originalEvent?.target as HTMLElement;
      if (target && (target.classList.contains('leaflet-container') || target.classList.contains('leaflet-zoom-animated'))) {
        // Additional check to ensure we're not clicking on a marker
        const isMarkerClick = target.closest('.leaflet-marker-icon') || target.closest('.paw-marker');
        if (!isMarkerClick) {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
      }
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
    // `onLocationSelect` should be stable callback.
  }, [center, zoom, onLocationSelect]);


  // Load photo thumbnails for encounters with photos
  useEffect(() => {
    encounters.forEach(encounter => {
      if (encounter.photoBlobId) {
        loadPhotoThumbnail(encounter);
      }
    });
  }, [encounters, loadPhotoThumbnail]);

  // Update markers when encounters change - use a ref to track if we need to update
  const lastEncountersRef = useRef<string>('');
  const lastSelectedRef = useRef<string | undefined>('');

  useEffect(() => {
    if (!markersRef.current || !mapInstanceRef.current) return;

    // Create a stable key for encounters to avoid unnecessary updates
    const encountersKey = encounters.map(e => `${e.id}-${e.lat}-${e.lng}-${e.catColor}`).join('|');
    const selectedKey = selectedEncounter;

    // Only update if encounters or selection actually changed
    if (lastEncountersRef.current === encountersKey && lastSelectedRef.current === selectedKey) {
      return;
    }

    lastEncountersRef.current = encountersKey;
    lastSelectedRef.current = selectedKey;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Add markers for each encounter
    encounters.forEach((encounter) => {
      const color = COLOR_MAP[encounter.catColor.toLowerCase()] || COLOR_MAP.other;
      const isSelected = selectedEncounter === encounter.id;
      const icon = createPawIcon(color, isSelected);

      const marker = L.marker([encounter.lat, encounter.lng], {
        icon,
        // Ensure markers stay visible during scrolling and interactions
        riseOnHover: true,
        keyboard: false,
        interactive: true,
        bubblingMouseEvents: false
      });

      // Create popup content with photo thumbnail
      const popupContent = createPopupContent(encounter);
      marker.bindPopup(popupContent);

      // Add click handler
      marker.on('click', (e: L.LeafletMouseEvent) => {
        // Prevent the map click event from firing
        L.DomEvent.stopPropagation(e);
        if (e.originalEvent) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
        }
        // Use a stable reference to prevent recreating markers
        if (onEncounterSelect) {
          onEncounterSelect(encounter);
        }
        marker.openPopup();
      });

      markersRef.current!.addLayer(marker);
    });
  }, [encounters, selectedEncounter, createPopupContent, onEncounterSelect]);

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