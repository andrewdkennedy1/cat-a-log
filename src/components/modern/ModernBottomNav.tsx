import { MapIcon, List, Grid, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SyncStatus } from './SyncStatus';

interface ModernBottomNavProps {
  viewMode: 'map' | 'list' | 'grid';
  onViewModeChange: (mode: 'map' | 'list' | 'grid') => void;
  onAdd: () => void;
  onSettings: () => void;
}

export function ModernBottomNav({ viewMode, onViewModeChange, onAdd, onSettings }: ModernBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Sync Status Bar */}
      <div className="px-4 py-1 border-b">
        <div className="flex justify-center">
          <SyncStatus />
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-around h-16">
        <Button variant="ghost" onClick={() => onViewModeChange('map')} className={cn("flex-col h-auto", viewMode === 'map' ? 'text-primary' : 'text-muted-foreground')}>
          <MapIcon className="h-6 w-6" />
          <span className="text-xs">Map</span>
        </Button>
        <Button variant="ghost" onClick={() => onViewModeChange('list')} className={cn("flex-col h-auto", viewMode === 'list' ? 'text-primary' : 'text-muted-foreground')}>
          <List className="h-6 w-6" />
          <span className="text-xs">List</span>
        </Button>
        
        <Button variant="ghost" onClick={onAdd} className="flex-col h-auto text-muted-foreground">
          <Plus className="h-6 w-6" />
          <span className="text-xs">Add</span>
        </Button>

        <Button variant="ghost" onClick={() => onViewModeChange('grid')} className={cn("flex-col h-auto", viewMode === 'grid' ? 'text-primary' : 'text-muted-foreground')}>
          <Grid className="h-6 w-6" />
          <span className="text-xs">Grid</span>
        </Button>
        
        <Button variant="ghost" onClick={onSettings} className="flex-col h-auto text-muted-foreground">
          <Settings className="h-6 w-6" />
          <span className="text-xs">Settings</span>
        </Button>
      </div>
    </div>
  );
}