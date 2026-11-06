import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

// Replaces the browser's window.confirm so destructive actions keep the
// app's look and can show a busy state while the request runs.
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) {
    return null;
  }

  const confirmClass =
    tone === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-card max-w-sm">

        <div className="p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="icon-tile shrink-0 bg-red-100 text-red-600">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h2 className="text-lg font-black text-black">
                {title}
              </h2>

              {message && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary flex-1"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`${confirmClass} flex-1`}
            >
              {loading ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;
