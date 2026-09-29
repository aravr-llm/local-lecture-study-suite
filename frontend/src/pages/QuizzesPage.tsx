import React, { useState, useEffect } from 'react';
import { HelpCircle, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { QuizRunner } from '../components/QuizRunner';
import { Lecture, QuizSet } from '../types';

interface QuizzesPageProps {
  onNavigate: (tab: string, lectureId?: string) => void;
}

export const QuizzesPage: React.FC<QuizzesPageProps> = ({ onNavigate }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getLectures('', 'newest')
      .then((res) => {
        const completed = res.lectures.filter((l: Lecture) => l.status === 'COMPLETE' && (l.quizzes_count ?? 0) > 0);
        setLectures(completed);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectLecture = async (lec: Lecture) => {
    setSelectedLecture(lec);
    setQuizSets([]);
    setQuizLoading(true);
    try {
      const res = await api.getQuizzes(lec.id);
      setQuizSets(res.quizSets || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setQuizLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {[1, 2].map((i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl animate-pulse h-20" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Practice Quizzes</h2>
        <p className="text-xs text-slate-400 mt-0.5">Test your knowledge from recorded lectures</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {lectures.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <HelpCircle className="w-10 h-10 text-slate-700 mx-auto" />
          <div className="text-sm text-slate-400">No quizzes available yet.</div>
          <p className="text-xs text-slate-500">Record and process a lecture to automatically generate quiz questions.</p>
          <button onClick={() => onNavigate('record')}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            Record a Lecture
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lecture selector */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Lecture</h3>
            {lectures.map((lec) => (
              <button
                key={lec.id}
                onClick={() => selectLecture(lec)}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  selectedLecture?.id === lec.id
                    ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-xs font-bold truncate">{lec.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {lec.quizzes_count} quiz set{(lec.quizzes_count ?? 0) !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>

          {/* Quiz runner */}
          <div className="lg:col-span-2">
            {!selectedLecture ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                Select a lecture to start a quiz.
              </div>
            ) : quizLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl animate-pulse h-48" />
            ) : quizSets.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                No quiz sets found for this lecture.
              </div>
            ) : (
              <QuizRunner
                quizSet={quizSets[0]}
                onAttemptCompleted={() => { if (selectedLecture) selectLecture(selectedLecture); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
