import { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store.ts';
import {
  Info,
  Download,
  Smartphone,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function Settings() {
  const { user } = useAppStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Listen for PWA installation trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* 2. User Profile Display Card */}
      {user && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            User Profile
          </h3>
          
          <div className="flex items-center gap-4 p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border"
            />
            <div className="min-w-0">
              <span className="inline-block text-[9px] font-extrabold bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full mb-1">
                Admin Manager
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</h4>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. PWA Installation Information Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          PWA Desktop & Mobile App
        </h3>
        <p className="text-xs text-slate-400">
          Install Brahmi directly on your home screen or desktop dashboard to run it like a native application with offline support.
        </p>

        {isInstalled ? (
          <div className="flex items-center gap-3 p-3.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-xs font-semibold">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Brahmi is successfully running as an installed PWA. Offline database query enabled!</span>
          </div>
        ) : isInstallable ? (
          <div className="flex items-center justify-between p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-purple-500 shrink-0" />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">App ready to install</span>
                <span className="text-[10px] text-slate-400">Click to install as full window desktop app</span>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-orange-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md"
            >
              Install App
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs">
              <Info className="w-5 h-5 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">
                To install on desktop, click the installation icon in your browser's address bar.
              </span>
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-purple-500" /> iOS & Safari Installation (Mobile)
              </h4>
              <ol className="text-[11px] list-decimal list-inside text-slate-500 dark:text-slate-400 space-y-1 pl-1 leading-relaxed">
                <li>Open this site inside the default <strong>Safari Browser</strong>.</li>
                <li>Tap the <strong>Share</strong> button (box with an up arrow) at the bottom screen center.</li>
                <li>Scroll down the actions list and tap <strong>Add to Home Screen</strong>.</li>
                <li>Confirm by typing a name and tapping <strong>Add</strong>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* 4. About Brahmi System */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900/30 rounded-2xl text-[10px] text-slate-400 flex items-center justify-between select-none">
        <span>System Version: v1.0.0-stable</span>
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Built for Brahmi Workers
        </span>
      </div>
    </div>
  );
}
