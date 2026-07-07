import { useAppStore } from '../../lib/store.ts';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let Icon = Info;
        let borderClass = 'border-slate-200 dark:border-slate-800';
        let iconClass = 'text-blue-500';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          borderClass = 'border-green-200 dark:border-green-900/50 bg-green-50/90 dark:bg-green-950/90';
          iconClass = 'text-green-500';
        } else if (toast.type === 'error') {
          Icon = AlertTriangle;
          borderClass = 'border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/90';
          iconClass = 'text-red-500';
        } else {
          borderClass = 'border-blue-200 dark:border-blue-900/50 bg-blue-50/90 dark:bg-blue-950/90';
          iconClass = 'text-blue-500';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border glass-panel shadow-lg pointer-events-auto animate-slide-up ${borderClass}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <Icon className={`w-5 h-5 ${iconClass}`} />
            </div>
            <div className="flex-grow">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
