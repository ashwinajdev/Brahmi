import React, { useState } from 'react';
import { useAppStore } from '../../lib/store.ts';
import { api } from '../../lib/api.ts';
import { User2, KeyRound, Mail, Loader2, ArrowRight, Image } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/50 to-orange-50/30 px-4 sm:px-6 lg:px-8 relative overflow-hidden py-12">
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
            Create Account
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Sign up to start assigning work and tracking tasks
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">
                  <User2 className="w-5 h-5" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-200 text-sm shadow-sm"
                  placeholder="Aditi Sharma"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-200 text-sm shadow-sm"
                  placeholder="aditi@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="avatarUrl" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Avatar URL (Optional)
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">
                  <Image className="w-5 h-5" />
                </span>
                <input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-200 text-sm shadow-sm"
                  placeholder="https://images.unsplash.com/... (Image URL)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-200 text-sm shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Confirm Password *
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-200 text-sm shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 rounded-xl border border-transparent text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-[0_10px_25px_-5px_rgba(147,51,234,0.3)] hover:shadow-[0_12px_28px_-5px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5 font-display tracking-wide">
                  Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <a
            href="#login"
            className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors hover:underline"
          >
            Already have an account? Log In
          </a>
        </div>
      </div>
    </div>
  );
}
