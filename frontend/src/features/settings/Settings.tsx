import { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store.ts';
import { t } from '../../lib/i18n.ts';
import {
  Info,
  Download,
  Smartphone,
  CheckCircle,
  HelpCircle,
  User,
  Languages
} from 'lucide-react';

export default function Settings() {
  const { user, language, setLanguage } = useAppStore();
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
            {t(language, 'userProfile')}
          </h3>
          
          <div className="flex items-center gap-4 p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                <User className="w-8 h-8" />
              </div>
            )}
            <div className="min-w-0">
              <span className="inline-block text-[9px] font-extrabold bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full mb-1">
                {t(language, 'adminManager')}
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</h4>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Language Setting Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Languages className="w-4 h-4 text-sky-500" />
          {t(language, 'language')}
        </h3>
        <p className="text-xs text-slate-400">{t(language, 'languageDesc')}</p>

        <div className="flex gap-3">
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
              language === 'en'
                ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className="text-lg">🇬🇧</span>
            {t(language, 'english')}
            {language === 'en' && <span className="ml-auto text-sky-500 text-xs font-bold">✓</span>}
          </button>

          <button
            onClick={() => setLanguage('kn')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
              language === 'kn'
                ? 'border-orange-500 bg-orange-500/10 text-orange-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className="text-lg">🇮🇳</span>
            {t(language, 'kannada')}
            {language === 'kn' && <span className="ml-auto text-orange-500 text-xs font-bold">✓</span>}
          </button>
        </div>
      </div>

      {/* 3. PWA Installation Information Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          {t(language, 'pwaTitle')}
        </h3>
        <p className="text-xs text-slate-400">
          {t(language, 'pwaDesc')}
        </p>

        {isInstalled ? (
          <div className="flex items-center gap-3 p-3.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-xs font-semibold">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{t(language, 'pwaInstalled')}</span>
          </div>
        ) : isInstallable ? (
          <div className="flex items-center justify-between p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-sky-500 shrink-0" />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{t(language, 'appReady')}</span>
                <span className="text-[10px] text-slate-400">{t(language, 'appReadyDesc')}</span>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-colors"
            >
              {t(language, 'installApp')}
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs">
              <Info className="w-5 h-5 text-slate-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">
                {t(language, 'pwaDesktopHint')}
              </span>
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-500" /> {t(language, 'iosTitle')}
              </h4>
              <ol className="text-[11px] list-decimal list-inside text-slate-500 dark:text-slate-400 space-y-1 pl-1 leading-relaxed">
                <li dangerouslySetInnerHTML={{ __html: t(language, 'iosStep1') }} />
                <li dangerouslySetInnerHTML={{ __html: t(language, 'iosStep2') }} />
                <li dangerouslySetInnerHTML={{ __html: t(language, 'iosStep3') }} />
                <li dangerouslySetInnerHTML={{ __html: t(language, 'iosStep4') }} />
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* 4. About Brahmi System */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900/30 rounded-2xl text-[10px] text-slate-400 flex items-center justify-between select-none">
        <span>{t(language, 'systemVersion')}</span>
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> {t(language, 'builtFor')}
        </span>
      </div>
    </div>
  );
}
