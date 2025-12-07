import { Lesson } from './types';

export const ALPHABET_LESSONS: Lesson[] = [
  {
    id: 'A',
    target: 'A',
    description: 'Make a fist with your thumb resting against the side of your index finger.',
    difficulty: 'Beginner',
    prompt: 'photorealistic close-up of a hand signing ASL letter A, neutral background, 4k'
  },
  {
    id: 'B',
    target: 'B',
    description: 'Open palm, fingers straight up and together, thumb tucked across palm.',
    difficulty: 'Beginner',
    prompt: 'photorealistic close-up of a hand signing ASL letter B, neutral background, 4k'
  },
  {
    id: 'C',
    target: 'C',
    description: 'Curve your fingers and thumb to form a C shape.',
    difficulty: 'Beginner',
    prompt: 'photorealistic close-up of a hand signing ASL letter C, side profile, neutral background, 4k'
  }
];

export const INITIAL_PROGRESS = {
  xp: 0,
  level: 'Beginner' as const,
  streakDays: 1,
  learnedSigns: []
};