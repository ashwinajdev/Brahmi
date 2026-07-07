import React, { useState } from 'react';
import { useAppStore } from '../../lib/store.ts';
import { api } from '../../lib/api.ts';
import { KeyRound, Mail, Loader2, ArrowRight } from 'lucide-react';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth, addToast } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      setAuth(data.user, data.token);
      addToast(`Welcome back, ${data.user.name}!`, 'success');
      window.location.hash = '#dashboard';
    } catch (error: any) {
      addToast(error.message || 'Login failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // For easy evaluation, let users log in as the default admin user seeded
    setEmail('admin@brahmi.com');
    setPassword('password123');
    addToast('Credentials pre-filled. Click Log In!', 'info');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 glass-panel p-8 rounded-2xl relative z-10 border border-slate-800 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-orange-500 shadow-md">
            <span className="font-display font-bold text-3xl text-white">B</span>
          </div>
          <h2 className="mt-6 text-3xl font-display font-extrabold text-white tracking-tight">
            Brahmi
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Work & Worker Assignment Management
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 rounded-xl border border-transparent text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5 font-display">
                  Log In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase font-medium">Or</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGuestLogin}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-900/30 text-xs font-medium text-slate-300 hover:bg-slate-900/60 transition-all cursor-pointer text-center block"
          >
            Pre-fill Demo Credentials (Admin)
          </button>
          
          <div className="text-center">
            <a
              href="#register"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              Don't have an account? Sign Up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
