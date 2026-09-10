import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 sm:bottom-6 right-0 sm:right-6 left-0 sm:left-auto z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-4 mx-auto sm:mx-0">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto p-3.5 sm:p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 transition-all duration-300 animate-slideUp ${
        toast.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
          : toast.type === 'error'
          ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
          : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-200'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />}
        {toast.type === 'info' && <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="text-xs sm:text-sm font-bold text-white font-heading">{toast.title}</h4>
        {toast.message && <p className="text-[11px] sm:text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-opacity shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
};
