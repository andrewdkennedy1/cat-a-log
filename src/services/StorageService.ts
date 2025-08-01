/**
 * IndexedDB Storage Service for CAT-a-log
 * Handles all local data persistence including encounters, photos, and metadata
 */

import { openDB, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { 
  CatEncounter, 
  StorageService as IStorageService, 
  UserPreferences, 
  SyncMetadata,
  CloudBackup 
} from '../types';

const DB_NAME = 'cat-a-log-db';
const DB_VERSION = 1;

// Store names
const ENCOUNTERS_STORE = 'encounters';
const PHOTOS_STORE = 'photos';
const METADATA_STORE = 'metadata';

// Metadata keys
const PREFERENCES_KEY = 'preferences';
const SYNC_METADATA_KEY = 'syncMetadata';

export class StorageService implements IStorageService {
  private db: IDBPDatabase | null = null;

  /**
   * Initialize the IndexedDB database with proper schema
   */
  private async initDB(): Promise<IDBPDatabase> {
    if (this.db) {
      return this.db;
    }

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Encounters store with indexes
        if (!db.objectStoreNames.contains(ENCOUNTERS_STORE)) {
          const encountersStore = db.createObjectStore(ENCOUNTERS_STORE, {
            keyPath: 'id'
          });
          encountersStore.createIndex('dateTime', 'dateTime');
          encountersStore.createIndex('catColor', 'catColor');
          encountersStore.createIndex('catType', 'catType');
        }

        // Photos store
        if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
          db.createObjectStore(PHOTOS_STORE);
        }

        // Metadata store for preferences and sync data
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE);
        }
      }
    });

    return this.db;
  }

  // Encounter Management Methods

  /**
   * Save a new encounter or update existing one
   */
  async saveEncounter(encounter: CatEncounter): Promise<void> {
    const db = await this.initDB();
    const now = new Date().toISOString();
    
    const encounterToSave = {
      ...encounter,
      updatedAt: now,
      createdAt: encounter.createdAt || now
    };

    await db.put(ENCOUNTERS_STORE, encounterToSave);
    console.log('StorageService: Saved encounter:', encounterToSave);
  }

  /**
   * Retrieve all encounters, sorted by date (newest first)
   */
  async getEncounters(): Promise<CatEncounter[]> {
    const db = await this.initDB();
    const encounters = await db.getAll(ENCOUNTERS_STORE);
    const activeEncounters = encounters.filter(e => !e.isDeleted);
    console.log('StorageService: Retrieved encounters:', JSON.stringify(activeEncounters, null, 2));
    
    // Sort by dateTime descending (newest first)
    return activeEncounters.sort((a, b) =>
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );
  }

  async setEncounters(encounters: CatEncounter[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction(ENCOUNTERS_STORE, 'readwrite');
    await tx.store.clear();
    for (const encounter of encounters) {
      await tx.store.add(encounter);
    }
    await tx.done;
  }

  /**
   * Update specific fields of an encounter
   */
  async updateEncounter(id: string, updates: Partial<CatEncounter>): Promise<void> {
    const db = await this.initDB();
    const existing = await db.get(ENCOUNTERS_STORE, id);
    
    if (!existing) {
      throw new Error(`Encounter with id ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString()
    };

    await db.put(ENCOUNTERS_STORE, updated);
  }

  /**
   * Delete an encounter and its associated photo if any
   */
  async deleteEncounter(id: string): Promise<void> {
    const db = await this.initDB();
    const encounter = await db.get(ENCOUNTERS_STORE, id);
    
    if (encounter) {
      encounter.isDeleted = true;
      encounter.updatedAt = new Date().toISOString();
      await db.put(ENCOUNTERS_STORE, encounter);
    }
  }

  // Photo Management Methods

  /**
   * Save a photo blob and return its unique ID
   */
  async savePhoto(blob: Blob): Promise<string> {
    const db = await this.initDB();
    const photoBlobId = uuidv4();
    
    await db.put(PHOTOS_STORE, blob, photoBlobId);
    
    return photoBlobId;
  }

  /**
   * Retrieve a photo blob by its ID
   */
  async getPhoto(photoBlobId: string): Promise<Blob | null> {
    const db = await this.initDB();
    const blob = await db.get(PHOTOS_STORE, photoBlobId);
    return blob || null;
  }

  /**
   * Delete a photo by its ID
   */
  async deletePhoto(photoBlobId: string): Promise<void> {
    const db = await this.initDB();
    await db.delete(PHOTOS_STORE, photoBlobId);
  }

  // Data Export/Import Methods

  /**
   * Export all data as JSON string for backup
   */
  async exportData(): Promise<string> {
    const db = await this.initDB();
    
    // Get all encounters
    const encounters = await this.getEncounters();
    
    // Get all photos and convert to base64
    const photos: { [photoBlobId: string]: string } = {};
    const photoKeys = await db.getAllKeys(PHOTOS_STORE);
    
    for (const key of photoKeys) {
      const blob = await db.get(PHOTOS_STORE, key);
      if (blob) {
        const base64 = await this.blobToBase64(blob);
        photos[key as string] = base64;
      }
    }
    
    // Get preferences and metadata
    const preferences = await this.getPreferences();
    const metadata = await this.getSyncMetadata();
    
    const backup: CloudBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      encounters,
      photos,
      preferences,
      metadata
    };
    
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import data from JSON string
   */
  async importData(jsonData: string): Promise<void> {
    let backup: CloudBackup;
    
    try {
      backup = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON format');
    }
    
    // Validate backup structure
    if (!backup.encounters || !Array.isArray(backup.encounters)) {
      throw new Error('Invalid backup format: missing encounters array');
    }
    
    const db = await this.initDB();
    const tx = db.transaction([ENCOUNTERS_STORE, PHOTOS_STORE, METADATA_STORE], 'readwrite');
    
    try {
      // Import encounters with conflict resolution (timestamp-based)
      for (const encounter of backup.encounters) {
        const existing = await tx.objectStore(ENCOUNTERS_STORE).get(encounter.id);
        
        if (!existing || new Date(encounter.updatedAt) >= new Date(existing.updatedAt)) {
          await tx.objectStore(ENCOUNTERS_STORE).put(encounter);
        }
      }
      
      // Import photos
      if (backup.photos) {
        for (const [photoBlobId, base64Data] of Object.entries(backup.photos)) {
          const blob = await this.base64ToBlob(base64Data);
          await tx.objectStore(PHOTOS_STORE).put(blob, photoBlobId);
        }
      }
      
      // Import preferences if provided
      if (backup.preferences) {
        await tx.objectStore(METADATA_STORE).put(backup.preferences, PREFERENCES_KEY);
      }
      
      // Import sync metadata if provided
      if (backup.metadata) {
        await tx.objectStore(METADATA_STORE).put(backup.metadata, SYNC_METADATA_KEY);
      }
      
      await tx.done;
    } catch (error) {
      tx.abort();
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Storage Management Methods

  /**
   * Get current storage usage information
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    
    // Fallback for browsers without storage API
    return { used: 0, quota: 0 };
  }

  /**
   * Clear all stored data
   */
  async clearStorage(): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction([ENCOUNTERS_STORE, PHOTOS_STORE, METADATA_STORE], 'readwrite');
    
    await Promise.all([
      tx.objectStore(ENCOUNTERS_STORE).clear(),
      tx.objectStore(PHOTOS_STORE).clear(),
      tx.objectStore(METADATA_STORE).clear()
    ]);
    
    await tx.done;
  }

  // Utility Methods for Preferences and Metadata

  /**
   * Get user preferences with defaults
   */
  async getPreferences(): Promise<UserPreferences> {
    const db = await this.initDB();
    const stored = await db.get(METADATA_STORE, PREFERENCES_KEY);
    
    const defaults: UserPreferences = {
      defaultMapCenter: [40.7128, -74.0060], // New York City
      defaultMapZoom: 13,
      autoSync: true,
      photoQuality: 'medium',
      theme: 'auto',
      customCatColors: [],
      customCoatLengths: [],
      customCatTypes: [],
      customBehaviors: []
    };
    
    return { ...defaults, ...stored };
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: UserPreferences): Promise<void> {
    const db = await this.initDB();
    await db.put(METADATA_STORE, preferences, PREFERENCES_KEY);
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(): Promise<SyncMetadata> {
    const db = await this.initDB();
    const stored = await db.get(METADATA_STORE, SYNC_METADATA_KEY);
    
    const defaults: SyncMetadata = {
      lastSyncTime: new Date(0).toISOString(),
      cloudDataHash: '',
      pendingChanges: []
    };
    
    return { ...defaults, ...stored };
  }

  /**
   * Save sync metadata
   */
  async saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
    const db = await this.initDB();
    await db.put(METADATA_STORE, metadata, SYNC_METADATA_KEY);
  }

  /**
   * Get custom options for a specific field
   */
  async getCustomOptions(field: 'catColor' | 'coatLength' | 'catType' | 'behavior'): Promise<string[]> {
    const preferences = await this.getPreferences();
    switch (field) {
      case 'catColor':
        return preferences.customCatColors || [];
      case 'coatLength':
        return preferences.customCoatLengths || [];
      case 'catType':
        return preferences.customCatTypes || [];
      case 'behavior':
        return preferences.customBehaviors || [];
      default:
        return [];
    }
  }

  /**
   * Add a new custom option for a specific field
   */
  async addCustomOption(field: 'catColor' | 'coatLength' | 'catType' | 'behavior', value: string): Promise<void> {
    const preferences = await this.getPreferences();
    let updated = false;

    switch (field) {
      case 'catColor':
        if (!preferences.customCatColors.includes(value)) {
          preferences.customCatColors.push(value);
          updated = true;
        }
        break;
      case 'coatLength':
        if (!preferences.customCoatLengths.includes(value)) {
          preferences.customCoatLengths.push(value);
          updated = true;
        }
        break;
      case 'catType':
        if (!preferences.customCatTypes.includes(value)) {
          preferences.customCatTypes.push(value);
          updated = true;
        }
        break;
      case 'behavior':
        if (!preferences.customBehaviors.includes(value)) {
          preferences.customBehaviors.push(value);
          updated = true;
        }
        break;
    }

    if (updated) {
      await this.savePreferences(preferences);
    }
  }

  /**
   * Update a custom option for a specific field
   */
  async updateCustomOption(field: 'catColor' | 'coatLength' | 'catType' | 'behavior', oldValue: string, newValue: string): Promise<void> {
    const preferences = await this.getPreferences();
    let updated = false;

    const updateField = (arr: string[]) => {
      const index = arr.indexOf(oldValue);
      if (index > -1) {
        arr[index] = newValue;
        updated = true;
      }
      return arr;
    };

    switch (field) {
      case 'catColor':
        preferences.customCatColors = updateField(preferences.customCatColors);
        break;
      case 'coatLength':
        preferences.customCoatLengths = updateField(preferences.customCoatLengths);
        break;
      case 'catType':
        preferences.customCatTypes = updateField(preferences.customCatTypes);
        break;
      case 'behavior':
        preferences.customBehaviors = updateField(preferences.customBehaviors);
        break;
    }

    if (updated) {
      await this.savePreferences(preferences);
    }
  }

  /**
   * Delete a custom option for a specific field
   */
  async deleteCustomOption(field: 'catColor' | 'coatLength' | 'catType' | 'behavior', value: string): Promise<void> {
    const preferences = await this.getPreferences();
    let updated = false;

    const deleteField = (arr: string[]) => {
      const index = arr.indexOf(value);
      if (index > -1) {
        arr.splice(index, 1);
        updated = true;
      }
      return arr;
    };

    switch (field) {
      case 'catColor':
        preferences.customCatColors = deleteField(preferences.customCatColors);
        break;
      case 'coatLength':
        preferences.customCoatLengths = deleteField(preferences.customCoatLengths);
        break;
      case 'catType':
        preferences.customCatTypes = deleteField(preferences.customCatTypes);
        break;
      case 'behavior':
        preferences.customBehaviors = deleteField(preferences.customBehaviors);
        break;
    }

    if (updated) {
      await this.savePreferences(preferences);
    }
  }

  // Helper Methods

  /**
   * Convert Blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 string to Blob
   */
  private async base64ToBlob(base64: string): Promise<Blob> {
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    return response.blob();
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();