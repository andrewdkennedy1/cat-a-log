import React from 'react';

interface SnackbarProps {
  message: string;
  onClose: () => void;
  type?: 'success' | 'error';
}

export function Snackbar({ message, onClose, type = 'success' }: SnackbarProps) {
  return (
    <div className={`snackbar ${type}`}>
      <p>{message}</p>
      <button onClick={onClose}>&times;</button>
    </div>
  );
}
