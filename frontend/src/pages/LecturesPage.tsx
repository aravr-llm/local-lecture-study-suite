import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Trash2,
  RefreshCw,
  Clock,
  Calendar,
  ChevronDown,
  Mic,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { Lecture } from '../types';

interface LecturesPageProps {
  onNavigate: (tab: string, lectureId?: string) => void;
}

const STATUS_COLORS: Record<Lecture['status'], string> = {
  RECORDING: 'bg-sky-950 text-sky-400 border-sky-800 animate-pulse',
  RECORDED: 'bg-slate-800 text-slate-300 border-slate-700',
  TRANSCRIBING: 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse',
  TRANSCRIBED: 'bg-amber-950 text-amber-300 border-amber-800',
  ANALYZING: 'bg-purple-950 text-purple-400 border-purple-800 animate-pulse',
  GENERATING_NOTES: 'bg-purple-950 text-purple-400 border-purple-800 animate-pulse',
  GENERATING_FLASHCARDS: 'bg-purple-950 text-purple-300 border-purple-800 animate-pulse',
  GENERATING_QUIZ: 'bg-purple-950 text-purple-300 border-purple-800 animate-pulse',
  COMPLETE: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  FAILED: 'bg-rose-950 text-rose-400 border-rose-800',
  CANCELLED: 'bg-slate-800 text-slate-400 border-slate-700',
};

const STATUS_LABELS: Record<Lecture['status'], string> = {
  RECORDING: 'Recording',
  RECORDED: 'Recorded',
  TRANSCRIBING: 'Transcribing',
  TRANSCRIBED: 'Transcribed',
  ANALYZING: 'Analyzing',
  GENERATING_NOTES: 'Generating Notes',
  GENERATING_FLASHCARDS: 'Generating Flashcards',
  GENERATING_QUIZ: 'Generating Quiz',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const LecturesPage: React.FC<LecturesPageProps> = ({ onNavigate }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const loadLectures = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getLectures(search, sort);
      setLectures(res.lectures);
    } catch (err: any) {
      setError(err.message || 'Failed to load lectures');
    } finally {
      setLoading(false);
    }
  }, [search, sort]);

  useEffect(() => {
    const timer = setTimeout(loadLectures, 300);
    return () => clearTimeout(timer);
  }, [loadLectures]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this lecture and all associated study materials? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.deleteLecture(id);
      setLectures((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete lecture');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReprocess = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setReprocessingId(id);
    try {
      await api.reprocessLecture(id);
      await loadLectures();
    } catch (err: any) {
      setError(err.message || 'Failed to reprocess lecture');
    } finally {
      setReprocessingId(null);
    }
  };

  const subjects = Array.from(new Set(lectures.map((l) => l.subject).filter(Boolean)));
  const filtered = subjectFilter ? lectures.filter((l) => l.subject === subjectFilter) : lectures;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Lecture Library</h2>
          <p className="text-xs text-slate-400 mt-0.5">{lectures.length} lecture{lectures.length !== 1 ? 's' : ''} stored locally</p>
        </div>
        <button
          onClick={() => onNavigate('record')}
          className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/25 transition"
        >
          <Mic className="w-4 h-4" />
          <span>New Recording</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search lectures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-8 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition appearance-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">By Title</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        {subjects.length > 0 && (
          <div className="relative">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-8 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition appearance-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
          <div className="text-sm text-slate-400">
            {search || subjectFilter ? 'No lectures match your filters.' : 'No lectures recorded yet.'}
          </div>
          {!search && !subjectFilter && (
            <button
              onClick={() => onNavigate('record')}
              className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Mic className="w-4 h-4" />
              <span>Record Your First Lecture</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lec) => (
            <div
              key={lec.id}
              onClick={() => onNavigate('lecture-detail', lec.id)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 cursor-pointer transition group shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-sky-400">
                      {lec.subject}
                    </span>
                    <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">
                      {lec.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(lec.created_at).toLocaleDateString()}
                    </span>
                    {lec.duration_seconds > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(lec.duration_seconds / 60)}m {lec.duration_seconds % 60}s
                      </span>
                    )}
                    {lec.flashcards_count != null && lec.flashcards_count > 0 && (
                      <span>{lec.flashcards_count} flashcard{lec.flashcards_count !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${STATUS_COLORS[lec.status]}`}>
                    {STATUS_LABELS[lec.status]}
                  </span>
                  {lec.status === 'FAILED' && (
                    <button
                      onClick={(e) => handleReprocess(e, lec.id)}
                      disabled={reprocessingId === lec.id}
                      title="Reprocess"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reprocessingId === lec.id ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, lec.id)}
                    disabled={deletingId === lec.id}
                    title="Delete lecture"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-500 hover:text-rose-400 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
