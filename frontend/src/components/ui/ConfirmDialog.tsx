import { useAppStore } from '../../lib/store.ts';
import { Trash2, AlertCircle, X } from 'lucide-react';

export default function ConfirmDialog() {
  const { confirmDialog, hideConfirm } = useAppStore();

  if (!confirmDialog) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    isDestructive = true
  } = confirmDialog;

  const handleConfirmClick = () => {
    onConfirm();
    hideConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={hideConfirm}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-in flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={hideConfirm}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Container */}
        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-4 ${
          isDestructive 
            ? 'bg-red-500/10 text-red-500' 
            : 'bg-amber-500/10 text-amber-500'
        }`}>
          {isDestructive ? <Trash2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>

        {/* Title & Message */}
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={hideConfirm}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/15 text-white border-none'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/15 text-white border-none'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
