import { FeedbackResult, WordItem } from '../types/vocabulary';

export interface ChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'tutor'; content: string }>;
  currentWord?: string;
  level?: string;
}

export interface ChatResponse {
  reply: string;
  offlineNotice?: string;
}

export interface FeedbackRequest {
  word: string;
  targetSentence?: string;
  userSubmission: string;
  submissionType: 'speak' | 'use_it';
  level?: string;
}

export async function sendTutorChat(data: ChatRequest): Promise<ChatResponse> {
  const res = await fetch('/api/tutor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function evaluateSubmission(data: FeedbackRequest): Promise<FeedbackResult> {
  const res = await fetch('/api/tutor/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function fetchGeneratedWord(word: string): Promise<WordItem> {
  const res = await fetch('/api/tutor/generate-word', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Server responded with ${res.status}`);
  }

  return res.json();
}
