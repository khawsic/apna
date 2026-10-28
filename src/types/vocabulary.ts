export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface WordItem {
  id: string;
  word: string;
  phonetic: string;
  readablePhonetic: string;
  partOfSpeech: string;
  meaning: string;
  examples: string[];
  synonyms: string[];
  antonyms?: string[];
  difficulty: DifficultyLevel;
  quizQuestion: string;
  quizOptions: QuizOption[];
  speakingTargetSentence: string;
  useItPrompt: string;
}

export type ConfidenceLevel = 'New' | 'Learning' | 'Mastered';

export interface SavedWord {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
  readablePhonetic: string;
  dateAdded: string;
  confidence: ConfidenceLevel;
  lastPracticed?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'tutor';
  content: string;
  timestamp: number;
  isAudioSource?: boolean;
}

export interface FeedbackResult {
  isCorrect: boolean;
  wordUsedProperly: boolean;
  strength: string;
  grammarIssue: string | null;
  naturalAlternative: string;
  explanation: string;
  score: number;
  encouragement: string;
  offlineNotice?: string;
}

export interface ActivityRecord {
  id: string;
  word: string;
  type: 'understand' | 'speak' | 'use_it';
  timestamp: number;
  passed: boolean;
  score: number;
  summary?: string;
}

export interface LearnerProgress {
  wordsPracticed: number;
  wordsMastered: number;
  correctAnswers: number;
  totalQuizzes: number;
  currentStreak: number;
  lastActiveDate: string;
  sessionPracticedCount: number;
  struggledWordIds: string[];
  recentActivities: ActivityRecord[];
}
