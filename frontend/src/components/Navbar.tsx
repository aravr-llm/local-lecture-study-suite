import React from 'react';
import {
  LayoutDashboard,
  Library,
  Mic,
  BookOpen,
  Sparkles,
  Award,
  BarChart3,
  Settings,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from '../types';

export type NavTab = 'dashboard' | 'lectures' | 'record' | 'notes' | 'flashcards' | 'quizzes' | 'progress' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, user, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'lectures', label: 'Lectures', icon: Library },
    { id: 'record', label: 'Record', icon: Mic, highlight: true },
    { id: 'notes', label: 'Notes', icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: Sparkles },
    { id: 'quizzes', label: 'Quizzes', icon: Award },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 flex items-center justify-between px-6 py-2.5 select-none">
      {/* Brand logo */}
      <div
        className="flex items-center space-x-2.5 cursor-pointer"
        onClick={() => setCurrentTab('dashboard')}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            LocalLecture
            <span className="text-[10px] uppercase font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
              AI Local
            </span>
          </span>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex items-center space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id as NavTab)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                item.highlight
                  ? isActive
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30'
                  : isActive
                  ? 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${item.highlight ? 'text-rose-400' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User profile & actions */}
      <div className="flex items-center space-x-3 text-xs">
        {user ? (
          <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-slate-300">{user.name}</span>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-slate-400">Guest Mode</div>
        )}
      </div>
    </header>
  );
};
