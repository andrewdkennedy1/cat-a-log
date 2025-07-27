/**
 * Service for synchronizing data with cloud storage
 */

import { storageService } from './StorageService';
import { GoogleDriveService } from './GoogleDriveService';

class SyncService {
  private driveService: GoogleDriveService | null = null;

  public setDriveService(driveService: GoogleDriveService) {
    this.driveService = driveService;
  }

  public isAuthenticated(): boolean {
    return !!this.driveService;
  }

  public async syncToCloud(): Promise<void> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    console.log('Starting sync to cloud...');
    
    try {
      const encounters = await storageService.getEncounters();
      await this.driveService.saveEncounters(encounters);
      
      console.log('Sync to cloud complete');
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      throw error;
    }
  }

  public async syncFromCloud(): Promise<void> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    console.log('Starting sync from cloud...');
    
    try {
      const encounters = await this.driveService.loadEncounters();
      await storageService.importData(JSON.stringify({ encounters }));
      console.log('Sync from cloud complete');
    } catch (error) {
      console.error('Sync from cloud failed:', error);
      throw error;
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

  public async restore(): Promise<void> {
    console.log('Starting restore...');
    
    try {
      await this.syncFromCloud();
      console.log('Restore complete');
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
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
