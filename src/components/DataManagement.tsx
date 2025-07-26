import React from 'react';

interface DataManagementProps {
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DataManagement({ onExport, onImport }: DataManagementProps) {
  return (
    <div className="data-management">
      <h3>Data Management</h3>
      <div className="data-management-actions">
        <button onClick={onExport} className="btn btn-secondary">
          Export Data
        </button>
        <label htmlFor="import-file" className="btn btn-secondary">
          Import Data
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={onImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
