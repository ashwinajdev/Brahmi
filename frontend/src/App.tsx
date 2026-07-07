import { useEffect, useState } from 'react';
import { useAppStore } from './lib/store.ts';
import { api } from './lib/api.ts';
import Layout from './components/Layout.tsx';
import Dashboard from './features/dashboard/Dashboard.tsx';
import WorkList from './features/work/WorkList.tsx';
import WorkerList from './features/worker/WorkerList.tsx';
import Settings from './features/settings/Settings.tsx';
import Login from './features/auth/Login.tsx';
import Register from './features/auth/Register.tsx';
import ToastContainer from './components/ui/Toast.tsx';
import ConfirmDialog from './components/ui/ConfirmDialog.tsx';
import WorkHistory from './features/work/WorkHistory.tsx';
import { Loader2 } from 'lucide-react';

interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export default function App() {
  const { user, token, setAuth, isLoadingAuth, setLoadingAuth, initTheme } = useAppStore();
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#dashboard');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);

  // Initialize theme
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Listen to hash changes for routing
  useEffect(() => {
    const handleHashChange = () => {
      // Parse hash and see if it contains a work task sub-detail route
      // e.g. #works/uuid
      const hash = window.location.hash || '#dashboard';
      if (hash.startsWith('#works/')) {
        const id = hash.split('#works/')[1];
        setSelectedWorkId(id);
        setCurrentHash('#works');
      } else {
        setSelectedWorkId(null);
        setCurrentHash(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial parse
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Fetch current user details on startup if token is present
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoadingAuth(false);
        // If not on register, fallback to login
        if (window.location.hash !== '#register') {
          window.location.hash = '#login';
        }
        return;
      }

      try {
        const data = await api.get<MeResponse>('/auth/me');
        setAuth(data.user, token);
      } catch (error) {
        console.error('Failed to restore session:', error);
        setAuth(null, null);
        window.location.hash = '#login';
      } finally {
        setLoadingAuth(false);
      }
    };

    fetchUser();
  }, [token, setAuth, setLoadingAuth]);

  // Handle page transitions / programmatic route navigation
  const handleNavigate = (tab: string, argument?: string) => {
    if (argument) {
      window.location.hash = `#${tab}/${argument}`;
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  const handleClearSelection = () => {
    window.location.hash = '#works';
  };

  // 1. Loading State
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-display font-semibold uppercase tracking-widest animate-pulse">
          Synchronizing Brahmi System
        </p>
      </div>
    );
  }

  // 2. Auth Flow Routing
  const isRegisteredView = currentHash === '#register';
  const isLoggedIn = !!user;

  if (!isLoggedIn) {
    if (isRegisteredView) {
      return (
        <>
          <Register />
          <ToastContainer />
          <ConfirmDialog />
        </>
      );
    }
    return (
      <>
        <Login />
        <ToastContainer />
        <ConfirmDialog />
      </>
    );
  }

  // 3. Authenticated Views Layout Routing
  let activeTab = 'dashboard';
  let pageContent = <Dashboard onNavigate={handleNavigate} />;

  switch (currentHash) {
    case '#dashboard':
      activeTab = 'dashboard';
      pageContent = <Dashboard onNavigate={handleNavigate} />;
      break;
    case '#works':
      activeTab = 'works';
      pageContent = (
        <WorkList
          initialSelectedWorkId={selectedWorkId}
          onClearSelection={handleClearSelection}
        />
      );
      break;
    case '#workers':
      activeTab = 'workers';
      pageContent = <WorkerList />;
      break;
    case '#history':
      activeTab = 'history';
      pageContent = <WorkHistory />;
      break;
    case '#settings':
      activeTab = 'settings';
      pageContent = <Settings />;
      break;
    default:
      activeTab = 'dashboard';
      pageContent = <Dashboard onNavigate={handleNavigate} />;
  }

  return (
    <>
      <Layout activeTab={activeTab}>
        {pageContent}
      </Layout>
      <ToastContainer />
      <ConfirmDialog />
    </>
  );
}
