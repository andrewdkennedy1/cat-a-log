/**
 * Modern App component using shadcn/ui
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Heart, Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { ModernEncounterWizard } from './ModernEncounterWizard';
import { ModernSettings } from './ModernSettings';
import { ModernEncounterCard } from './ModernEncounterCard';
import { ModernBottomNav } from './ModernBottomNav';
import { Map } from '@/components/Map';
import { useEncounters } from '@/hooks/useEncounters';
import { useUI } from '@/hooks/useUI';
import { useUser } from '@/hooks/useUser';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import type { CatEncounter } from '@/types';
import { storageService } from '@/services/StorageService';

export function ModernApp() {
  const { isOffline } = useOfflineStatus();
  const {
    encounters,
    addEncounter,
    updateEncounter,
    deleteEncounter
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

  const { preferences, restoreGoogleToken } = useUser();

  const [formLocation, setFormLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [editingEncounter, setEditingEncounter] = useState<CatEncounter | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>('map');
  const [isSelectLocationPromptOpen, setIsSelectLocationPromptOpen] = useState(false);
  const [searchTerm] = useState('');
  const [filteredEncounters, setFilteredEncounters] = useState<CatEncounter[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Restore Google token on app startup with proper timing
  useEffect(() => {
    // We only want this to run once on startup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    restoreGoogleToken();
  }, []);

  // Removed periodic check to prevent log flooding

  // Load photo thumbnails
  useEffect(() => {
    const loadAndSetUrls = async () => {
      const newUrls: Record<string, string> = {};
      const idsToLoad = encounters
        .map(e => e.photoBlobId)
        .filter((id): id is string => !!id && !photoUrls[id]);

      if (idsToLoad.length === 0) return;

      const loadedBlobs = await Promise.all(
        idsToLoad.map(id => storageService.getPhoto(id).catch(e => {
          console.error(`Failed to load photo ${id}:`, e);
          return null;
        }))
      );

      idsToLoad.forEach((id, index) => {
        const blob = loadedBlobs[index];
        if (blob) {
          newUrls[id] = URL.createObjectURL(blob);
        }
      });

      if (Object.keys(newUrls).length > 0) {
        setPhotoUrls(prev => ({ ...prev, ...newUrls }));
      }
    };

    loadAndSetUrls();

    // Cleanup function
    return () => {
      // This cleanup runs when the component unmounts or when `encounters` changes.
      // We should only revoke URLs that are no longer in use.
      const currentBlobIds = new Set(encounters.map(e => e.photoBlobId));
      Object.entries(photoUrls).forEach(([blobId, url]) => {
        if (!currentBlobIds.has(blobId)) {
          URL.revokeObjectURL(url);
          // Also remove from state to keep it clean
          setPhotoUrls(prev => {
            const next = { ...prev };
            delete next[blobId];
            return next;
          });
        }
      });
    };
  }, [encounters, photoUrls]);

  // Filter encounters based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEncounters(encounters);
    } else {
      const filtered = encounters.filter(encounter =>
        encounter.catColor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        encounter.catType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        encounter.behavior.toLowerCase().includes(searchTerm.toLowerCase()) ||
        encounter.comment?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEncounters(filtered);
    }
  }, [encounters, searchTerm]);

  // Handle location selection for new encounter
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setFormLocation({ lat, lng });
    setEditingEncounter(undefined);
    setIsSelectLocationPromptOpen(false);
    openForm();
  }, [openForm]);

  // Handle encounter selection
  const handleEncounterSelect = useCallback((encounter: CatEncounter) => {
    selectEncounter(encounter.id);
  }, [selectEncounter]);

  // Handle encounter edit
  const handleEncounterEdit = useCallback((encounter: CatEncounter) => {
    setEditingEncounter(encounter);
    setFormLocation(undefined);
    openForm();
  }, [openForm]);

  // Handle encounter deletion
  const handleEncounterDelete = useCallback(async (encounter: CatEncounter) => {
    if (confirm('Are you sure you want to delete this encounter?')) {
      await deleteEncounter(encounter.id);
      if (selectedEncounter === encounter.id) {
        selectEncounter(undefined);
      }
    }
  }, [deleteEncounter, selectedEncounter, selectEncounter]);

  // Handle form save
  const handleFormSave = async (encounter: CatEncounter) => {
    try {
      if (editingEncounter) {
        await updateEncounter(encounter.id, encounter);
      } else {
        await addEncounter(encounter);
      }
      closeForm();
      setEditingEncounter(undefined);
      setFormLocation(undefined);
    } catch (error) {
      console.error('Failed to save encounter:', error);
    }
  };

  // Handle form cancel
  const handleFormCancel = () => {
    closeForm();
    setEditingEncounter(undefined);
    setFormLocation(undefined);
  };


  const renderListView = () => (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-24">
      {filteredEncounters.length === 0 ? (
        <Card className="text-center">
          <CardContent className="p-0">
            <div className="pt-6">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No encounters found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first cat encounter!'}
              </p>
              <Button onClick={() => openForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Encounter
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        filteredEncounters.map((encounter) => (
          <ModernEncounterCard
            key={encounter.id}
            encounter={encounter}
            onEdit={handleEncounterEdit}
            onDelete={handleEncounterDelete}
            photoUrl={encounter.photoBlobId ? photoUrls[encounter.photoBlobId] : null}
          />
        ))
      )}
    </div>
  );

  const renderGridView = () => {
    // Filter encounters that have photos for Instagram-like grid
    const encountersWithPhotos = filteredEncounters.filter(encounter =>
      encounter.photoBlobId && photoUrls[encounter.photoBlobId]
    );

    return (
      <div className="h-full overflow-y-auto p-2 pb-24">
        <div className="grid grid-cols-3 gap-1">
          {encountersWithPhotos.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center min-h-[50vh]">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                {searchTerm ? 'No photos match your search' : 'Start taking photos of your cat encounters to see them here!'}
              </p>
              <Button onClick={() => openForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
            </div>
          ) : (
            encountersWithPhotos.map((encounter) => (
              <div
                key={encounter.id}
                className="aspect-square relative group cursor-pointer overflow-hidden bg-muted"
                onClick={() => handleEncounterEdit(encounter)}
              >
                <img
                  src={photoUrls[encounter.photoBlobId!]}
                  alt={`${encounter.catType} - ${encounter.catColor}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {/* Overlay with basic info on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center text-sm">
                    <div className="font-medium capitalize">{encounter.catType}</div>
                    <div className="text-xs opacity-90 capitalize">{encounter.catColor}</div>
                  </div>
                </div>
                {/* Delete button in top right */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEncounterDelete(encounter);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-background relative">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium absolute top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-900 rounded-full animate-pulse" />
            You are currently offline. Some features may be unavailable.
          </div>
        </div>
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        <div className="flex items-center justify-center p-4 h-16" style={{ paddingTop: `calc(env(safe-area-inset-top) + 0.5rem)` }}>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl">CAT-a-log</h1>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full hidden sm:inline-block">
              {encounters.length} encounters
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-full w-full">
        {/* Map is always in the background */}
        <div className="absolute inset-0 z-10">
          <Map
            encounters={encounters}
            onLocationSelect={handleLocationSelect}
            onEncounterSelect={handleEncounterSelect}
            onEncounterEdit={handleEncounterEdit}
            onEncounterDelete={handleEncounterDelete}
            center={mapCenter}
            zoom={mapZoom}
            photoUrls={photoUrls}
          />
        </div>

        {/* List and Grid views overlay the map */}
        {viewMode !== 'map' && (
          <div className="absolute inset-0 z-20 bg-background pt-16">
            {viewMode === 'list' ? renderListView() : renderGridView()}
          </div>
        )}
      </main>

      <ModernBottomNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => {
          setViewMode('map');
          setIsSelectLocationPromptOpen(true);
        }}
        onSettings={() => setIsSettingsOpen(true)}
      />

      {/* Dialogs - Outside main container to ensure proper z-index */}
      <ModernEncounterWizard
        isOpen={isFormOpen}
        initialData={editingEncounter}
        location={formLocation}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <ModernSettings
            preferences={preferences}
            onPreferencesChange={() => {
              // Handle preferences update
            }}
            onClose={() => setIsSettingsOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isSelectLocationPromptOpen} onOpenChange={setIsSelectLocationPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          <p>Please click or long-press on the map to select the location for the new encounter.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}