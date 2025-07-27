import { useEffect, useRef, useState, useCallback, type FC } from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { MapProps, CatEncounter } from '../types';
import { useUI } from '../hooks/useUI';
import { useGeolocation } from '../hooks/useGeolocation';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { EncounterInfoCard } from './EncounterInfoCard';
import { LocationButton } from './LocationButton';

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
      <g fill="${color}" stroke="#000" stroke-width="2">
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

// Create user location marker icon
const createUserLocationIcon = (accuracy?: number) => {
  const isHighAccuracy = accuracy && accuracy <= 50;
  const color = isHighAccuracy ? '#4285f4' : '#ffa500';
  const size = 16;

  const locationSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="${color}" stroke="#fff" stroke-width="3"/>
      <circle cx="12" cy="12" r="3" fill="#fff"/>
    </svg>
  `;

  return L.divIcon({
    html: locationSvg,
    className: 'user-location-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

interface ExtendedMapProps extends MapProps {
  onEncounterEdit?: (encounter: CatEncounter) => void;
  onEncounterDelete?: (encounter: CatEncounter) => void;
  photoUrls?: Record<string, string>;
}


export const Map: FC<ExtendedMapProps> = ({
  encounters,
  onLocationSelect,
  onEncounterSelect,
  onEncounterEdit,
  onEncounterDelete,
  photoUrls = {},
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 13
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup<L.Marker> | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const { selectedEncounter } = useUI();
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);
  const onEncounterSelectRef = useRef(onEncounterSelect);

  useEffect(() => {
    onEncounterSelectRef.current = onEncounterSelect;
  }, [onEncounterSelect]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [encounterToDelete, setEncounterToDelete] = useState<CatEncounter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasInitializedLocation, setHasInitializedLocation] = useState(false);

  // Use geolocation hook with watch enabled for mobile devices
  const {
    position,
    error: geoError,
    loading: geoLoading,
    getCurrentPosition,
    getCoordinates,
    getAccuracy,
    isMobile,
    supported: geoSupported,
    usingIpGeolocation
  } = useGeolocation({
    watch: true,
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000 // 30 seconds
  });


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

  // Handle location button click to center map on user location
  const handleLocationFound = useCallback((lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
    }
  }, []);

  // Create popup content with EncounterInfoCard
  const createPopupContent = useCallback((encounter: CatEncounter, photoUrl?: string) => {
    const container = document.createElement('div');
    container.style.minWidth = '250px';
    container.style.padding = '8px';

    // Render the EncounterInfoCard React component into the container
    const root = ReactDOM.createRoot(container);
    root.render(
      <EncounterInfoCard
        encounter={encounter}
        onEdit={(enc) => window.editEncounter(enc.id)}
        onDelete={(enc) => window.deleteEncounter(enc.id)}
        className="map-popup-card"
        photoUrl={photoUrl}
      />
    );

    return container;
  }, []);


  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: true
    });

    // Invalidate size on next tick to ensure container is sized
    setTimeout(() => map.invalidateSize(), 0);

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
        onLocationSelectRef.current(e.latlng.lat, e.latlng.lng);
      }, 500); // 500ms for long press
    };

    const handleTouchStart = (e: L.LeafletEvent) => {
      const touchEvent = e as L.LeafletMouseEvent; // Touch events have latlng in Leaflet
      if (touchEvent.latlng) {
        longPressTriggered = false;
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          onLocationSelectRef.current(touchEvent.latlng.lat, touchEvent.latlng.lng);
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
      const isMarkerClick = target.closest('.leaflet-marker-icon') || target.closest('.paw-marker');
      if (!isMarkerClick) {
        onLocationSelectRef.current(e.latlng.lat, e.latlng.lng);
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
  }, [center, zoom]);



  // Update user location marker when GPS position changes
  useEffect(() => {
    if (!mapInstanceRef.current || !position) return;

    const coordinates = getCoordinates();
    if (!coordinates) return;

    const [lat, lng] = coordinates;
    const accuracy = getAccuracy();

    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userLocationMarkerRef.current);
    }

    // Create new user location marker
    const userMarker = L.marker([lat, lng], {
      icon: createUserLocationIcon(accuracy || undefined),
      zIndexOffset: 1000 // Ensure user location appears above other markers
    });

    // Add tooltip showing accuracy and source
    const accuracyText = usingIpGeolocation
      ? 'Your location (IP based)'
      : accuracy
        ? `Your location (±${Math.round(accuracy)}m)`
        : 'Your location';

    userMarker.bindTooltip(accuracyText, {
      permanent: false,
      direction: 'top'
    });

    userMarker.addTo(mapInstanceRef.current);
    userLocationMarkerRef.current = userMarker;

    // Center map on user location for mobile devices on first GPS fix
    if (isMobile && !hasInitializedLocation) {
      mapInstanceRef.current.setView([lat, lng], 16);
      setHasInitializedLocation(true);
    }
  }, [position, getCoordinates, getAccuracy, isMobile, hasInitializedLocation, usingIpGeolocation]);

  // Request location permission on mobile devices
  useEffect(() => {
    if (isMobile && geoSupported && !position && !geoError) {
      getCurrentPosition();
    }
  }, [isMobile, geoSupported, position, geoError, getCurrentPosition]);

  // Update markers when encounters change - use a ref to track existing markers
  const markersMapRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());

  useEffect(() => {
    if (!markersRef.current || !mapInstanceRef.current) {
      console.log('Map: Missing refs - markersRef:', !!markersRef.current, 'mapInstanceRef:', !!mapInstanceRef.current);
      return;
    }

    console.log('Map: Updating markers, encounters:', encounters.length, encounters);

    const currentMarkers = markersMapRef.current;
    const newEncounterIds = new Set(encounters.map(e => e.id));

    // Remove markers for encounters that no longer exist
    for (const [id, marker] of currentMarkers.entries()) {
      if (!newEncounterIds.has(id)) {
        markersRef.current.removeLayer(marker);
        currentMarkers.delete(id);
      }
    }

    // Add or update markers for each encounter
    encounters.forEach((encounter) => {
      console.log('Map: Processing encounter:', encounter.id, encounter.lat, encounter.lng, encounter.catColor);
      const color = COLOR_MAP[encounter.catColor.toLowerCase()] || COLOR_MAP.other;
      const isSelected = selectedEncounter === encounter.id;
      const existingMarker = currentMarkers.get(encounter.id);

      console.log('Map: Color for', encounter.catColor, ':', color);

      // Check if we need to update this marker
      const needsUpdate = !existingMarker ||
        existingMarker.getLatLng().lat !== encounter.lat ||
        existingMarker.getLatLng().lng !== encounter.lng ||
        (isSelected !== (existingMarker.options.icon as L.DivIcon)?.options?.className?.includes('selected'));

      console.log('Map: Needs update:', needsUpdate, 'existing marker:', !!existingMarker);

      if (needsUpdate) {
        // Remove existing marker if it exists
        if (existingMarker && markersRef.current) {
          markersRef.current.removeLayer(existingMarker);
        }

        // Create new marker
        const icon = createPawIcon(color, isSelected);
        const marker = L.marker([encounter.lat, encounter.lng], {
          icon,
          // Ensure markers stay visible during scrolling and interactions
          riseOnHover: true,
          keyboard: false,
          interactive: true,
          bubblingMouseEvents: false,
          zIndexOffset: isSelected ? 1000 : 0 // Bring selected markers to front
        });

        // Create popup content with photo thumbnail
        const photoUrl = encounter.photoBlobId ? photoUrls[encounter.photoBlobId] : undefined;
        const popupContent = createPopupContent(encounter, photoUrl);
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
          onEncounterSelectRef.current(encounter);
          marker.openPopup();
        });

        if (markersRef.current) {
          markersRef.current.addLayer(marker);
        }
        currentMarkers.set(encounter.id, marker);
        console.log('Map: Added marker for encounter:', encounter.id, 'at', encounter.lat, encounter.lng);
      } else {
        console.log('Map: Skipped marker update for encounter:', encounter.id);
      }
    });
  }, [encounters, selectedEncounter, createPopupContent, photoUrls]);

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
      window.editEncounter = () => { };
      window.deleteEncounter = () => { };
    };
  }, [encounters, handleEncounterEdit, handleEncounterDelete]);



  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

      {/* GPS Status Indicator for Mobile */}
      {isMobile && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
            display: geoLoading || geoError ? 'block' : 'none'
          }}
        >
          {geoLoading && '📍 Getting location...'}
          {geoError && !usingIpGeolocation && '❌ Location unavailable'}
          {usingIpGeolocation && '📍 Using approximate location'}
        </div>
      )}

      {/* Location Button */}
      <LocationButton
        onLocationFound={handleLocationFound}
        className="map-location-button"
      />

      {/* Delete Confirmation Dialog */}
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