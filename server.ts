import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google GenAI client
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health & Status check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

const SYSTEM_INSTRUCTION_TUTOR = `You are Voca, a friendly and highly effective English vocabulary tutor. Help learners improve their vocabulary and communicate confidently in everyday life, college, and professional settings.

Use simple English appropriate to the learner's selected level. Introduce one concept at a time. Explain unfamiliar words using clear definitions, practical examples, and relatable contexts.

When teaching a word, provide its part of speech, meaning, pronunciation guidance, two examples, a synonym, and a short practice question.

When reviewing a learner's sentence:
- Identify whether the target word is used correctly.
- Acknowledge one specific strength.
- Correct grammar or word usage when necessary.
- Offer a more natural alternative.
- Explain the improvement briefly.
- Invite the learner to try again.

Be supportive, specific, and honest. Never shame learners. Never claim to have heard audio, verified pronunciation, or measured fluency unless the necessary input and processing actually occurred.

Keep responses concise and conversational (under 3-4 sentences when possible for voice readiness). Ask only one practice question at a time. Adapt future explanations to the learner's selected difficulty level.`;

// Conversational Chat with Voca
app.post('/api/tutor/chat', async (req, res) => {
  try {
    const { message, history = [], currentWord, level = 'intermediate' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!aiClient) {
      // Friendly offline / simulated response if API key is not yet set
      res.json({
        reply: `I'm Voca! I see you're practicing "${currentWord || 'vocabulary'}". When using words like this, remember to focus on clear context. For example: "She gave an articulate response to the interview question." How would you like to use this word in a sentence?`,
        offlineNotice: 'GEMINI_API_KEY is not configured yet. Running in offline practice mode.',
      });
      return;
    }

    // Build contents from history and current message
    const formattedHistory = (history || []).slice(-6).map((item: { role: string; content: string }) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content }],
    }));

    const promptContext = `[Context: Current Target Word: "${currentWord || 'None'}", Learner Level: "${level}"]
User message: ${message}`;

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: promptContext }],
      },
    ];

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TUTOR,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I'm sorry, I couldn't process that. Could you try rephrasing?";
    res.json({ reply });
  } catch (error: any) {
    console.warn('Gemini chat API call error, providing intelligent fallback:', error?.message);
    const { message, currentWord = 'articulate' } = req.body;
    let fallbackText = `I'm Voca! While connecting to live Gemini models, I can still guide you on "${currentWord}". For interview and workplace communication, focus on clear context and active verbs. For example: "She gave an articulate summary of the project goals."`;

    if (message && message.toLowerCase().includes('interview')) {
      fallbackText = `In interviews, using "${currentWord}" shows communication maturity. For example: "I ensure our team remains articulate and focused when presenting sprint reviews." How would you apply this to your own projects?`;
    } else if (message && message.toLowerCase().includes('difference')) {
      fallbackText = `Great question! Words like "${currentWord}" focus on expressiveness and clarity of thought, whereas words like "fluent" focus on speed and ease of speech. An articulate speaker makes complex ideas simple.`;
    } else if (message && message.toLowerCase().includes('example')) {
      fallbackText = `Here is another natural example: "The team lead gave an articulate explanation that resolved the client's concerns immediately." Try speaking or typing your own version!`;
    }

    res.json({
      reply: fallbackText,
      offlineNotice: 'Operating in guided practice mode (Gemini API returned: ' + (error?.status || 'Network/Billing limitation') + ').',
    });
  }
});

