/**
 * EncounterForm - Modal component for creating and editing cat encounters
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { EncounterFormProps, CatEncounter } from '../types';
import { 
  CAT_COLORS,
  COAT_LENGTHS,
  CAT_TYPES, 
  BEHAVIOR_PRESETS,
  createCatEncounter,
  updateCatEncounter,
  validateCatEncounter,
  type CatColor,
  type CatType
} from '../models/CatEncounter';
import { useAppContext } from '../context/AppContext';
import { getCurrentTimestamp } from '../utils/dataUtils';
import { PhotoInput } from './PhotoInput';
import { storageService } from '../services/StorageService';

const COMMENT_MAX_LENGTH = 500;

export function EncounterForm({ 
  isOpen, 
  initialData, 
  location, 
  onSave, 
  onCancel 
}: EncounterFormProps) {
  const { state, dispatch } = useAppContext();
  const { preferences } = state.user;

  // Form state
  const [catColor, setCatColor] = useState<CatColor>('Mixed/Other');
  const [customCatColor, setCustomCatColor] = useState('');
  const [coatLength, setCoatLength] = useState('Shorthair');
  const [customCoatLength, setCustomCoatLength] = useState('');
  const [catType, setCatType] = useState<CatType>('Domestic Shorthair');
  const [customCatType, setCustomCatType] = useState('');
  const [behavior, setBehavior] = useState('Friendly');
  const [customBehavior, setCustomBehavior] = useState('');
  const [comment, setComment] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [existingPhotoBlobId, setExistingPhotoBlobId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with current date/time or existing data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Editing existing encounter
        setCatColor(initialData.catColor as CatColor || 'Mixed/Other');
        setCatType(initialData.catType as CatType || 'Domestic Shorthair');
        
        // Handle behavior - check if it's a preset or custom
        const isPresetBehavior = BEHAVIOR_PRESETS.slice(0, -1).includes(initialData.behavior as any);
        if (isPresetBehavior) {
          setBehavior(initialData.behavior || 'Friendly');
          setCustomBehavior('');
        } else {
          setBehavior('Custom...');
          setCustomBehavior(initialData.behavior || '');
        }
        
        setComment(initialData.comment || '');
        setDateTime(initialData.dateTime ? formatDateTimeForInput(initialData.dateTime) : getCurrentDateTimeForInput());
        
        // Handle existing photo
        setExistingPhotoBlobId(initialData.photoBlobId || null);
        loadExistingPhoto(initialData.photoBlobId);
      } else {
        // Creating new encounter - reset to defaults
        setCatColor('Mixed/Other');
        setCustomCatColor('');
        setCoatLength('Shorthair');
        setCustomCoatLength('');
        setCatType('Domestic Shorthair');
        setCustomCatType('');
        setBehavior('Friendly');
        setCustomBehavior('');
        setComment('');
        setDateTime(getCurrentDateTimeForInput());
        setPhoto(null);
        setExistingPhotoBlobId(null);
      }
      setErrors([]);
      setIsSubmitting(false);
    }
  }, [isOpen, initialData]);

  // Load existing photo when editing
  const loadExistingPhoto = useCallback(async (photoBlobId?: string) => {
    if (photoBlobId) {
      try {
        const photoBlob = await storageService.getPhoto(photoBlobId);
        setPhoto(photoBlob);
      } catch (error) {
        console.error('Failed to load existing photo:', error);
        setPhoto(null);
      }
    } else {
      setPhoto(null);
    }
  }, []);

  // Get current date/time formatted for datetime-local input
  const getCurrentDateTimeForInput = useCallback((): string => {
    const now = new Date();
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  // Format ISO string for datetime-local input
  const formatDateTimeForInput = useCallback((isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  // Convert datetime-local input to ISO string
  const formatInputForISO = useCallback((inputValue: string): string => {
    return new Date(inputValue).toISOString();
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      // Determine final values
      const finalCatColor = catColor === 'Custom...' ? customCatColor.trim() : catColor;
      const finalCoatLength = coatLength === 'Custom...' ? customCoatLength.trim() : coatLength;
      const finalCatType = catType === 'Custom...' ? customCatType.trim() : catType;
      const finalBehavior = behavior === 'Custom...' ? customBehavior.trim() : behavior;
      
      // Validate required fields
      if (!finalCatColor) {
        setErrors(['Cat color is required']);
        setIsSubmitting(false);
        return;
      }
      if (!finalCoatLength) {
        setErrors(['Coat length is required']);
        setIsSubmitting(false);
        return;
      }
      if (!finalCatType) {
        setErrors(['Cat type is required']);
        setIsSubmitting(false);
        return;
      }
      if (!finalBehavior) {
        setErrors(['Behavior is required']);
        setIsSubmitting(false);
        return;
      }

      if (!location && !initialData) {
        setErrors(['Location is required']);
        setIsSubmitting(false);
        return;
      }

      // Handle photo storage
      let photoBlobId: string | undefined = existingPhotoBlobId || undefined;
      
      if (photo) {
        // Check if this is a new photo (different from existing)
        const isNewPhoto = !existingPhotoBlobId || photo !== await storageService.getPhoto(existingPhotoBlobId);
        
        if (isNewPhoto) {
          // Save new photo and get its ID
          photoBlobId = await storageService.savePhoto(photo);
          
          // Clean up old photo if we're updating
          if (existingPhotoBlobId && existingPhotoBlobId !== photoBlobId) {
            try {
              await storageService.deletePhoto(existingPhotoBlobId);
            } catch (error) {
              console.warn('Failed to delete old photo:', error);
            }
          }
        }
      } else if (existingPhotoBlobId) {
        // Photo was removed, delete the existing one
        try {
          await storageService.deletePhoto(existingPhotoBlobId);
        } catch (error) {
          console.warn('Failed to delete removed photo:', error);
        }
        photoBlobId = undefined;
      }

      // Create or update encounter
      let encounter: CatEncounter;
      
      if (initialData && initialData.id) {
        // Update existing encounter
        encounter = updateCatEncounter(initialData as CatEncounter, {
          catColor: finalCatColor,
          coatLength: finalCoatLength,
          catType: finalCatType,
          behavior: finalBehavior,
          comment: comment.trim() || undefined,
          dateTime: formatInputForISO(dateTime),
          photoBlobId,
          // Keep existing location if no new location provided
          lat: location?.lat ?? initialData.lat!,
          lng: location?.lng ?? initialData.lng!
        });
      } else {
        // Create new encounter
        if (!location) {
          setErrors(['Location is required for new encounters']);
          setIsSubmitting(false);
          return;
        }
        
        encounter = createCatEncounter(
          location.lat,
          location.lng,
          finalCatColor,
          finalCoatLength,
          finalCatType,
          finalBehavior,
          {
            comment: comment.trim() || undefined,
            dateTime: formatInputForISO(dateTime),
            photoBlobId
          }
        );
      }

      // Validate the encounter
      const validation = validateCatEncounter(encounter);
      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      // Save the encounter
      onSave(encounter);

      // Update user preferences with new custom values
      const updatedPreferences = { ...preferences };
      if (catColor === 'Custom...' && !preferences.customCatColors.includes(finalCatColor)) {
        updatedPreferences.customCatColors = [...preferences.customCatColors, finalCatColor];
      }
      if (coatLength === 'Custom...' && !preferences.customCoatLengths.includes(finalCoatLength)) {
        updatedPreferences.customCoatLengths = [...preferences.customCoatLengths, finalCoatLength];
      }
      if (catType === 'Custom...' && !preferences.customCatTypes.includes(finalCatType)) {
        updatedPreferences.customCatTypes = [...preferences.customCatTypes, finalCatType];
      }
      if (behavior === 'Custom...' && !preferences.customBehaviors.includes(finalBehavior)) {
        updatedPreferences.customBehaviors = [...preferences.customBehaviors, finalBehavior];
      }
      dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: updatedPreferences });
      
    } catch (error) {
      console.error('Error saving encounter:', error);
      setErrors(['An error occurred while saving the encounter']);
      setIsSubmitting(false);
    }
  }, [
    catColor, customCatColor,
    coatLength, customCoatLength,
    catType, customCatType,
    behavior, customBehavior,
    comment, 
    dateTime, 
    photo,
    existingPhotoBlobId,
    location, 
    initialData, 
    onSave, 
    formatInputForISO,
    dispatch,
    preferences
  ]);

  const catColors = useMemo(() => [...CAT_COLORS.slice(0, -1), ...preferences.customCatColors, 'Custom...'], [preferences.customCatColors]);
  const coatLengths = useMemo(() => [...COAT_LENGTHS.slice(0, -1), ...preferences.customCoatLengths, 'Custom...'], [preferences.customCoatLengths]);
  const catTypes = useMemo(() => [...CAT_TYPES.slice(0, -1), ...preferences.customCatTypes, 'Custom...'], [preferences.customCatTypes]);
  const behaviorPresets = useMemo(() => [...BEHAVIOR_PRESETS.slice(0, -1), ...preferences.customBehaviors, 'Custom...'], [preferences.customBehaviors]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setErrors([]);
    setIsSubmitting(false);
    onCancel();
  }, [onCancel]);

  // Handle cat color change
  const handleCatColorChange = useCallback((value: string) => {
    setCatColor(value as CatColor);
    if (value !== 'Custom...') {
      setCustomCatColor('');
    }
  }, []);

  // Handle coat length change
  const handleCoatLengthChange = useCallback((value: string) => {
    setCoatLength(value);
    if (value !== 'Custom...') {
      setCustomCoatLength('');
    }
  }, []);

  // Handle cat type change
  const handleCatTypeChange = useCallback((value: string) => {
    setCatType(value as CatType);
    if (value !== 'Custom...') {
      setCustomCatType('');
    }
  }, []);

  // Handle behavior change
  const handleBehaviorChange = useCallback((value: string) => {
    setBehavior(value);
    if (value !== 'Custom...') {
      setCustomBehavior('');
    }
  }, []);

  // Handle comment change with character limit
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= COMMENT_MAX_LENGTH) {
      setComment(value);
    }
  }, []);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  const isEditing = Boolean(initialData?.id);
  const remainingChars = COMMENT_MAX_LENGTH - comment.length;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? 'Edit Cat Encounter' : 'Log Cat Encounter'}</h2>
        
        {errors.length > 0 && (
          <div className="error-messages mb-4">
            {errors.map((error, index) => (
              <div key={index} style={{ color: '#dc3545', marginBottom: '0.5rem' }}>
                {error}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Date and Time */}
          <div className="form-group">
            <label htmlFor="dateTime" className="form-label">
              Date & Time *
            </label>
            <input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Cat Color */}
          <div className="form-group">
            <label htmlFor="catColor" className="form-label">
              Cat Color *
            </label>
            <select
              id="catColor"
              value={catColor}
              onChange={(e) => handleCatColorChange(e.target.value)}
              className="form-select"
              required
            >
              {catColors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Cat Color Input */}
          {catColor === 'Custom...' && (
            <div className="form-group">
              <label htmlFor="customCatColor" className="form-label">
                Custom Color *
              </label>
              <input
                id="customCatColor"
                type="text"
                value={customCatColor}
                onChange={(e) => setCustomCatColor(e.target.value)}
                className="form-input"
                placeholder="Describe the cat's color..."
                required
                maxLength={100}
              />
            </div>
          )}

          {/* Coat Length */}
          <div className="form-group">
            <label htmlFor="coatLength" className="form-label">
              Coat Length *
            </label>
            <select
              id="coatLength"
              value={coatLength}
              onChange={(e) => handleCoatLengthChange(e.target.value)}
              className="form-select"
              required
            >
              {coatLengths.map((length) => (
                <option key={length} value={length}>
                  {length}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Coat Length Input */}
          {coatLength === 'Custom...' && (
            <div className="form-group">
              <label htmlFor="customCoatLength" className="form-label">
                Custom Coat Length *
              </label>
              <input
                id="customCoatLength"
                type="text"
                value={customCoatLength}
                onChange={(e) => setCustomCoatLength(e.target.value)}
                className="form-input"
                placeholder="Describe the cat's coat length..."
                required
                maxLength={100}
              />
            </div>
          )}

          {/* Cat Type */}
          <div className="form-group">
            <label htmlFor="catType" className="form-label">
              Cat Type *
            </label>
            <select
              id="catType"
              value={catType}
              onChange={(e) => handleCatTypeChange(e.target.value)}
              className="form-select"
              required
            >
              {catTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Cat Type Input */}
          {catType === 'Custom...' && (
            <div className="form-group">
              <label htmlFor="customCatType" className="form-label">
                Custom Type *
              </label>
              <input
                id="customCatType"
                type="text"
                value={customCatType}
                onChange={(e) => setCustomCatType(e.target.value)}
                className="form-input"
                placeholder="Describe the cat's type..."
                required
                maxLength={100}
              />
            </div>
          )}

          {/* Behavior */}
          <div className="form-group">
            <label htmlFor="behavior" className="form-label">
              Behavior *
            </label>
            <select
              id="behavior"
              value={behavior}
              onChange={(e) => handleBehaviorChange(e.target.value)}
              className="form-select"
              required
            >
              {behaviorPresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Behavior Input */}
          {behavior === 'Custom...' && (
            <div className="form-group">
              <label htmlFor="customBehavior" className="form-label">
                Custom Behavior *
              </label>
              <input
                id="customBehavior"
                type="text"
                value={customBehavior}
                onChange={(e) => setCustomBehavior(e.target.value)}
                className="form-input"
                placeholder="Describe the cat's behavior..."
                required
                maxLength={100}
              />
            </div>
          )}

          {/* Comment */}
          <div className="form-group">
            <label htmlFor="comment" className="form-label">
              Comment
              <span style={{ fontSize: '0.875rem', color: '#666', marginLeft: '0.5rem' }}>
                ({remainingChars} characters remaining)
              </span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={handleCommentChange}
              className="form-textarea"
              placeholder="Add any additional notes about this encounter..."
              rows={3}
            />
          </div>

          {/* Photo */}
          <div className="form-group">
            <label className="form-label">
              Photo (Optional)
            </label>
            <PhotoInput
              value={photo}
              onChange={setPhoto}
              disabled={isSubmitting}
            />
          </div>

          {/* Location Info */}
          {location && (
            <div className="form-group">
              <label className="form-label">Location</label>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between gap-2 mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}