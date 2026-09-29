import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Sparkles, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { api } from '../api/client';

interface ProgressPageProps {
  onNavigate: (tab: string, lectureId?: string) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({ onNavigate }) => {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProgress()
      .then((res) => setProgress(res))
      .catch((err: any) => setError(err.message || 'Failed to load progress'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl animate-pulse h-24" />)}
      </div>
    );
  }

  const m = progress?.metrics ?? {};
  const recentAttempts: any[] = progress?.recentAttempts ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Study Progress</h2>
        <p className="text-xs text-slate-400 mt-0.5">Your learning analytics — all computed locally</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Lectures', value: m.lecturesCount ?? 0, icon: BookOpen, color: 'text-sky-400', sub: 'Processed locally' },
          { label: 'Cards Due', value: m.dueCards ?? 0, icon: Sparkles, color: 'text-emerald-400', sub: 'Spaced repetition' },
          { label: 'Quiz Accuracy', value: `${m.averageScore ?? 0}%`, icon: Award, color: 'text-amber-400', sub: 'All attempts' },
          { label: 'Mastered Cards', value: m.masteredCards ?? 0, icon: TrendingUp, color: 'text-purple-400', sub: 'Interval > 6 days' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-[11px] text-slate-500">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weak Topics</h3>
          {m.topWeakTopics && m.topWeakTopics.length > 0 ? (
            <div className="space-y-2">
              {m.topWeakTopics.map((topic: string, i: number) => (
                <div key={i} className="bg-slate-950 border border-rose-900/50 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-semibold text-rose-300">{topic}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">Needs Review</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-6">
              No weak topics identified yet. Complete quizzes to generate recommendations.
            </div>
          )}
        </div>

        {/* Recent Quiz Attempts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Quiz Attempts</h3>
          {recentAttempts.length > 0 ? (
            <div className="space-y-2">
              {recentAttempts.slice(0, 8).map((attempt: any) => {
                const pct = Math.round((attempt.score / attempt.total_questions) * 100);
                return (
                  <div key={attempt.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-white">{attempt.quiz_title || 'Quiz'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-6">
              No quiz attempts yet.{' '}
              <button onClick={() => onNavigate('lectures')} className="text-emerald-400 hover:underline">
                Go to a lecture
              </button>{' '}
              to take a quiz.
            </div>
          )}
        </div>
      </div>

      {/* Study Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Keep Your Streak Going</div>
          <div className="text-xs text-slate-400 mt-0.5">Review due cards and practice weak topics daily.</div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('flashcards')}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            Review Flashcards
          </button>
          <button
            onClick={() => onNavigate('lectures')}
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            Practice Quizzes
          </button>
        </div>
      </div>
    </div>
  );
};