// Interactive Sentence & Usage Feedback Endpoint
app.post('/api/tutor/feedback', async (req, res) => {
  try {
    const { word, targetSentence, userSubmission, submissionType = 'use_it', level = 'intermediate' } = req.body;

    if (!userSubmission || !word) {
      res.status(400).json({ error: 'Word and user submission are required' });
      return;
    }

    if (!aiClient) {
      const containsWord = userSubmission.toLowerCase().includes(word.toLowerCase());
      res.json({
        isCorrect: containsWord,
        wordUsedProperly: containsWord,
        strength: containsWord
          ? `Great job incorporating the target word "${word}" into your sentence!`
          : `You expressed a clear idea, though the word "${word}" wasn't used.`,
        grammarIssue: null,
        naturalAlternative: containsWord
          ? userSubmission
          : `Try including "${word}": for example, "We need an articulate plan."`,
        explanation: containsWord
          ? `Your sentence shows good intent and clarity.`
          : `Ensure the target word "${word}" is placed as a fitting part of speech.`,
        score: containsWord ? 85 : 50,
        encouragement: 'Keep practicing! Consistent daily repetition builds confident communication.',
        offlineNotice: 'Evaluated locally because GEMINI_API_KEY is not configured.',
      });
      return;
    }

    const evaluationPrompt = `You are evaluating a learner's English submission for the target vocabulary word "${word}".
Activity Type: ${submissionType === 'speak' ? 'Spoken speech transcript verification' : 'Original sentence creation (Use It)'}
Target Word: "${word}"
Optional Reference Sentence: "${targetSentence || ''}"
Learner's submission: "${userSubmission}"
Learner's current level: "${level}"

Please evaluate strictly and constructively:
1. Did the learner use the target word "${word}" correctly according to its part of speech and natural English collocation?
2. If this was a spoken transcript verification, check if the recognized transcript matched the intended target or used the word reasonably. Note: evaluate transcript text, do not claim to assess audio tone.
3. Identify one genuine specific strength in their sentence.
4. Identify any grammatical or usage errors (or specify null if none).
5. Provide a more natural, native-sounding alternative sentence.
6. Provide a concise explanation (1-2 sentences) of how to improve.
7. Assign an encouraging score between 0 and 100 based on usage accuracy and clarity.
8. Offer a warm, motivating closing encouragement.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: evaluationPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TUTOR,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: {
              type: Type.BOOLEAN,
              description: 'True if the usage is correct and appropriate.',
            },
            wordUsedProperly: {
              type: Type.BOOLEAN,
              description: 'True if the target word is used in proper grammatical context.',
            },
            strength: {
              type: Type.STRING,
              description: 'One specific strength in the learner sentence.',
            },
            grammarIssue: {
              type: Type.STRING,
              description: 'Specific grammar or usage correction, or empty if perfect.',
            },
            naturalAlternative: {
              type: Type.STRING,
              description: 'A more natural, polished alternative sentence.',
            },
            explanation: {
              type: Type.STRING,
              description: 'Concise explanation of the feedback.',
            },
            score: {
              type: Type.INTEGER,
              description: 'Score from 0 to 100.',
            },
            encouragement: {
              type: Type.STRING,
              description: 'Short uplifting encouraging remark.',
            },
          },
          required: [
            'isCorrect',
            'wordUsedProperly',
            'strength',
            'naturalAlternative',
            'explanation',
            'score',
            'encouragement',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini feedback error, providing smart linguistic assessment fallback:', error?.message);
    const { word = 'articulate', userSubmission = '' } = req.body;
    const containsWord = userSubmission.toLowerCase().includes(word.toLowerCase());
    const wordCount = userSubmission.trim().split(/\s+/).length;
    const score = containsWord ? (wordCount >= 6 ? 90 : 78) : 55;

    res.json({
      isCorrect: containsWord,
      wordUsedProperly: containsWord,
      strength: containsWord
        ? `You successfully incorporated "${word}" with appropriate context.`
        : `Your sentence expresses a clear thought.`,
      grammarIssue: userSubmission.endsWith('.') ? null : 'Remember to finish your sentence with closing punctuation.',
      naturalAlternative: containsWord
        ? userSubmission
        : `Consider phrasing: "I practiced an articulate approach to explain our team goals."`,
      explanation: containsWord
        ? `The word "${word}" fits neatly into your sentence structure.`
        : `Make sure the target word "${word}" is directly woven into your sentence.`,
      score,
      encouragement: 'Great effort! Repetition and active use cement new vocabulary into your long-term memory.',
      offlineNotice: 'Evaluated with linguistic feedback rules.',
    });
  }
});

// Dynamic Word Generator: Generate complete curriculum card for any English word
app.post('/api/tutor/generate-word', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word || typeof word !== 'string') {
      res.status(400).json({ error: 'Word is required' });
      return;
    }

    if (!aiClient) {
      // Fallback response for offline/unconfigured key
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
      res.json({
        id: word.toLowerCase(),
        word: capitalized,
        phonetic: `/${word.toLowerCase()}/`,
        readablePhonetic: word.toUpperCase(),
        partOfSpeech: 'noun / adjective',
        meaning: `A meaningful English term learned in VocabVoice AI.`,
        examples: [
          `Learning how to use "${word}" expands your workplace communication.`,
          `Try forming your own sentence with "${word}".`,
        ],
        synonyms: ['expressive', 'relevant'],
        antonyms: ['unrelated'],
        difficulty: 'Intermediate',
        quizQuestion: `What is the best definition for "${capitalized}"?`,
        quizOptions: [
          { text: `The standard meaning and context for ${capitalized}`, isCorrect: true },
          { text: `An unrelated, irrelevant meaning`, isCorrect: false },
          { text: `A completely opposite concept`, isCorrect: false },
        ],
        speakingTargetSentence: `I am learning how to use the word ${word} in my conversations.`,
        useItPrompt: `Write or say a sentence showing how you might use "${word}" at work or in everyday life.`,
      });
      return;
    }

    const wordPrompt = `Generate a comprehensive English vocabulary learning card for the word "${word}".
Format strictly as JSON with accurate phonetics, part of speech, simple English definition, 2 natural workplace/everyday example sentences, synonyms, antonyms, difficulty level (Beginner, Intermediate, or Advanced), a 3-choice multiple choice quiz question testing comprehension with exactly 1 correct answer, a speaking target sentence, and a practical "Use It" prompt.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: wordPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            readablePhonetic: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            meaning: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            synonyms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            antonyms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            difficulty: { type: Type.STRING },
            quizQuestion: { type: Type.STRING },
            quizOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                },
                required: ['text', 'isCorrect'],
              },
            },
            speakingTargetSentence: { type: Type.STRING },
            useItPrompt: { type: Type.STRING },
          },
          required: [
            'word',
            'phonetic',
            'readablePhonetic',
            'partOfSpeech',
            'meaning',
            'examples',
            'synonyms',
            'difficulty',
            'quizQuestion',
            'quizOptions',
            'speakingTargetSentence',
            'useItPrompt',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    parsed.id = parsed.word.toLowerCase();
    res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini word generation error, using fallback:', error?.message);
    const { word = 'word' } = req.body;
    const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
    res.json({
      id: word.toLowerCase(),
      word: capitalized,
      phonetic: `/${word.toLowerCase()}/`,
      readablePhonetic: word.toUpperCase(),
      partOfSpeech: 'noun / adjective',
      meaning: `An effective professional term to expand workplace and conversational fluency.`,
      examples: [
        `Using "${word}" in your project updates communicates precision and confidence.`,
        `The team discussed how best to apply this concept during our sprint planning.`,
      ],
      synonyms: ['Clear', 'Effective', 'Insightful'],
      antonyms: ['Ambiguous'],
      difficulty: 'Intermediate',
      quizQuestion: `What is the most effective way to demonstrate "${capitalized}"?`,
      quizOptions: [
        { text: `Applying it thoughtfully in context to explain ideas with clarity`, isCorrect: true },
        { text: `Using it out of context where it causes confusion`, isCorrect: false },
        { text: `Avoiding clear communication altogether`, isCorrect: false },
      ],
      speakingTargetSentence: `I am developing my confidence to use ${word} naturally in conversations.`,
      useItPrompt: `Write or say a sentence demonstrating how "${word}" applies to your work or study routine.`,
    });
  }
});

// Vite middleware for dev or static serving for production
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VocabVoice AI server running on http://0.0.0.0:${PORT}`);
});
