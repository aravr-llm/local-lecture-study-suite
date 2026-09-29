import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  HardDrive,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Key,
} from 'lucide-react';
import { api } from '../api/client';
import { SystemDiagnostics } from '../types';

interface SettingsPageProps {
  user: { email: string; name: string } | null;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Change password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Sync
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; repositoryUrl?: string; message?: string; violations?: string[] } | null>(null);

  // Delete account
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    api.getDiagnostics()
      .then(setDiagnostics)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (newPw.length < 12) { setPwMsg({ type: 'error', text: 'Password must be at least 12 characters.' }); return; }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await api.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const scanRes = await api.getSyncScan();
      if (!scanRes.scan.isSafe) {
        setSyncResult({ success: false, violations: scanRes.scan.violations });
        return;
      }
      const res = await api.triggerSync('local-lecture-study-suite');
      setSyncResult({ success: res.success, repositoryUrl: res.repositoryUrl, message: res.message });
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message || 'Sync failed.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Permanently delete your account and all lecture data? This CANNOT be undone.')) return;
    if (!confirm('Are you absolutely sure? This will delete ALL your recordings, notes, flashcards, and quizzes.')) return;
    setDeleteLoading(true);
    try {
      await api.deleteAccount();
      onLogout();
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Application configuration and account management</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI & Transcription Status */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Local AI & Transcription</h3>
        </div>
        {loading ? (
          <div className="animate-pulse h-16 bg-slate-800 rounded-xl" />
        ) : diagnostics ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="text-slate-400 uppercase tracking-wider font-semibold">AI Provider</div>
                <div className="text-white font-bold">{diagnostics.aiStatus.activeProvider}</div>
                <div className={`text-[10px] ${diagnostics.aiStatus.ollamaAvailable ? 'text-emerald-400' : 'text-slate-500'}`}>
                  Ollama: {diagnostics.aiStatus.ollamaAvailable ? 'Online' : 'Offline'}
                </div>
                <div className={`text-[10px] ${diagnostics.aiStatus.llamacppAvailable ? 'text-emerald-400' : 'text-slate-500'}`}>
                  llama.cpp: {diagnostics.aiStatus.llamacppAvailable ? 'Online' : 'Offline'}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="text-slate-400 uppercase tracking-wider font-semibold">Transcription</div>
                <div className="text-white font-bold">{diagnostics.transcriptionStatus.activeProvider}</div>
                <div className={`text-[10px] ${diagnostics.transcriptionStatus.isAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {diagnostics.transcriptionStatus.isAvailable ? 'Whisper Available' : 'Using Fallback'}
                </div>
              </div>
            </div>
            {diagnostics.aiStatus.availableModels.length > 0 && (
              <div className="text-slate-400">
                Available models: <span className="text-slate-200">{diagnostics.aiStatus.availableModels.join(', ')}</span>
              </div>
            )}
            <div className="bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-lg text-emerald-300">
              {diagnostics.privacyBanners.aiProcessing}
            </div>
          </div>
        ) : null}
      </section>

      {/* Storage */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white">Local Storage</h3>
        </div>
        {loading ? (
          <div className="animate-pulse h-12 bg-slate-800 rounded-xl" />
        ) : diagnostics ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-slate-400 uppercase tracking-wider font-semibold">Audio Recordings</div>
              <div className="text-white font-bold">{diagnostics.storage.audioTotalFormatted}</div>
              <div className="text-[10px] text-slate-500 truncate">{diagnostics.storage.recordingsDir}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-slate-400 uppercase tracking-wider font-semibold">Database</div>
              <div className="text-white font-bold">{diagnostics.storage.databaseSizeFormatted}</div>
              <div className="text-[10px] text-emerald-400">Encrypted at rest</div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Repository Sync */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Private Repository Sync</h3>
        </div>
        <p className="text-xs text-slate-400">
          Upload the application source code to your private GitHub repository. Audio, database, and personal data are never included — a security scan runs first.
        </p>
        <button
          onClick={handleSync}
          disabled={syncLoading}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
          {syncLoading ? 'Scanning & Syncing...' : 'Sync to Private Repository'}
        </button>
        {syncResult && (
          <div className={`text-xs p-3 rounded-xl border ${syncResult.success ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' : 'bg-rose-950/40 border-rose-800/50 text-rose-300'}`}>
            {syncResult.success ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sync successful!
                </div>
                {syncResult.repositoryUrl && (
                  <a href={syncResult.repositoryUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-400 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {syncResult.repositoryUrl}
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-semibold">{syncResult.message || 'Sync failed'}</div>
                {syncResult.violations && syncResult.violations.map((v, i) => (
                  <div key={i} className="text-[10px] text-rose-400">• {v}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Change Password */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Change Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            { label: 'Current Password', value: currentPw, setter: setCurrentPw },
            { label: 'New Password (12+ chars)', value: newPw, setter: setNewPw },
            { label: 'Confirm New Password', value: confirmPw, setter: setConfirmPw },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          ))}
          {pwMsg && (
            <div className={`text-xs p-2.5 rounded-lg ${pwMsg.type === 'success' ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300' : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'}`}>
              {pwMsg.text}
            </div>
          )}
          <button type="submit" disabled={pwLoading}
            className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>

      {/* Account Info & Danger Zone */}
      <section className="bg-slate-900 border border-rose-900/40 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-rose-300">Danger Zone</h3>
        </div>
        <div className="text-xs text-slate-400">
          Signed in as <span className="text-slate-200 font-semibold">{user?.email}</span> ({user?.name})
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onLogout}
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            Sign Out
          </button>
          <button onClick={handleDeleteAccount} disabled={deleteLoading}
            className="bg-rose-900/50 hover:bg-rose-900 border border-rose-800 disabled:opacity-50 text-rose-300 text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            {deleteLoading ? 'Deleting...' : 'Delete Account & All Data'}
          </button>
        </div>
      </section>
    </div>
  );
};
