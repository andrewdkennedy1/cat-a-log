
import { useEffect, useRef } from 'react';

interface SnackbarProps {
  message: string;
  onClose: () => void;
  type?: 'success' | 'error';
  duration?: number;
}

export function Snackbar({ message, onClose, type = 'success', duration }: SnackbarProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const defaultDuration = duration || (type === 'error' ? 6000 : 4000);

  useEffect(() => {
    // Auto-close after specified duration
    timeoutRef.current = setTimeout(() => {
      onClose();
    }, defaultDuration);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onClose, defaultDuration]);

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  };

  return (
    <div className={`snackbar ${type}`}>
      <p>{message}</p>
      <button onClick={handleClose}>&times;</button>
    </div>
  );
}
