/**
 * Modern App component using shadcn/ui
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Menu, Settings, Download, Upload, MapIcon, List, Grid, Search, Heart, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ModernEncounterForm } from './ModernEncounterForm';
import { ModernLocationButton } from './ModernLocationButton';
import { ModernSettings } from './ModernSettings';
import { ModernEncounterCard } from './ModernEncounterCard';
import { Map } from '@/components/Map';
import { useEncounters } from '@/hooks/useEncounters';
import { useUI } from '@/hooks/useUI';
import { useUser } from '@/hooks/useUser';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import type { CatEncounter } from '@/types';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEncounters, setFilteredEncounters] = useState<CatEncounter[]>([]);

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

  // Handle location button click
  const handleLocationButtonClick = () => {
    // Center map on user location - this would be handled by the Map component
  };

  const renderListView = () => (
    <div className="h-full overflow-y-auto p-4 space-y-4">
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
          />
        ))
      )}
    </div>
  );

  const renderGridView = () => (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-900 rounded-full animate-pulse" />
            You are currently offline. Some features may be unavailable.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="font-bold text-xl">CAT-a-log</h1>
            </div>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {encounters.length} encounters
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search encounters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="hidden md:flex border rounded-lg">
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="rounded-r-none"
              >
                <MapIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-x"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-l-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>

            {/* Menu */}
            <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Menu</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <div className="md:hidden">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                    <div className="flex border rounded-lg mb-2">
                      <Button
                        variant={viewMode === 'map' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setViewMode('map');
                          setIsMenuOpen(false);
                        }}
                        className="flex-1 rounded-r-none"
                      >
                        <MapIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setViewMode('list');
                          setIsMenuOpen(false);
                        }}
                        className="flex-1 rounded-none border-x"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setViewMode('grid');
                          setIsMenuOpen(false);
                        }}
                        className="flex-1 rounded-l-none"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          <>
            {/* Map Container */}
            <div className="absolute inset-0 z-20">
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

            {/* Floating Location Button */}
            <div className="relative z-30">
              <ModernLocationButton onLocationFound={handleLocationButtonClick} />
            </div>

            {/* Floating Add Button */}
            <div className="absolute bottom-6 right-6 z-10">
              <Button
                onClick={() => {
                  setFormLocation(undefined);
                  setEditingEncounter(undefined);
                  openForm();
                }}
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </>
        ) : viewMode === 'list' ? (
          renderListView()
        ) : (
          renderGridView()
        )}
      </div>

      {/* Floating Add Button for Mobile */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button
          onClick={() => {
            setFormLocation(undefined);
            setEditingEncounter(undefined);
            openForm();
          }}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

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