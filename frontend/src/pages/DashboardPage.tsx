import React, { useState, useEffect } from 'react';
import {
  Mic,
  BookOpen,
  Sparkles,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { api } from '../api/client';
import { Lecture } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string, lectureId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [lecRes, progRes] = await Promise.all([api.getLectures('', 'newest'), api.getProgress()]);
        setRecentLectures(lecRes.lectures.slice(0, 4));
        setProgress(progRes);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local Study Assistant Active</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Ready to study your local lectures?
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All audio recordings, Whisper transcriptions, notes, and study cards are processed strictly on this machine. Zero cloud telemetry.
          </p>
        </div>

        <button
          onClick={() => onNavigate('record')}
          className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5"
        >
          <Mic className="w-4 h-4" />
          <span>Record New Lecture</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Lectures</span>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{progress?.metrics?.lecturesCount ?? 0}</div>
          <div className="text-[11px] text-slate-500">Processed locally</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Cards Due</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{progress?.metrics?.dueCards ?? 0}</div>
          <button
            onClick={() => onNavigate('flashcards')}
            className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
          >
            Review deck now <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Quiz Accuracy</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{progress?.metrics?.averageScore ?? 0}%</div>
          <div className="text-[11px] text-slate-500">Across practice attempts</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Mastered Cards</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{progress?.metrics?.masteredCards ?? 0}</div>
          <div className="text-[11px] text-slate-500">SM-2 interval &gt; 6 days</div>
        </div>
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Lectures */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Lectures</h3>
            <button
              onClick={() => onNavigate('lectures')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              View all
            </button>
          </div>

          {recentLectures.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <div>No lectures recorded yet. Start your first recording!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLectures.map((lec) => (
                <div
                  key={lec.id}
                  onClick={() => onNavigate('lectures', lec.id)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition cursor-pointer flex items-center justify-between group shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-slate-950 border border-slate-800 text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {lec.subject}
                      </span>
                      <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">
                        {lec.title}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(lec.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(lec.duration_seconds / 60)} min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        lec.status === 'COMPLETE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : lec.status === 'FAILED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                      }`}
                    >
                      {lec.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Study Focus & Weak Topics */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Study Focus Areas</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <p className="text-xs text-slate-400 leading-relaxed">
              Topics where quiz questions were missed or flashcards marked difficult:
            </p>
            {progress?.metrics?.topWeakTopics && progress.metrics.topWeakTopics.length > 0 ? (
              <div className="space-y-2">
                {progress.metrics.topWeakTopics.map((topic: string, i: number) => (
                  <div
                    key={i}
                    className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-rose-300">{topic}</span>
                    <span className="text-[10px] text-slate-500">Needs review</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-center text-xs text-slate-400 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <div>No weak topics identified yet. Complete quizzes to generate recommendations!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
