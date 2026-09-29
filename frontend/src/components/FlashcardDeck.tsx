import React, { useState } from 'react';
import { Sparkles, RotateCw, CheckCircle, ChevronLeft, ChevronRight, Plus, Trash2, Clock, Tag } from 'lucide-react';
import { Flashcard } from '../types';
import { api } from '../api/client';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  onReviewSubmitted?: () => void;
  lectureId?: string;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ flashcards, onReviewSubmitted, lectureId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newTopic, setNewTopic] = useState('General');

  const topics = ['all', ...Array.from(new Set(flashcards.map((f) => f.topic)))];

  const filteredCards = flashcards.filter((c) => (filterTopic === 'all' ? true : c.topic === filterTopic));
  const currentCard = filteredCards[currentIndex];

  const handleRating = async (rating: number) => {
    if (!currentCard) return;
    try {
      await api.reviewFlashcard(currentCard.id, rating);
      setIsFlipped(false);
      if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
      onReviewSubmitted?.();
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureId || !newQuestion.trim() || !newAnswer.trim()) return;

    try {
      await api.createFlashcard({
        lectureId,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        topic: newTopic.trim(),
      });
      setShowCreateModal(false);
      setNewQuestion('');
      setNewAnswer('');
      onReviewSubmitted?.();
    } catch (err) {
      console.error('Error creating flashcard:', err);
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
        <Sparkles className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-base font-bold text-white">No Flashcards Available Yet</h3>
        <p className="text-xs text-slate-400">
          Record or transcribe a lecture to automatically generate study flashcards with spaced repetition.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header and topic filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          <select
            value={filterTopic}
            onChange={(e) => {
              setFilterTopic(e.target.value);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Topics' : t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span>
            Card {currentIndex + 1} of {filteredCards.length}
          </span>
          {lectureId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-600/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Flashcard View */}
      {currentCard && (
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 min-h-[300px] rounded-3xl p-8 flex flex-col justify-between shadow-2xl cursor-pointer transition-all duration-300 relative group"
        >
          {/* Card metadata bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <span className="bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 text-[11px] font-semibold text-sky-400">
              {currentCard.topic}
            </span>
            <div className="flex items-center space-x-3">
              <span className="capitalize text-slate-400 text-[11px]">
                Type: {currentCard.card_type.replace('_', ' ')}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  currentCard.difficulty === 'easy'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : currentCard.difficulty === 'hard'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {currentCard.difficulty}
              </span>
            </div>
          </div>

          {/* Question / Answer text */}
          <div className="my-auto py-6 text-center space-y-4">
            <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              {isFlipped ? 'Answer' : 'Question'}
            </div>
            <div className="text-lg font-medium text-slate-100 leading-relaxed max-w-lg mx-auto">
              {isFlipped ? currentCard.answer : currentCard.question}
            </div>
          </div>

          {/* Footer prompt */}
          <div className="flex items-center justify-center text-xs text-slate-500 space-x-1.5">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click card to {isFlipped ? 'see question' : 'reveal answer'}</span>
          </div>
        </div>
      )}

      {/* SM-2 Spaced Repetition Rating Buttons */}
      {isFlipped && (
        <div className="space-y-2 animate-fadeIn">
          <div className="text-center text-xs text-slate-400 font-medium">
            How well did you know this answer?
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleRating(1)}
              className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 py-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center"
            >
              <span>Again</span>
              <span className="text-[10px] text-rose-400/80 font-normal">&lt; 10 min</span>
            </button>

            <button
              onClick={() => handleRating(2)}
              className="bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 py-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center"
            >
              <span>Hard</span>
              <span className="text-[10px] text-amber-400/80 font-normal">1 day</span>
            </button>

            <button
              onClick={() => handleRating(3)}
              className="bg-sky-950/60 hover:bg-sky-900 border border-sky-800 text-sky-300 py-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center"
            >
              <span>Good</span>
              <span className="text-[10px] text-sky-400/80 font-normal">3 days</span>
            </button>

            <button
              onClick={() => handleRating(4)}
              className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 py-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center"
            >
              <span>Easy</span>
              <span className="text-[10px] text-emerald-400/80 font-normal">7 days</span>
            </button>
          </div>
        </div>
      )}

      {/* Card Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          disabled={currentIndex === 0}
          onClick={() => {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
          }}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          disabled={currentIndex >= filteredCards.length - 1}
          onClick={() => {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
          }}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleCreateCard}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-slate-200"
          >
            <h3 className="font-bold text-white text-sm">Add Custom Study Flashcard</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Question</label>
              <textarea
                required
                rows={2}
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Answer</label>
              <textarea
                required
                rows={3}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Topic</label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition"
              >
                Save Flashcard
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
