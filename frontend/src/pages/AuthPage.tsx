import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User as UserIcon, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

interface AuthPageProps {
  onAuthenticated: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        onAuthenticated(res.user);
      } else {
        const res = await api.register({ email, password, name });
        onAuthenticated(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Privacy guarantee badge */}
      <div className="mb-6 flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/80 px-3.5 py-1.5 rounded-full text-emerald-300 text-xs shadow-lg">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold">Local-First Architecture: Zero Cloud Data Transmission</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Local<span className="text-emerald-400">Lecture</span>
          </h1>
          <p className="text-xs text-slate-400">
            {isLogin
              ? 'Sign in to access your local offline lecture repository'
              : 'Create a local account secured with Argon2id hashing'}
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-rose-950/50 border border-rose-800/60 p-3 rounded-xl text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Your Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Arav Raina"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {!isLogin && (
              <p className="text-[10px] text-slate-500 mt-1">
                Must be at least 8 characters with letters and numbers/symbols.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In Locally' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            {isLogin ? "Don't have a local account? Register here" : 'Already registered? Sign in'}
          </button>
        </div>

        {/* Security badge footer */}
        <div className="border-t border-slate-800/80 pt-4 text-center space-y-1">
          <div className="text-[11px] font-semibold text-slate-400">
            Protected by Argon2id Cryptographic Hashing
          </div>
          <p className="text-[10px] text-slate-500">
            Passwords never leave your device. Stored locally in SQLite.
          </p>
        </div>
      </div>
    </div>
  );
};
