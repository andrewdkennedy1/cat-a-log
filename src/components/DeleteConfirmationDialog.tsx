/**
 * DeleteConfirmationDialog - Modal component for confirming encounter deletion
 */



interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  encounterInfo: {
    catColor: string;
    catType: string;
    dateTime: string;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  encounterInfo,
  onConfirm,
  onCancel,
  isDeleting = false
}: DeleteConfirmationDialogProps) {
  if (!isOpen || !encounterInfo) {
    return null;
  }

  const formattedDate = new Date(encounterInfo.dateTime).toLocaleDateString();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Delete Encounter</h2>
        
        <div className="mb-4">
          <p>Are you sure you want to delete this encounter?</p>
          <div className="encounter-info mt-2 p-3" style={{ 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <div><strong>{encounterInfo.catColor} {encounterInfo.catType}</strong></div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>{formattedDate}</div>
          </div>
          <p className="mt-2" style={{ color: '#dc3545', fontSize: '0.875rem' }}>
            This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger"
            disabled={isDeleting}
            style={{
              backgroundColor: '#dc3545',
              borderColor: '#dc3545',
              color: 'white'
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}