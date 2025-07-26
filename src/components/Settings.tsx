import type { ChangeEvent } from 'react';
import type { UserPreferences } from '../types';
import { GoogleLogin } from './GoogleLogin';
import { syncService } from '../services/SyncService';
import { useUser } from '../hooks/useUser';

interface SettingsProps {
  preferences: UserPreferences;
  onPreferencesChange: (updates: Partial<UserPreferences>) => void;
  showSnackbar: (message: string, type?: 'success' | 'error') => void;
}

export function Settings({ preferences, onPreferencesChange, showSnackbar }: SettingsProps) {
  const { isAuthenticated, hasGoogleToken } = useUser();

  const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onPreferencesChange({ theme: e.target.value as 'auto' | 'light' | 'dark' });
  };

  const handleAutoSyncChange = (e: ChangeEvent<HTMLInputElement>) => {
    onPreferencesChange({ autoSync: e.target.checked });
  };

  const handleSync = async () => {
    try {
      await syncService.sync();
      showSnackbar('Sync complete!', 'success');
    } catch (error) {
      console.error('Sync failed:', error);
      showSnackbar('Sync failed. Please try again.', 'error');
    }
  };

  const handleRestore = async () => {
    if (!confirm('This will replace your current data with the backup from Google Drive. Are you sure?')) {
      return;
    }

    try {
      await syncService.restore();
      showSnackbar('Data restored from Google Drive!', 'success');
    } catch (error) {
      console.error('Restore failed:', error);
      showSnackbar('Restore failed. Please try again.', 'error');
    }
  };

  const handleLoginSuccess = () => {
    showSnackbar('Successfully connected to Google Drive!', 'success');
  };

  const handleLoginError = (error: Error) => {
    showSnackbar('Failed to connect to Google Drive. Please try again.', 'error');
  };

  return (
    <div className="settings">
      <h3>Settings</h3>
      
      <div className="settings-section">
        <h4>Appearance</h4>
        <div className="settings-item">
          <label htmlFor="theme-select">Theme</label>
          <select
            id="theme-select"
            value={preferences.theme}
            onChange={handleThemeChange}
          >
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h4>Google Drive Sync</h4>
        <div className="settings-item">
          <GoogleLogin 
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
        </div>
        
        {isAuthenticated && hasGoogleToken && (
          <>
            <div className="settings-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.autoSync}
                  onChange={handleAutoSyncChange}
                />
                Automatically sync when online
              </label>
            </div>
            
            <div className="settings-item">
              <div className="sync-buttons">
                <button onClick={handleSync} className="btn btn-primary">
                  Backup to Google Drive
                </button>
                <button onClick={handleRestore} className="btn btn-secondary">
                  Restore from Google Drive
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
