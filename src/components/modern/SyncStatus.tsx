/**
 * Sync Status component to show Google Drive sync status
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/useUser';
import { syncService } from '@/services/SyncService';

export function SyncStatus() {
  const { isAuthenticated, hasGoogleToken, preferences } = useUser();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for sync events
    const unsubscribe = syncService.on((status, error) => {
      setSyncStatus(status);
      setSyncError(error || null);
      
      if (status === 'idle' && !error) {
        setLastSyncTime(new Date());
      }
    });

    return unsubscribe;
  }, []);

  if (!isAuthenticated || !hasGoogleToken) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <CloudOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  }

  if (!preferences.autoSync) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Cloud className="h-3 w-3" />
        Sync Disabled
      </Badge>
    );
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return lastSyncTime ? <CheckCircle className="h-3 w-3" /> : <Cloud className="h-3 w-3" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return syncError ? `Error: ${syncError}` : 'Sync Error';
      default:
        return lastSyncTime ? `Synced ${formatTime(lastSyncTime)}` : 'Connected';
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (syncStatus) {
      case 'syncing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return lastSyncTime ? 'default' : 'outline';
    }
  };

  return (
    <Badge variant={getStatusVariant()} className="flex items-center gap-1">
      {getStatusIcon()}
      {getStatusText()}
    </Badge>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}