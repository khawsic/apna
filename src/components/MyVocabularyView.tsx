import React, { useState } from 'react';
import {
  Bookmark,
  Volume2,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';
import { SavedWord, ConfidenceLevel, WordItem } from '../types/vocabulary';
import { speechService } from '../services/speechService';
import { storageService } from '../services/storageService';

interface MyVocabularyViewProps {
  savedWords: SavedWord[];
  onRefreshSavedWords: () => void;
  onReviewWord: (wordId: string) => void;
  allWords: WordItem[];
  onSelectWord: (word: WordItem) => void;
}

export const MyVocabularyView: React.FC<MyVocabularyViewProps> = ({
  savedWords,
  onRefreshSavedWords,
  onReviewWord,
  allWords,
  onSelectWord,
}) => {
  const [filter, setFilter] = useState<'All' | ConfidenceLevel>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);

  const filteredWords = savedWords.filter((item) => {
    const matchesFilter = filter === 'All' || item.confidence === filter;
    const matchesSearch =
      item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.meaning.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handlePlayPronunciation = async (item: SavedWord) => {
    setPlayingWordId(item.id);
    await speechService.speak(item.word, { rate: 0.85 });
    setPlayingWordId(null);
  };

  const handleRemove = (wordId: string) => {
    storageService.removeSavedWord(wordId);
    onRefreshSavedWords();
  };

  const handleUpdateConfidence = (wordId: string, conf: ConfidenceLevel) => {
    storageService.updateWordConfidence(wordId, conf);
    onRefreshSavedWords();
  };

  const confidenceBadges: Record<ConfidenceLevel, { bg: string; text: string; border: string }> = {
    New: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    Learning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    Mastered: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-indigo-600" />
              <span>My Vocabulary Notebook</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your personalized list of saved vocabulary, confidence levels, and review items.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved vocabulary..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1">Status:</span>
          {(['All', 'New', 'Learning', 'Mastered'] as const).map((status) => {
            const count =
              status === 'All'
                ? savedWords.length
                : savedWords.filter((w) => w.confidence === status).length;
            const isSelected = filter === status;

            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{status}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Words List */}
      {filteredWords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.map((item) => {
            const badge = confidenceBadges[item.confidence] || confidenceBadges.Learning;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{item.word}</h3>
                        <span className="text-xs text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded">
                          {item.partOfSpeech}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-700 font-mono mt-0.5">
                        {item.readablePhonetic}
                      </p>
                    </div>

                    {/* Confidence Selector dropdown */}
                    <select
                      value={item.confidence}
                      onChange={(e) =>
                        handleUpdateConfidence(item.id, e.target.value as ConfidenceLevel)
                      }
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      <option value="New">New</option>
                      <option value="Learning">Learning</option>
                      <option value="Mastered">Mastered</option>
                    </select>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed font-normal">
                    {item.meaning}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Added {item.dateAdded}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Pronunciation button */}
                    <button
                      onClick={() => handlePlayPronunciation(item)}
                      title="Listen to pronunciation"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
                    >
                      <Volume2
                        className={`w-4 h-4 ${
                          playingWordId === item.id ? 'text-indigo-600 animate-bounce' : ''
                        }`}
                      />
                    </button>

                    {/* Review Button */}
                    <button
                      onClick={() => onReviewWord(item.id)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleRemove(item.id)}
                      title="Remove from saved words"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No saved words found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || filter !== 'All'
                ? 'No words matched your current search or filter. Try clearing filters.'
                : 'Save words during your daily study sessions to review and track them here.'}
            </p>
          </div>

          <div className="pt-2">
            <span className="text-xs text-slate-400 block mb-2 font-medium">
              Quick start: Save one of these target words now:
            </span>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {allWords.slice(0, 5).map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    storageService.saveWord(w, 'Learning');
                    onRefreshSavedWords();
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition"
                >
                  + Save {w.word}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
