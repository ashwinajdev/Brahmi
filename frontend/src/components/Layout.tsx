import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store.ts';
import { useKeepAlive } from '../lib/useKeepAlive.ts';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  LogOut,
  CloudOff,
  Menu,
  X,
  History,
  User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

export default function Layout({ children, activeTab }: LayoutProps) {
  const { user, logout } = useAppStore();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Keep Render backend warm — silent /health ping every 8 minutes
  useKeepAlive();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hash: '#dashboard' },
    { id: 'works', label: 'Work Tasks', icon: Briefcase, hash: '#works' },
    { id: 'workers', label: 'Worker Roster', icon: Users, hash: '#workers' },
    { id: 'history', label: 'Work History', icon: History, hash: '#history' },
    { id: 'settings', label: 'Settings', icon: Settings, hash: '#settings' },
  ];

  const getTitle = () => {
    const item = menuItems.find((m) => m.id === activeTab);
    return item ? item.label : 'Brahmi';
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row overflow-hidden">
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-1.5 shadow-md animate-fade-in">
          <CloudOff className="w-4 h-4" />
          <span>Offline mode — viewing cached data. Some features may be limited.</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-screen sticky top-0 ${isOffline ? 'pt-8' : ''}`}>
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-200 dark:border-slate-800">
          <img src="/brahmi-logo.png" alt="Brahmi Logo" loading="eager" decoding="async" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Brahmi
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-grow p-4 space-y-1" aria-label="Main navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.hash}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-l-4 border-sky-500 pl-3'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">

          {user && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-2.5">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                aria-label="Log out of Brahmi"
                className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Shell Container */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className={`md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 sticky top-0 z-30 ${isOffline ? 'mt-7' : ''}`} aria-label="Mobile app header">
          <div className="flex items-center gap-2">
            <img src="/brahmi-logo.png" alt="Brahmi Logo" loading="eager" decoding="async" className="h-7 w-7 rounded-md object-cover" />
            {/* Using span instead of h1 — the main content area owns the page-level h1 heading */}
            <span className="font-display font-bold text-md text-slate-900 dark:text-white" aria-live="polite">
              {getTitle()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">

            {user && (
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label={`View profile for ${user.name}`}
                aria-expanded={isProfileOpen}
                className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <User className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-menu"
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </header>

        {/* Mobile Slide-out Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <nav
              id="mobile-nav-menu"
              aria-label="Mobile navigation"
              className={`absolute top-14 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xl animate-fade-in`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-2 gap-2">
                {menuItems
                  .filter((item) => item.id !== 'settings')
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <a
                        key={item.id}
                        href={item.hash}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl text-xs font-semibold gap-2 border border-slate-100 dark:border-slate-800/60 transition-all ${
                          isActive
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        {item.label}
                      </a>
                    );
                  })}
              </div>
              <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={logout}
                  aria-label="Log out of Brahmi"
                  className="flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Mobile Profile Dropdown Overlay */}
        {isProfileOpen && user && (
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setIsProfileOpen(false)}
          >
            <div
              className="absolute top-14 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xl w-60 z-50 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.name} profile photo`}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-full object-cover mx-auto mb-2 border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto mb-2 border border-slate-200 dark:border-slate-800 shrink-0">
                    <User className="w-6 h-6" aria-hidden="true" />
                  </div>
                )}
                <p className="text-xs font-bold">{user.name}</p>
                <p className="text-[10px] text-slate-400">{user.email}</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  aria-label="Log out of Brahmi"
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" /> Log Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md items-center justify-between px-8 shrink-0">
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
            {getTitle()}
          </h1>

          <div className="flex items-center gap-4">

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
              PWA Online
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow p-3 md:p-8 overflow-y-auto overscroll-contain bg-slate-50 dark:bg-slate-950 select-none pb-20 md:pb-8" id="main-content" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (Full Width) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-lg h-16 flex items-center justify-around px-2 select-none" aria-label="Bottom navigation">
          {menuItems
            .filter((item) => item.id !== 'settings')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={item.hash}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center min-w-[64px] h-12 rounded-xl gap-0.5 transition-all duration-300 ${
                    isActive
                      ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 scale-105 font-bold'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-355'
                  }`}
                >
                  <Icon className={`transition-transform duration-300 ${isActive ? 'w-5 h-5 scale-110' : 'w-5 h-5'}`} aria-hidden="true" />
                  <span className={`text-[9px] tracking-tight font-extrabold transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-85'}`}>
                    {item.id === 'history' ? 'History' : item.label.split(' ')[0]}
                  </span>
                </a>
              );
            })}
        </nav>
      </div>
    </div>
  );
}
