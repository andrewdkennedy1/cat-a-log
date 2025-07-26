/**
 * Modern App component using shadcn/ui
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Heart, Camera, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ModernEncounterForm } from './ModernEncounterForm';
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

  const { preferences } = useUser();

  const [formLocation, setFormLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [editingEncounter, setEditingEncounter] = useState<CatEncounter | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEncounters, setFilteredEncounters] = useState<CatEncounter[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Load photo thumbnails
  useEffect(() => {
    const loadPhotos = async () => {
      const urls: Record<string, string> = {};
      for (const encounter of encounters) {
        if (encounter.photoBlobId && !photoUrls[encounter.photoBlobId]) {
          try {
            const blob = await storageService.getPhoto(encounter.photoBlobId);
            if (blob) {
              urls[encounter.photoBlobId] = URL.createObjectURL(blob);
            }
          } catch (error) {
            console.error('Failed to load photo:', error);
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setPhotoUrls(prev => ({ ...prev, ...urls }));
      }
    };

    loadPhotos();

    // Cleanup URLs on unmount
    return () => {
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url));
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
        <Card className="p-8 text-center">
          <CardContent>
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No encounters found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first cat encounter!'}
            </p>
            <Button onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Encounter
            </Button>
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

  const renderGridView = () => (
    <div className="h-full overflow-y-auto p-4 pb-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredEncounters.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-8 text-center">
              <CardContent>
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No encounters found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start documenting your cat encounters!'}
                </p>
                <Button onClick={() => openForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Encounter
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredEncounters.map((encounter) => (
            <ModernEncounterCard
              key={encounter.id}
              encounter={encounter}
              onEdit={handleEncounterEdit}
              onDelete={handleEncounterDelete}
              compact
              photoUrl={encounter.photoBlobId ? photoUrls[encounter.photoBlobId] : null}
            />
          ))
        )}
      </div>
    </div>
  );

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
        <div className="flex items-center justify-between p-4 h-20" style={{ paddingTop: `calc(env(safe-area-inset-top) + 1rem)` }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="font-bold text-xl">CAT-a-log</h1>
            </div>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full hidden sm:inline-block">
              {encounters.length} encounters
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
            
            {/* Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
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
          />
        </div>
        
        {/* List and Grid views overlay the map */}
        {viewMode !== 'map' && (
          <div className="absolute inset-0 z-20 bg-background pt-20">
            {viewMode === 'list' ? renderListView() : renderGridView()}
          </div>
        )}
      </main>

      <ModernBottomNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => {
          setFormLocation(undefined);
          setEditingEncounter(undefined);
          openForm();
        }}
      />

      {/* Dialogs - Outside main container to ensure proper z-index */}
      <ModernEncounterForm
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
    </div>
  );
}