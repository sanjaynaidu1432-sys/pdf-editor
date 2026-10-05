import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ScannedAlertProps {
  message?: string | null;
  onDismiss: () => void;
}

export const ScannedAlert: React.FC<ScannedAlertProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 select-none shadow-xs z-20">
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold">{message}</span>
          <span className="ml-2 text-amber-700">
            (This document is in view-only mode because text cannot be surgically extracted without OCR)
          </span>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="p-1 rounded hover:bg-amber-100 text-amber-600 transition"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
