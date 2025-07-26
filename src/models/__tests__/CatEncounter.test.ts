/**
 * Unit tests for CatEncounter model and validation functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateCatEncounter,
  createCatEncounter,
  updateCatEncounter,
  isValidLatitude,
  isValidLongitude,
  isValidCatColor,
  isValidCatType,
  isValidBehavior,
  CAT_COLORS,
  CAT_TYPES,
  BEHAVIOR_PRESETS
} from '../CatEncounter';
import { CatEncounter } from '../../types';
import * as dataUtils from '../../utils/dataUtils';

// Mock the dataUtils functions
vi.mock('../../utils/dataUtils', () => ({
  generateUUID: vi.fn(() => 'test-uuid-123'),
  getCurrentTimestamp: vi.fn(() => '2024-01-15T10:30:00.000Z')
}));

describe('CatEncounter Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCatEncounter', () => {
    const validEncounter: CatEncounter = {
      id: 'test-uuid-123',
      lat: 40.7128,
      lng: -74.0060,
      dateTime: '2024-01-15T10:30:00.000Z',
      catColor: 'Black',
      catType: 'Domestic Shorthair',
      behavior: 'Friendly',
      comment: 'A friendly black cat',
      photoBlobId: 'photo-123',
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z'
    };

    it('should validate a complete valid encounter', () => {
      const result = validateCatEncounter(validEncounter);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a minimal valid encounter', () => {
      const minimalEncounter: CatEncounter = {
        id: 'test-uuid-123',
        lat: 40.7128,
        lng: -74.0060,
        dateTime: '2024-01-15T10:30:00.000Z',
        catColor: 'Black',
        catType: 'Domestic Shorthair',
        behavior: 'Friendly',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z'
      };

      const result = validateCatEncounter(minimalEncounter);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject encounter with missing required fields', () => {
      const invalidEncounter = {
        lat: 40.7128,
        lng: -74.0060
        // Missing other required fields
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID is required and must be a string');
      expect(result.errors).toContain('DateTime is required and must be a string');
      expect(result.errors).toContain('Cat color is required');
      expect(result.errors).toContain('Cat type is required');
      expect(result.errors).toContain('Behavior is required');
      expect(result.errors).toContain('CreatedAt is required and must be a string');
      expect(result.errors).toContain('UpdatedAt is required and must be a string');
    });

    it('should reject encounter with invalid latitude', () => {
      const invalidEncounter = {
        ...validEncounter,
        lat: 91 // Invalid latitude > 90
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Latitude must be between -90 and 90 degrees');
    });

    it('should reject encounter with invalid longitude', () => {
      const invalidEncounter = {
        ...validEncounter,
        lng: -181 // Invalid longitude < -180
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Longitude must be between -180 and 180 degrees');
    });

    it('should reject encounter with invalid cat color', () => {
      const invalidEncounter = {
        ...validEncounter,
        catColor: 'Purple' // Invalid color
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Cat color must be one of: ${CAT_COLORS.join(', ')}`);
    });

    it('should reject encounter with invalid cat type', () => {
      const invalidEncounter = {
        ...validEncounter,
        catType: 'Robot Cat' // Invalid type
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Cat type must be one of: ${CAT_TYPES.join(', ')}`);
    });

    it('should reject encounter with empty behavior', () => {
      const invalidEncounter = {
        ...validEncounter,
        behavior: '' // Empty behavior
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Behavior cannot be empty');
    });

    it('should reject encounter with invalid ISO timestamp', () => {
      const invalidEncounter = {
        ...validEncounter,
        dateTime: '2024-01-15 10:30:00' // Invalid ISO format
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('DateTime must be a valid ISO-8601 timestamp');
    });

    it('should reject encounter with invalid optional field types', () => {
      const invalidEncounter = {
        ...validEncounter,
        comment: 123, // Should be string
        photoBlobId: true // Should be string
      };

      const result = validateCatEncounter(invalidEncounter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Comment must be a string if provided');
      expect(result.errors).toContain('PhotoBlobId must be a string if provided');
    });
  });

  describe('createCatEncounter', () => {
    it('should create a valid encounter with required fields', () => {
      const encounter = createCatEncounter(
        40.7128,
        -74.0060,
        'Black',
        'Domestic Shorthair',
        'Friendly'
      );

      expect(encounter.id).toBe('test-uuid-123');
      expect(encounter.lat).toBe(40.7128);
      expect(encounter.lng).toBe(-74.0060);
      expect(encounter.catColor).toBe('Black');
      expect(encounter.catType).toBe('Domestic Shorthair');
      expect(encounter.behavior).toBe('Friendly');
      expect(encounter.dateTime).toBe('2024-01-15T10:30:00.000Z');
      expect(encounter.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(encounter.updatedAt).toBe('2024-01-15T10:30:00.000Z');
      expect(encounter.comment).toBeUndefined();
      expect(encounter.photoBlobId).toBeUndefined();
    });

    it('should create encounter with optional fields', () => {
      const encounter = createCatEncounter(
        40.7128,
        -74.0060,
        'Black',
        'Domestic Shorthair',
        'Friendly',
        {
          comment: 'A friendly cat',
          photoBlobId: 'photo-123',
          dateTime: '2024-01-15T12:00:00.000Z'
        }
      );

      expect(encounter.comment).toBe('A friendly cat');
      expect(encounter.photoBlobId).toBe('photo-123');
      expect(encounter.dateTime).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should call generateUUID and getCurrentTimestamp', () => {
      createCatEncounter(40.7128, -74.0060, 'Black', 'Domestic Shorthair', 'Friendly');

      expect(dataUtils.generateUUID).toHaveBeenCalledOnce();
      expect(dataUtils.getCurrentTimestamp).toHaveBeenCalledTimes(2); // createdAt and updatedAt
    });
  });

  describe('updateCatEncounter', () => {
    const existingEncounter: CatEncounter = {
      id: 'existing-id',
      lat: 40.7128,
      lng: -74.0060,
      dateTime: '2024-01-15T10:30:00.000Z',
      catColor: 'Black',
      catType: 'Domestic Shorthair',
      behavior: 'Friendly',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z'
    };

    it('should update encounter with new values', () => {
      const updated = updateCatEncounter(existingEncounter, {
        behavior: 'Playful',
        comment: 'Now playing'
      });

      expect(updated.id).toBe('existing-id'); // Should not change
      expect(updated.createdAt).toBe('2024-01-15T10:00:00.000Z'); // Should not change
      expect(updated.behavior).toBe('Playful');
      expect(updated.comment).toBe('Now playing');
      expect(updated.updatedAt).toBe('2024-01-15T10:30:00.000Z'); // Should be updated
    });

    it('should not allow updating id or createdAt', () => {
      const updated = updateCatEncounter(existingEncounter, {
        // These should be ignored by TypeScript, but test runtime behavior
        behavior: 'Sleepy'
      } as any);

      expect(updated.id).toBe('existing-id');
      expect(updated.createdAt).toBe('2024-01-15T10:00:00.000Z');
      expect(updated.behavior).toBe('Sleepy');
    });
  });

  describe('validation helper functions', () => {
    describe('isValidLatitude', () => {
      it('should validate correct latitudes', () => {
        expect(isValidLatitude(0)).toBe(true);
        expect(isValidLatitude(90)).toBe(true);
        expect(isValidLatitude(-90)).toBe(true);
        expect(isValidLatitude(45.5)).toBe(true);
      });

      it('should reject invalid latitudes', () => {
        expect(isValidLatitude(91)).toBe(false);
        expect(isValidLatitude(-91)).toBe(false);
        expect(isValidLatitude(NaN)).toBe(false);
        expect(isValidLatitude('40' as any)).toBe(false);
      });
    });

    describe('isValidLongitude', () => {
      it('should validate correct longitudes', () => {
        expect(isValidLongitude(0)).toBe(true);
        expect(isValidLongitude(180)).toBe(true);
        expect(isValidLongitude(-180)).toBe(true);
        expect(isValidLongitude(-74.006)).toBe(true);
      });

      it('should reject invalid longitudes', () => {
        expect(isValidLongitude(181)).toBe(false);
        expect(isValidLongitude(-181)).toBe(false);
        expect(isValidLongitude(NaN)).toBe(false);
        expect(isValidLongitude('-74' as any)).toBe(false);
      });
    });

    describe('isValidCatColor', () => {
      it('should validate predefined cat colors', () => {
        expect(isValidCatColor('Black')).toBe(true);
        expect(isValidCatColor('White')).toBe(true);
        expect(isValidCatColor('Orange/Ginger')).toBe(true);
        expect(isValidCatColor('Mixed/Other')).toBe(true);
      });

      it('should reject invalid cat colors', () => {
        expect(isValidCatColor('Purple')).toBe(false);
        expect(isValidCatColor('black')).toBe(false); // Case sensitive
        expect(isValidCatColor('')).toBe(false);
      });
    });

    describe('isValidCatType', () => {
      it('should validate predefined cat types', () => {
        expect(isValidCatType('Domestic Shorthair')).toBe(true);
        expect(isValidCatType('Stray')).toBe(true);
        expect(isValidCatType('Kitten')).toBe(true);
        expect(isValidCatType('Unknown')).toBe(true);
      });

      it('should reject invalid cat types', () => {
        expect(isValidCatType('Robot Cat')).toBe(false);
        expect(isValidCatType('domestic shorthair')).toBe(false); // Case sensitive
        expect(isValidCatType('')).toBe(false);
      });
    });

    describe('isValidBehavior', () => {
      it('should validate non-empty behavior strings', () => {
        expect(isValidBehavior('Friendly')).toBe(true);
        expect(isValidBehavior('Custom behavior')).toBe(true);
        expect(isValidBehavior('  Playful  ')).toBe(true); // Trimmed
      });

      it('should reject invalid behaviors', () => {
        expect(isValidBehavior('')).toBe(false);
        expect(isValidBehavior('   ')).toBe(false); // Only whitespace
        expect(isValidBehavior(123 as any)).toBe(false);
      });
    });
  });

  describe('constants', () => {
    it('should have correct cat colors', () => {
      expect(CAT_COLORS).toContain('Black');
      expect(CAT_COLORS).toContain('White');
      expect(CAT_COLORS).toContain('Orange/Ginger');
      expect(CAT_COLORS).toContain('Mixed/Other');
      expect(CAT_COLORS.length).toBeGreaterThan(5);
    });

    it('should have correct cat types', () => {
      expect(CAT_TYPES).toContain('Domestic Shorthair');
      expect(CAT_TYPES).toContain('Stray');
      expect(CAT_TYPES).toContain('Kitten');
      expect(CAT_TYPES).toContain('Unknown');
      expect(CAT_TYPES.length).toBeGreaterThan(5);
    });

    it('should have correct behavior presets', () => {
      expect(BEHAVIOR_PRESETS).toContain('Friendly');
      expect(BEHAVIOR_PRESETS).toContain('Playful');
      expect(BEHAVIOR_PRESETS).toContain('Shy');
      expect(BEHAVIOR_PRESETS).toContain('Custom...');
      expect(BEHAVIOR_PRESETS.length).toBe(7);
    });
  });
});