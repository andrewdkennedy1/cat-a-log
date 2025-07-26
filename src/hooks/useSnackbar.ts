import { useState, useCallback } from 'react';

export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showSnackbar = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setSnackbar({ message, type });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(null);
  }, []);

  return { snackbar, showSnackbar, hideSnackbar };
}
