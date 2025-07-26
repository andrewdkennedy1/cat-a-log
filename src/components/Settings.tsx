import React from 'react';
import type { UserPreferences } from '../types';

interface SettingsProps {
  preferences: UserPreferences;
  onPreferencesChange: (updates: Partial<UserPreferences>) => void;
}

import { syncService } from '../services/SyncService';

export function Settings({ preferences, onPreferencesChange }: SettingsProps) {
  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPreferencesChange({ theme: e.target.value as 'auto' | 'light' | 'dark' });
  };

  const handleSync = async () => {
    try {
      await syncService.sync();
      alert('Sync complete!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. See console for details.');
    }
  };

  return (
    <div className="settings">
      <h3>Settings</h3>
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
      <div className="settings-item">
        <button onClick={handleSync} className="btn btn-primary">
          Sync with Google Drive
        </button>
      </div>
    </div>
  );
}
