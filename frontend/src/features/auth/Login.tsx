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
    setEmail('admin@brahmi.com');
    setPassword('password123');
    addToast('Credentials pre-filled. Click Log In!', 'info');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/50 to-orange-50/30 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-200/40 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/30 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-50/40 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 bg-white/70 backdrop-blur-xl p-8 rounded-2xl relative z-10 border border-white/80 shadow-[0_20px_50px_rgba(31,41,55,0.05)] hover:shadow-[0_24px_58px_rgba(31,41,55,0.08)] transition-all duration-500 ease-out animate-slide-up">
        <div className="text-center">
          {/* Animated Logo Container */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-orange-500 shadow-[0_8px_20px_rgba(147,51,234,0.25)] hover:rotate-6 transition-transform duration-300 ease-out">
            <span className="font-display font-bold text-3xl text-white select-none">B</span>
          </div>
          <h2 className="mt-6 text-3xl font-display font-extrabold text-slate-800 tracking-tight">
            Brahmi
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Work & Worker Assignment Management
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-200 text-sm shadow-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-200 text-sm shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 rounded-xl border border-transparent text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-[0_10px_25px_-5px_rgba(147,51,234,0.3)] hover:shadow-[0_12px_28px_-5px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5 font-display tracking-wide">
                  Log In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-150"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase font-bold tracking-widest">Or</span>
          <div className="flex-grow border-t border-slate-150"></div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGuestLogin}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white/40 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.99] transition-all duration-250 cursor-pointer text-center block shadow-sm"
          >
            Pre-fill Demo Credentials (Admin)
          </button>
          
          <div className="text-center">
            <a
              href="#register"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors hover:underline"
            >
              Don't have an account? Sign Up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
