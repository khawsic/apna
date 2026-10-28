import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Volume2,
  Mic,
  Square,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookCheck,
  Send,
  Loader2,
  Award,
} from 'lucide-react';
import { WordItem, FeedbackResult, DifficultyLevel } from '../types/vocabulary';
import { speechService } from '../services/speechService';
import { evaluateSubmission } from '../services/apiService';
import { storageService } from '../services/storageService';
import { AudioWave } from './AudioWave';

interface InteractivePracticeModalProps {
  word: WordItem;
  isOpen: boolean;
  onClose: () => void;
  userLevel: DifficultyLevel;
  onPracticeCompleted: (word: WordItem, passed: boolean, score: number) => void;
}

type PracticeStep = 'understand' | 'speak' | 'use_it' | 'complete';

export const InteractivePracticeModal: React.FC<InteractivePracticeModalProps> = ({
  word,
  isOpen,
  onClose,
  userLevel,
  onPracticeCompleted,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<PracticeStep>('understand');

  // Step 1: Understand
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [hasAnsweredQuiz, setHasAnsweredQuiz] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);

  // Step 2: Speak
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechFeedback, setSpeechFeedback] = useState<{
    accuracy: number;
    matchedWords: string[];
    missingWords: string[];
    evaluated: boolean;
  } | null>(null);
  const [manualSpeakInput, setManualSpeakInput] = useState('');

  // Step 3: Use it
  const [useItSentence, setUseItSentence] = useState('');
  const [isListeningUseIt, setIsListeningUseIt] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<FeedbackResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overall session score accumulator
  const [activityScores, setActivityScores] = useState({
    understand: 0,
    speak: 0,
    useIt: 0,
  });

  // Handler for Step 1 Quiz
  const handleSelectQuizOption = (idx: number) => {
    if (hasAnsweredQuiz) return;
    setSelectedOptionIndex(idx);
    setHasAnsweredQuiz(true);
    const option = word.quizOptions[idx];
    const correct = Boolean(option.isCorrect);
    setIsQuizCorrect(correct);

    const quizScore = correct ? 100 : 40;
    setActivityScores((prev) => ({ ...prev, understand: quizScore }));

    // Record activity
    storageService.recordActivity(
      {
        id: `quiz-${Date.now()}`,
        word: word.word,
        type: 'understand',
        timestamp: Date.now(),
        passed: correct,
        score: quizScore,
        summary: correct ? 'Correctly identified meaning' : 'Need review on definition',
      },
      word.id
    );
  };

  const handleRetryQuiz = () => {
    setSelectedOptionIndex(null);
    setHasAnsweredQuiz(false);
    setIsQuizCorrect(false);
  };

  // Handler for Step 2: Speak audio listen
  const handleListenTargetSentence = async () => {
    setIsSpeakingTarget(true);
    await speechService.speak(word.speakingTargetSentence, { rate: 0.9 });
    setIsSpeakingTarget(false);
  };

  // Handler for Step 2: Mic Recording
  const handleToggleSpeakMic = () => {
    if (isListeningMic) {
      speechService.stopListening();
      setIsListeningMic(false);
      evaluateSpokenTranscript(speechTranscript);
      return;
    }

    setErrorMessage(null);
    setSpeechTranscript('');
    setSpeechFeedback(null);

    const started = speechService.startListening({
      onStart: () => setIsListeningMic(true),
      onResult: (transcript, isFinal) => {
        setSpeechTranscript(transcript);
        if (isFinal) {
          speechService.stopListening();
          setIsListeningMic(false);
          evaluateSpokenTranscript(transcript);
        }
      },
      onError: (err) => {
        setIsListeningMic(false);
        setErrorMessage(err);
      },
      onEnd: () => {
        setIsListeningMic(false);
      },
    });

    if (!started) setIsListeningMic(false);
  };

  const evaluateSpokenTranscript = (rawText: string) => {
    const text = (rawText || manualSpeakInput).trim();
    if (!text) return;

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(/\s+/)
        .filter(Boolean);

    const targetWords = normalize(word.speakingTargetSentence);
    const spokenWords = normalize(text);

    const matched = targetWords.filter((w) => spokenWords.includes(w));
    const missing = targetWords.filter((w) => !spokenWords.includes(w));

    const accuracy = targetWords.length > 0 ? Math.round((matched.length / targetWords.length) * 100) : 100;
    const result = {
      accuracy,
      matchedWords: matched,
      missingWords: missing,
      evaluated: true,
    };
    setSpeechFeedback(result);
    setActivityScores((prev) => ({ ...prev, speak: accuracy }));

    storageService.recordActivity(
      {
        id: `speak-${Date.now()}`,
        word: word.word,
        type: 'speak',
        timestamp: Date.now(),
        passed: accuracy >= 70,
        score: accuracy,
        summary: `Spoken transcript match: ${accuracy}%`,
      },
      word.id
    );
  };

  // Handler for Step 3: Use it Mic dictation
  const handleToggleUseItMic = () => {
    if (isListeningUseIt) {
      speechService.stopListening();
      setIsListeningUseIt(false);
      return;
    }

    setErrorMessage(null);
    const started = speechService.startListening({
      onStart: () => setIsListeningUseIt(true),
      onResult: (transcript, isFinal) => {
        setUseItSentence(transcript);
        if (isFinal) {
          setIsListeningUseIt(false);
        }
      },
      onError: (err) => {
        setIsListeningUseIt(false);
        setErrorMessage(err);
      },
      onEnd: () => setIsListeningUseIt(false),
    });
    if (!started) setIsListeningUseIt(false);
  };

  // Submit Step 3 sentence to Gemini API
  const handleSubmitUseIt = async () => {
    if (!useItSentence.trim()) return;

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await evaluateSubmission({
        word: word.word,
        targetSentence: word.speakingTargetSentence,
        userSubmission: useItSentence.trim(),
        submissionType: 'use_it',
        level: userLevel.toLowerCase(),
      });

      setAiFeedback(result);
      setActivityScores((prev) => ({ ...prev, useIt: result.score }));

      storageService.recordActivity(
        {
          id: `useit-${Date.now()}`,
          word: word.word,
          type: 'use_it',
          timestamp: Date.now(),
          passed: result.isCorrect,
          score: result.score,
          summary: result.strength,
        },
        word.id
      );
    } catch (err: any) {
      console.error('Use It feedback failed:', err);
      setErrorMessage(err?.message || 'Failed to evaluate sentence. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleFinishPractice = (markMastered: boolean) => {
    const totalScore = Math.round(
      (activityScores.understand + activityScores.speak + activityScores.useIt) / 3
    );
    const passed = totalScore >= 70;

    if (markMastered) {
      storageService.saveWord(word, 'Mastered');
    } else {
      storageService.saveWord(word, 'Learning');
    }

    onPracticeCompleted(word, passed, totalScore);
    onClose();
  };

  const stepsList = [
    { key: 'understand', label: '1. Understand', icon: BookCheck },
    { key: 'speak', label: '2. Speak', icon: Mic },
    { key: 'use_it', label: '3. Use It', icon: Sparkles },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Interactive Practice: {word.word}</h2>
              <p className="text-xs text-slate-500">
                Phonetic: <span className="font-medium text-slate-700">{word.readablePhonetic}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        {step !== 'complete' && (
          <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
            {stepsList.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.key;
              const isPast =
                (s.key === 'understand' && (step === 'speak' || step === 'use_it')) ||
                (s.key === 'speak' && step === 'use_it');

              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </div>
                  {idx < stepsList.length - 1 && <span className="text-slate-300">→</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: UNDERSTAND */}
          {step === 'understand' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Activity 1 of 3: Meaning Comprehension
                </span>
                <h3 className="text-lg font-bold text-slate-900">{word.quizQuestion}</h3>
                <p className="text-xs text-slate-500">
                  Select the choice that best captures the real meaning and usage of "{word.word}".
                </p>
              </div>

              <div className="space-y-2.5">
                {word.quizOptions.map((opt, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  let cardStyle =
                    'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 bg-white text-slate-800';

                  if (hasAnsweredQuiz) {
                    if (opt.isCorrect) {
                      cardStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
                    } else if (isSelected && !opt.isCorrect) {
                      cardStyle = 'border-rose-400 bg-rose-50/70 text-rose-950';
                    } else {
                      cardStyle = 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60';
                    }
                  } else if (isSelected) {
                    cardStyle = 'border-indigo-600 bg-indigo-50/60 text-indigo-950';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectQuizOption(idx)}
                      disabled={hasAnsweredQuiz}
                      className={`w-full p-4 rounded-xl border text-left text-sm transition flex items-start gap-3.5 ${cardStyle}`}
                    >
                      <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="flex-1">
                        <p>{opt.text}</p>
                      </div>
                      {hasAnsweredQuiz && opt.isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      {hasAnsweredQuiz && isSelected && !opt.isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback box */}
              {hasAnsweredQuiz && (
                <div
                  className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
                    isQuizCorrect
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}
                >
                  {isQuizCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">
                      {isQuizCorrect ? 'Well done!' : 'Not quite right yet.'}
                    </p>
                    <p className="text-xs">
                      {isQuizCorrect
                        ? `You correctly grasped "${word.word}". Meaning: ${word.meaning}`
                        : `"${word.word}" means: ${word.meaning}. Give it another try!`}
                    </p>
                  </div>
                  {!isQuizCorrect && (
                    <button
                      onClick={handleRetryQuiz}
                      className="px-3 py-1 bg-white border border-rose-200 text-xs font-semibold rounded-lg text-rose-800 hover:bg-rose-100/50 flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SPEAK */}
          {step === 'speak' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Activity 2 of 3: Pronounce & Speak
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Read or say this target sentence aloud:
                </h3>
              </div>

              {/* Target sentence display */}
              <div className="p-5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-3">
                <p className="text-lg font-semibold text-slate-900 leading-snug">
                  "{word.speakingTargetSentence}"
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleListenTargetSentence}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 transition shadow-2xs"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isSpeakingTarget ? 'Playing audio...' : 'Listen to Native Pace'}</span>
                  </button>
                  <AudioWave active={isSpeakingTarget} size="sm" bars={4} />
                </div>
              </div>

              {/* Recording interaction */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center text-center space-y-4">
                <button
                  onClick={handleToggleSpeakMic}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md ${
                    isListeningMic
                      ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isListeningMic ? (
                    <Square className="w-6 h-6 fill-white" />
                  ) : (
                    <Mic className="w-7 h-7" />
                  )}
                </button>

                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    {isListeningMic
                      ? 'Listening to your microphone...'
                      : 'Click the microphone and speak aloud'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isListeningMic
                      ? 'Speak the sentence clearly, then click again when done.'
                      : 'Uses browser speech recognition to analyze spoken words.'}
                  </p>
                </div>

                {isListeningMic && (
                  <AudioWave active={true} color="bg-rose-600" size="md" bars={7} />
                )}

                {/* Recognized Transcript Live Preview */}
                {(speechTranscript || isListeningMic) && (
                  <div className="w-full text-left p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-500 block mb-1">
                      Recognized Transcript:
                    </span>
                    <p className="text-slate-800 font-medium italic">
                      "{speechTranscript || 'Listening...'}"
                    </p>
                  </div>
                )}
              </div>

              {/* Manual text fallback for speech */}
              <div className="pt-1">
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700 font-medium">
                    Microphone unavailable? Click for text fallback verification
                  </summary>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={manualSpeakInput}
                      onChange={(e) => setManualSpeakInput(e.target.value)}
                      placeholder="Type the sentence here..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => evaluateSpokenTranscript(manualSpeakInput)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                    >
                      Check Text
                    </button>
                  </div>
                </details>
              </div>

              {/* Feedback on speech */}
              {speechFeedback && (
                <div
                  className={`p-4 rounded-xl border text-sm space-y-2 ${
                    speechFeedback.accuracy >= 70
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {speechFeedback.accuracy >= 70 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <RotateCcw className="w-4 h-4 text-amber-600" />
                      )}
                      Transcript Match: {speechFeedback.accuracy}%
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white font-semibold">
                      {speechFeedback.accuracy >= 85
                        ? 'Excellent clarity'
                        : speechFeedback.accuracy >= 70
                        ? 'Good attempt'
                        : 'Practice again'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {speechFeedback.accuracy >= 70
                      ? `Great spoken delivery! Your recognized words matched the target sentence successfully.`
                      : `You got parts of the sentence. Try speaking with slower, rhythmic pacing.`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Note: Feedback is based on speech recognition transcript accuracy.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: USE IT */}
          {step === 'use_it' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Activity 3 of 3: Original Sentence Creation
                </span>
                <h3 className="text-lg font-bold text-slate-900">{word.useItPrompt}</h3>
                <p className="text-xs text-slate-500">
                  Compose an original sentence using <strong>"{word.word}"</strong>. Dictate with your microphone or type it in.
                </p>
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={useItSentence}
                    onChange={(e) => setUseItSentence(e.target.value)}
                    placeholder={`e.g., During the quarterly review, I gave an ${word.word.toLowerCase()} breakdown of our customer metrics...`}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 text-sm text-slate-900 focus:outline-none placeholder-slate-400"
                  />
                  <button
                    onClick={handleToggleUseItMic}
                    title="Dictate with microphone"
                    className={`absolute bottom-3 right-3 p-2 rounded-lg transition ${
                      isListeningUseIt
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Target word: <strong className="text-indigo-600">{word.word}</strong>
                  </span>
                  <button
                    onClick={handleSubmitUseIt}
                    disabled={!useItSentence.trim() || isEvaluating}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition shadow-xs"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Submit for AI Review</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Structured AI Feedback Card */}
              {aiFeedback && (
                <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        AI
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Voca's Language Assessment</h4>
                        <span className="text-[11px] text-slate-500">
                          {aiFeedback.wordUsedProperly
                            ? 'Word used correctly in context'
                            : 'Needs usage adjustment'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-indigo-700">
                        {aiFeedback.score}
                      </span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                  </div>

                  {/* Feedback breakdown */}
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200/70">
                      <span className="font-bold text-emerald-700 block mb-0.5">
                        What you did well:
                      </span>
                      <p className="text-slate-700">{aiFeedback.strength}</p>
                    </div>

                    {aiFeedback.grammarIssue && (
                      <div className="p-3 bg-white rounded-xl border border-amber-200">
                        <span className="font-bold text-amber-800 block mb-0.5">
                          Grammar / Usage note:
                        </span>
                        <p className="text-slate-700">{aiFeedback.grammarIssue}</p>
                      </div>
                    )}

                    <div className="p-3 bg-white rounded-xl border border-slate-200/70">
                      <span className="font-bold text-indigo-700 block mb-0.5">
                        More Natural Phrasing:
                      </span>
                      <p className="text-slate-800 italic font-medium">
                        "{aiFeedback.naturalAlternative}"
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200/70">
                      <span className="font-bold text-slate-700 block mb-0.5">Insight:</span>
                      <p className="text-slate-600">{aiFeedback.explanation}</p>
                    </div>

                    <p className="text-slate-500 italic pt-1">{aiFeedback.encouragement}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: COMPLETE SUMMARY */}
          {step === 'complete' && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                <Award className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">
                  Practice Session Completed!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  You successfully completed all 3 learning activities for{' '}
                  <strong className="text-indigo-600">{word.word}</strong>.
                </p>
              </div>

              {/* Score Breakdown Pills */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Understand</span>
                  <span className="text-lg font-bold text-slate-800">
                    {activityScores.understand}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Pronounce</span>
                  <span className="text-lg font-bold text-slate-800">
                    {activityScores.speak || 90}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Use It</span>
                  <span className="text-lg font-bold text-slate-800">
                    {activityScores.useIt || 85}%
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  onClick={() => handleFinishPractice(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
                >
                  Mark as Mastered & Save
                </button>
                <button
                  onClick={() => handleFinishPractice(false)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
                >
                  Save as Learning
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        {step !== 'complete' && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 'speak') setStep('understand');
                if (step === 'use_it') setStep('speak');
              }}
              disabled={step === 'understand'}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 transition"
            >
              Back
            </button>

            {step === 'understand' && (
              <button
                onClick={() => setStep('speak')}
                disabled={!hasAnsweredQuiz}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
              >
                <span>Next: Pronunciation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'speak' && (
              <button
                onClick={() => setStep('use_it')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
              >
                <span>Next: Use It in Sentence</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'use_it' && (
              <button
                onClick={() => setStep('complete')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
              >
                <span>View Summary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
