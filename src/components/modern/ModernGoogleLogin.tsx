/**
 * Modern Google Login component using shadcn/ui
 */

import { useState } from 'react';
import { Cloud, CloudOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { GoogleDriveService } from '@/services/GoogleDriveService';

export function ModernGoogleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const { isAuthenticated, setAuthenticated, setGoogleToken, logout, initializeGoogleDrive, googleToken, hasGoogleDriveService } = useUser();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      console.log('Starting Google authentication...');
      const token = await GoogleDriveService.authenticate();
      console.log('Google authentication successful, token received');
      
      // Set token and authentication state
      setGoogleToken(token);
      setAuthenticated(true);
      
      // Initialize Google Drive service
      await initializeGoogleDrive(token);
      console.log('Google login flow completed successfully');
    } catch (error: unknown) {
      console.error('Google login failed:', error);
      
      // Clear any partial state on failure
      setGoogleToken(undefined);
      setAuthenticated(false);
      
      let errorMessage = 'Google login failed. Please try again.';
      if (error instanceof Error && error.message) {
        if (error.message.includes('failed to load') || error.message.includes('API client failed to load')) {
          errorMessage = 'Google services are still loading. Please wait a moment and try again.';
        } else if (error.message.includes('popup_closed_by_user')) {
          errorMessage = 'Login was cancelled. Please try again if you want to connect to Google Drive.';
        } else if (error.message.includes('invalid_token') || error.message.includes('unauthorized')) {
          errorMessage = 'Authentication failed. Please try signing in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLogoutLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLogoutLoading(false);
    }
  };

  const isGoogleAuthenticated = !!googleToken;
  const isFullyAuthenticated = isAuthenticated && isGoogleAuthenticated && hasGoogleDriveService;

  if (isFullyAuthenticated) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">Connected to Google Drive</p>
                <p className="text-sm text-green-700">Your data is being synced automatically</p>
              </div>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-100"
              disabled={isLogoutLoading}
            >
              {isLogoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <CloudOff className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto">
              <Cloud className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Connect Google Drive</h3>
              <p className="text-sm text-muted-foreground">
                Backup and sync your cat encounters across all your devices
              </p>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Connect Google Drive
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Your data stays private in your Google Drive</p>
            <p>• Automatic backup when online</p>
            <p>• Access from any device</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}