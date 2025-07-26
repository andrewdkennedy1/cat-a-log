/**
 * Unit tests for data transformation utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  transformEncountersForExport,
  createExportData,
  validateImportData,
  transformImportData,
  mergeEncounterData,
  blobToBase64,
  base64ToBlob,
  sanitizeEncounterForExport
} from '../dataTransform';
import { CatEncounter, UserPreferences, SyncMetadata } from '../../types';
import * as dataUtils from '../dataUtils';

// Mock the dataUtils functions
vi.mock('../dataUtils', () => ({
  generateUUID: vi.fn(() => 'generated-uuid-123'),
  getCurrentTimestamp: vi.fn(() => '2024-01-15T10:30:00.000Z'),
  isValidISOTimestamp: vi.fn((timestamp: string) => {
    // Simple mock that validates basic ISO format
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(timestamp);
  })
}));

describe('Data Transform Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEncounter: CatEncounter = {
    id: 'encounter-1',
    lat: 40.7128,
    lng: -74.0060,
    dateTime: '2024-01-15T10:30:00.000Z',
    catColor: 'Black',
    catType: 'Domestic Shorthair',
    behavior: 'Friendly',
    comment: 'A friendly black cat',
    photoBlobId: 'photo-1',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:15:00.000Z'
  };

  const mockPreferences: UserPreferences = {
    defaultMapCenter: [40.7128, -74.0060],
    defaultMapZoom: 13,
    autoSync: true,
    photoQuality: 'medium',
    theme: 'auto'
  };

  const mockMetadata: SyncMetadata = {
    lastSyncTime: '2024-01-15T10:00:00.000Z',
    cloudDataHash: 'hash123',
    pendingChanges: ['encounter-1']
  };

  describe('transformEncountersForExport', () => {
    it('should transform encounters with all fields present', () => {
      const encounters = [mockEncounter];
      const result = transformEncountersForExport(encounters);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEncounter);
    });

    it('should add missing required fields', () => {
      const incompleteEncounter = {
        ...mockEncounter,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      } as any;

      const result = transformEncountersForExport([incompleteEncounter]);
      
      expect(result[0].id).toBe('generated-uuid-123');
      expect(result[0].createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result[0].updatedAt).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('createExportData', () => {
    it('should create complete export data structure', () => {
      const encounters = [mockEncounter];
      const photos = { 'photo-1': 'base64data' };
      
      const result = createExportData(encounters, photos, mockPreferences, mockMetadata);
      
      expect(result.version).toBe('1.0.0');
      expect(result.exportedAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.encounters).toEqual([mockEncounter]);
      expect(result.photos).toEqual(photos);
      expect(result.preferences).toEqual(mockPreferences);
      expect(result.metadata).toEqual(mockMetadata);
    });

    it('should create minimal export data', () => {
      const encounters = [mockEncounter];
      
      const result = createExportData(encounters);
      
      expect(result.version).toBe('1.0.0');
      expect(result.exportedAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.encounters).toEqual([mockEncounter]);
      expect(result.photos).toEqual({});
      expect(result.preferences).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('validateImportData', () => {
    const validImportData = {
      version: '1.0.0',
      exportedAt: '2024-01-15T10:30:00.000Z',
      encounters: [mockEncounter],
      photos: { 'photo-1': 'base64data' },
      preferences: mockPreferences,
      metadata: mockMetadata
    };

    it('should validate correct import data', () => {
      const result = validateImportData(validImportData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.validEncounters).toEqual([mockEncounter]);
      expect(result.invalidEncounters).toHaveLength(0);
    });

    it('should reject non-object data', () => {
      const result = validateImportData('not an object');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Import data must be a valid JSON object');
    });

    it('should reject data without encounters array', () => {
      const invalidData = { ...validImportData, encounters: 'not an array' };
      const result = validateImportData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Encounters data must be an array');
    });

    it('should handle invalid encounters in array', () => {
      const invalidEncounter = { ...mockEncounter, lat: 'invalid' };
      const dataWithInvalidEncounter = {
        ...validImportData,
        encounters: [mockEncounter, invalidEncounter]
      };
      
      const result = validateImportData(dataWithInvalidEncounter);
      
      expect(result.isValid).toBe(true); // Still valid if some encounters are valid
      expect(result.validEncounters).toHaveLength(1);
      expect(result.invalidEncounters).toHaveLength(1);
      expect(result.invalidEncounters[0].errors[0]).toContain('Encounter 2:');
    });

    it('should warn about missing version', () => {
      const dataWithoutVersion = { ...validImportData };
      delete dataWithoutVersion.version;
      
      const result = validateImportData(dataWithoutVersion);
      
      expect(result.warnings).toContain('No version information found in import data');
    });

    it('should warn about incompatible version', () => {
      const dataWithBadVersion = { ...validImportData, version: '2.0.0' };
      
      const result = validateImportData(dataWithBadVersion);
      
      expect(result.warnings).toContain('Import data version 2.0.0 may not be fully compatible');
    });

    it('should warn about invalid preferences', () => {
      const dataWithBadPreferences = { 
        ...validImportData, 
        preferences: { invalid: 'preferences' }
      };
      
      const result = validateImportData(dataWithBadPreferences);
      
      expect(result.warnings).toContain('Invalid user preferences data');
    });
  });

  describe('transformImportData', () => {
    const validImportData = {
      version: '1.0.0',
      exportedAt: '2024-01-15T10:30:00.000Z',
      encounters: [mockEncounter],
      photos: { 'photo-1': 'base64data' },
      preferences: mockPreferences,
      metadata: mockMetadata
    };

    it('should transform valid import data', () => {
      const result = transformImportData(validImportData);
      
      expect(result.encounters).toEqual([mockEncounter]);
      expect(result.photos).toEqual({ 'photo-1': 'base64data' });
      expect(result.preferences).toEqual(mockPreferences);
      expect(result.metadata).toEqual(mockMetadata);
    });

    it('should throw error for invalid data', () => {
      const invalidData = { encounters: 'not an array' };
      
      expect(() => transformImportData(invalidData as any)).toThrow('Invalid import data:');
    });
  });

  describe('mergeEncounterData', () => {
    const localEncounter: CatEncounter = {
      ...mockEncounter,
      id: 'shared-id',
      behavior: 'Local behavior',
      updatedAt: '2024-01-15T10:00:00.000Z'
    };

    const importedEncounter: CatEncounter = {
      ...mockEncounter,
      id: 'shared-id',
      behavior: 'Imported behavior',
      updatedAt: '2024-01-15T11:00:00.000Z' // Newer
    };

    it('should merge encounters with newer imported data winning', () => {
      const result = mergeEncounterData([localEncounter], [importedEncounter]);
      
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].behavior).toBe('Imported behavior');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should keep local data when it is newer', () => {
      const newerLocal = { ...localEncounter, updatedAt: '2024-01-15T12:00:00.000Z' };
      const result = mergeEncounterData([newerLocal], [importedEncounter]);
      
      expect(result.merged[0].behavior).toBe('Local behavior');
    });

    it('should detect conflicts with same timestamp', () => {
      const sameTimestamp = '2024-01-15T10:00:00.000Z';
      const local = { ...localEncounter, updatedAt: sameTimestamp };
      const imported = { ...importedEncounter, updatedAt: sameTimestamp };
      
      const result = mergeEncounterData([local], [imported]);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].local).toEqual(local);
      expect(result.conflicts[0].imported).toEqual(imported);
    });

    it('should add new encounters from import', () => {
      const newEncounter = { ...mockEncounter, id: 'new-id' };
      const result = mergeEncounterData([localEncounter], [newEncounter]);
      
      expect(result.merged).toHaveLength(2);
      expect(result.merged.some(e => e.id === 'new-id')).toBe(true);
    });

    it('should keep local encounters not in import', () => {
      const localOnly = { ...mockEncounter, id: 'local-only' };
      const result = mergeEncounterData([localOnly], []);
      
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].id).toBe('local-only');
    });
  });

  describe('blobToBase64', () => {
    it('should convert blob to base64 string', async () => {
      const blob = new Blob(['test data'], { type: 'text/plain' });
      const result = await blobToBase64(blob);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('base64ToBlob', () => {
    it('should convert base64 to blob', () => {
      const base64 = 'dGVzdCBkYXRh'; // 'test data' in base64
      const blob = base64ToBlob(base64, 'text/plain');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');
    });

    it('should use default mime type', () => {
      const base64 = 'dGVzdCBkYXRh';
      const blob = base64ToBlob(base64);
      
      expect(blob.type).toBe('image/jpeg');
    });
  });

  describe('sanitizeEncounterForExport', () => {
    it('should sanitize encounter data', () => {
      const dirtyEncounter: CatEncounter = {
        ...mockEncounter,
        comment: '  Dirty comment with extra spaces  ',
        behavior: '  Playful  '
      };

      const result = sanitizeEncounterForExport(dirtyEncounter);
      
      expect(result.comment).toBe('Dirty comment with extra spaces');
      expect(result.behavior).toBe('Playful');
    });

    it('should handle undefined comment', () => {
      const encounterWithoutComment = { ...mockEncounter };
      delete encounterWithoutComment.comment;

      const result = sanitizeEncounterForExport(encounterWithoutComment);
      
      expect(result.comment).toBeUndefined();
    });

    it('should convert empty comment to undefined', () => {
      const encounterWithEmptyComment = { ...mockEncounter, comment: '   ' };

      const result = sanitizeEncounterForExport(encounterWithEmptyComment);
      
      expect(result.comment).toBeUndefined();
    });
  });
});