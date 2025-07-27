/**
 * Core TypeScript interfaces for CAT-a-log application
 */

// Primary encounter record
export interface CatEncounter {
  id: string;              // UUID v4
  lat: number;             // Latitude coordinate
  lng: number;             // Longitude coordinate
  dateTime: string;        // ISO-8601 timestamp
  catColor: string;        // Standardized color value
  coatLength?: string;     // Standardized coat length value (optional for backward compatibility)
  catType: string;         // Standardized type value
  behavior: string;        // Preset or custom behavior
  comment?: string;        // Optional user comment
  photoBlobId?: string;    // Reference to photo in IndexedDB
  createdAt: string;       // ISO-8601 creation timestamp
  updatedAt: string;       // ISO-8601 last update timestamp
}

// Behavior preset configuration
export interface BehaviorPreset {
  id: string;
  label: string;
  isDefault: boolean;
}

// User preferences and settings
export interface UserPreferences {
  defaultMapCenter: [number, number];
  defaultMapZoom: number;
  autoSync: boolean;
  photoQuality: 'low' | 'medium' | 'high';
  theme: 'light' | 'dark' | 'auto';
  customCatColors: string[];
  customCoatLengths: string[];
  customCatTypes: string[];
  customBehaviors: string[];
}

// Sync metadata for conflict resolution
export interface SyncMetadata {
  lastSyncTime: string;
  cloudDataHash: string;
  pendingChanges: string[]; // Array of encounter IDs
}

// IndexedDB schema interfaces
export interface DatabaseSchema {
  encounters: {
    key: string; // encounter.id
    value: CatEncounter;
    indexes: {
      dateTime: string;
      catColor: string;
      catType: string;
    };
  };
  
  photos: {
    key: string; // photoBlobId
    value: Blob;
  };
  
  metadata: {
    key: string; // setting name
    value: unknown;   // setting value
  };
}

// Google Drive data format
export interface CloudBackup {
  version: string;
  exportedAt: string;
  encounters: CatEncounter[];
  photos: { [photoBlobId: string]: string }; // Base64 encoded
  preferences: UserPreferences;
  metadata: SyncMetadata;
}

import { GoogleDriveService } from '@/services/GoogleDriveService';

// Application state interfaces
export interface UserState {
  isAuthenticated: boolean;
  googleToken?: string;
  preferences: UserPreferences;
  googleDriveService?: GoogleDriveService;
  googleDriveStatus: 'uninitialized' | 'initializing' | 'initialized' | 'error';
}

export interface AppState {
  encounters: CatEncounter[];
  user: UserState;
  ui: {
    selectedEncounter?: string;
    mapCenter: [number, number];
    mapZoom: number;
    isFormOpen: boolean;
    syncStatus: 'idle' | 'syncing' | 'error';
    isOnline: boolean;
    showOfflineMessage: boolean;
  };
}

// Component prop interfaces
export interface MapProps {
  encounters: CatEncounter[];
  onLocationSelect: (lat: number, lng: number) => void;
  onEncounterSelect: (encounter: CatEncounter) => void;
  center?: [number, number];
  zoom?: number;
}

export interface EncounterFormProps {
  isOpen: boolean;
  initialData?: Partial<CatEncounter>;
  location?: { lat: number; lng: number };
  onSave: (encounter: CatEncounter) => void;
  onCancel: () => void;
}

// Service interfaces
export interface StorageService {
  // Encounter Management
  saveEncounter(encounter: CatEncounter): Promise<void>;
  getEncounters(): Promise<CatEncounter[]>;
  updateEncounter(id: string, updates: Partial<CatEncounter>): Promise<void>;
  deleteEncounter(id: string): Promise<void>;
  
  // Photo Management
  savePhoto(blob: Blob): Promise<string>; // returns photoBlobId
  getPhoto(photoBlobId: string): Promise<Blob | null>;
  deletePhoto(photoBlobId: string): Promise<void>;
  
  // Data Export/Import
  exportData(): Promise<string>; // JSON string
  importData(jsonData: string): Promise<void>;
  
  // Storage Management
  getStorageUsage(): Promise<{ used: number; quota: number }>;
  clearStorage(): Promise<void>;
}

export interface SyncService {
  // Authentication
  authenticateGoogle(): Promise<boolean>;
  isAuthenticated(): boolean;
  refreshToken(): Promise<boolean>;
  
  // Data Synchronization
  syncToCloud(): Promise<void>;
  syncFromCloud(): Promise<void>;
  checkCloudData(): Promise<{ lastModified: Date; hasData: boolean }>;
  
  // Conflict Resolution
  resolveConflicts(localData: unknown, cloudData: unknown): Promise<unknown>;
}

// Error handling interfaces
export interface StorageError extends Error {
  type: 'quota_exceeded' | 'unavailable' | 'corruption';
}

export interface NetworkError extends Error {
  type: 'offline' | 'rate_limit' | 'auth_failure';
}

export interface DataConflict {
  field: string;
  localValue: unknown;
  cloudValue: unknown;
  timestamp: string;
}

export interface Resolution {
  action: 'use_local' | 'use_cloud' | 'merge';
  mergedValue?: unknown;
}

export interface ErrorHandler {
  handleStorageError(error: StorageError): void;
  handleNetworkError(error: NetworkError): void;
  handleSyncConflict(conflict: DataConflict): Promise<Resolution>;
  showUserMessage(message: string, type: 'info' | 'warning' | 'error'): void;
}