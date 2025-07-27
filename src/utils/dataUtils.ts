/**
 * Utility functions for data generation and manipulation
 */

/**
 * Generates a UUID v4 string
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gets the current timestamp as an ISO-8601 string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Converts a Date object to ISO-8601 string
 */
export function dateToISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parses an ISO-8601 string to a Date object
 */
export function parseISOString(isoString: string): Date {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO string: ${isoString}`);
  }
  return date;
}

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates if a string is a valid ISO-8601 timestamp
 */
export function isValidISOTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString() === timestamp;
  } catch {
    return false;
  }
}

/**
 * Formats a timestamp for display
 */
export function formatTimestamp(timestamp: string, options: Intl.DateTimeFormatOptions = {}): string {
  try {
    const date = parseISOString(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Gets the time difference between two timestamps in milliseconds
 */
export function getTimeDifference(timestamp1: string, timestamp2: string): number {
  try {
    const date1 = parseISOString(timestamp1);
    const date2 = parseISOString(timestamp2);
    return Math.abs(date1.getTime() - date2.getTime());
  } catch {
    return 0;
  }
}

/**
 * Checks if a timestamp is within a certain time range from now
 */
export function isWithinTimeRange(timestamp: string, rangeMs: number): boolean {
  try {
    const date = parseISOString(timestamp);
    const now = new Date();
    const diff = Math.abs(now.getTime() - date.getTime());
    return diff <= rangeMs;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a string for safe storage and display
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Truncates a string to a maximum length with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Validates coordinate bounds
 */
export function validateCoordinates(lat: number, lng: number): { isValid: boolean; error?: string } {
  if (typeof lat !== 'number' || isNaN(lat)) {
    return { isValid: false, error: 'Latitude must be a valid number' };
  }
  
  if (typeof lng !== 'number' || isNaN(lng)) {
    return { isValid: false, error: 'Longitude must be a valid number' };
  }
  
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }
  
  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }
  
  return { isValid: true };
}