/**
 * Modern App component using shadcn/ui
 */

import { useState } from 'react';
import { Plus, Menu, Settings, Download, Upload, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ModernEncounterForm } from './ModernEncounterForm';
import { ModernLocationButton } from './ModernLocationButton';
import { ModernSettings } from './ModernSettings';
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

  // Handle location selection for new encounter
  const handleLocationSelect = (lat: number, lng: number) => {
    setFormLocation({ lat, lng });
    setEditingEncounter(undefined);
    openForm();
  };

  // Handle encounter selection
  const handleEncounterSelect = (encounter: CatEncounter) => {
    selectEncounter(encounter.id);
  };

  // Handle encounter edit
  const handleEncounterEdit = (encounter: CatEncounter) => {
    setEditingEncounter(encounter);
    setFormLocation(undefined);
    openForm();
  };

  // Handle encounter deletion
  const handleEncounterDelete = async (encounter: CatEncounter) => {
    if (confirm('Are you sure you want to delete this encounter?')) {
      await deleteEncounter(encounter.id);
      if (selectedEncounter === encounter.id) {
        selectEncounter(undefined);
      }
    }
  };

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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
          You are currently offline. Some features may be unavailable.
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Map Container */}
        <div className="absolute inset-0">
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

        {/* Floating UI Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Bar */}
          <div className="flex justify-between items-center p-4 pointer-events-auto">
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg">
              <div className="flex items-center gap-2 p-3">
                <MapIcon className="h-5 w-5 text-primary" />
                <h1 className="font-semibold text-lg">CAT-a-log</h1>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {encounters.length} encounters
                </span>
              </div>
            </Card>

            {/* Menu Button */}
            <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Menu</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
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
                    onClick={() => {
                      // Handle export
                      setIsMenuOpen(false);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      // Handle import
                      setIsMenuOpen(false);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Location Button */}
          <ModernLocationButton onLocationFound={handleLocationButtonClick} />

          {/* Add Encounter Button */}
          <div className="absolute bottom-6 right-6 pointer-events-auto">
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
        </div>
      </div>

      {/* Encounter Form Dialog */}
      <ModernEncounterForm
        isOpen={isFormOpen}
        initialData={editingEncounter}
        location={formLocation}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />

      {/* Settings Dialog */}
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