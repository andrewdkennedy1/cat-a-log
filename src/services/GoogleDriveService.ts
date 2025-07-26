/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CatEncounter } from "@/types";

declare const gapi: any;

const FOLDER_NAME = 'CAT-a-log-data';
const METADATA_FILE_NAME = 'encounters.json';
const PHOTOS_FOLDER_NAME = 'photos';

export class GoogleDriveService {
  private driveReady = false;
  private folderId: string | null = null;
  private photosFolderId: string | null = null;
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error("Google Drive API access token is required.");
    }
    this.accessToken = accessToken;
  }

  public async init() {
    try {
      if (typeof gapi === 'undefined' || !gapi.client) {
        throw new Error("Google API client not loaded.");
      }

      gapi.client.setToken({ access_token: this.accessToken });
      await gapi.client.load('drive', 'v3');
      
      this.folderId = await this.findOrCreateFolder(FOLDER_NAME);
      this.photosFolderId = await this.findOrCreateFolder(PHOTOS_FOLDER_NAME, this.folderId);

      this.driveReady = true;
      console.log('Google Drive Service Initialized');
    } catch (error: any) {
      console.error('Error initializing Google Drive service:', error);
      if (error.result && error.result.error) {
        throw new Error(`Google Drive API Error: ${error.result.error.message}`);
      }
      throw new Error(`Failed to initialize Google Drive: ${error.message || 'Unknown error'}`);
    }
  }

  private async findOrCreateFolder(name: string, parentId?: string | null): Promise<string> {
    const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
    
    const listResult = await gapi.client.drive.files.list({
      q: query,
      fields: 'files(id)',
    });

    if (listResult.result.files && listResult.result.files.length > 0) {
      return listResult.result.files[0].id!;
    } else {
      const folderMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] }),
      };
      const createResult = await gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });
      return createResult.result.id!;
    }
  }

  private async getEncountersFileId(): Promise<string | null> {
    if (!this.driveReady) throw new Error('Google Drive not initialized');
    const fileResult = await gapi.client.drive.files.list({
      q: `name='${METADATA_FILE_NAME}' and '${this.folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });
    return fileResult.result.files && fileResult.result.files.length > 0 ? fileResult.result.files[0].id : null;
  }

  public async saveEncounters(encounters: CatEncounter[]): Promise<void> {
    if (!this.driveReady) throw new Error('Google Drive not initialized');
    const fileId = await this.getEncountersFileId();
    
    const metadata = {
      name: METADATA_FILE_NAME,
      mimeType: 'application/json',
      parents: this.folderId ? [this.folderId] : undefined,
    };
    
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const multipartRequestBody =
      `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(encounters, null, 2)}${close_delim}`;

    const request = gapi.client.request({
      path: `/upload/drive/v3/files${fileId ? `/${fileId}` : ''}`,
      method: fileId ? 'PATCH' : 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
      body: multipartRequestBody,
    });

    await request;
  }

  public async loadEncounters(): Promise<CatEncounter[]> {
    if (!this.driveReady) throw new Error('Google Drive not initialized');
    const fileId = await this.getEncountersFileId();
    if (!fileId) return [];

    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });

    return JSON.parse(response.body) as CatEncounter[];
  }

  public async savePhoto(photo: File): Promise<string> {
    if (!this.driveReady || !this.photosFolderId) throw new Error('Google Drive not initialized or photos folder not found');
    
    const metadata = {
      name: photo.name,
      mimeType: photo.type,
      parents: [this.photosFolderId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const fileReader = new FileReader();
    const base64Data = await new Promise<string>(resolve => {
      fileReader.onload = () => resolve((fileReader.result as string).split(',')[1]);
      fileReader.readAsDataURL(photo);
    });

    const multipartRequestBody =
      `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `${delimiter}Content-Type: ${photo.type}\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n${base64Data}${close_delim}`;

    const request = gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
      body: multipartRequestBody,
    });

    const response = await request;
    if (!response.result.id) {
      throw new Error("Failed to save photo to Google Drive.");
    }
    return response.result.id;
  }

  public async getPhoto(fileId: string): Promise<Blob> {
    if (!this.driveReady) throw new Error('Google Drive not initialized');
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    
    const blob = await fetch(`data:;base64,${btoa(response.body)}`).then(res => res.blob());
    return blob;
  }

  public authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: '304619344995-56ll4mek5dnu6lo4d8j9tn44ffqhlmel.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: (response: any) => {
            if (response.error) {
              return reject(response);
            }
            this.accessToken = response.access_token;
            resolve(response.access_token);
          },
        });
        tokenClient.requestAccessToken();
      } catch (error) {
        reject(error);
      }
    });
  }

  public logout() {
    if (this.accessToken) {
      (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
  }
}
