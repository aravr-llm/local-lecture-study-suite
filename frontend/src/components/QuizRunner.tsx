import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';
import { QuizSet } from '../types';
import { api } from '../api/client';

interface QuizRunnerProps {
  quizSet: QuizSet;
  onAttemptCompleted?: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ quizSet, onAttemptCompleted }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = quizSet.questions;
  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (questionId: string, option: string) => {
    if (submissionResult) return; // Locked after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const { result } = await api.submitQuiz(quizSet.id, selectedAnswers);
      setSubmissionResult(result);
      onAttemptCompleted?.();
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmissionResult(null);
    setCurrentIndex(0);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
        <Award className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-base font-bold text-white">No Quiz Generated Yet</h3>
        <p className="text-xs text-slate-400">
          Transcribe a lecture to automatically generate multi-choice and short-answer practice exams.
        </p>
      </div>
    );
  }

  // Completed Evaluation Screen
  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">Quiz Completed!</h3>
            <p className="text-xs text-slate-400">Performance report and topic review</p>
          </div>

          <div className="flex items-center justify-center space-x-6 py-2">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {submissionResult.score} / {submissionResult.totalQuestions}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Score</div>
            </div>

            <div className="h-10 w-px bg-slate-800" />

            <div className="text-center">
              <div className="text-3xl font-bold text-sky-400">
                {submissionResult.percentage}%
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Accuracy</div>
            </div>
          </div>

          {/* Weak topics to review */}
          {submissionResult.weakTopics && submissionResult.weakTopics.length > 0 && (
            <div className="bg-rose-950/30 border border-rose-900/50 p-4 rounded-2xl text-left space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Recommended Topics to Review:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {submissionResult.weakTopics.map((topic: string, i: number) => (
                  <span
                    key={i}
                    className="bg-rose-950 border border-rose-800/80 text-rose-300 px-2.5 py-1 rounded-lg text-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleRetake}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-5 py-2.5 rounded-xl mx-auto transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Practice Quiz</span>
          </button>
        </div>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Question Explanations</h4>
          {submissionResult.results.map((res: any, idx: number) => (
            <div
              key={res.questionId || idx}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-3 ${
                res.isCorrect ? 'border-emerald-800/60' : 'border-rose-800/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="font-semibold text-xs text-slate-200">
                  {idx + 1}. {res.question}
                </span>
                {res.isCorrect ? (
                  <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold shrink-0 ml-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-rose-400 text-xs font-bold shrink-0 ml-2">
                    <XCircle className="w-4 h-4" />
                    <span>Incorrect</span>
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Your Answer: </span>
                  <span className={res.isCorrect ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                    {res.userAnswer || '(None)'}
                  </span>
                </div>
                {!res.isCorrect && (
                  <div>
                    <span className="text-slate-400">Correct Answer: </span>
                    <span className="text-emerald-400 font-medium">{res.correctAnswer}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <span className="font-semibold text-sky-400">Explanation: </span>
                {res.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active Quiz Taking Interface
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
        <span className="font-bold text-white">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-sky-400 font-medium">
          {currentQuestion.topic}
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-100 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        {currentQuestion.question_type === 'short_answer' ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">Type your answer below:</label>
            <input
              type="text"
              value={selectedAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleSelectOption(currentQuestion.id, e.target.value)}
              placeholder="Your answer..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {(currentQuestion.options || []).map((opt, i) => {
              const isSelected = selectedAnswers[currentQuestion.id] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(currentQuestion.id, opt)}
                  className={`w-full text-left p-4 rounded-2xl text-xs font-medium border transition-all flex items-center space-x-3 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-emerald-500 text-black' : 'border border-slate-700 text-slate-400'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="leading-normal">{opt}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation and Submit */}
      <div className="flex items-center justify-between pt-2">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="text-xs text-slate-400 hover:text-white disabled:opacity-30 px-3 py-1.5"
        >
          Previous
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Practice Quiz'}
          </button>
        )}
      </div>
    </div>
  );
};
