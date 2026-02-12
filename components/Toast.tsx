
import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border min-w-[280px] animate-in slide-in-from-right duration-300
            ${toast.type === 'success' ? 'bg-slate-900 border-emerald-500/30 text-emerald-400' : 
              toast.type === 'error' ? 'bg-slate-900 border-red-500/30 text-red-400' : 
              'bg-slate-900 border-blue-500/30 text-blue-400'}
          `}
        >
          <div className="shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
          </div>
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
