/**
 * Modern Settings component using shadcn/ui
 */

import { useState } from 'react';
import { Palette, Cloud, Download, Upload, Smartphone, Monitor, Sun, Moon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModernGoogleLogin } from './ModernGoogleLogin';
import { useUser } from '@/hooks/useUser';
import { syncService } from '@/services/SyncService';
import { storageService } from '@/services/StorageService';
import type { UserPreferences } from '@/types';

interface ModernSettingsProps {
  preferences: UserPreferences;
  onPreferencesChange: (updates: Partial<UserPreferences>) => void;
  onClose: () => void;
}

export function ModernSettings({ preferences, onPreferencesChange, onClose }: ModernSettingsProps) {
  const { isAuthenticated, hasGoogleToken } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    onPreferencesChange({ theme });
  };

  const handlePhotoQualityChange = (quality: 'low' | 'medium' | 'high') => {
    onPreferencesChange({ photoQuality: quality });
  };

  const handleAutoSyncChange = (autoSync: boolean) => {
    onPreferencesChange({ autoSync });
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await syncService.sync();
      // Show success message
    } catch (error) {
      console.error('Sync failed:', error);
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('This will replace your current data with the backup from Google Drive. Are you sure?')) {
      return;
    }

    setIsLoading(true);
    try {
      await syncService.restore();
      // Show success message
    } catch (error) {
      console.error('Restore failed:', error);
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('This will permanently delete ALL your cat encounter data, photos, and settings. This action cannot be undone. Are you sure?')) {
      return;
    }

    setIsLoading(true);
    try {
      await storageService.clearStorage();
      // Refresh the page to reset the app state
      window.location.reload();
    } catch (error) {
      console.error('Clear data failed:', error);
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={preferences.theme} onValueChange={handleThemeChange}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {getThemeIcon(preferences.theme)}
                    <span className="capitalize">{preferences.theme}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Auto
                  </div>
                </SelectItem>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photoQuality">Photo Quality</Label>
            <Select value={preferences.photoQuality} onValueChange={handlePhotoQualityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Faster upload)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (Best quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Google Drive Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Drive Sync
          </CardTitle>
          <CardDescription>
            Backup and sync your cat encounters across devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModernGoogleLogin />
          
          {isAuthenticated && hasGoogleToken && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync when online
                  </p>
                </div>
                <Button
                  variant={preferences.autoSync ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAutoSyncChange(!preferences.autoSync)}
                >
                  {preferences.autoSync ? "Enabled" : "Disabled"}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSync}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? "Syncing..." : "Backup to Drive"}
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isLoading ? "Restoring..." : "Restore from Drive"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mobile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Settings
          </CardTitle>
          <CardDescription>
            Settings specific to mobile usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Map Zoom</Label>
            <Select 
              value={preferences.defaultMapZoom.toString()} 
              onValueChange={(value) => onPreferencesChange({ defaultMapZoom: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">City Level (10)</SelectItem>
                <SelectItem value="13">Neighborhood (13)</SelectItem>
                <SelectItem value="15">Street Level (15)</SelectItem>
                <SelectItem value="17">Building Level (17)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage your stored data and reset the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Clear All Data</h4>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all your cat encounters, photos, and settings. 
                  This action cannot be undone.
                </p>
                <Button
                  onClick={handleClearData}
                  disabled={isLoading}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isLoading ? "Clearing..." : "Clear All Data"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Close Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={onClose}>
          Close Settings
        </Button>
      </div>
    </div>
  );
}