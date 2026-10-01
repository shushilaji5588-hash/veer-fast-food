import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Eye, EyeOff, UtensilsCrossed, AlertCircle, Database, Check } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your Username or Employee ID.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your Password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(username.trim(), password.trim());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="flex-1 min-h-[90vh] flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="w-full max-w-sm">
        {/* Brand Banner Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 p-1 shadow-2xl shadow-amber-500/20 mb-3 ring-4 ring-gray-800">
            <div className="w-full h-full bg-gray-950 rounded-[22px] flex items-center justify-center">
              <UtensilsCrossed className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            <span className="text-amber-400">VEER</span>{' '}
            <span className="text-red-500">FAST FOOD</span>
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">
            Restaurant &amp; Hotel Management POS
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
            <Database className="w-3 h-3" />
            <span>100% Offline SQLite Database</span>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Username / Employee ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or EMP001"
                  className="w-full bg-gray-950/90 border border-gray-800 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  autoCapitalize="none"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-gray-950/90 border border-gray-800 rounded-2xl px-4 py-3.5 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-gray-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Verifying Offline Database...' : 'LOGIN'}</span>
            </button>
          </form>

          {/* Quick Demo Credentials for Fast Testing */}
          <div className="mt-6 pt-5 border-t border-gray-800/80">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
              Quick Test Credentials:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin', 'admin123')}
                className="p-2 rounded-xl bg-gray-950/80 border border-gray-800 hover:border-amber-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400">Admin</span>
                  <Check className="w-3 h-3 text-gray-600 group-hover:text-amber-400" />
                </div>
                <p className="text-[10px] text-gray-400 font-mono">admin / admin123</p>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('EMP001', '1234')}
                className="p-2 rounded-xl bg-gray-950/80 border border-gray-800 hover:border-blue-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-400">Rajesh</span>
                  <Check className="w-3 h-3 text-gray-600 group-hover:text-blue-400" />
                </div>
                <p className="text-[10px] text-gray-400 font-mono">EMP001 / 1234</p>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('EMP002', '1234')}
                className="p-1.5 rounded-lg bg-gray-950/50 border border-gray-800/70 text-left hover:border-gray-700"
              >
                <span className="text-[11px] font-semibold text-gray-300">Suresh (EMP002)</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('EMP003', '1234')}
                className="p-1.5 rounded-lg bg-gray-950/50 border border-gray-800/70 text-left hover:border-gray-700"
              >
                <span className="text-[11px] font-semibold text-gray-300">Pooja (EMP003)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
