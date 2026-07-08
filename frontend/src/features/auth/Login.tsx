import { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store.ts';
import { api } from '../../lib/api.ts';
import { Loader2, Check, Delete, Lock } from 'lucide-react';

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
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const { setAuth, addToast } = useAppStore();

  const handlePinSubmit = async (enteredPin = pin) => {
    if (isLoading) return;
    
    if (enteredPin.length === 0) {
      addToast('Please enter your PIN', 'info');
      return;
    }

    if (enteredPin !== '2525') {
      setIsShaking(true);
      addToast('Incorrect PIN. Please try again.', 'error');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 500);
      return;
    }

    setIsLoading(true);
    try {
      // Under the hood, log in as the default admin user
      const data = await api.post<LoginResponse>('/auth/login', {
        email: 'admin@brahmi.com',
        password: 'password123',
      });
      setAuth(data.user, data.token);
      addToast(`Welcome back, ${data.user.name}!`, 'success');
      window.location.hash = '#dashboard';
    } catch (error: any) {
      addToast(error.message || 'Login failed. Please try again.', 'error');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberClick = (num: number) => {
    if (isLoading) return;
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  // Keyboard support for typing PIN
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handlePinSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pin, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/50 to-orange-50/30 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950/80 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-200/40 dark:bg-purple-900/10 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/30 dark:bg-orange-900/10 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-50/40 dark:bg-indigo-950/10 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 rounded-2xl relative z-10 border border-white/80 dark:border-slate-800/80 shadow-[0_20px_50px_rgba(31,41,55,0.05)] hover:shadow-[0_24px_58px_rgba(31,41,55,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 ease-out animate-slide-up">
        <div className="text-center">
          {/* Animated Logo Container */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-orange-500 shadow-[0_8px_20px_rgba(147,51,234,0.25)] hover:rotate-6 transition-transform duration-300 ease-out">
            <span className="font-display font-bold text-3xl text-white select-none">B</span>
          </div>
          <h2 className="mt-6 text-2xl font-display font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Security Lock
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
            Enter PIN to access the application
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex flex-col items-center justify-center space-y-6 my-6">
          <div className={`flex justify-center space-x-6 py-2 ${isShaking ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    hasDigit
                      ? 'bg-gradient-to-r from-purple-600 to-orange-500 scale-125 shadow-[0_0_10px_rgba(147,51,234,0.5)]'
                      : 'bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600'
                  }`}
                />
              );
            })}
          </div>
          
          <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 font-medium">
            <Lock className="w-3.5 h-3.5 mr-1" />
            <span>4-digit security code</span>
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto pt-2 pb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumberClick(num)}
              disabled={isLoading}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 active:scale-95 transition-all duration-150 shadow-sm border border-slate-100 dark:border-slate-750 disabled:opacity-50 select-none cursor-pointer"
            >
              {num}
            </button>
          ))}
          
          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading || pin.length === 0}
            className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all duration-150 disabled:opacity-30 select-none cursor-pointer"
            title="Delete last digit"
          >
            <Delete className="w-6 h-6" />
          </button>

          {/* 0 Button */}
          <button
            type="button"
            onClick={() => handleNumberClick(0)}
            disabled={isLoading}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 active:scale-95 transition-all duration-150 shadow-sm border border-slate-100 dark:border-slate-750 disabled:opacity-50 select-none cursor-pointer"
          >
            0
          </button>

          {/* Submit/Tick Button */}
          <button
            type="button"
            onClick={() => handlePinSubmit()}
            disabled={isLoading}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white bg-gradient-to-tr from-purple-600 to-orange-500 hover:from-purple-500 hover:to-orange-450 hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(147,51,234,0.3)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-150 disabled:opacity-50 select-none cursor-pointer"
            title="Login to app"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Check className="w-7 h-7 stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Minimal Registration Link (hidden/subtle) */}
        <div className="text-center pt-2">
          <a
            href="#register"
            className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            Switch to Email Registration
          </a>
        </div>
      </div>
    </div>
  );
}
