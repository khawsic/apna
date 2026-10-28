/**
 * Speech Service: Wraps browser SpeechSynthesis (TTS) and Web Speech API SpeechRecognition (STT)
 * with robust fallbacks, state management, and clear diagnostics.
 */

// Extend window interface for Webkit Speech Recognition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isListeningInternal = false;
  private isSpeakingInternal = false;
  private speakingListeners: Array<(isSpeaking: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer high quality English voices (Google, Samantha, Daniel, Natural, US/GB)
    const preferred = voices.find(
      (v) =>
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('US') || v.name.includes('UK')))
    );
    this.selectedVoice = preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices().filter((v) => v.lang.startsWith('en'));
  }

  public setVoice(voiceName: string) {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    const found = voices.find((v) => v.name === voiceName);
    if (found) this.selectedVoice = found;
  }

  public isTtsSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isSttSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public subscribeSpeaking(callback: (isSpeaking: boolean) => void): () => void {
    this.speakingListeners.push(callback);
    callback(this.isSpeakingInternal);
    return () => {
      this.speakingListeners = this.speakingListeners.filter((cb) => cb !== callback);
    };
  }

  private notifySpeaking(state: boolean) {
    this.isSpeakingInternal = state;
    this.speakingListeners.forEach((cb) => cb(state));
  }

  /**
   * Speak text clearly using SpeechSynthesis with custom rate and pitch
   */
  public speak(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        console.warn('SpeechSynthesis is not supported in this browser.');
        options?.onEnd?.();
        resolve();
        return;
      }

      // Stop any existing speech
      this.stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = options?.rate ?? 0.95; // slightly deliberate for vocabulary learning
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        this.notifySpeaking(true);
      };

      utterance.onend = () => {
        this.notifySpeaking(false);
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        this.notifySpeaking(false);
        options?.onEnd?.();
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.notifySpeaking(false);
    }
  }

  /**
   * Start Speech Recognition with callback handlers
   */
  public startListening(handlers: {
    onStart?: () => void;
    onResult?: (transcript: string, isFinal: boolean) => void;
    onError?: (errorMessage: string, isPermissionError: boolean) => void;
    onEnd?: () => void;
  }): boolean {
    if (!this.isSttSupported()) {
      handlers.onError?.(
        'Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or use the text input below.',
        false
      );
      return false;
    }

    if (this.isListeningInternal) {
      this.stopListening();
    }

    // Stop speaking if listening starts
    this.stopSpeaking();

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'en-US';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListeningInternal = true;
        handlers.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const transcript = finalTranscript || interimTranscript;
        handlers.onResult?.(transcript, Boolean(finalTranscript));
      };

      this.recognition.onerror = (event: any) => {
        this.isListeningInternal = false;
        let msg = 'Speech recognition failed.';
        let isPermission = false;

        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            msg = 'Microphone access was denied. Please allow microphone permission in your browser URL bar.';
            isPermission = true;
            break;
          case 'no-speech':
            msg = 'No speech detected. Please speak closer to your microphone or check volume.';
            break;
          case 'audio-capture':
            msg = 'No microphone was found on your device. Please plug in or enable a microphone.';
            break;
          case 'network':
            msg = 'Speech recognition network error. Please check your internet connection or use text input.';
            break;
          case 'aborted':
            msg = 'Speech recognition stopped.';
            break;
          default:
            msg = `Speech recognition error: ${event.error}`;
        }

        handlers.onError?.(msg, isPermission);
      };

      this.recognition.onend = () => {
        this.isListeningInternal = false;
        handlers.onEnd?.();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.isListeningInternal = false;
      handlers.onError?.(`Failed to start microphone: ${err?.message || 'Unknown error'}`, false);
      return false;
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.isListeningInternal = false;
  }

  public isListening(): boolean {
    return this.isListeningInternal;
  }
}

export const speechService = new SpeechService();
