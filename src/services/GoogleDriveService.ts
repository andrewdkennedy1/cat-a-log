/**
 * Service for interacting with Google Drive API
 */

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
          hasGrantedAllScopes: (token: any, ...scopes: string[]) => boolean;
        };
      };
    };
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: any) => Promise<void>;
        request: (config: any) => Promise<any>;
        drive: {
          files: {
            list: (params: any) => Promise<any>;
            create: (params: any) => Promise<any>;
            get: (params: any) => Promise<any>;
          };
        };
      };
    };
  }
}

interface GoogleAuthResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

class GoogleDriveService {
  private static instance: GoogleDriveService;
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private readonly CLIENT_ID = '304619344995-56ll4mek5dnu6lo4d8j9tn44ffqhlmel.apps.googleusercontent.com';
  private readonly SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  private async initializeGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.gapi) {
        // Load GAPI script dynamically if not already loaded
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client', async () => {
            try {
              await window.gapi.client.init({
                discoveryDocs: [this.DISCOVERY_DOC],
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        };
        script.onerror = reject;
        document.head.appendChild(script);
      } else {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: [this.DISCOVERY_DOC],
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      }
    });
  }

  private initializeTokenClient(): void {
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services not loaded');
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (response: GoogleAuthResponse) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
          // Store token in localStorage for persistence
          localStorage.setItem('google_access_token', response.access_token);
          localStorage.setItem('google_token_expires', (Date.now() + response.expires_in * 1000).toString());
        }
      },
    });
  }

  public async authenticate(): Promise<string> {
    try {
      // Check if we have a valid stored token
      const storedToken = localStorage.getItem('google_access_token');
      const tokenExpires = localStorage.getItem('google_token_expires');
      
      if (storedToken && tokenExpires && Date.now() < parseInt(tokenExpires)) {
        this.accessToken = storedToken;
        return storedToken;
      }

      // Initialize GAPI and token client if not already done
      await this.initializeGapi();
      
      if (!this.tokenClient) {
        this.initializeTokenClient();
      }

      // Request new token
      return new Promise((resolve, reject) => {
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (response: GoogleAuthResponse) => {
          originalCallback(response);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('Authentication failed'));
          }
        };
        
        this.tokenClient.requestAccessToken();
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  public isAuthenticated(): boolean {
    const storedToken = localStorage.getItem('google_access_token');
    const tokenExpires = localStorage.getItem('google_token_expires');
    
    return !!(storedToken && tokenExpires && Date.now() < parseInt(tokenExpires));
  }

  public logout(): void {
    this.accessToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expires');
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated()) {
      await this.authenticate();
    }
  }

  public async uploadJsonFile(fileName: string, content: string): Promise<void> {
    try {
      await this.ensureAuthenticated();
      await this.initializeGapi();

      const metadata = {
        name: fileName,
        parents: ['appDataFolder'],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([content], { type: 'application/json' }));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      console.log(`Successfully uploaded ${fileName} to Google Drive`);
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  public async getLatestFile(): Promise<{ id: string, name: string, content: string } | null> {
    try {
      await this.ensureAuthenticated();
      await this.initializeGapi();

      // List files in appDataFolder, ordered by modified time descending
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=parents in 'appDataFolder'&orderBy=modifiedTime desc&pageSize=1`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.files || data.files.length === 0) {
        return null;
      }

      const file = data.files[0];

      // Download file content
      const contentResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!contentResponse.ok) {
        throw new Error(`Failed to download file: ${contentResponse.statusText}`);
      }

      const content = await contentResponse.text();

      return {
        id: file.id,
        name: file.name,
        content,
      };
    } catch (error) {
      console.error('Failed to get latest file:', error);
      throw error;
    }
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
