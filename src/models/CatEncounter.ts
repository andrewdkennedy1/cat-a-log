/**
 * CatEncounter data model with validation functions
 */

import type { CatEncounter } from '../types';
import { generateUUID, getCurrentTimestamp } from '../utils/dataUtils';

// Standardized cat colors
export const CAT_COLORS = [
  'Black',
  'White',
  'Gray',
  'Orange/Ginger',
  'Brown/Tabby',
  'Calico',
  'Tortoiseshell',
  'Siamese',
  'Tuxedo',
  'Mixed/Other'
] as const;

// Standardized cat types
export const CAT_TYPES = [
  'Domestic Shorthair',
  'Domestic Longhair',
  'Stray',
  'Feral',
  'Pet (Outdoor)',
  'Kitten',
  'Unknown'
] as const;

// Behavior presets
export const BEHAVIOR_PRESETS = [
  'Friendly',
  'Playful',
  'Shy',
  'Sleepy',
  'Hungry',
  'Curious',
  'Custom...'
] as const;

export type CatColor = typeof CAT_COLORS[number];
export type CatType = typeof CAT_TYPES[number];
export type BehaviorPreset = typeof BEHAVIOR_PRESETS[number];

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a CatEncounter object
 */
export function validateCatEncounter(encounter: Partial<CatEncounter>): ValidationResult {
  const errors: string[] = [];

  // Required fields validation
  if (!encounter.id || typeof encounter.id !== 'string') {
    errors.push('ID is required and must be a string');
  }

  if (typeof encounter.lat !== 'number' || isNaN(encounter.lat)) {
    errors.push('Latitude is required and must be a valid number');
  } else if (encounter.lat < -90 || encounter.lat > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }

  if (typeof encounter.lng !== 'number' || isNaN(encounter.lng)) {
    errors.push('Longitude is required and must be a valid number');
  } else if (encounter.lng < -180 || encounter.lng > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }

  if (!encounter.dateTime || typeof encounter.dateTime !== 'string') {
    errors.push('DateTime is required and must be a string');
  } else if (!isValidISOString(encounter.dateTime)) {
    errors.push('DateTime must be a valid ISO-8601 timestamp');
  }

  if (!encounter.catColor || typeof encounter.catColor !== 'string') {
    errors.push('Cat color is required');
  } else if (!CAT_COLORS.includes(encounter.catColor as CatColor)) {
    errors.push(`Cat color must be one of: ${CAT_COLORS.join(', ')}`);
  }

  if (!encounter.catType || typeof encounter.catType !== 'string') {
    errors.push('Cat type is required');
  } else if (!CAT_TYPES.includes(encounter.catType as CatType)) {
    errors.push(`Cat type must be one of: ${CAT_TYPES.join(', ')}`);
  }

  if (typeof encounter.behavior !== 'string') {
    errors.push('Behavior is required');
  } else if (encounter.behavior.trim().length === 0) {
    errors.push('Behavior cannot be empty');
  }

  if (!encounter.createdAt || typeof encounter.createdAt !== 'string') {
    errors.push('CreatedAt is required and must be a string');
  } else if (!isValidISOString(encounter.createdAt)) {
    errors.push('CreatedAt must be a valid ISO-8601 timestamp');
  }

  if (!encounter.updatedAt || typeof encounter.updatedAt !== 'string') {
    errors.push('UpdatedAt is required and must be a string');
  } else if (!isValidISOString(encounter.updatedAt)) {
    errors.push('UpdatedAt must be a valid ISO-8601 timestamp');
  }

  // Optional fields validation
  if (encounter.comment !== undefined && typeof encounter.comment !== 'string') {
    errors.push('Comment must be a string if provided');
  }

  if (encounter.photoBlobId !== undefined && typeof encounter.photoBlobId !== 'string') {
    errors.push('PhotoBlobId must be a string if provided');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a new CatEncounter with default values
 */
export function createCatEncounter(
  lat: number,
  lng: number,
  catColor: CatColor,
  catType: CatType,
  behavior: string,
  options: {
    comment?: string;
    photoBlobId?: string;
    dateTime?: string;
  } = {}
): CatEncounter {
  const now = getCurrentTimestamp();
  const createdAt = getCurrentTimestamp();
  
  return {
    id: generateUUID(),
    lat,
    lng,
    dateTime: options.dateTime || now,
    catColor,
    catType,
    behavior,
    comment: options.comment,
    photoBlobId: options.photoBlobId,
    createdAt,
    updatedAt: createdAt
  };
}

/**
 * Updates an existing CatEncounter with new values
 */
export function updateCatEncounter(
  existing: CatEncounter,
  updates: Partial<Omit<CatEncounter, 'id' | 'createdAt'>>
): CatEncounter {
  return {
    ...existing,
    ...updates,
    updatedAt: getCurrentTimestamp()
  };
}

/**
 * Validates an ISO-8601 timestamp string
 */
function isValidISOString(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && date.toISOString() === dateString;
}

/**
 * Validates latitude coordinate
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validates longitude coordinate
 */
export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
}

/**
 * Validates if a string is a valid cat color
 */
export function isValidCatColor(color: string): color is CatColor {
  return CAT_COLORS.includes(color as CatColor);
}

/**
 * Validates if a string is a valid cat type
 */
export function isValidCatType(type: string): type is CatType {
  return CAT_TYPES.includes(type as CatType);
}

/**
 * Validates if a behavior string is valid (non-empty)
 */
export function isValidBehavior(behavior: string): boolean {
  return typeof behavior === 'string' && behavior.trim().length > 0;
}