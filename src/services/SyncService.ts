/**
 * Service for synchronizing data with a cloud provider
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

  public async sync(): Promise<void> {
    console.log('Syncing data...');
    await googleDriveService.authenticate();
    const data = await storageService.exportData();
    await googleDriveService.uploadJsonFile('cat-a-log-backup.json', data);
    console.log('Sync complete.');
  }

  public async checkForUpdates(): Promise<void> {
    console.log('Checking for updates...');
    await googleDriveService.authenticate();
    const remoteFile = await googleDriveService.getLatestFile();
    if (remoteFile) {
      console.log('Remote file found:', remoteFile.name);
      // TODO: Implement conflict resolution
    } else {
      console.log('No remote file found.');
    }
  }
}

export const syncService = SyncService.getInstance();
