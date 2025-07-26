/**
 * Service for synchronizing data with cloud storage
 */

import { storageService } from './StorageService';
import { googleDriveService } from './GoogleDriveService';

class SyncService {
  private static instance: SyncService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public async authenticateGoogle(): Promise<boolean> {
    try {
      await googleDriveService.authenticate();
      return true;
    } catch (error) {
      console.error('Google authentication failed:', error);
      return false;
    }
  }

  public isAuthenticated(): boolean {
    return googleDriveService.isAuthenticated();
  }

  public async refreshToken(): Promise<boolean> {
    try {
      await googleDriveService.authenticate();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  public async syncToCloud(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    console.log('Starting sync to cloud...');
    
    try {
      // Export data from storage service
      const data = await storageService.exportData();
      
      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `cat-a-log-backup-${timestamp}.json`;
      
      await googleDriveService.uploadJsonFile(fileName, data);
      
      console.log('Sync to cloud complete');
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      throw error;
    }
  }

  public async syncFromCloud(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    console.log('Starting sync from cloud...');
    
    try {
      const remoteFile = await googleDriveService.getLatestFile();
      
      if (remoteFile) {
        console.log('Restoring from:', remoteFile.name);
        await storageService.importData(remoteFile.content);
        console.log('Sync from cloud complete');
      } else {
        console.log('No backup file found in cloud');
      }
    } catch (error) {
      console.error('Sync from cloud failed:', error);
      throw error;
    }
  }

  public async checkCloudData(): Promise<{ lastModified: Date; hasData: boolean }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const remoteFile = await googleDriveService.getLatestFile();
      
      if (remoteFile) {
        // Parse the backup to get the timestamp
        const backup = JSON.parse(remoteFile.content);
        return {
          lastModified: new Date(backup.exportedAt || new Date()),
          hasData: true
        };
      } else {
        return {
          lastModified: new Date(0),
          hasData: false
        };
      }
    } catch (error) {
      console.error('Failed to check cloud data:', error);
      throw error;
    }
  }

  public async resolveConflicts(localData: any, cloudData: any): Promise<any> {
    // Simple conflict resolution: use the most recent data
    // In a real app, this would be more sophisticated
    const localTime = new Date(localData.exportedAt || 0);
    const cloudTime = new Date(cloudData.exportedAt || 0);
    
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

export const syncService = SyncService.getInstance();
