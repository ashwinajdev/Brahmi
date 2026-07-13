import { useEffect, useState, lazy, Suspense } from 'react';
import { useAppStore } from './lib/store.ts';
import { api } from './lib/api.ts';
import Layout from './components/Layout.tsx';
import ToastContainer from './components/ui/Toast.tsx';
import ConfirmDialog from './components/ui/ConfirmDialog.tsx';
import { Loader2 } from 'lucide-react';

// Lazy-load all route-level feature components
// This eliminates ~851 KiB of unused JS on initial load (Lighthouse: Reduce unused JavaScript)
const Dashboard = lazy(() => import('./features/dashboard/Dashboard.tsx'));
const WorkList = lazy(() => import('./features/work/WorkList.tsx'));
const WorkerList = lazy(() => import('./features/worker/WorkerList.tsx'));
const Settings = lazy(() => import('./features/settings/Settings.tsx'));
const Login = lazy(() => import('./features/auth/Login.tsx'));
const Register = lazy(() => import('./features/auth/Register.tsx'));
const WorkHistory = lazy(() => import('./features/work/WorkHistory.tsx'));

interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

// Shared page-level loading spinner for Suspense fallback
function PageLoader() {
  return (
    <div
      className="flex-grow flex items-center justify-center py-24"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Loader2
        className="w-8 h-8 animate-spin"
        style={{ color: 'var(--accent-purple)' }}
      />
    </div>
  );
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
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        <Loader2
          className="w-10 h-10 animate-spin mb-4"
          style={{ color: 'var(--accent-purple)' }}
        />
        <p
          className="text-xs font-display font-semibold uppercase tracking-widest animate-pulse"
          style={{ color: 'var(--text-secondary)' }}
        >
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
          <Suspense fallback={<PageLoader />}>
            <Register />
          </Suspense>
          <ToastContainer />
          <ConfirmDialog />
        </>
      );
    }
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Login />
        </Suspense>
        <ToastContainer />
        <ConfirmDialog />
      </>
    );
  }

  // 3. Authenticated Views Layout Routing
  let activeTab = 'dashboard';
  let pageContent = (
    <Suspense fallback={<PageLoader />}>
      <Dashboard onNavigate={handleNavigate} />
    </Suspense>
  );

  switch (currentHash) {
    case '#dashboard':
      activeTab = 'dashboard';
      pageContent = (
        <Suspense fallback={<PageLoader />}>
          <Dashboard onNavigate={handleNavigate} />
        </Suspense>
      );
      break;
    case '#works':
      activeTab = 'works';
      pageContent = (
        <Suspense fallback={<PageLoader />}>
          <WorkList
            initialSelectedWorkId={selectedWorkId}
            onClearSelection={handleClearSelection}
          />
        </Suspense>
      );
      break;
    case '#workers':
      activeTab = 'workers';
      pageContent = (
        <Suspense fallback={<PageLoader />}>
          <WorkerList />
        </Suspense>
      );
      break;
    case '#history':
      activeTab = 'history';
      pageContent = (
        <Suspense fallback={<PageLoader />}>
          <WorkHistory />
        </Suspense>
      );
      break;
    case '#settings':
      activeTab = 'settings';
      pageContent = (
        <Suspense fallback={<PageLoader />}>
          <Settings />
        </Suspense>
      );
      break;
    default:
      activeTab = 'dashboard';
      pageContent = (
        <Suspense fallback={<PageLoader />}>
          <Dashboard onNavigate={handleNavigate} />
        </Suspense>
      );
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
