import { LearnerProgress, SavedWord, WordItem, ActivityRecord } from '../types/vocabulary';

const STORAGE_KEY_SAVED_WORDS = 'vocabvoice_saved_words_v1';
const STORAGE_KEY_PROGRESS = 'vocabvoice_progress_v1';
const STORAGE_KEY_LEVEL = 'vocabvoice_user_level_v1';

const DEFAULT_PROGRESS: LearnerProgress = {
  wordsPracticed: 0,
  wordsMastered: 0,
  correctAnswers: 0,
  totalQuizzes: 0,
  currentStreak: 1,
  lastActiveDate: new Date().toISOString().slice(0, 10),
  sessionPracticedCount: 0,
  struggledWordIds: [],
  recentActivities: [],
};

export const storageService = {
  getSavedWords(): SavedWord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SAVED_WORDS);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load saved words:', e);
      return [];
    }
  },

  saveWord(wordItem: WordItem, confidence: SavedWord['confidence'] = 'Learning'): SavedWord[] {
    const list = this.getSavedWords();
    const existingIndex = list.findIndex((item) => item.id.toLowerCase() === wordItem.id.toLowerCase());

    const newRecord: SavedWord = {
      id: wordItem.id.toLowerCase(),
      word: wordItem.word,
      meaning: wordItem.meaning,
      partOfSpeech: wordItem.partOfSpeech,
      readablePhonetic: wordItem.readablePhonetic,
      dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      confidence,
      lastPracticed: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    let updated: SavedWord[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...newRecord,
      };
    } else {
      updated = [newRecord, ...list];
    }

    try {
      localStorage.setItem(STORAGE_KEY_SAVED_WORDS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to write saved words:', e);
    }
    return updated;
  },

  updateWordConfidence(wordId: string, confidence: SavedWord['confidence']): SavedWord[] {
    const list = this.getSavedWords();
    const updated = list.map((item) => {
      if (item.id.toLowerCase() === wordId.toLowerCase()) {
        return { ...item, confidence };
      }
      return item;
    });

    try {
      localStorage.setItem(STORAGE_KEY_SAVED_WORDS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update word confidence:', e);
    }
    return updated;
  },

  removeSavedWord(wordId: string): SavedWord[] {
    const list = this.getSavedWords();
    const updated = list.filter((item) => item.id.toLowerCase() !== wordId.toLowerCase());
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_WORDS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete word:', e);
    }
    return updated;
  },

  isWordSaved(wordId: string): boolean {
    const list = this.getSavedWords();
    return list.some((item) => item.id.toLowerCase() === wordId.toLowerCase());
  },

  getProgress(): LearnerProgress {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (!data) return DEFAULT_PROGRESS;
      const parsed: LearnerProgress = JSON.parse(data);
      // Ensure daily streak calculation
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.lastActiveDate !== today) {
        const lastDate = new Date(parsed.lastActiveDate);
        const currentDate = new Date(today);
        const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          parsed.currentStreak = (parsed.currentStreak || 1) + 1;
        } else if (diffDays > 1) {
          parsed.currentStreak = 1;
        }
        parsed.lastActiveDate = today;
        parsed.sessionPracticedCount = 0;
        this.saveProgress(parsed);
      }
      return parsed;
    } catch (e) {
      return DEFAULT_PROGRESS;
    }
  },

  saveProgress(progress: LearnerProgress) {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  },

  recordActivity(activity: ActivityRecord, wordId: string) {
    const current = this.getProgress();
    const recent = [activity, ...(current.recentActivities || [])].slice(0, 20);

    let wordsPracticed = current.wordsPracticed;
    const existingActivityWithWord = (current.recentActivities || []).some(
      (a) => a.word.toLowerCase() === activity.word.toLowerCase()
    );
    if (!existingActivityWithWord) {
      wordsPracticed += 1;
    }

    let correctAnswers = current.correctAnswers;
    let totalQuizzes = current.totalQuizzes;
    if (activity.type === 'understand') {
      totalQuizzes += 1;
      if (activity.passed) {
        correctAnswers += 1;
      }
    }

    const struggled = new Set(current.struggledWordIds || []);
    if (!activity.passed || activity.score < 70) {
      struggled.add(wordId.toLowerCase());
    } else if (activity.score >= 85) {
      // If performed well, remove from struggled
      struggled.delete(wordId.toLowerCase());
    }

    // Check words mastered
    const saved = this.getSavedWords();
    const masteredCount = saved.filter((w) => w.confidence === 'Mastered').length;

    const updated: LearnerProgress = {
      ...current,
      wordsPracticed,
      wordsMastered: Math.max(current.wordsMastered, masteredCount),
      correctAnswers,
      totalQuizzes,
      sessionPracticedCount: current.sessionPracticedCount + 1,
      struggledWordIds: Array.from(struggled),
      recentActivities: recent,
    };

    this.saveProgress(updated);
    return updated;
  },

  resetProgress(): LearnerProgress {
    try {
      localStorage.removeItem(STORAGE_KEY_PROGRESS);
    } catch (e) {
      // ignore
    }
    return DEFAULT_PROGRESS;
  },

  getUserLevel(): 'Beginner' | 'Intermediate' | 'Advanced' {
    return (localStorage.getItem(STORAGE_KEY_LEVEL) as any) || 'Intermediate';
  },

  setUserLevel(level: 'Beginner' | 'Intermediate' | 'Advanced') {
    localStorage.setItem(STORAGE_KEY_LEVEL, level);
  },
};
