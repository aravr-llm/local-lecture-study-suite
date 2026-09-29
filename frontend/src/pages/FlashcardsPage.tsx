import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { FlashcardDeck } from '../components/FlashcardDeck';
import { Flashcard } from '../types';

interface FlashcardsPageProps {
  onNavigate: (tab: string, lectureId?: string) => void;
}

export const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ onNavigate }) => {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDueCards = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.getDueFlashcards();
      setDueCards(res.dueCards || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load due flashcards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDueCards(); }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl animate-pulse h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Flashcard Review</h2>
          <p className="text-xs text-slate-400 mt-0.5">Spaced repetition — SM-2 algorithm</p>
        </div>
        <div className="bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-300">{dueCards.length} due</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {dueCards.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <div className="text-lg font-bold text-white">All Caught Up!</div>
          <p className="text-xs text-slate-400">
            No flashcards are due right now. Keep recording lectures and reviewing to build your deck.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={loadDueCards}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl transition">
              Check Again
            </button>
            <button onClick={() => onNavigate('lectures')}
              className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl transition">
              Go to Lectures
            </button>
          </div>
        </div>
      ) : (
        <FlashcardDeck
          flashcards={dueCards}
          lectureId={undefined}
          onReviewSubmitted={loadDueCards}
        />
      )}
    </div>
  );
};
