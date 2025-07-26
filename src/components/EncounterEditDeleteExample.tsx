/**
 * Example component demonstrating encounter editing and deletion features
 */

import React from 'react';
import { AppProvider } from '../context/AppContext';
import { EncounterManager } from './EncounterManager';

export function EncounterEditDeleteExample() {
  return (
    <AppProvider>
      <div style={{ height: '100vh', width: '100vw' }}>
        <EncounterManager />
      </div>
    </AppProvider>
  );
}