import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  Volume2,
  FileText,
  BookOpen,
  Sparkles,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  Download,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import { NotesEditor } from '../components/NotesEditor';
import { FlashcardDeck } from '../components/FlashcardDeck';
import { QuizRunner } from '../components/QuizRunner';
import { ExportModal } from '../components/ExportModal';
import { Lecture, LectureNote, Flashcard, QuizSet, TranscriptSegment } from '../types';

type Tab = 'overview' | 'transcript' | 'notes' | 'flashcards' | 'quiz';

interface LectureDetailPageProps {
  lectureId: string;
  onNavigate: (tab: string, lectureId?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETE: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  FAILED: 'bg-rose-950 text-rose-400 border-rose-800',
  RECORDING: 'bg-sky-950 text-sky-400 border-sky-800 animate-pulse',
  default: 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse',
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const LectureDetailPage: React.FC<LectureDetailPageProps> = ({ lectureId, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [note, setNote] = useState<LectureNote | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioTime, setAudioTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  const loadLecture = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getLecture(lectureId);
      setLecture(res.lecture);
    } catch (err: any) {
      setError(err.message || 'Failed to load lecture');
    } finally {
      setLoading(false);
    }
  }, [lectureId]);

  useEffect(() => { loadLecture(); }, [loadLecture]);

  useEffect(() => {
    if (!lecture || lecture.status !== 'COMPLETE') return;

    Promise.all([
      api.getNotes(lectureId).catch(() => null),
      api.getFlashcards(lectureId).catch(() => null),
      api.getQuizzes(lectureId).catch(() => null),
      api.getTranscript(lectureId).catch(() => null),
    ]).then(([notesRes, flashRes, quizRes, transcriptRes]) => {
      if (notesRes?.note) setNote(notesRes.note);
      if (flashRes?.flashcards) setFlashcards(flashRes.flashcards);
      if (quizRes?.quizSets) setQuizSets(quizRes.quizSets);
      if (transcriptRes?.segments) setSegments(transcriptRes.segments);
    });
  }, [lecture, lectureId]);

  // Auto-poll if still processing
  useEffect(() => {
    if (!lecture) return;
    const inProgress = !['COMPLETE', 'FAILED', 'CANCELLED', 'RECORDING'].includes(lecture.status);
    if (!inProgress) return;
    const timer = setInterval(loadLecture, 4000);
    return () => clearInterval(timer);
  }, [lecture, loadLecture]);

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try { await api.reprocessLecture(lectureId); await loadLecture(); }
    catch (err: any) { setError(err.message); }
    finally { setReprocessing(false); }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl animate-pulse h-32" />
        <div className="bg-slate-900 border border-slate-800 rounded-2xl animate-pulse h-64" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-rose-950/40 border border-rose-800/50 rounded-2xl p-8 text-center text-rose-300 text-sm">
          {error || 'Lecture not found.'}
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[lecture.status] ?? STATUS_COLORS.default;
  const hasAudio = Boolean(lecture.has_audio);
  const inProgress = !['COMPLETE', 'FAILED', 'CANCELLED'].includes(lecture.status);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'transcript', label: 'Transcript', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'notes', label: 'Notes', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'flashcards', label: `Flashcards${flashcards.length > 0 ? ` (${flashcards.length})` : ''}`, icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'quiz', label: `Quiz${quizSets.length > 0 ? ` (${quizSets.length})` : ''}`, icon: <HelpCircle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Back + Header */}
      <div className="space-y-3">
        <button
          onClick={() => onNavigate('lectures')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Lectures
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-sky-400">
                  {lecture.subject}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${statusColor}`}>
                  {lecture.status}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">{lecture.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(lecture.duration_seconds / 60)}m {lecture.duration_seconds % 60}s
                </span>
                <span>{new Date(lecture.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {lecture.status === 'FAILED' && (
                <button onClick={handleReprocess} disabled={reprocessing}
                  className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition">
                  <RefreshCw className={`w-3.5 h-3.5 ${reprocessing ? 'animate-spin' : ''}`} />
                  Reprocess
                </button>
              )}
              {lecture.status === 'COMPLETE' && (
                <button onClick={() => setShowExport(true)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition">
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* In-Progress Banner */}
          {inProgress && (
            <div className="mt-4 bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-300">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              Processing lecture... This page will auto-update. Status: <strong>{lecture.status}</strong>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {hasAudio && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-emerald-700 hover:bg-emerald-600 flex items-center justify-center transition shrink-0">
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </button>
            <div className="flex-1 space-y-1">
              <input
                type="range" min={0} max={audioDuration} value={audioTime} step={0.5}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{formatTime(audioTime)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>
            </div>
            <Volume2 className="w-4 h-4 text-slate-500" />
          </div>
          <audio
            ref={audioRef}
            src={`/api/lectures/${lectureId}/audio`}
            onTimeUpdate={() => setAudioTime(audioRef.current?.currentTime ?? 0)}
            onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration ?? 0)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-emerald-700 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {note ? (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white">Summary</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{note.summary}</p>
                </div>
                {note.key_concepts.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-white">Key Concepts</h3>
                    <div className="flex flex-wrap gap-2">
                      {note.key_concepts.map((c, i) => (
                        <span key={i} className="bg-slate-800 border border-slate-700 text-sky-300 text-xs px-3 py-1 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {note.definitions.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-white">Definitions</h3>
                    <div className="space-y-2">
                      {note.definitions.map((d, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                          <div className="text-xs font-bold text-emerald-300">{d.term}</div>
                          <div className="text-xs text-slate-300 mt-1">{d.definition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {note.study_questions.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-white">Study Questions</h3>
                    <div className="space-y-2">
                      {note.study_questions.map((q, i) => (
                        <div key={i} className="flex gap-2 text-sm text-slate-300">
                          <span className="text-slate-600 font-mono">{i + 1}.</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                {inProgress ? 'Notes are being generated...' : 'No notes available for this lecture.'}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white">Transcript</h3>
            {segments.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">
                {inProgress ? 'Transcript is being generated...' : 'No transcript available.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {segments.map((seg) => (
                  <div key={seg.id} className="flex gap-3 group">
                    <button
                      onClick={() => seekTo(seg.start_time)}
                      title={`Jump to ${formatTime(seg.start_time)}`}
                      className="text-[10px] text-emerald-500 hover:text-emerald-300 font-mono shrink-0 mt-0.5 transition"
                    >
                      {formatTime(seg.start_time)}
                    </button>
                    <p className="text-sm text-slate-300 leading-relaxed">{seg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          note ? (
            <NotesEditor lectureId={lectureId} note={note} onSaved={loadLecture} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
              {inProgress ? 'Notes are being generated...' : 'No notes available for this lecture.'}
            </div>
          )
        )}

        {activeTab === 'flashcards' && (
          <div>
            {flashcards.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                {inProgress ? 'Flashcards are being generated...' : 'No flashcards for this lecture.'}
              </div>
            ) : (
              <FlashcardDeck flashcards={flashcards} lectureId={lectureId} />
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div>
            {quizSets.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                {inProgress ? 'Quiz is being generated...' : 'No quiz sets for this lecture.'}
              </div>
            ) : (
              <QuizRunner quizSet={quizSets[0]} onAttemptCompleted={loadLecture} />
            )}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          isOpen={showExport}
          lectureId={lectureId}
          lectureTitle={lecture.title}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};
