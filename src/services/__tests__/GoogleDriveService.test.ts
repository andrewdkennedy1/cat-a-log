/**
 * Tests for Google Drive Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveService } from '../GoogleDriveService';
import type { CatEncounter } from '../../types';

// Mock the global gapi object
const mockGapi = {
  client: {
    setToken: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    drive: {
      files: {
        list: vi.fn(),
        create: vi.fn(),
        get: vi.fn(),
      },
    },
    request: vi.fn(),
  },
};

// Mock the global google object
const mockGoogle = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn(),
      revoke: vi.fn(),
    },
  },
};

// Set up global mocks
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).gapi = mockGapi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).google = mockGoogle;
  vi.clearAllMocks();
});

describe('GoogleDriveService', () => {
  const mockToken = 'mock-access-token';
  
  it('should initialize with access token', () => {
    expect(() => new GoogleDriveService(mockToken)).not.toThrow();
  });

  it('should throw error without access token', () => {
    expect(() => new GoogleDriveService('')).toThrow('Google Drive API access token is required.');
  });

  it('should authenticate and return access token', async () => {
    const mockTokenClient = {
      requestAccessToken: vi.fn(),
    };

    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation((config) => {
      // Simulate successful authentication by calling the callback immediately
      setTimeout(() => config.callback({ access_token: mockToken }), 0);
      return mockTokenClient;
    });

    const token = await GoogleDriveService.authenticate();
    
    expect(token).toBe(mockToken);
    expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
      client_id: '304619344995-56ll4mek5dnu6lo4d8j9tn44ffqhlmel.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: expect.any(Function),
    });
  });

  it('should handle authentication errors', async () => {
    const mockTokenClient = {
      requestAccessToken: vi.fn(),
    };

    mockGoogle.accounts.oauth2.initTokenClient.mockImplementation((config) => {
      // Simulate authentication error by calling the callback with error
      setTimeout(() => config.callback({ error: 'access_denied' }), 0);
      return mockTokenClient;
    });

    await expect(GoogleDriveService.authenticate()).rejects.toEqual({ error: 'access_denied' });
  });

  it('should initialize drive service', async () => {
    const service = new GoogleDriveService(mockToken);
    
    // Mock folder creation responses
    mockGapi.client.drive.files.list
      .mockResolvedValueOnce({ result: { files: [] } }) // Main folder doesn't exist
      .mockResolvedValueOnce({ result: { files: [] } }); // Photos folder doesn't exist
    
    mockGapi.client.drive.files.create
      .mockResolvedValueOnce({ result: { id: 'main-folder-id' } }) // Create main folder
      .mockResolvedValueOnce({ result: { id: 'photos-folder-id' } }); // Create photos folder

    await service.init();

    expect(mockGapi.client.setToken).toHaveBeenCalledWith({ access_token: mockToken });
    expect(mockGapi.client.load).toHaveBeenCalledWith('drive', 'v3');
  });

  it('should save encounters to drive', async () => {
    const service = new GoogleDriveService(mockToken);
    
    // Mock initialization
    mockGapi.client.drive.files.list
      .mockResolvedValueOnce({ result: { files: [] } })
      .mockResolvedValueOnce({ result: { files: [] } });
    
    mockGapi.client.drive.files.create
      .mockResolvedValueOnce({ result: { id: 'main-folder-id' } })
      .mockResolvedValueOnce({ result: { id: 'photos-folder-id' } });

    await service.init();

    // Mock encounters file check (doesn't exist)
    mockGapi.client.drive.files.list.mockResolvedValueOnce({ result: { files: [] } });
    
    // Mock file creation
    mockGapi.client.request.mockResolvedValueOnce({ result: { id: 'file-id' } });

    const mockEncounters: CatEncounter[] = [
      {
        id: '1',
        dateTime: '2024-01-01T12:00:00Z',
        lat: 40.7128,
        lng: -74.0060,
        catColor: 'black',
        catType: 'domestic',
        behavior: 'friendly',
        comment: 'Test encounter',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      },
    ];

    await service.saveEncounters(mockEncounters);

    expect(mockGapi.client.request).toHaveBeenCalledWith({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': expect.stringContaining('multipart/related') },
      body: expect.stringContaining('encounters'),
    });
  });

  it('should load encounters from drive', async () => {
    const service = new GoogleDriveService(mockToken);
    
    // Mock initialization
    mockGapi.client.drive.files.list
      .mockResolvedValueOnce({ result: { files: [] } })
      .mockResolvedValueOnce({ result: { files: [] } });
    
    mockGapi.client.drive.files.create
      .mockResolvedValueOnce({ result: { id: 'main-folder-id' } })
      .mockResolvedValueOnce({ result: { id: 'photos-folder-id' } });

    await service.init();

    // Mock encounters file exists
    mockGapi.client.drive.files.list.mockResolvedValueOnce({ 
      result: { files: [{ id: 'encounters-file-id' }] } 
    });
    
    const mockEncountersData = {
      encounters: [
        {
          id: '1',
          dateTime: '2024-01-01T12:00:00Z',
          lat: 40.7128,
          lng: -74.0060,
          catColor: 'black',
          catType: 'domestic',
          behavior: 'friendly',
          comment: 'Test encounter',
          createdAt: '2024-01-01T12:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z',
        },
      ],
      exportedAt: '2024-01-01T12:00:00Z',
      version: '1.0',
    };

    // Mock file content
    mockGapi.client.drive.files.get.mockResolvedValueOnce({
      body: JSON.stringify(mockEncountersData),
    });

    const encounters = await service.loadEncounters();

    expect(encounters).toHaveLength(1);
    expect(encounters[0].id).toBe('1');
    expect(mockGapi.client.drive.files.get).toHaveBeenCalledWith({
      fileId: 'encounters-file-id',
      alt: 'media',
    });
  });

  it('should return empty array when no encounters file exists', async () => {
    const service = new GoogleDriveService(mockToken);
    
    // Mock initialization
    mockGapi.client.drive.files.list
      .mockResolvedValueOnce({ result: { files: [] } })
      .mockResolvedValueOnce({ result: { files: [] } });
    
    mockGapi.client.drive.files.create
      .mockResolvedValueOnce({ result: { id: 'main-folder-id' } })
      .mockResolvedValueOnce({ result: { id: 'photos-folder-id' } });

    await service.init();

    // Mock no encounters file
    mockGapi.client.drive.files.list.mockResolvedValueOnce({ result: { files: [] } });

    const encounters = await service.loadEncounters();

    expect(encounters).toEqual([]);
  });
});