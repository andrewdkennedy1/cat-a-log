/**
 * Tests for EncounterForm component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EncounterForm } from '../EncounterForm';
import type { CatEncounter } from '../../types';
import { createCatEncounter } from '../../models/CatEncounter';

// Mock the data utils
vi.mock('../../utils/dataUtils', () => ({
    getCurrentTimestamp: () => '2024-01-15T10:30:00.000Z',
    generateUUID: () => 'test-uuid-123'
}));

// Mock the storage service
vi.mock('../../services/StorageService', () => ({
    storageService: {
        savePhoto: vi.fn().mockResolvedValue('photo-blob-id-123'),
        getPhoto: vi.fn().mockResolvedValue(null),
        deletePhoto: vi.fn().mockResolvedValue(undefined)
    }
}));

// Mock PhotoInput component
vi.mock('../PhotoInput', () => ({
    PhotoInput: ({ value, onChange, disabled }: { value: Blob | null, onChange: (photo: Blob | null) => void, disabled: boolean }) => (
        <div data-testid="photo-input">
            <div>Photo Input Mock</div>
            {value && <div data-testid="photo-preview">Photo Preview</div>}
            <button
                onClick={() => onChange(new Blob(['test'], { type: 'image/jpeg' }))}
                disabled={disabled}
                data-testid="add-photo"
            >
                Add Photo
            </button>
            <button
                onClick={() => onChange(null)}
                disabled={disabled}
                data-testid="remove-photo"
            >
                Remove Photo
            </button>
        </div>
    )
}));

describe('EncounterForm', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();
    const mockLocation = { lat: 40.7128, lng: -74.0060 };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('when creating a new encounter', () => {
        it('renders the form with default values', () => {
            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('Log Cat Encounter')).toBeInTheDocument();
            expect(screen.getByLabelText(/Date & Time/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Cat Color/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Cat Type/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Comment/)).toBeInTheDocument();
            expect(screen.getByText(/Location/)).toBeInTheDocument();
        });

        it('shows location coordinates', () => {
            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('Lat: 40.712800, Lng: -74.006000')).toBeInTheDocument();
        });

        it('submits form with correct data', async () => {
            const user = userEvent.setup();

            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Fill out form
            await user.selectOptions(screen.getByLabelText(/Cat Color/), 'Black');
            await user.selectOptions(screen.getByLabelText(/Cat Type/), 'Stray');
            await user.type(screen.getByLabelText(/Comment/), 'A shy black cat hiding under a car');

            // Submit form
            await user.click(screen.getByText('Save'));

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 'test-uuid-123',
                    lat: 40.7128,
                    lng: -74.0060,
                    catColor: 'Black',
                    catType: 'Stray',
                    behavior: 'Friendly', // Default behavior
                    comment: 'A shy black cat hiding under a car',
                    createdAt: '2024-01-15T10:30:00.000Z',
                    updatedAt: '2024-01-15T10:30:00.000Z'
                })
            );
        });

        it('handles custom behavior input', async () => {
            const user = userEvent.setup();

            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Select custom behavior
            const behaviorSelects = screen.getAllByLabelText(/Behavior/);
            await user.selectOptions(behaviorSelects[0], 'Custom...');

            // Custom behavior input should appear
            expect(screen.getByLabelText(/Custom Behavior/)).toBeInTheDocument();

            // Fill custom behavior
            await user.type(screen.getByLabelText(/Custom Behavior/), 'Hunting mice');

            // Submit form
            await user.click(screen.getByText('Save'));

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith(
                    expect.objectContaining({
                        behavior: 'Hunting mice'
                    })
                );
            });
        });

        it('shows character count for comments', () => {
            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('(500 characters remaining)')).toBeInTheDocument();
        });

        it('renders photo input component', () => {
            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByTestId('photo-input')).toBeInTheDocument();
            expect(screen.getByText('Photo Input Mock')).toBeInTheDocument();
        });

        it('handles photo addition and saves encounter with photo', async () => {
            const user = userEvent.setup();
            const { storageService } = await import('../../services/StorageService');

            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Add a photo
            await user.click(screen.getByTestId('add-photo'));

            // Submit form
            const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            await user.click(submitButton);

            await waitFor(() => {
                expect(storageService.savePhoto).toHaveBeenCalledWith(
                    expect.any(Blob)
                );
            });
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    photoBlobId: 'photo-blob-id-123'
                })
            );
        });
    });

    describe('when editing an existing encounter', () => {
        const existingEncounter: CatEncounter = createCatEncounter(
            40.7128,
            -74.0060,
            'Black',
            'Stray',
            'Shy',
            {
                comment: 'Original comment',
                dateTime: '2024-01-10T14:30:00.000Z'
            }
        );

        it('renders with "Edit" title', () => {
            render(
                <EncounterForm
                    isOpen={true}
                    initialData={existingEncounter}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('Edit Cat Encounter')).toBeInTheDocument();
            expect(screen.getByText('Update')).toBeInTheDocument();
        });

        it('pre-populates form with existing data', () => {
            render(
                <EncounterForm
                    isOpen={true}
                    initialData={existingEncounter}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            const colorSelect = screen.getByLabelText(/Cat Color/) as HTMLSelectElement;
            const typeSelect = screen.getByLabelText(/Cat Type/) as HTMLSelectElement;
            const commentTextarea = screen.getByLabelText(/Comment/) as HTMLTextAreaElement;

            expect(colorSelect.value).toBe('Black');
            expect(typeSelect.value).toBe('Stray');
            expect(commentTextarea.value).toBe('Original comment');
        });

        it('loads existing photo when editing encounter with photo', async () => {
            const encounterWithPhoto = {
                ...existingEncounter,
                photoBlobId: 'existing-photo-id'
            };

            const { storageService } = await import('../../services/StorageService');
            const mockPhotoBlob = new Blob(['existing-photo'], { type: 'image/jpeg' });
            vi.mocked(storageService.getPhoto).mockResolvedValue(mockPhotoBlob);

            render(
                <EncounterForm
                    isOpen={true}
                    initialData={encounterWithPhoto}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            await waitFor(() => {
                expect(storageService.getPhoto).toHaveBeenCalledWith('existing-photo-id');
            });
        });

        it('handles photo removal when editing', async () => {
            const user = userEvent.setup();
            const encounterWithPhoto = {
                ...existingEncounter,
                photoBlobId: 'existing-photo-id'
            };

            const { storageService } = await import('../../services/StorageService');

            render(
                <EncounterForm
                    isOpen={true}
                    initialData={encounterWithPhoto}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Remove photo
            await user.click(screen.getByTestId('remove-photo'));

            // Submit form
            const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            await user.click(submitButton);

            await waitFor(() => {
                expect(storageService.deletePhoto).toHaveBeenCalledWith('existing-photo-id');
                expect(mockOnSave).toHaveBeenCalledWith(
                    expect.objectContaining({
                        photoBlobId: undefined
                    })
                );
            });
        });

    });

    describe('form interactions', () => {
        it('calls onCancel when cancel button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <EncounterForm
                    isOpen={true}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);
            expect(mockOnCancel).toHaveBeenCalled();
        });
    });
});

    describe('when not open', () => {
        it('does not render anything', () => {
            render(
                <EncounterForm
                    isOpen={false}
                    location={mockLocation}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.queryByText('Log Cat Encounter')).not.toBeInTheDocument();
        });
    });
});