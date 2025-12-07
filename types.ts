
export type Difficulty = 'Beginner' | 'Intermediate' | 'Conversational';

export interface StudentProgress {
  xp: number;
  level: Difficulty;
  streakDays: number;
  learnedSigns: string[];
}

export interface Lesson {
  id: string;
  target: string; // The letter or word
  description: string;
  difficulty: Difficulty;
  prompt: string; // The prompt for the Image Generator
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  correctionPrompt?: string; // If failed, prompt for a specific correction image
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING_REF = 'GENERATING_REF', // Generating initial lesson image
  WAITING_FOR_USER = 'WAITING_FOR_USER',
  LISTENING = 'LISTENING', // User is speaking
  ANALYZING = 'ANALYZING',
  FEEDBACK = 'FEEDBACK',
  SUCCESS = 'SUCCESS'
}
