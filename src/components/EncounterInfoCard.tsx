/**
 * EncounterInfoCard - Component for displaying encounter details with edit/delete actions
 */

import { useState, useEffect } from 'react';
import type { CatEncounter } from '../types';
import { storageService } from '../services/StorageService';

interface EncounterInfoCardProps {
  encounter: CatEncounter;
  onEdit: (encounter: CatEncounter) => void;
  onDelete: (encounter: CatEncounter) => void;
  className?: string;
  photoUrl?: string | null;
}

export function EncounterInfoCard({
  encounter,
  onEdit,
  onDelete,
  className = '',
  photoUrl: initialPhotoUrl = null
}: EncounterInfoCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);

  // Load photo thumbnail if available and not already provided
  useEffect(() => {
    if (encounter.photoBlobId && !initialPhotoUrl) {
      setIsLoadingPhoto(true);
      storageService.getPhoto(encounter.photoBlobId)
        .then(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPhotoUrl(url);
          }
        })
        .catch(error => {
          console.error('Failed to load photo:', error);
          setPhotoUrl(null);
        })
        .finally(() => {
          setIsLoadingPhoto(false);
        });
    } else if (initialPhotoUrl) {
      setPhotoUrl(initialPhotoUrl);
    } else {
      setPhotoUrl(null);
    }
  }, [encounter.photoBlobId, initialPhotoUrl]);

  // Cleanup object URL on unmount or when URL changes
  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const formattedDate = new Date(encounter.dateTime).toLocaleDateString();
  const formattedTime = new Date(encounter.dateTime).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`encounter-info-card ${className}`}>
      {/* Photo thumbnail */}
      {encounter.photoBlobId && (
        <div className="encounter-photo mb-3">
          {isLoadingPhoto ? (
            <div 
              className="photo-placeholder"
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#666'
              }}
            >
              Loading...
            </div>
          ) : photoUrl ? (
            <img 
              src={photoUrl} 
              alt="Cat encounter" 
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          ) : (
            <div 
              className="photo-error"
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ddd',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#999'
              }}
            >
              Photo unavailable
            </div>
          )}
        </div>
      )}

      {/* Encounter details */}
      <div className="encounter-details">
        <div className="encounter-header mb-2">
          <h3 className="encounter-title" style={{ margin: 0, fontSize: '1.1rem' }}>
            {encounter.catColor} {encounter.catType}
          </h3>
          <div className="encounter-datetime" style={{ fontSize: '0.875rem', color: '#666' }}>
            {formattedDate} at {formattedTime}
          </div>
        </div>

        <div className="encounter-behavior mb-2">
          <strong>Behavior:</strong> {encounter.behavior}
        </div>

        {encounter.comment && (
          <div className="encounter-comment mb-3">
            <strong>Comment:</strong>
            <div style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
              {encounter.comment}
            </div>
          </div>
        )}

        <div className="encounter-location mb-3" style={{ fontSize: '0.875rem', color: '#666' }}>
          <strong>Location:</strong> {encounter.lat.toFixed(6)}, {encounter.lng.toFixed(6)}
        </div>
      </div>

      {/* Action buttons */}
      <div className="encounter-actions" style={{ 
        display: 'flex', 
        gap: '0.5rem',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #eee'
      }}>
        <button
          type="button"
          onClick={() => onEdit(encounter)}
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(encounter)}
          className="btn btn-danger btn-sm"
          style={{ 
            flex: 1,
            backgroundColor: '#dc3545',
            borderColor: '#dc3545',
            color: 'white'
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}