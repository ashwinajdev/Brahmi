import React, { useState } from 'react';
import { useAppStore } from '../../lib/store.ts';
import { api } from '../../lib/api.ts';
import { User2, KeyRound, Mail, Loader2, ArrowRight } from 'lucide-react';

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth, addToast } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.post<RegisterResponse>('/auth/register', {
        email,
        password,
        name,
        avatarUrl: avatarUrl || undefined,
      });
      setAuth(data.user, data.token);
      addToast(`Account created! Welcome, ${data.user.name}!`, 'success');
      window.location.hash = '#dashboard';
    } catch (error: any) {
      addToast(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
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
            Create Account
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign up to start assigning work and tracking tasks
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full Name *
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User2 className="w-5 h-5" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  placeholder="Aditi Sharma"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address *
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  placeholder="aditi@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="avatarUrl" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Avatar URL (Optional)
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User2 className="w-5 h-5" />
                </span>
                <input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  placeholder="https://images.unsplash.com/... (Image URL)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password *
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  placeholder="•••••••• (Min 6 chars)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 rounded-xl border border-transparent text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5 font-display">
                  Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <a
            href="#login"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            Already have an account? Log In
          </a>
        </div>
      </div>
    </div>
  );
}
