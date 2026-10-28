import React, { useState } from 'react';
import { Volume2, Bookmark, BookmarkCheck, Sparkles, ArrowRight, Search, Loader2 } from 'lucide-react';
import { WordItem, DifficultyLevel } from '../types/vocabulary';
import { speechService } from '../services/speechService';
import { AudioWave } from './AudioWave';

interface DailyWordCardProps {
  currentWord: WordItem;
  allWords: WordItem[];
  onSelectWord: (word: WordItem) => void;
  onPracticeWord: (word: WordItem) => void;
  isSaved: boolean;
  onToggleSave: (word: WordItem) => void;
  onGenerateCustomWord: (wordText: string) => Promise<void>;
  isGeneratingWord: boolean;
}

export const DailyWordCard: React.FC<DailyWordCardProps> = ({
  currentWord,
  allWords,
  onSelectWord,
  onPracticeWord,
  isSaved,
  onToggleSave,
  onGenerateCustomWord,
  isGeneratingWord,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const handleListenPronunciation = async () => {
    if (isPlayingAudio) {
      speechService.stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    // Speak word clearly, then short pause, then first example
    await speechService.speak(currentWord.word, { rate: 0.85 });
    // short delay then say example
    await new Promise((r) => setTimeout(r, 250));
    await speechService.speak(currentWord.examples[0], { rate: 0.95 });
    setIsPlayingAudio(false);
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const existing = allWords.find((w) => w.word.toLowerCase() === searchQuery.trim().toLowerCase());
    if (existing) {
      onSelectWord(existing);
      setSearchQuery('');
      setShowSearchInput(false);
    } else {
      onGenerateCustomWord(searchQuery.trim());
      setSearchQuery('');
      setShowSearchInput(false);
    }
  };

  const difficultyColors: Record<DifficultyLevel, string> = {
    Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
    Advanced: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
          </span>
          <span className="text-xs uppercase font-bold tracking-widest text-indigo-200">Today's Target Word</span>
          <span className="text-slate-500">•</span>
          <span className="text-xs text-slate-300">Word of the Day</span>
        </div>

        {/* Word Switcher & Dynamic Word Search */}
        <div className="flex items-center gap-2">
          {showSearchInput ? (
            <form onSubmit={handleCustomSearchSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type any English word..."
                className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-indigo-400 w-44"
                autoFocus
              />
              <button
                type="submit"
                disabled={isGeneratingWord}
                className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-white transition flex items-center gap-1"
              >
                {isGeneratingWord ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Learn'}
              </button>
              <button
                type="button"
                onClick={() => setShowSearchInput(false)}
                className="text-xs text-slate-400 hover:text-white px-1"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition"
              title="Search or generate another word"
            >
              <Search className="w-3 h-3" />
              <span>Explore Another Word</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Left Column: Word, Phonetics, Badges, Meaning */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {currentWord.word}
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md border capitalize bg-slate-100 text-slate-700 border-slate-200">
                {currentWord.partOfSpeech}
              </span>
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                  difficultyColors[currentWord.difficulty] || difficultyColors.Intermediate
                }`}
              >
                {currentWord.difficulty}
              </span>
            </div>

            {/* Pronunciation phonetics */}
            <div className="flex items-center gap-3 text-slate-600 text-sm">
              <span className="font-mono text-slate-800 font-medium tracking-wide bg-slate-100 px-2 py-0.5 rounded">
                {currentWord.phonetic}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-medium text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                Sounds like: <strong className="font-bold">{currentWord.readablePhonetic}</strong>
              </span>
            </div>

            {/* Simple English Meaning */}
            <div className="pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Meaning in Simple English</h3>
              <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-normal">
                {currentWord.meaning}
              </p>
            </div>

            {/* Example Sentences */}
            <div className="pt-2 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Natural Examples</h3>
              <div className="space-y-2">
                {currentWord.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed flex items-start gap-2.5"
                  >
                    <span className="text-indigo-500 font-bold mt-0.5 text-xs">0{idx + 1}</span>
                    <p className="flex-1 italic">"{example}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Synonyms & Antonyms */}
            <div className="flex flex-wrap gap-4 pt-2 text-xs">
              <div>
                <span className="font-semibold text-slate-500 mr-2">Synonyms:</span>
                <span className="text-slate-800">
                  {currentWord.synonyms.map((s, i) => (
                    <span
                      key={i}
                      className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded mr-1.5 mb-1 font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </span>
              </div>
              {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-500 mr-2">Antonyms:</span>
                  <span className="text-slate-800">
                    {currentWord.antonyms.map((a, i) => (
                      <span
                        key={i}
                        className="inline-block bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded mr-1.5 mb-1 font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Key Action Buttons */}
          <div className="w-full md:w-64 flex flex-col gap-3 pt-2 md:pt-0">
            {/* Listen button */}
            <button
              onClick={handleListenPronunciation}
              className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-between transition shadow-xs ${
                isPlayingAudio
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'text-indigo-600 animate-bounce' : 'text-slate-600'}`} />
                <span>{isPlayingAudio ? 'Listening...' : 'Listen to Pronunciation'}</span>
              </div>
              <AudioWave active={isPlayingAudio} size="sm" bars={4} />
            </button>

            {/* Practise button */}
            <button
              onClick={() => onPracticeWord(currentWord)}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-between transition shadow-sm shadow-indigo-200 group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Practise This Word</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Save word toggle button */}
            <button
              onClick={() => onToggleSave(currentWord)}
              className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition ${
                isSaved
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                  <span>Saved to My Vocabulary</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-slate-500" />
                  <span>Save to Vocabulary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Word Quick Switcher Pills */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Curated Workplace Vocabulary ({allWords.length} Words)
            </span>
            <span className="text-xs text-slate-500">Click any word to study</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {allWords.map((word) => {
              const isSelected = word.id.toLowerCase() === currentWord.id.toLowerCase();
              return (
                <button
                  key={word.id}
                  onClick={() => onSelectWord(word)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {word.word}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
