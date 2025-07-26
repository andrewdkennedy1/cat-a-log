/**
 * Tests for DeleteConfirmationDialog component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DeleteConfirmationDialog } from '../DeleteConfirmationDialog';

describe('DeleteConfirmationDialog', () => {
  const mockEncounterInfo = {
    catColor: 'Orange',
    catType: 'Tabby',
    dateTime: '2024-01-15T10:30:00.000Z'
  };

  const defaultProps = {
    isOpen: true,
    encounterInfo: mockEncounterInfo,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isDeleting: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open with encounter info', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText('Delete Encounter')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this encounter?')).toBeInTheDocument();
    expect(screen.getByText('Orange Tabby')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DeleteConfirmationDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Delete Encounter')).not.toBeInTheDocument();
  });

  it('does not render when encounterInfo is null', () => {
    render(<DeleteConfirmationDialog {...defaultProps} encounterInfo={null} />);
    
    expect(screen.queryByText('Delete Encounter')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when delete button is clicked', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Delete'));
    
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when overlay is clicked', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    
    const overlay = screen.getByText('Delete Encounter').closest('.modal-overlay');
    fireEvent.click(overlay!);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when modal content is clicked', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    
    const modalContent = screen.getByText('Delete Encounter').closest('.modal-content');
    fireEvent.click(modalContent!);
    
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('shows deleting state', () => {
    render(<DeleteConfirmationDialog {...defaultProps} isDeleting={true} />);
    
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Deleting...')).toBeDisabled();
  });

  it('formats date correctly', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />);
    
    // The date should be formatted as a locale date string
    const expectedDate = new Date('2024-01-15T10:30:00.000Z').toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });
});