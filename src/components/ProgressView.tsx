import React, { useState } from 'react';
import {
  BarChart3,
  Award,
  CheckCircle2,
  Flame,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Calendar,
  Trash2,
} from 'lucide-react';
import { LearnerProgress, WordItem } from '../types/vocabulary';
import { storageService } from '../services/storageService';

interface ProgressViewProps {
  progress: LearnerProgress;
  onRefreshProgress: () => void;
  allWords: WordItem[];
  onReviewStruggledWord: (wordItem: WordItem) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  progress,
  onRefreshProgress,
  allWords,
  onReviewStruggledWord,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const accuracyPercent =
    progress.totalQuizzes > 0
      ? Math.round((progress.correctAnswers / progress.totalQuizzes) * 100)
      : 0;

  // Session goal target: 5 practice activities
  const sessionTarget = 5;
  const sessionPercent = Math.min(
    100,
    Math.round((progress.sessionPracticedCount / sessionTarget) * 100)
  );

  // Look up words the user struggled with
  const struggledWordItems = progress.struggledWordIds
    .map((id) => allWords.find((w) => w.id.toLowerCase() === id.toLowerCase()))
    .filter((w): w is WordItem => Boolean(w));

  const handleReset = () => {
    storageService.resetProgress();
    onRefreshProgress();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Session Goal */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full">
              Session Goal
            </span>
            <span className="text-xs text-slate-300">
              {progress.sessionPracticedCount} of {sessionTarget} activities completed today
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Learning Analytics & Fluency
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Real metrics calculated strictly from your interactive sessions, quiz checks, speech recognition, and sentence reviews.
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full md:w-64 bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Today's Progress</span>
            <span className="text-indigo-300">{sessionPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${sessionPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {sessionPercent >= 100
              ? '🎉 Daily goal reached! Excellent momentum.'
              : `${sessionTarget - progress.sessionPracticedCount} more to hit daily goal.`}
          </p>
        </div>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Words Practised */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Words Practised</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{progress.wordsPracticed}</p>
          <p className="text-[11px] text-slate-500">Unique words studied</p>
        </div>

        {/* Metric 2: Words Mastered */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Words Mastered</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{progress.wordsMastered}</p>
          <p className="text-[11px] text-slate-500">Marked as mastered</p>
        </div>

        {/* Metric 3: Quiz Accuracy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Correct Answers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-slate-900">{accuracyPercent}%</p>
            <span className="text-xs text-slate-500">
              ({progress.correctAnswers}/{progress.totalQuizzes})
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Comprehension quiz accuracy</p>
        </div>

        {/* Metric 4: Daily Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Learning Streak</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{progress.currentStreak}</p>
          <p className="text-[11px] text-slate-500">Consecutive days active</p>
        </div>
      </div>

      {/* Words to Review / Struggled With Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Words to Revisit & Review ({struggledWordItems.length})
              </h3>
              <p className="text-xs text-slate-500">
                Words where you missed a quiz answer or scored below 70% in practice.
              </p>
            </div>
          </div>
        </div>

        {struggledWordItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {struggledWordItems.map((word) => (
              <div
                key={word.id}
                className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{word.word}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{word.meaning}</p>
                </div>
                <button
                  onClick={() => onReviewStruggledWord(word)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs shrink-0 ml-3"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Practice</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">No struggled words on your record!</p>
            <p className="mt-0.5">
              Whenever a practice quiz or speech activity needs improvement, it will automatically appear here for quick review.
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Recent Activity History</span>
        </h3>

        {progress.recentActivities && progress.recentActivities.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {progress.recentActivities.slice(0, 10).map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      act.passed ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <span className="font-bold text-slate-800">{act.word}</span>
                    <span className="text-slate-400 mx-1.5">•</span>
                    <span className="text-slate-500 capitalize">{act.type.replace('_', ' ')}</span>
                    {act.summary && (
                      <p className="text-[11px] text-slate-500 mt-0.5 italic">"{act.summary}"</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      act.passed
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    Score: {act.score}%
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {new Date(act.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">
            No practice sessions recorded yet. Start by practicing today's target word!
          </p>
        )}
      </div>

      {/* Reset Progress Danger Zone */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-200 text-xs">
        <div className="text-slate-500">
          <span>Need to start fresh for a new learner or test scenario?</span>
        </div>

        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-rose-700 font-medium">Are you sure?</span>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition"
            >
              Confirm Reset
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-2 py-1 text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Learning Progress</span>
          </button>
        )}
      </div>
    </div>
  );
};
