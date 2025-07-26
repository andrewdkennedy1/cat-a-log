/**
 * Tests for EncounterInfoCard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { EncounterInfoCard } from '../EncounterInfoCard';
import { storageService } from '../../services/StorageService';
import type { CatEncounter } from '../../types';

// Mock the storage service
vi.mock('../../services/StorageService', () => ({
  storageService: {
    getPhoto: vi.fn()
  }
}));

const mockStorageService = vi.mocked(storageService);

describe('EncounterInfoCard', () => {
  const mockEncounter: CatEncounter = {
    id: 'test-id',
    lat: 40.7128,
    lng: -74.0060,
    dateTime: '2024-01-15T10:30:00.000Z',
    catColor: 'Orange',
    catType: 'Tabby',
    behavior: 'Friendly',
    comment: 'Very cute cat!',
    photoBlobId: 'photo-123',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z'
  };

  const defaultProps = {
    encounter: mockEncounter,
    onEdit: vi.fn(),
    onDelete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders encounter details correctly', () => {
    mockStorageService.getPhoto.mockResolvedValue(null);
    
    render(<EncounterInfoCard {...defaultProps} />);
    
    expect(screen.getByText('Orange Tabby')).toBeInTheDocument();
    expect(screen.getByText('Behavior:')).toBeInTheDocument();
    expect(screen.getByText('Friendly')).toBeInTheDocument();
    expect(screen.getByText('Very cute cat!')).toBeInTheDocument();
    expect(screen.getByText(/40\.712800, -74\.006000/)).toBeInTheDocument();
  });

  it('renders without comment when not provided', () => {
    const encounterWithoutComment = { ...mockEncounter, comment: undefined };
    mockStorageService.getPhoto.mockResolvedValue(null);
    
    render(<EncounterInfoCard {...defaultProps} encounter={encounterWithoutComment} />);
    
    expect(screen.getByText('Orange Tabby')).toBeInTheDocument();
    expect(screen.queryByText('Comment:')).not.toBeInTheDocument();
  });

  it('renders without photo when photoBlobId is not provided', () => {
    const encounterWithoutPhoto = { ...mockEncounter, photoBlobId: undefined };
    render(<EncounterInfoCard {...defaultProps} encounter={encounterWithoutPhoto} />);
    
    expect(screen.getByText('Orange Tabby')).toBeInTheDocument();
    expect(screen.queryByAltText('Cat encounter')).not.toBeInTheDocument();
  });

  it('loads and displays photo when photoBlobId is provided', async () => {
    const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
    mockStorageService.getPhoto.mockResolvedValue(mockBlob);

    render(<EncounterInfoCard {...defaultProps} />);
    
    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Wait for photo to load
    await waitFor(() => {
      expect(screen.getByAltText('Cat encounter')).toBeInTheDocument();
    });
    
    expect(mockStorageService.getPhoto).toHaveBeenCalledWith('photo-123');
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
  });

  it('shows error state when photo fails to load', async () => {
    mockStorageService.getPhoto.mockRejectedValue(new Error('Failed to load'));

    render(<EncounterInfoCard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Photo unavailable')).toBeInTheDocument();
    });
  });

  it('shows error state when photo blob is null', async () => {
    mockStorageService.getPhoto.mockResolvedValue(null);

    render(<EncounterInfoCard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Photo unavailable')).toBeInTheDocument();
    });
  });

  it('calls onEdit when edit button is clicked', () => {
    mockStorageService.getPhoto.mockResolvedValue(null);
    
    render(<EncounterInfoCard {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockEncounter);
  });

  it('calls onDelete when delete button is clicked', () => {
    mockStorageService.getPhoto.mockResolvedValue(null);
    
    render(<EncounterInfoCard {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Delete'));
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockEncounter);
  });

  it('formats date and time correctly', () => {
    mockStorageService.getPhoto.mockResolvedValue(null);
    
    render(<EncounterInfoCard {...defaultProps} />);
    
    const expectedDate = new Date('2024-01-15T10:30:00.000Z').toLocaleDateString();
    const expectedTime = new Date('2024-01-15T10:30:00.000Z').toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    expect(screen.getByText(`${expectedDate} at ${expectedTime}`)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    mockStorageService.getPhoto.mockResolvedValue(null);
    
    const { container } = render(<EncounterInfoCard {...defaultProps} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('encounter-info-card', 'custom-class');
  });

  it('cleans up object URL on unmount', async () => {
    const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
    mockStorageService.getPhoto.mockResolvedValue(mockBlob);

    const { unmount } = render(<EncounterInfoCard {...defaultProps} />);
    
    // Wait for photo to load and URL to be created
    await waitFor(() => {
      expect(screen.getByAltText('Cat encounter')).toBeInTheDocument();
    });
    
    // Verify URL was created
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    
    unmount();
    
    // Object URL should be revoked on unmount (the cleanup function should be called)
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });
});