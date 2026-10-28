import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Square,
  RotateCcw,
  Bot,
  User,
  AlertCircle,
  Sparkles,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { ChatMessage, WordItem, DifficultyLevel } from '../types/vocabulary';
import { speechService } from '../services/speechService';
import { sendTutorChat } from '../services/apiService';
import { AudioWave } from './AudioWave';

interface VoiceTutorPanelProps {
  currentWord: WordItem;
  userLevel: DifficultyLevel;
  setUserLevel: (level: DifficultyLevel) => void;
}

type MicState = 'idle' | 'listening' | 'processing' | 'speaking';

export const VoiceTutorPanel: React.FC<VoiceTutorPanelProps> = ({
  currentWord,
  userLevel,
  setUserLevel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'tutor',
      content: `Hello! I'm Voca, your personal vocabulary coach. Today we're exploring "${currentWord.word}". You can listen, ask questions, or press the microphone to practise speaking!`,
      timestamp: Date.now(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [micState, setMicState] = useState<MicState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check speech recognition support on mount
  useEffect(() => {
    setIsSpeechRecognitionSupported(speechService.isSttSupported());
  }, []);

  // Sync speech state with SpeechService
  useEffect(() => {
    const unsubscribe = speechService.subscribeSpeaking((isSpeaking) => {
      if (isSpeaking) {
        setMicState((prev) => (prev === 'listening' ? prev : 'speaking'));
      } else {
        setMicState((prev) => (prev === 'speaking' ? 'idle' : prev));
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, micState]);

  // When word changes, introduce the new word
  useEffect(() => {
    const introMessage: ChatMessage = {
      id: `word-intro-${currentWord.id}-${Date.now()}`,
      role: 'tutor',
      content: `Let's focus on "${currentWord.word}" (${currentWord.readablePhonetic}). It means: ${currentWord.meaning}. How would you like to explore it together?`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, introMessage]);
  }, [currentWord.id]);

  const handleSendMessage = async (textToSend: string, isFromMic = false) => {
    const text = textToSend.trim();
    if (!text) return;

    setErrorMessage(null);
    setMicState('processing');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      isAudioSource: isFromMic,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLiveTranscript('');

    try {
      const historyPayload = messages.slice(-5).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendTutorChat({
        message: text,
        history: historyPayload,
        currentWord: currentWord.word,
        level: userLevel.toLowerCase(),
      });

      if (res.offlineNotice) {
        setOfflineNotice(res.offlineNotice);
      }

      const tutorMsg: ChatMessage = {
        id: `tutor-${Date.now()}`,
        role: 'tutor',
        content: res.reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, tutorMsg]);
      setMicState('idle');

      // Speak tutor answer automatically if user spoke via microphone
      if (isFromMic) {
        await speechService.speak(res.reply);
      }
    } catch (err: any) {
      console.error('Tutor chat failed:', err);
      setErrorMessage(err?.message || 'Failed to get a response from Voca. Please try again.');
      setMicState('idle');
    }
  };

  // Toggle microphone recording
  const handleToggleMic = () => {
    if (micState === 'listening') {
      speechService.stopListening();
      setMicState('idle');
      if (liveTranscript.trim()) {
        handleSendMessage(liveTranscript, true);
      }
      return;
    }

    if (micState === 'speaking') {
      speechService.stopSpeaking();
      setMicState('idle');
      return;
    }

    setErrorMessage(null);
    setLiveTranscript('');
    setIsPermissionDenied(false);

    const started = speechService.startListening({
      onStart: () => {
        setMicState('listening');
      },
      onResult: (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal && transcript.trim().length > 0) {
          speechService.stopListening();
          handleSendMessage(transcript, true);
        }
      },
      onError: (errText, isPermission) => {
        setMicState('idle');
        setErrorMessage(errText);
        if (isPermission) setIsPermissionDenied(true);
      },
      onEnd: () => {
        setMicState((prev) => (prev === 'listening' ? 'idle' : prev));
      },
    });

    if (!started) {
      setMicState('idle');
    }
  };

  const handleReplayAudio = async (text: string) => {
    await speechService.speak(text);
  };

  const handleStopSpeaking = () => {
    speechService.stopSpeaking();
    setMicState('idle');
  };

  const quickPrompts = [
    `Explain "${currentWord.word}" in simpler terms`,
    `Give me another practical workplace example for "${currentWord.word}"`,
    `What is the difference between "${currentWord.word}" and ${currentWord.synonyms[0] || 'similar words'}?`,
    `Give me a short challenge sentence to test me`,
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[640px] overflow-hidden">
      {/* Tutor Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            {micState === 'speaking' && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300"></span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-sm">Voca — AI Vocabulary Coach</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Practising: <strong>{currentWord.word}</strong></span>
              <span>•</span>
              <span>Adaptive tutor</span>
            </p>
          </div>
        </div>

        {/* Level Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={userLevel}
              onChange={(e) => setUserLevel(e.target.value as DifficultyLevel)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="Beginner">Level: Beginner</option>
              <option value="Intermediate">Level: Intermediate</option>
              <option value="Advanced">Level: Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offline / Key Notice if applicable */}
      {offlineNotice && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <span>{offlineNotice}</span>
          <button onClick={() => setOfflineNotice(null)} className="text-amber-900 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isTutor = msg.role === 'tutor';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isTutor ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isTutor ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-800 text-white'
                }`}
              >
                {isTutor ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className={`max-w-[85%] sm:max-w-[78%] space-y-1 ${isTutor ? '' : 'text-right'}`}>
                <div
                  className={`inline-block p-4 rounded-2xl text-sm leading-relaxed text-left ${
                    isTutor
                      ? 'bg-slate-100/90 text-slate-800 rounded-tl-sm border border-slate-200/60'
                      : 'bg-indigo-600 text-white rounded-tr-sm shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                <div className={`flex items-center gap-2 text-[11px] text-slate-400 px-1 ${isTutor ? '' : 'justify-end'}`}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.isAudioSource && (
                    <span className="flex items-center gap-1 text-indigo-600 font-medium">
                      <Mic className="w-3 h-3" /> Voice
                    </span>
                  )}
                  {isTutor && (
                    <button
                      onClick={() => handleReplayAudio(msg.content)}
                      className="text-slate-500 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition flex items-center gap-1"
                      title="Replay audio pronunciation"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Replay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live speech transcription pill */}
        {micState === 'listening' && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm animate-pulse">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Listening to your microphone...
                </span>
                <AudioWave active={true} color="bg-indigo-600" size="sm" bars={5} />
              </div>
              <p className="text-slate-800 font-medium mt-1 min-h-[1.25rem]">
                {liveTranscript || 'Speak naturally now (e.g., "How do I use articulate in an email?")...'}
              </p>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {micState === 'processing' && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-2 px-3 bg-slate-50 rounded-xl w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Voca is thinking and formulating feedback...</span>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
              {isPermissionDenied && (
                <p className="mt-1 text-slate-600">
                  Tip: You can use the text box below anytime without a microphone!
                </p>
              )}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-800 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="font-semibold text-slate-400 shrink-0">Try asking:</span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap transition shadow-2xs font-normal"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Tutor Input Bar & Controls */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Main Microphone Button */}
          <button
            onClick={handleToggleMic}
            disabled={!isSpeechRecognitionSupported && micState !== 'speaking'}
            title={
              !isSpeechRecognitionSupported
                ? 'Speech recognition not supported in this browser. Use text input.'
                : micState === 'listening'
                ? 'Stop listening & send'
                : micState === 'speaking'
                ? 'Stop audio playback'
                : 'Speak into microphone'
            }
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              micState === 'listening'
                ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                : micState === 'speaking'
                ? 'bg-amber-600 text-white ring-4 ring-amber-200'
                : micState === 'processing'
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : !isSpeechRecognitionSupported
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
            }`}
          >
            {micState === 'listening' ? (
              <Square className="w-5 h-5 fill-white" />
            ) : micState === 'speaking' ? (
              <Square className="w-5 h-5 fill-white" />
            ) : !isSpeechRecognitionSupported ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text Input Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputQuery);
            }}
            className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-indigo-500 focus-within:bg-white transition"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                micState === 'listening'
                  ? 'Listening to microphone...'
                  : `Ask Voca about "${currentWord.word}" or type a question...`
              }
              disabled={micState === 'listening'}
              className="flex-1 bg-transparent py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || micState === 'processing'}
              className={`p-2 rounded-lg transition ${
                inputQuery.trim() && micState !== 'processing'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                  : 'text-slate-400 bg-slate-200/70 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Stop Speaking Button if audio is currently playing */}
          {micState === 'speaking' && (
            <button
              onClick={handleStopSpeaking}
              className="px-3 py-2 bg-amber-100 text-amber-800 rounded-xl text-xs font-medium hover:bg-amber-200 transition shrink-0"
            >
              Stop Audio
            </button>
          )}
        </div>

        {/* Audio status banner */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                micState === 'listening'
                  ? 'bg-rose-500 animate-ping'
                  : micState === 'speaking'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            <span>
              {micState === 'listening'
                ? 'Listening live... speak clearly'
                : micState === 'speaking'
                ? 'Voca is speaking...'
                : micState === 'processing'
                ? 'Processing response...'
                : 'Ready for voice or text'}
            </span>
          </div>
          {!isSpeechRecognitionSupported && (
            <span className="text-amber-700 font-medium">Text mode active (STT unsupported)</span>
          )}
        </div>
      </div>
    </div>
  );
};
