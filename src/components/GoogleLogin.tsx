/**
 * Google Login component for authenticating with Google Drive
 */

import { useState } from 'react';
import { googleDriveService } from '../services/GoogleDriveService';
import { useUser } from '../hooks/useUser';

interface GoogleLoginProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function GoogleLogin({ onSuccess, onError }: GoogleLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, setAuthenticated, setGoogleToken, logout } = useUser();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const token = await googleDriveService.authenticate();
      setGoogleToken(token);
      setAuthenticated(true);
      onSuccess?.();
    } catch (error) {
      console.error('Google login failed:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    googleDriveService.logout();
    logout();
  };

  // Check if already authenticated on component mount
  const isGoogleAuthenticated = googleDriveService.isAuthenticated();

  if (isAuthenticated && isGoogleAuthenticated) {
    return (
      <div className="google-login authenticated">
        <div className="auth-status">
          <span className="status-icon">✓</span>
          <span>Connected to Google Drive</span>
        </div>
        <button 
          onClick={handleLogout}
          className="btn btn-secondary"
          type="button"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="google-login">
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="btn btn-primary google-login-btn"
        type="button"
      >
        {isLoading ? (
          <>
            <span className="loading-spinner">⟳</span>
            Connecting...
          </>
        ) : (
          <>
            <span className="google-icon">G</span>
            Connect Google Drive
          </>
        )}
      </button>
      <p className="login-help">
        Connect to Google Drive to automatically backup and sync your cat encounters across devices.
      </p>
    </div>
  );
}