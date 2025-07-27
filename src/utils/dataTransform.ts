/**
 * Data transformation helpers for import/export operations
 */

import type { CatEncounter, UserPreferences, SyncMetadata } from '../types';
import { validateCatEncounter } from '../models/CatEncounter';
import { isValidISOTimestamp, getCurrentTimestamp, generateUUID } from './dataUtils';

/**
 * Export data format for JSON backup
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  encounters: CatEncounter[];
  photos: { [photoBlobId: string]: string }; // Base64 encoded
  preferences?: UserPreferences;
  metadata?: SyncMetadata;
}

/**
 * Import validation result
 */
export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validEncounters: CatEncounter[];
  invalidEncounters: Array<{ data: any; errors: string[] }>;
}

/**
 * Transforms encounters to export format
 */
export function transformEncountersForExport(encounters: CatEncounter[]): CatEncounter[] {
  return encounters.map(encounter => ({
    ...encounter,
    // Ensure all required fields are present
    id: encounter.id || generateUUID(),
    createdAt: encounter.createdAt || getCurrentTimestamp(),
    updatedAt: encounter.updatedAt || getCurrentTimestamp()
  }));
}

/**
 * Creates export data structure
 */
export function createExportData(
  encounters: CatEncounter[],
  photos: { [photoBlobId: string]: string } = {},
  preferences?: UserPreferences,
  metadata?: SyncMetadata
): ExportData {
  return {
    version: '1.0.0',
    exportedAt: getCurrentTimestamp(),
    encounters: transformEncountersForExport(encounters),
    photos,
    preferences,
    metadata
  };
}

/**
 * Validates import data structure
 */
export function validateImportData(data: any): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validEncounters: CatEncounter[] = [];
  const invalidEncounters: Array<{ data: any; errors: string[] }> = [];

  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Import data must be a valid JSON object'],
      warnings: [],
      validEncounters: [],
      invalidEncounters: []
    };
  }

  // Check version compatibility
  if (!data.version || typeof data.version !== 'string') {
    warnings.push('No version information found in import data');
  } else if (!isCompatibleVersion(data.version)) {
    warnings.push(`Import data version ${data.version} may not be fully compatible`);
  }

  // Check exportedAt timestamp
  if (!data.exportedAt || !isValidISOTimestamp(data.exportedAt)) {
    warnings.push('Invalid or missing export timestamp');
  }

  // Validate encounters array
  if (!Array.isArray(data.encounters)) {
    errors.push('Encounters data must be an array');
  } else {
    data.encounters.forEach((encounter: any, index: number) => {
      const validation = validateCatEncounter(encounter);
      if (validation.isValid) {
        validEncounters.push(encounter as CatEncounter);
      } else {
        invalidEncounters.push({
          data: encounter,
          errors: validation.errors.map(err => `Encounter ${index + 1}: ${err}`)
        });
      }
    });
  }

  // Validate photos object
  if (data.photos && typeof data.photos !== 'object') {
    warnings.push('Photos data should be an object with photoBlobId keys');
  }

  // Validate preferences
  if (data.preferences && !isValidUserPreferences(data.preferences)) {
    warnings.push('Invalid user preferences data');
  }

  // Validate metadata
  if (data.metadata && !isValidSyncMetadata(data.metadata)) {
    warnings.push('Invalid sync metadata');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validEncounters,
    invalidEncounters
  };
}

/**
 * Transforms import data to internal format
 */
export function transformImportData(data: ExportData): {
  encounters: CatEncounter[];
  photos: { [photoBlobId: string]: string };
  preferences?: UserPreferences;
  metadata?: SyncMetadata;
} {
  const validation = validateImportData(data);
  
  if (!validation.isValid) {
    throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
  }

  return {
    encounters: validation.validEncounters,
    photos: data.photos || {},
    preferences: data.preferences,
    metadata: data.metadata
  };
}

/**
 * Merges two sets of encounter data, resolving conflicts by timestamp
 */
export function mergeEncounterData(
  localEncounters: CatEncounter[],
  importedEncounters: CatEncounter[]
): {
  merged: CatEncounter[];
  conflicts: Array<{ local: CatEncounter; imported: CatEncounter }>;
} {
  const merged: CatEncounter[] = [];
  const conflicts: Array<{ local: CatEncounter; imported: CatEncounter }> = [];
  const localMap = new Map(localEncounters.map(e => [e.id, e]));

  // Add all imported encounters, checking for conflicts
  importedEncounters.forEach(imported => {
    const local = localMap.get(imported.id);
    
    if (!local) {
      // New encounter, add it
      merged.push(imported);
    } else {
      // Conflict detected, resolve by timestamp
      const localUpdated = new Date(local.updatedAt);
      const importedUpdated = new Date(imported.updatedAt);
      
      if (importedUpdated > localUpdated) {
        // Imported is newer, use it
        merged.push(imported);
      } else if (localUpdated > importedUpdated) {
        // Local is newer, keep it
        merged.push(local);
      } else {
        // Same timestamp, flag as conflict
        conflicts.push({ local, imported });
        merged.push(local); // Default to local
      }
      
      // Remove from local map to track processed items
      localMap.delete(imported.id);
    }
  });

  // Add remaining local encounters that weren't in import
  localMap.forEach(encounter => {
    merged.push(encounter);
  });

  return { merged, conflicts };
}

/**
 * Converts Blob to Base64 string for export
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts Base64 string to Blob for import
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Sanitizes encounter data for export
 */
export function sanitizeEncounterForExport(encounter: CatEncounter): CatEncounter {
  return {
    ...encounter,
    comment: encounter.comment?.trim() || undefined,
    behavior: encounter.behavior.trim()
  };
}

/**
 * Checks version compatibility
 */
function isCompatibleVersion(version: string): boolean {
  const supportedVersions = ['1.0.0'];
  return supportedVersions.includes(version);
}

/**
 * Validates user preferences structure
 */
function isValidUserPreferences(preferences: any): preferences is UserPreferences {
  return (
    preferences &&
    typeof preferences === 'object' &&
    Array.isArray(preferences.defaultMapCenter) &&
    preferences.defaultMapCenter.length === 2 &&
    typeof preferences.defaultMapCenter[0] === 'number' &&
    typeof preferences.defaultMapCenter[1] === 'number' &&
    typeof preferences.defaultMapZoom === 'number' &&
    typeof preferences.autoSync === 'boolean' &&
    ['low', 'medium', 'high'].includes(preferences.photoQuality) &&
    ['light', 'dark', 'auto'].includes(preferences.theme)
  );
}

/**
 * Validates sync metadata structure
 */
function isValidSyncMetadata(metadata: any): metadata is SyncMetadata {
  return (
    metadata &&
    typeof metadata === 'object' &&
    typeof metadata.lastSyncTime === 'string' &&
    isValidISOTimestamp(metadata.lastSyncTime) &&
    typeof metadata.cloudDataHash === 'string' &&
    Array.isArray(metadata.pendingChanges) &&
    metadata.pendingChanges.every((id: any) => typeof id === 'string')
  );
}