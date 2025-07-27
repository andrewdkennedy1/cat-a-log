/**
 * Service for synchronizing data with cloud storage
 */

import { storageService } from './StorageService';
import { GoogleDriveService } from './GoogleDriveService';
import type { CatEncounter } from '@/types';

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
        this.syncToCloud().catch(console.error);
      }
    }, 5 * 60 * 1000);
  }

  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public async syncToCloud(): Promise<void> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;
    this.emit('syncing');
    console.log('Starting sync to cloud...');

    try {
      const encounters = await storageService.getEncounters();
      await this.driveService.saveEncounters(encounters);

      console.log('Sync to cloud complete');
      this.emit('idle');
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      this.emit('error', (error as Error).message);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  public async syncFromCloud(): Promise<CatEncounter[]> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return [];
    }

    this.syncInProgress = true;
    this.emit('syncing');
    console.log('Starting sync from cloud...');

    try {
      const encounters = await this.driveService.loadEncounters();
      await storageService.importData(JSON.stringify({ encounters }));
      console.log('Sync from cloud complete');
      this.emit('idle');
      return encounters;
    } catch (error) {
      console.error('Sync from cloud failed:', error);
      this.emit('error', (error as Error).message);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  public async checkCloudData(): Promise<{ lastModified: Date; hasData: boolean }> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      const encounters = await this.driveService.loadEncounters();
      if (encounters.length > 0) {
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

  public async sync(): Promise<void> {
    console.log('Starting full sync...');

    try {
      await this.syncToCloud();
      console.log('Full sync complete');
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  public async restore(): Promise<CatEncounter[]> {
    console.log('Starting restore...');

    try {
      const encounters = await this.syncFromCloud();
      console.log('Restore complete');
      return encounters;
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  public async syncEncounter(): Promise<void> {
    if (!this.driveService || !this.autoSyncEnabled) return;

    try {
      // Get all encounters and sync to cloud
      await this.syncToCloud();
    } catch (error) {
      console.error('Failed to sync encounter:', error);
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
}

export const syncService = new SyncService();
