import React from 'react';
import { BookOpen, Bookmark, BarChart3, Flame, Mic, Volume2 } from 'lucide-react';
import { DifficultyLevel } from '../types/vocabulary';

interface HeaderProps {
  activeTab: 'learn' | 'vocabulary' | 'progress';
  setActiveTab: (tab: 'learn' | 'vocabulary' | 'progress') => void;
  savedCount: number;
  streak: number;
  userLevel: DifficultyLevel;
  setUserLevel: (level: DifficultyLevel) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  streak,
  userLevel,
  setUserLevel,
  isSpeaking,
  onStopSpeaking,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('learn')}
              className="flex items-center gap-3 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:bg-indigo-700 transition">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900">VocabVoice</span>
                  <span className="px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded border border-indigo-200/60">
                    AI
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">Learn words. Speak confidently.</p>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('learn')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'learn'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Learn</span>
            </button>

            <button
              onClick={() => setActiveTab('vocabulary')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                activeTab === 'vocabulary'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>My Vocabulary</span>
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-xs font-semibold rounded-full bg-indigo-600 text-white">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'progress'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Progress</span>
            </button>
          </nav>

          {/* Right side widgets: streak, level, speech status, profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio speaking indicator */}
            {isSpeaking && (
              <button
                onClick={onStopSpeaking}
                title="AI is speaking. Click to stop."
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full animate-pulse hover:bg-amber-100 transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Speaking (Click to stop)</span>
              </button>
            )}

            {/* Daily Streak */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200/60 rounded-full"
              title="Daily learning streak"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>{streak} {streak === 1 ? 'day' : 'days'}</span>
            </div>

            {/* Level selector */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200">
              <span className="font-medium text-slate-500">Level:</span>
              <select
                value={userLevel}
                onChange={(e) => setUserLevel(e.target.value as DifficultyLevel)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Learner indicator */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-xs tracking-wider">
                LR
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none">Learner</p>
                <p className="text-[10px] text-slate-500 leading-none mt-0.5">{userLevel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
