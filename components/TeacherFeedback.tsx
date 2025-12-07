import React, { useEffect } from 'react';
import { Bot, Volume2, ArrowRight, RotateCcw } from 'lucide-react';
import { FeedbackResponse, AppState } from '../types';

interface TeacherFeedbackProps {
  appState: AppState;
  feedback: FeedbackResponse | null;
  onNext: () => void;
  onRetry: () => void;
}

export const TeacherFeedback: React.FC<TeacherFeedbackProps> = ({ appState, feedback, onNext, onRetry }) => {
  
  // Handle Text-to-Speech
  useEffect(() => {
    if (feedback?.message && (appState === AppState.FEEDBACK || appState === AppState.SUCCESS)) {
      // Cancel previous speech to avoid overlap
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(feedback.message);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      
      // Try to find a good English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en-US')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  }, [feedback, appState]);

  if (appState === AppState.IDLE || appState === AppState.GENERATING_REF) return null;

  const isSuccess = appState === AppState.SUCCESS;
  const isAnalyzing = appState === AppState.ANALYZING;

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 p-6 
      transition-transform duration-500 ease-out
      ${isAnalyzing || feedback ? 'translate-y-0' : 'translate-y-full'}
    `}>
      <div className="max-w-4xl mx-auto">
        <div className={`
          relative overflow-hidden rounded-2xl shadow-2xl border-l-4
          ${isSuccess ? 'bg-emerald-950/90 border-emerald-500' : 'bg-slate-900/90 border-violet-500'}
          backdrop-blur-xl p-6 flex flex-col md:flex-row items-center gap-6
        `}>
          
          {/* Avatar / Icon */}
          <div className={`
            p-4 rounded-full shrink-0
            ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-violet-500/20 text-violet-400'}
          `}>
             <Bot size={32} />
          </div>

          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${isSuccess ? 'text-emerald-400' : 'text-violet-400'}`}>
              Gemini Teacher AI
            </h3>
            <p className="text-lg md:text-xl font-medium text-white">
              {isAnalyzing ? "Analyzing hand geometry..." : feedback?.message || "Ready when you are."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 shrink-0">
             {!isAnalyzing && feedback && (
               <>
                {!isSuccess && (
                  <button 
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-colors"
                  >
                    <RotateCcw size={18} />
                    Retry
                  </button>
                )}
                
                {isSuccess && (
                  <button 
                    onClick={onNext}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-white shadow-lg shadow-emerald-900/50 transition-all hover:scale-105"
                  >
                    Next Lesson
                    <ArrowRight size={18} />
                  </button>
                )}
               </>
             )}
          </div>
          
          {/* Audio Wave Visualizer (Fake) */}
          <div className="absolute right-6 top-6 opacity-20">
            <Volume2 size={24} />
          </div>

        </div>
      </div>
    </div>
  );
};