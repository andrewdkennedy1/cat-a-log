/**
 * Service for synchronizing data with cloud storage
 */

import { storageService } from './StorageService';
import { GoogleDriveService } from './GoogleDriveService';
import type { CatEncounter, UserPreferences } from '@/types';

// Simple event emitter for sync status
type SyncEventListener = (status: 'idle' | 'syncing' | 'error', error?: string) => void;

class EventEmitter {
  private listeners: SyncEventListener[] = [];

  on(listener: SyncEventListener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  emit(status: 'idle' | 'syncing' | 'error', error?: string) {
    this.listeners.forEach(listener => listener(status, error));
  }
}

class SyncService extends EventEmitter {
  private driveService: GoogleDriveService | null = null;
  private syncInProgress = false;
  private autoSyncEnabled = true;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  public setDriveService(driveService: GoogleDriveService) {
    this.driveService = driveService;
    this.startAutoSync();
  }

  public isAuthenticated(): boolean {
    return !!this.driveService;
  }

  public setAutoSync(enabled: boolean) {
    this.autoSyncEnabled = enabled;
    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  private startAutoSync() {
    if (!this.autoSyncEnabled || !this.driveService) return;

    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      if (!this.syncInProgress) {
        this.sync().catch(console.error);
      }
    }, 5 * 60 * 1000);
  }

  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }


  public async checkCloudData(): Promise<{ lastModified: Date; hasData: boolean }> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const { encounters, preferences } = await this.driveService.loadData();
      if (encounters.length > 0 || Object.keys(preferences).length > 0) {
        const lastModified = encounters.reduce((latest, e) => {
          const d = new Date(e.updatedAt);
          return d > latest ? d : latest;
        }, new Date(0));
        return { lastModified, hasData: true };
      }
      return { lastModified: new Date(0), hasData: false };
    } catch (error) {
      console.error('Failed to check cloud data:', error);
      throw error;
    }
  }

  public async resolveConflicts(localData: unknown, cloudData: unknown): Promise<unknown> {
    // Simple conflict resolution: use the most recent data
    // In a real app, this would be more sophisticated
    const localTime = new Date((localData as { exportedAt?: string })?.exportedAt || 0);
    const cloudTime = new Date((cloudData as { exportedAt?: string })?.exportedAt || 0);

    return cloudTime > localTime ? cloudData : localData;
  }

  private mergeEncounters(local: CatEncounter[], remote: CatEncounter[]): { merged: CatEncounter[], needsUpload: CatEncounter[], needsDownload: CatEncounter[] } {
    const merged: CatEncounter[] = [];
    const needsUpload: CatEncounter[] = [];
    const needsDownload: CatEncounter[] = [];
    
    const remoteMap = new Map(remote.map(e => [e.id, e]));

    // Process local encounters
    for (const localEncounter of local) {
      const remoteEncounter = remoteMap.get(localEncounter.id);
      if (remoteEncounter) {
        // Encounter exists in both
        if (localEncounter.isDeleted) {
          // If local is deleted, it's the latest state
          merged.push(localEncounter);
          needsUpload.push(localEncounter);
        } else if (remoteEncounter.isDeleted) {
          // If remote is deleted, it's the latest state
          merged.push(remoteEncounter);
          needsDownload.push(remoteEncounter);
        } else {
          // Neither is deleted, compare timestamps
          const localDate = new Date(localEncounter.updatedAt);
          const remoteDate = new Date(remoteEncounter.updatedAt);
          if (localDate > remoteDate) {
            merged.push(localEncounter);
            needsUpload.push(localEncounter);
          } else if (remoteDate > localDate) {
            merged.push(remoteEncounter);
            needsDownload.push(remoteEncounter);
          } else {
            merged.push(localEncounter);
          }
        }
        remoteMap.delete(localEncounter.id);
      } else {
        // Local encounter not in remote, needs upload
        merged.push(localEncounter);
        needsUpload.push(localEncounter);
      }
    }

    // Process remaining remote encounters
    for (const remoteEncounter of remoteMap.values()) {
      merged.push(remoteEncounter);
      needsDownload.push(remoteEncounter);
    }

    return { merged, needsUpload, needsDownload };
  }

  private mergePreferences(local: UserPreferences, remote: UserPreferences): UserPreferences {
    const merged = { ...local };

    if (remote) {
      // Merge custom option arrays, removing duplicates
      merged.customCatColors = [...new Set([...(local.customCatColors || []), ...(remote.customCatColors || [])])];
      merged.customCoatLengths = [...new Set([...(local.customCoatLengths || []), ...(remote.customCoatLengths || [])])];
      merged.customCatTypes = [...new Set([...(local.customCatTypes || []), ...(remote.customCatTypes || [])])];
      merged.customBehaviors = [...new Set([...(local.customBehaviors || []), ...(remote.customBehaviors || [])])];

      // For other settings, we can decide on a strategy. For now, local wins (already default)
    }

    return merged;
  }

  public async sync(): Promise<CatEncounter[]> {
    if (!this.driveService) throw new Error('Google Drive service not initialized');
    if (this.syncInProgress) {
      console.log('Sync already in progress.');
      return [];
    }

    this.syncInProgress = true;
    this.emit('syncing');
    console.log('Starting full two-way sync...');

    try {
      // 1. Fetch remote and local data
      const remoteData = await this.driveService.loadData();
      const localEncounters = await storageService.getEncounters();
      
      // 2. Merge data
      const { merged, needsUpload, needsDownload } = this.mergeEncounters(localEncounters, remoteData.encounters);
      
      console.log(`Sync details: Merged: ${merged.length}, To Upload: ${needsUpload.length}, To Download: ${needsDownload.length}`);

     // 3. Sync photos
     await this.syncPhotos(merged, needsDownload);

      // 4. Update local storage with merged data
      await storageService.setEncounters(merged);
      
     // 5. Merge and save preferences
     const localPreferences = await storageService.getPreferences();
     const mergedPreferences = this.mergePreferences(localPreferences, remoteData.preferences);
     await storageService.savePreferences(mergedPreferences);

     // 6. Upload merged data to cloud
     // 6. Upload merged data to cloud, excluding soft-deleted items from the final remote state
     const finalToUpload = merged.filter(e => !e.isDeleted);
     await this.driveService.saveData({ encounters: finalToUpload, preferences: mergedPreferences });

      console.log('Full sync complete');
      this.emit('idle');
      return merged;

    } catch (error) {
      console.error('Full sync failed:', error);
      this.emit('error', (error as Error).message);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  public async restore(): Promise<CatEncounter[]> {
    if (!this.driveService) throw new Error('Google Drive service not initialized');

    this.emit('syncing');
    console.log('Restoring data from Google Drive...');

    try {
      const remoteData = await this.driveService.loadData();
      await storageService.setEncounters(remoteData.encounters);
      await storageService.savePreferences(remoteData.preferences);
      
      console.log('Restore complete');
      this.emit('idle');
      return remoteData.encounters;
    } catch (error) {
      console.error('Restore failed:', error);
      this.emit('error', (error as Error).message);
      throw error;
    }
  }

  public async syncEncounter(): Promise<void> {
    if (this.isAuthenticated()) {
      await this.sync();
    }
  }

  public disconnect(): void {
    this.stopAutoSync();
    this.driveService = null;
    this.syncInProgress = false;
  }

  public async checkForUpdates(): Promise<void> {
    console.log('Checking for updates...');
    if (!this.isAuthenticated()) {
      console.log('Not authenticated, skipping update check');
      return;
    }

    const cloudData = await this.checkCloudData();
    if (cloudData.hasData) {
      console.log('Remote file found, last modified:', cloudData.lastModified);
      // TODO: Implement conflict resolution
    } else {
      console.log('No remote file found.');
    }
  }

  private async syncPhotos(encounters: CatEncounter[], needsDownload: CatEncounter[]): Promise<void> {
    if (!this.driveService) return;

    // Upload photos for encounters that have a local photo but no Drive ID
    for (const encounter of encounters) {
      if (encounter.photoBlobId && !encounter.photoDriveId) {
        try {
          const photoBlob = await storageService.getPhoto(encounter.photoBlobId);
          if (photoBlob) {
            console.log(`Uploading photo for encounter ${encounter.id}...`);
            const photoFile = new File([photoBlob], `${encounter.photoBlobId}.jpg`, { type: photoBlob.type });
            const driveId = await this.driveService.savePhoto(photoFile);
            encounter.photoDriveId = driveId;
            await storageService.saveEncounter(encounter);
          }
        } catch (error) {
          console.error(`Failed to upload photo for encounter ${encounter.id}:`, error);
        }
      }
    }

    // Download photos for encounters that are new to this device
    for (const encounter of needsDownload) {
      if (encounter.photoDriveId) {
        try {
          console.log(`Downloading photo for encounter ${encounter.id}...`);
          const photo = await this.driveService.getPhoto(encounter.photoDriveId);
          const blobId = await storageService.savePhoto(photo);
          encounter.photoBlobId = blobId;
          await storageService.saveEncounter(encounter);
        } catch (error) {
          console.error(`Failed to download photo for encounter ${encounter.id}:`, error);
        }
      }
    }
  }
}

export const syncService = new SyncService();
