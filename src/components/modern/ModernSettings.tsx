/**
 * Modern Settings component using shadcn/ui
 */

import { useState } from 'react';
import { Palette, Cloud, Download, Upload, Smartphone, Trash2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModernGoogleLogin } from './ModernGoogleLogin';
import { InstallPWAButton } from './InstallPWAButton';
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
    } catch (error) {
      console.error('Sync failed:', error);
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
      const encounters = await syncService.restore();
      // Refresh the page to show restored data
      if (encounters.length > 0) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Restore failed:', error);
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



      {/* PWA Install */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Install App
          </CardTitle>
          <CardDescription>
            Install CAT-a-log on your device for a better experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallPWAButton />
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

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link to="/policy" className="block">
            <Button variant="link" className="p-0 h-auto">Privacy Policy</Button>
          </Link>
          <Link to="/tos" className="block">
            <Button variant="link" className="p-0 h-auto">Terms of Service</Button>
          </Link>
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