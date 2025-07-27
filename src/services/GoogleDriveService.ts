/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CatEncounter } from "@/types";

// Use window.gapi instead of global declaration

const METADATA_FILE_NAME = 'app-data.json';

export class GoogleDriveService {
  private driveReady = false;
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error("Google Drive API access token is required.");
    }
    this.accessToken = accessToken;
  }

  public async init() {
    try {
      console.log('Initializing Google Drive service with token...');
      
      // Wait for all Google APIs to be loaded
      await GoogleDriveService.waitForAllGoogleAPIs();

      const gapi = (window as any).gapi;
      
      // Set the access token
      gapi.client.setToken({ access_token: this.accessToken });
      
      // Load the Drive API
      await gapi.client.load('drive', 'v3');
      console.log('Google Drive API loaded successfully');
      
      // Test the token by making a simple API call
      try {
        await gapi.client.drive.about.get({ fields: 'user' });
        console.log('Token validation successful');
      } catch (tokenError: any) {
        console.error('Token validation failed:', tokenError);
        if (tokenError.status === 401) {
          throw new Error('Google token has expired or is invalid. Please sign in again.');
        }
        throw tokenError;
      }
      
      this.driveReady = true;
      console.log('Google Drive Service Initialized successfully');
    } catch (error: any) {
      console.error('Error initializing Google Drive service:', error);
      
      // Handle specific error cases
      if (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401)) {
        throw new Error('Google authentication has expired. Please sign in again.');
      }
      
      if (error.result && error.result.error) {
        throw new Error(`Google Drive API Error: ${error.result.error.message}`);
      }
      
      throw new Error(`Failed to initialize Google Drive: ${error.message || 'Unknown error'}`);
    }
  }

  private static async waitForGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxAttempts = 30; // 3 seconds max wait time
      let attempts = 0;
      let clientInitialized = false;

      const checkAPI = () => {
        attempts++;
        
        const loadStatus = (window as any).googleAPILoadStatus;
        const gapiError = loadStatus && loadStatus.gapiError;
        
        // Check if script failed to load
        if (gapiError) {
          console.error('Google API script failed to load from CDN');
          reject(new Error("Google API script failed to load. This might be due to network issues or ad blockers. Please check your internet connection and disable any ad blockers, then try again."));
          return;
        }
        
        // Only log every 10 attempts to reduce flooding
        if (attempts % 10 === 0 || attempts === 1) {
          console.log(`Checking Google API (attempt ${attempts}/30)...`);
        }
        
        if (typeof (window as any).gapi !== 'undefined') {
          // gapi is loaded, now initialize the client if not already done
          if (!(window as any).gapi.client && !clientInitialized) {
            console.log('Initializing gapi client...');
            clientInitialized = true;
            (window as any).gapi.load('client', () => {
              console.log('Google API client initialized!');
              resolve();
            });
            return;
          } else if ((window as any).gapi.client) {
            console.log('Google API client is ready!');
            resolve();
            return;
          }
        }

        if (attempts >= maxAttempts) {
          console.error('Google API failed to initialize after 3 seconds');
          reject(new Error("Google API failed to initialize. This might be due to network issues, ad blockers, or browser security settings. Please check your internet connection, disable any ad blockers, and try again."));
          return;
        }

        setTimeout(checkAPI, 100);
      };

      checkAPI();
    });
  }

  private async getEncountersFileId(): Promise<string | null> {
    if (!this.driveReady) throw new Error('Google Drive not initialized');
    const gapi = (window as any).gapi;
    const fileResult = await gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${METADATA_FILE_NAME}' and trashed=false`,
      fields: 'files(id)',
    });
    return fileResult.result.files && fileResult.result.files.length > 0 ? fileResult.result.files[0].id : null;
  }

  public async saveData(data: { encounters: CatEncounter[], preferences: any }): Promise<void> {
    if (!this.driveReady) {
      throw new Error('Google Drive not initialized');
    }

    try {
      const fileId = await this.getEncountersFileId();
      const content = JSON.stringify(data, null, 2);
      const gapi = (window as any).gapi;

      if (fileId) {
        // Update existing file
        await gapi.client.request({
          path: `/upload/drive/v3/files/${fileId}`,
          method: 'PATCH',
          params: { uploadType: 'media' },
          body: content,
        });
        console.log('Data updated in Google Drive:', fileId);
      } else {
        // Create new file
        const metadata = {
          name: METADATA_FILE_NAME,
          mimeType: 'application/json',
          parents: ['appDataFolder'],
        };
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;

        const multipartRequestBody =
          `${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}` +
          `${delimiter}Content-Type: application/json\r\n\r\n${content}` +
          `${close_delim}`;

        const response = await gapi.client.request({
          path: '/upload/drive/v3/files',
          method: 'POST',
          params: { uploadType: 'multipart' },
          headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
          body: multipartRequestBody,
        });
        console.log('Data saved to Google Drive:', response.result);
      }
    } catch (error) {
      console.error('Error saving data to Google Drive:', error);
      throw new Error(`Failed to save data: ${(error as any).result?.error?.message || (error as any).message}`);
    }
  }

  public async loadData(): Promise<{ encounters: CatEncounter[], preferences: any }> {
    if (!this.driveReady) throw new Error('Google Drive not initialized');
    
    try {
      const fileId = await this.getEncountersFileId();
      if (!fileId) {
        console.log('No app data file found in Google Drive');
        return { encounters: [], preferences: {} };
      }

      const gapi = (window as any).gapi;
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      // Handle cases where response.body might not be a string
      const responseBody = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
      const data = JSON.parse(responseBody);
      
      if (data && data.encounters && data.preferences) {
        return data;
      } else {
        // Handle legacy format
        const encounters = Array.isArray(data) ? data : (data.encounters || []);
        return { encounters, preferences: data.preferences || {} };
      }
    } catch (error: any) {
      // If parsing fails because the file is empty, return empty data
      if (error instanceof SyntaxError) {
        console.warn('App data file is empty or corrupted, starting fresh.');
        return { encounters: [], preferences: {} };
      }
      console.error('Error loading data from Google Drive:', error);
      throw new Error(`Failed to load data: ${error.message}`);
    }
  }

  public async savePhoto(photo: File): Promise<string> {
    if (!this.driveReady) throw new Error('Google Drive not initialized');
    
    const metadata = {
      name: photo.name,
      mimeType: photo.type,
      parents: ['appDataFolder'],
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

    const gapi = (window as any).gapi;
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

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to download photo:', errorData);
        throw new Error(`Failed to download photo: ${errorData.error.message}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Error fetching photo:', error);
      throw error;
    }
  }

  private static async loadScriptDynamically(src: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log(`${name} loaded dynamically`);
        resolve();
      };
      script.onerror = () => {
        reject(new Error(`Failed to load ${name} dynamically`));
      };
      document.head.appendChild(script);
    });
  }

  private static async waitForAllGoogleAPIs(): Promise<void> {
    console.log('Waiting for all Google APIs to load...');
    
    try {
      // Wait for both APIs in parallel
      await Promise.all([
        GoogleDriveService.waitForGoogleIdentity(),
        GoogleDriveService.waitForGoogleAPI()
      ]);
      
      console.log('All Google APIs are ready!');
    } catch (error) {
      console.warn('Initial API loading failed, attempting dynamic loading...', error);
      
      // Try to load scripts dynamically as fallback
      try {
        const loadStatus = (window as any).googleAPILoadStatus;
        
        if (loadStatus.gsiError || !loadStatus.gsi) {
          await GoogleDriveService.loadScriptDynamically('https://accounts.google.com/gsi/client', 'Google Identity Services');
        }
        
        if (loadStatus.gapiError || !loadStatus.gapi) {
          await GoogleDriveService.loadScriptDynamically('https://apis.google.com/js/api.js', 'Google API');
        }
        
        // Wait a bit for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try again
        await Promise.all([
          GoogleDriveService.waitForGoogleIdentity(),
          GoogleDriveService.waitForGoogleAPI()
        ]);
        
        console.log('All Google APIs loaded successfully via fallback!');
      } catch (fallbackError) {
        console.error('Both initial and fallback loading failed:', fallbackError);
        throw new Error('Failed to load Google APIs. Please check your internet connection and try refreshing the page.');
      }
    }
  }

  public static diagnoseGoogleAPIs(): void {
    const loadStatus = (window as any).googleAPILoadStatus;
    console.log('Google APIs Diagnostic:', {
      loadStatus,
      googleObject: typeof (window as any).google,
      gapiObject: typeof (window as any).gapi,
      googleAccounts: !!(window as any).google?.accounts,
      googleOAuth2: !!(window as any).google?.accounts?.oauth2,
      gapiClient: !!(window as any).gapi?.client,
      userAgent: navigator.userAgent,
      location: window.location.href
    });
  }

  public static authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('Starting Google authentication...');
      GoogleDriveService.diagnoseGoogleAPIs();
      
      GoogleDriveService.waitForGoogleIdentity()
        .then(() => {
          console.log('Initializing Google OAuth token client...');
          const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.appdata',
            callback: (response: any) => {
              console.log('OAuth callback received:', response);
              if (response.error) {
                console.error('OAuth error:', response.error);
                return reject(new Error(response.error_description || response.error));
              }
              if (!response.access_token) {
                console.error('No access token in response');
                return reject(new Error('No access token received'));
              }
              console.log('Access token received successfully');
              resolve(response.access_token);
            },
          });
          
          console.log('Requesting access token...');
          tokenClient.requestAccessToken();
        })
        .catch(error => {
          console.error('Failed to initialize Google Identity Services:', error);
          GoogleDriveService.diagnoseGoogleAPIs();
          reject(error);
        });
    });
  }

  private static async waitForGoogleIdentity(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxAttempts = 30; // 3 seconds max wait time
      let attempts = 0;

      const checkIdentity = () => {
        attempts++;
        
        const loadStatus = (window as any).googleAPILoadStatus;
        const gsiError = loadStatus && loadStatus.gsiError;
        const gsiAvailable = typeof (window as any).google !== 'undefined' && 
                            (window as any).google.accounts && 
                            (window as any).google.accounts.oauth2;
        
        // Check if script failed to load
        if (gsiError) {
          console.error('Google Identity Services script failed to load from CDN');
          reject(new Error("Google Identity Services script failed to load. This might be due to network issues or ad blockers. Please check your internet connection and disable any ad blockers, then try again."));
          return;
        }
        
        // Only log every 10 attempts to reduce flooding
        if (attempts % 10 === 0 || attempts === 1) {
          console.log(`Checking Google Identity Services (attempt ${attempts}/30)...`);
        }
        
        if (gsiAvailable) {
          console.log('Google Identity Services is ready!');
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          console.error('Google Identity Services failed to initialize after 3 seconds');
          reject(new Error("Google Identity Services failed to initialize. This might be due to network issues, ad blockers, or browser security settings. Please check your internet connection, disable any ad blockers, and try again."));
          return;
        }

        setTimeout(checkIdentity, 100);
      };

      checkIdentity();
    });
  }

  public static async logout(token: string) {
    if (token) {
      try {
        await GoogleDriveService.waitForGoogleIdentity();
        (window as any).google.accounts.oauth2.revoke(token, () => {});
      } catch (error) {
        console.warn('Could not revoke Google token:', error);
      }
    }
  }
}
