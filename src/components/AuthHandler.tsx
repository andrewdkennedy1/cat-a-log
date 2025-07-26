/**
 * Component to handle OAuth callback and authentication state
 */

import { useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { googleDriveService } from '../services/GoogleDriveService';

export function AuthHandler() {
  const { setAuthenticated, setGoogleToken } = useUser();

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuthStatus = () => {
      if (googleDriveService.isAuthenticated()) {
        const token = localStorage.getItem('google_access_token');
        if (token) {
          setGoogleToken(token);
          setAuthenticated(true);
        }
      }
    };

    // Check auth status when component mounts
    checkAuthStatus();

    // Handle OAuth callback if we're on the auth page
    const handleAuthCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        // This would be handled by the Google Identity Services library
        // but we can clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleAuthCallback();
  }, [setAuthenticated, setGoogleToken]);

  return null; // This component doesn't render anything
}