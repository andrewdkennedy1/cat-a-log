/**
 * Unit tests for data utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateUUID,
  getCurrentTimestamp,
  dateToISOString,
  parseISOString,
  isValidUUID,
  isValidISOTimestamp,
  formatTimestamp,
  getTimeDifference,
  isWithinTimeRange,
  sanitizeString,
  truncateString,
  validateCoordinates
} from '../dataUtils';

describe('Data Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should use crypto.randomUUID when available', () => {
      const mockRandomUUID = vi.fn(() => 'crypto-uuid-123');
      const originalRandomUUID = global.crypto?.randomUUID;
      
      // Mock the randomUUID method
      Object.defineProperty(global.crypto, 'randomUUID', {
        value: mockRandomUUID,
        configurable: true
      });

      const uuid = generateUUID();
      expect(uuid).toBe('crypto-uuid-123');
      expect(mockRandomUUID).toHaveBeenCalledOnce();

      // Restore original
      if (originalRandomUUID) {
        Object.defineProperty(global.crypto, 'randomUUID', {
          value: originalRandomUUID,
          configurable: true
        });
      } else {
        delete (global.crypto as any).randomUUID;
      }
    });

    it('should fallback to manual generation when crypto.randomUUID is not available', () => {
      const originalRandomUUID = global.crypto?.randomUUID;
      
      // Remove randomUUID temporarily
      delete (global.crypto as any).randomUUID;

      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      // Restore original
      if (originalRandomUUID) {
        Object.defineProperty(global.crypto, 'randomUUID', {
          value: originalRandomUUID,
          configurable: true
        });
      }
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return a valid ISO-8601 timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should return current time', () => {
      const before = Date.now();
      const timestamp = getCurrentTimestamp();
      const after = Date.now();
      
      const timestampMs = new Date(timestamp).getTime();
      expect(timestampMs).toBeGreaterThanOrEqual(before);
      expect(timestampMs).toBeLessThanOrEqual(after);
    });
  });

  describe('dateToISOString', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const isoString = dateToISOString(date);
      expect(isoString).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('parseISOString', () => {
    it('should parse valid ISO string to Date', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const date = parseISOString(isoString);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe(isoString);
    });

    it('should throw error for invalid ISO string', () => {
      expect(() => parseISOString('invalid-date')).toThrow('Invalid ISO string: invalid-date');
      expect(() => parseISOString('not-a-date-at-all')).toThrow();
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUID v4 format', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false); // v1
      expect(isValidUUID('6ba7b811-9dad-21d1-80b4-00c04fd430c8')).toBe(false); // v2
      expect(isValidUUID('6ba7b812-9dad-31d1-80b4-00c04fd430c8')).toBe(false); // v3
      expect(isValidUUID('6ba7b814-9dad-41d1-80b4-00c04fd430c8')).toBe(true);  // v4
    });

    it('should reject invalid UUID formats', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false); // Too short
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false); // Too long
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidISOTimestamp', () => {
    it('should validate correct ISO-8601 timestamps', () => {
      expect(isValidISOTimestamp('2024-01-15T10:30:00.000Z')).toBe(true);
      expect(isValidISOTimestamp('2024-01-15T10:30:00.123Z')).toBe(true);
      // Note: '2024-01-15T10:30:00Z' becomes '2024-01-15T10:30:00.000Z' when parsed and converted back
      const dateWithoutMs = new Date('2024-01-15T10:30:00Z').toISOString();
      expect(isValidISOTimestamp(dateWithoutMs)).toBe(true);
    });

    it('should reject invalid timestamp formats', () => {
      expect(isValidISOTimestamp('2024-01-15 10:30:00')).toBe(false);
      expect(isValidISOTimestamp('2024/01/15T10:30:00Z')).toBe(false);
      expect(isValidISOTimestamp('invalid-date')).toBe(false);
      expect(isValidISOTimestamp('')).toBe(false);
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp for display', () => {
      const timestamp = '2024-01-15T10:30:00.000Z';
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should handle custom format options', () => {
      const timestamp = '2024-01-15T10:30:00.000Z';
      const formatted = formatTimestamp(timestamp, { 
        year: '2-digit',
        month: 'numeric',
        day: 'numeric'
      });
      expect(formatted).toContain('24');
      expect(formatted).toContain('1');
      expect(formatted).toContain('15');
    });

    it('should return "Invalid Date" for invalid timestamps', () => {
      expect(formatTimestamp('invalid-date')).toBe('Invalid Date');
    });
  });

  describe('getTimeDifference', () => {
    it('should calculate time difference in milliseconds', () => {
      const timestamp1 = '2024-01-15T10:30:00.000Z';
      const timestamp2 = '2024-01-15T10:35:00.000Z';
      const diff = getTimeDifference(timestamp1, timestamp2);
      expect(diff).toBe(5 * 60 * 1000); // 5 minutes in ms
    });

    it('should return absolute difference', () => {
      const timestamp1 = '2024-01-15T10:35:00.000Z';
      const timestamp2 = '2024-01-15T10:30:00.000Z';
      const diff = getTimeDifference(timestamp1, timestamp2);
      expect(diff).toBe(5 * 60 * 1000); // 5 minutes in ms
    });

    it('should return 0 for invalid timestamps', () => {
      expect(getTimeDifference('invalid', '2024-01-15T10:30:00.000Z')).toBe(0);
      expect(getTimeDifference('2024-01-15T10:30:00.000Z', 'invalid')).toBe(0);
    });
  });

  describe('isWithinTimeRange', () => {
    it('should check if timestamp is within range', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      expect(isWithinTimeRange(fiveMinutesAgo.toISOString(), 6 * 60 * 1000)).toBe(true);
      expect(isWithinTimeRange(tenMinutesAgo.toISOString(), 6 * 60 * 1000)).toBe(false);
    });

    it('should return false for invalid timestamps', () => {
      expect(isWithinTimeRange('invalid-date', 1000)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim and normalize whitespace', () => {
      expect(sanitizeString('  hello   world  ')).toBe('hello world');
      expect(sanitizeString('hello\n\nworld')).toBe('hello world');
      expect(sanitizeString('hello\t\tworld')).toBe('hello world');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings with ellipsis', () => {
      expect(truncateString('Hello, World!', 10)).toBe('Hello, ...');
      expect(truncateString('Short', 10)).toBe('Short');
      expect(truncateString('Exactly10!', 10)).toBe('Exactly10!');
    });

    it('should handle edge cases', () => {
      expect(truncateString('', 5)).toBe('');
      expect(truncateString('Hi', 3)).toBe('Hi');
      expect(truncateString('Hi', 2)).toBe('Hi');
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      const result = validateCoordinates(40.7128, -74.0060);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate boundary coordinates', () => {
      expect(validateCoordinates(90, 180).isValid).toBe(true);
      expect(validateCoordinates(-90, -180).isValid).toBe(true);
      expect(validateCoordinates(0, 0).isValid).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const result = validateCoordinates(91, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90 degrees');
    });

    it('should reject invalid longitude', () => {
      const result = validateCoordinates(0, 181);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180 degrees');
    });

    it('should reject non-numeric coordinates', () => {
      const result1 = validateCoordinates(NaN, 0);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Latitude must be a valid number');

      const result2 = validateCoordinates(0, NaN);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Longitude must be a valid number');
    });
  });
});