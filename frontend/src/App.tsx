import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { User, SystemDiagnostics } from './types';

import { Navbar } from './components/Navbar';
import { PrivacyBanner } from './components/PrivacyBanner';
import { FirstRunModal } from './components/FirstRunModal';
import { AudioRecorder } from './components/AudioRecorder';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { LecturesPage } from './pages/LecturesPage';
import { LectureDetailPage } from './pages/LectureDetailPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';

import type { NavTab } from './components/Navbar';

const FIRST_RUN_KEY = 'local_lecture_first_run_shown';

// Extended tab set including internal navigation targets not in the Navbar enum
type AppTab = NavTab | 'lecture-detail';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [activeLectureId, setActiveLectureId] = useState<string | null>(null);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  // Restore session on load
  useEffect(() => {
    api.getMe()
      .then((res) => {
        setUser(res.user);
        if (!localStorage.getItem(FIRST_RUN_KEY)) {
          setShowFirstRun(true);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));

    api.getDiagnostics()
      .then(setDiagnostics)
      .catch(() => {});
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentTab('dashboard');
    if (!localStorage.getItem(FIRST_RUN_KEY)) {
      setShowFirstRun(true);
    }
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    setUser(null);
    setCurrentTab('dashboard');
  };

  const handleFirstRunClose = () => {
    localStorage.setItem(FIRST_RUN_KEY, 'true');
    setShowFirstRun(false);
  };

  // Unified navigation handler used by all pages
  const navigate = (tab: string, lectureId?: string) => {
    setCurrentTab(tab as AppTab);
    if (lectureId) setActiveLectureId(lectureId);
  };

  // Called when recording finishes — jump straight to the lecture detail
  const handleRecordingComplete = (lectureId: string) => {
    setActiveLectureId(lectureId);
    setCurrentTab('lecture-detail');
  };

  // Navbar only handles its own NavTab values; we bridge with setCurrentTab
  const handleNavTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'lectures':
        return <LecturesPage onNavigate={navigate} />;
      case 'lecture-detail':
        return activeLectureId
          ? <LectureDetailPage lectureId={activeLectureId} onNavigate={navigate} />
          : <LecturesPage onNavigate={navigate} />;
      case 'record':
        return (
          <div className="max-w-3xl mx-auto space-y-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Record New Lecture</h2>
              <p className="text-xs text-slate-400 mt-0.5">Audio is stored strictly on your local machine — never uploaded</p>
            </div>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
          </div>
        );
      case 'flashcards':
        return <FlashcardsPage onNavigate={navigate} />;
      case 'quizzes':
        return <QuizzesPage onNavigate={navigate} />;
      case 'progress':
        return <ProgressPage onNavigate={navigate} />;
      case 'settings':
        return <SettingsPage user={user} onLogout={handleLogout} />;
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  // Determine which NavTab is active (lecture-detail shows lectures as active in nav)
  const navTab: NavTab = currentTab === 'lecture-detail' ? 'lectures' : (currentTab as NavTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PrivacyBanner />
      <Navbar
        user={user}
        currentTab={navTab}
        setCurrentTab={handleNavTabChange}
        onLogout={handleLogout}
      />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {renderPage()}
      </main>

      {showFirstRun && (
        <FirstRunModal
          isOpen={showFirstRun}
          onClose={handleFirstRunClose}
          diagnostics={diagnostics}
        />
      )}
    </div>
  );
};
