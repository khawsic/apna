/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DailyWordCard } from './components/DailyWordCard';
import { VoiceTutorPanel } from './components/VoiceTutorPanel';
import { MyVocabularyView } from './components/MyVocabularyView';
import { ProgressView } from './components/ProgressView';
import { InteractivePracticeModal } from './components/InteractivePracticeModal';
import { INITIAL_WORDS } from './data/initialWords';
import { WordItem, SavedWord, LearnerProgress, DifficultyLevel } from './types/vocabulary';
import { storageService } from './services/storageService';
import { speechService } from './services/speechService';
import { fetchGeneratedWord } from './services/apiService';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'learn' | 'vocabulary' | 'progress'>('learn');
  const [allWords, setAllWords] = useState<WordItem[]>(INITIAL_WORDS);
  const [currentWord, setCurrentWord] = useState<WordItem>(INITIAL_WORDS[0]); // Starts with "Articulate"
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [progress, setProgress] = useState<LearnerProgress>(storageService.getProgress());
  const [userLevel, setUserLevelState] = useState<DifficultyLevel>(storageService.getUserLevel());
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Practice Modal State
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [practicingWord, setPracticingWord] = useState<WordItem>(INITIAL_WORDS[0]);
  const [isGeneratingCustomWord, setIsGeneratingCustomWord] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Load initial saved words & subscribe to speech synthesis state
  useEffect(() => {
    setSavedWords(storageService.getSavedWords());
    setProgress(storageService.getProgress());

    const unsubscribe = speechService.subscribeSpeaking((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => unsubscribe();
  }, []);

  const handleSetUserLevel = (level: DifficultyLevel) => {
    setUserLevelState(level);
    storageService.setUserLevel(level);
  };

  const refreshSavedWords = () => {
    setSavedWords(storageService.getSavedWords());
    setProgress(storageService.getProgress());
  };

  const refreshProgress = () => {
    setProgress(storageService.getProgress());
    setSavedWords(storageService.getSavedWords());
  };

  const handleSelectWord = (word: WordItem) => {
    speechService.stopSpeaking();
    speechService.stopListening();
    setCurrentWord(word);
    showToast(`Loaded "${word.word}" for study`);
  };

  const handleToggleSave = (word: WordItem) => {
    const isSaved = storageService.isWordSaved(word.id);
    if (isSaved) {
      storageService.removeSavedWord(word.id);
      showToast(`Removed "${word.word}" from saved vocabulary`, 'info');
    } else {
      storageService.saveWord(word, 'Learning');
      showToast(`Saved "${word.word}" to My Vocabulary!`, 'success');
    }
    refreshSavedWords();
  };

  const handleOpenPractice = (word: WordItem) => {
    speechService.stopSpeaking();
    speechService.stopListening();
    setPracticingWord(word);
    setIsPracticeModalOpen(true);
  };

  const handlePracticeCompleted = (word: WordItem, passed: boolean, score: number) => {
    refreshProgress();
    refreshSavedWords();
    showToast(`Session completed for "${word.word}" (Score: ${score}%)!`, passed ? 'success' : 'info');
  };

  const handleReviewWord = (wordId: string) => {
    const found = allWords.find((w) => w.id.toLowerCase() === wordId.toLowerCase());
    if (found) {
      handleOpenPractice(found);
    } else {
      // Find from initial words
      const initial = INITIAL_WORDS.find((w) => w.id.toLowerCase() === wordId.toLowerCase());
      if (initial) {
        handleOpenPractice(initial);
      }
    }
  };

  const handleGenerateCustomWord = async (wordText: string) => {
    setIsGeneratingCustomWord(true);
    try {
      showToast(`AI generating learning card for "${wordText}"...`, 'info');
      const generated = await fetchGeneratedWord(wordText);
      setAllWords((prev) => [generated, ...prev.filter((w) => w.id !== generated.id)]);
      setCurrentWord(generated);
      showToast(`Ready to learn "${generated.word}"!`, 'success');
    } catch (err: any) {
      console.error('Word generation failed:', err);
      showToast(`Could not generate word: ${err?.message || 'Error'}`, 'info');
    } finally {
      setIsGeneratingCustomWord(false);
    }
  };

  const isCurrentWordSaved = storageService.isWordSaved(currentWord.id);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-indigo-900 text-white border-indigo-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedWords.length}
        streak={progress.currentStreak}
        userLevel={userLevel}
        setUserLevel={handleSetUserLevel}
        isSpeaking={isSpeaking}
        onStopSpeaking={() => speechService.stopSpeaking()}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* LEARN TAB */}
        {activeTab === 'learn' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Daily Word Card: 7 Columns on Large Screens */}
            <div className="lg:col-span-7 space-y-6">
              <DailyWordCard
                currentWord={currentWord}
                allWords={allWords}
                onSelectWord={handleSelectWord}
                onPracticeWord={handleOpenPractice}
                isSaved={isCurrentWordSaved}
                onToggleSave={handleToggleSave}
                onGenerateCustomWord={handleGenerateCustomWord}
                isGeneratingWord={isGeneratingCustomWord}
              />

              {/* Informative Guidance Card for Job Seekers / Workplace English */}
              <div className="bg-indigo-50/60 rounded-2xl border border-indigo-100 p-5 text-xs text-indigo-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    ✦
                  </span>
                  <span>Workplace Vocabulary Tip</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Colleagues and hiring managers listen not just to grammar, but to precision. Using precise adjectives like{' '}
                  <strong className="text-indigo-900 font-semibold">{currentWord.word}</strong> conveys confidence and executive presence. Try asking Voca for interview examples on the right!
                </p>
              </div>
            </div>

            {/* Conversational Voice Tutor Panel: 5 Columns on Large Screens */}
            <div className="lg:col-span-5">
              <VoiceTutorPanel
                currentWord={currentWord}
                userLevel={userLevel}
                setUserLevel={handleSetUserLevel}
              />
            </div>
          </div>
        )}

        {/* MY VOCABULARY TAB */}
        {activeTab === 'vocabulary' && (
          <MyVocabularyView
            savedWords={savedWords}
            onRefreshSavedWords={refreshSavedWords}
            onReviewWord={handleReviewWord}
            allWords={allWords}
            onSelectWord={handleSelectWord}
          />
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <ProgressView
            progress={progress}
            onRefreshProgress={refreshProgress}
            allWords={allWords}
            onReviewStruggledWord={handleOpenPractice}
          />
        )}
      </main>

      {/* Interactive 3-Activity Practice Modal */}
      <InteractivePracticeModal
        word={practicingWord}
        isOpen={isPracticeModalOpen}
        onClose={() => setIsPracticeModalOpen(false)}
        userLevel={userLevel}
        onPracticeCompleted={handlePracticeCompleted}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} VocabVoice AI. Learn words. Speak confidently.</p>
          <p className="text-slate-400">
            Powered by Google Gemini & Web Speech API. All audio evaluated with transparent user consent.
          </p>
        </div>
      </footer>
    </div>
  );
}
