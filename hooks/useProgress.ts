import { useState, useEffect } from 'react';
import { StudentProgress } from '../types';
import { INITIAL_PROGRESS } from '../constants';

export const useProgress = () => {
  const [progress, setProgress] = useState<StudentProgress>(() => {
    const saved = localStorage.getItem('signsynth-progress');
    return saved ? JSON.parse(saved) : INITIAL_PROGRESS;
  });

  useEffect(() => {
    localStorage.setItem('signsynth-progress', JSON.stringify(progress));
  }, [progress]);

  const addXP = (amount: number) => {
    setProgress(prev => ({ ...prev, xp: prev.xp + amount }));
  };

  const markLearned = (sign: string) => {
    setProgress(prev => {
      if (prev.learnedSigns.includes(sign)) return prev;
      return {
        ...prev,
        learnedSigns: [...prev.learnedSigns, sign]
      };
    });
  };

  return { progress, addXP, markLearned };
};