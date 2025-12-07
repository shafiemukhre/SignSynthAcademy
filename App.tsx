
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WebcamView, WebcamRef } from './components/WebcamView';
import { GenerativeCanvas } from './components/GenerativeCanvas';
import { TeacherFeedback } from './components/TeacherFeedback';
import { useProgress } from './hooks/useProgress';
import { ALPHABET_LESSONS } from './constants';
import { analyzeHandShape, generateReferenceImage, createLessonFromIntent } from './services/aiService';
import { AppState, FeedbackResponse, Lesson } from './types';
import { Brain, Trophy, Flame, Zap, Layout, BookOpen, Dumbbell, Settings, LogOut, Menu, Mic, MicOff, RefreshCw, Radio, Sparkles, Send, School, Keyboard, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

// Polyfill for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const { progress, addXP, markLearned } = useProgress();
  const [activeTab, setActiveTab] = useState<'classroom' | 'practice'>('classroom');
  
  // Classroom State
  const [currentLesson, setCurrentLesson] = useState<Lesson>(ALPHABET_LESSONS[0]);
  const [lessonQueue, setLessonQueue] = useState<Lesson[]>(ALPHABET_LESSONS);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Classroom Auto/Voice/Input State
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [lastSpokenCommand, setLastSpokenCommand] = useState<string | null>(null);
  const [customSentence, setCustomSentence] = useState("");

  // Practice State
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceImage, setPracticeImage] = useState<string | null>(null);
  const [isPracticeGenerating, setIsPracticeGenerating] = useState(false);

  const webcamRef = useRef<WebcamRef>(null);
  const recognitionRef = useRef<any>(null);

  // --- TAB HANDLING ---
  const handleTabChange = (tab: 'classroom' | 'practice') => {
    setActiveTab(tab);
    if (tab === 'practice') {
      // Turn off classroom tools when leaving
      setIsMicOn(false);
      setIsAutoMode(false);
    }
  };

  // --- CLASSROOM LOGIC ---

  // Load a specific lesson
  const loadLesson = useCallback(async (lesson: Lesson, forceRefresh = false) => {
    setCurrentLesson(lesson);
    setAppState(AppState.GENERATING_REF);
    setFeedback(null);
    try {
      const url = await generateReferenceImage(lesson.prompt, "1:1");
      setRefImage(url);
      setAppState(AppState.WAITING_FOR_USER);
    } catch (e) {
      console.error(e);
      setAppState(AppState.IDLE);
    }
  }, []);

  // Start initial lesson on mount if in classroom
  useEffect(() => {
    if (activeTab === 'classroom' && !refImage) {
      loadLesson(ALPHABET_LESSONS[0]);
    }
  }, [activeTab, loadLesson, refImage]);

  const performAnalysis = async (imageSrc: string, spokenText?: string) => {
    if (appState === AppState.ANALYZING || appState === AppState.GENERATING_REF) return;

    setAppState(AppState.ANALYZING);
    setFeedback(null);

    try {
      const result = await analyzeHandShape(currentLesson.target, imageSrc, spokenText);
      setFeedback(result);
      
      if (result.success) {
        setAppState(AppState.SUCCESS);
        addXP(50);
        markLearned(currentLesson.target);
      } else {
        setAppState(AppState.FEEDBACK);
      }
    } catch (e) {
      console.error("Analysis failed", e);
      setAppState(AppState.WAITING_FOR_USER);
    }
  };

  const handleCapture = async () => {
    if (appState !== AppState.WAITING_FOR_USER && appState !== AppState.FEEDBACK && appState !== AppState.SUCCESS) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      await performAnalysis(imageSrc);
    }
  };

  const processVoiceCommand = async (transcript: string) => {
    const lower = transcript.toLowerCase();
    setLastSpokenCommand(transcript);
    setTimeout(() => setLastSpokenCommand(null), 3000);

    if (lower.includes('next lesson') || lower.includes('move to next') || lower.includes('skip')) {
      handleNext();
      return;
    }
    
    if (lower.includes('previous lesson') || lower.includes('go back')) {
      handlePrevious();
      return;
    }

    if (lower.includes('again') || lower.includes('repeat') || lower.includes('restart')) {
      loadLesson(currentLesson);
      return;
    }

    if (lower.includes('how to') || lower.includes('show me') || lower.includes('teach me')) {
      setAppState(AppState.GENERATING_REF);
      setFeedback({ success: false, message: `Generative Teacher: Creating lesson for "${transcript}"...` });
      
      try {
        const newLesson = await createLessonFromIntent(transcript);
        setLessonQueue(prev => [...prev, newLesson]);
        await loadLesson(newLesson);
      } catch (e) {
        setAppState(AppState.WAITING_FOR_USER);
        setFeedback({ success: false, message: "Sorry, I couldn't generate that lesson." });
      }
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      await performAnalysis(imageSrc, transcript);
    }
  };

  const handleSentenceSubmit = () => {
    if (!customSentence.trim()) return;
    
    // Split by spaces to preserve words
    const rawWords = customSentence.trim().split(/\s+/);
    
    const newLessons: Lesson[] = rawWords.map((rawWord, index) => {
      const word = rawWord.replace(/[^A-Za-z]/g, '').toUpperCase(); // Clean punctuation
      if (!word) return null; 
      
      const isWord = word.length > 1;
      return {
        id: `seq-${Date.now()}-${index}`,
        target: word,
        description: `Step ${index + 1} of ${rawWords.length}: Sign '${word}'`,
        difficulty: isWord ? 'Intermediate' : 'Beginner',
        // Word-for-word infographic generation vs Letter generation
        prompt: isWord 
          ? `educational infographic illustration of hands signing the word "${word}" in ASL, showing motion lines, arrows indicating movement, and facial expression if necessary, photorealistic style, white background`
          : `photorealistic close-up of a hand signing ASL letter ${word}, neutral background, 4k`
      };
    }).filter(Boolean) as Lesson[];

    if (newLessons.length === 0) return;

    setLessonQueue(newLessons);
    loadLesson(newLessons[0]);
    setCustomSentence("");
    setFeedback({
      success: false,
      message: `Queue updated! We will go word by word. First up: "${newLessons[0].target}"`
    });
  };

  // --- PRACTICE LOGIC ---
  const handlePracticeGenerate = async () => {
    if (!practiceInput.trim()) return;
    setIsPracticeGenerating(true);
    setPracticeImage(null);
    try {
      const prompt = `A clear, high-quality educational infographic showing the American Sign Language (ASL) hand signs for the sentence: "${practiceInput}". The hands should be arranged sequentially to spell out or sign the words. Neutral background, photorealistic style, high contrast.`;
      const url = await generateReferenceImage(prompt, "16:9");
      setPracticeImage(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPracticeGenerating(false);
    }
  };

  const handlePracticeInClassroom = () => {
    if (!practiceImage || !practiceInput) return;

    // Create a custom lesson from the practice session
    const customLesson: Lesson = {
      id: `practice-${Date.now()}`,
      target: practiceInput,
      description: `Custom practice session for: "${practiceInput}". Mimic the signs shown in the generated guide.`,
      difficulty: 'Conversational',
      prompt: `A clear, high-quality educational infographic showing the American Sign Language (ASL) hand signs for the sentence: "${practiceInput}".`
    };

    // Update Classroom State directly
    setCurrentLesson(customLesson);
    setRefImage(practiceImage); // Inject the already generated image
    setLessonQueue(prev => [customLesson, ...prev]); // Add to history/queue
    setAppState(AppState.WAITING_FOR_USER);
    
    setFeedback({
      success: false,
      message: `Great! Let's master "${practiceInput}". I'll watch your signing and give you feedback.`
    });

    // Switch to Classroom
    handleTabChange('classroom');
  };

  // --- EFFECTS ---

  // Voice Recognition (Only in Classroom)
  const processCommandRef = useRef(processVoiceCommand);
  useEffect(() => { processCommandRef.current = processVoiceCommand; }, [processVoiceCommand]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || activeTab !== 'classroom') return;

    if (isMicOn) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript.trim();
        processCommandRef.current(transcript);
      };
      
      recognition.onend = () => { if (isMicOn && activeTab === 'classroom') recognition.start(); };
      try { recognition.start(); } catch(e) {}
      recognitionRef.current = recognition;
    } else {
      recognitionRef.current?.stop();
    }
    return () => recognitionRef.current?.stop();
  }, [isMicOn, activeTab]);

  // Auto-Check (Only in Classroom)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (isAutoMode && activeTab === 'classroom' && (appState === AppState.WAITING_FOR_USER || appState === AppState.FEEDBACK || appState === AppState.SUCCESS)) {
      intervalId = setInterval(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) performAnalysis(imageSrc);
      }, 3500);
    }
    return () => clearInterval(intervalId);
  }, [isAutoMode, appState, currentLesson, activeTab]);

  // Navigation Handlers
  const handleNext = () => {
    const idx = lessonQueue.findIndex(l => l.id === currentLesson.id);
    const nextIndex = (idx + 1) % lessonQueue.length;
    loadLesson(lessonQueue[nextIndex]);
  };

  const handlePrevious = () => {
    const idx = lessonQueue.findIndex(l => l.id === currentLesson.id);
    const prevIndex = idx - 1;
    if (prevIndex >= 0) {
      loadLesson(lessonQueue[prevIndex]);
    }
  };

  const handleRefreshImage = () => {
    // Force reload of current lesson image
    loadLesson(currentLesson, true);
  };

  const handleRetry = () => {
    setAppState(AppState.WAITING_FOR_USER);
    setFeedback(null);
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden selection:bg-violet-500/30">
      
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-violet-600 to-pink-500 p-2 rounded-lg shrink-0">
               <Brain size={24} className="text-white" />
            </div>
            {isSidebarOpen && (
              <div className="animate-fade-in whitespace-nowrap overflow-hidden">
                <h1 className="text-lg font-bold tracking-tight">SignSynth</h1>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-2">
           <NavItem 
             icon={<BookOpen size={20} />} 
             label="Classroom" 
             active={activeTab === 'classroom'} 
             expanded={isSidebarOpen} 
             onClick={() => handleTabChange('classroom')}
           />
           <NavItem 
             icon={<Dumbbell size={20} />} 
             label="Practice" 
             active={activeTab === 'practice'} 
             expanded={isSidebarOpen} 
             onClick={() => handleTabChange('practice')}
           />
           <NavItem icon={<Layout size={20} />} label="Dashboard" expanded={isSidebarOpen} />
           <NavItem icon={<Settings size={20} />} label="Settings" expanded={isSidebarOpen} />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-slate-600">ST</div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">Student</p>
                <p className="text-xs text-slate-500 truncate">Beginner</p>
              </div>
            )}
            {isSidebarOpen && <LogOut size={16} className="text-slate-500 hover:text-white cursor-pointer" />}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <Menu size={20} />
          </button>

          {lastSpokenCommand && (
            <div className="absolute left-1/2 -translate-x-1/2 bg-violet-600/90 text-white px-4 py-1 rounded-full text-sm font-mono animate-bounce">
               🎤 "{lastSpokenCommand}"
            </div>
          )}

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-amber-400">
               <Flame size={18} fill="currentColor" />
               <span className="font-mono font-bold hidden md:inline">{progress.streakDays} Day Streak</span>
               <span className="font-mono font-bold md:hidden">{progress.streakDays}</span>
             </div>
             <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-900">
               <Trophy size={16} />
               <span className="font-mono font-bold">{progress.xp} XP</span>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
          
          {/* CLASSROOM TAB */}
          {activeTab === 'classroom' && (
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
              {/* Left: Input */}
              <div className="flex-1 flex flex-col gap-4 relative">
                <div className="flex justify-between items-center px-2">
                   <div className="text-xs font-mono text-slate-500">STUDENT FEED</div>
                   <div className="flex items-center gap-3">
                     
                     {/* Voice Toggle */}
                     <button 
                        onClick={() => setIsMicOn(!isMicOn)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                          isMicOn 
                            ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]' 
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                     >
                       {isMicOn ? <Mic size={12} className="animate-pulse" /> : <MicOff size={12} />}
                       VOICE: {isMicOn ? 'ON' : 'OFF'}
                     </button>

                     {/* Auto-Check Toggle */}
                     <button 
                        onClick={() => setIsAutoMode(!isAutoMode)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                          isAutoMode 
                            ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]' 
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                     >
                       <RefreshCw size={12} className={isAutoMode ? "animate-spin" : ""} />
                       AUTO: {isAutoMode ? 'ON' : 'OFF'}
                     </button>
                   </div>
                </div>

                {/* Sentence Input */}
                <div className="flex gap-2 px-1">
                  <input 
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-1 focus:ring-violet-500 outline-none placeholder:text-slate-600"
                    placeholder="Type a sentence (e.g. HELLO WORLD)..."
                    value={customSentence}
                    onChange={(e) => setCustomSentence(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSentenceSubmit()}
                  />
                  <button 
                    onClick={handleSentenceSubmit}
                    disabled={!customSentence.trim()}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 p-2 rounded-lg transition-colors"
                  >
                    <Keyboard size={18} className="text-violet-400" />
                  </button>
                </div>

                <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-800 min-h-[350px]">
                  <WebcamView 
                    ref={webcamRef}
                    isActive={true} 
                    isAnalyzing={appState === AppState.ANALYZING} 
                    isListening={isMicOn}
                  />
                  
                  {!isAutoMode && (appState === AppState.WAITING_FOR_USER || appState === AppState.FEEDBACK) && (
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
                       <button 
                        onClick={handleCapture}
                        className="pointer-events-auto bg-white text-black rounded-full p-4 shadow-xl shadow-violet-900/20 hover:scale-110 hover:shadow-violet-500/50 transition-all cursor-pointer group"
                       >
                         <Zap size={32} className="group-hover:text-violet-600 transition-colors" />
                       </button>
                     </div>
                  )}
                </div>
              </div>

              {/* Right: Output */}
              <div className="flex-1 flex flex-col gap-4 relative">
                 <div className="absolute -top-3 left-4 z-10 bg-slate-950 px-2 text-xs font-mono text-slate-500">NANO BANANA PRO REF</div>
                 <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-800 min-h-[350px] group/canvas">
                   <GenerativeCanvas 
                     imageUrl={refImage} 
                     isGenerating={appState === AppState.GENERATING_REF}
                     isSuccess={appState === AppState.SUCCESS}
                     promptText={currentLesson.prompt} 
                   />

                   {/* NAVIGATION CONTROLS */}
                   <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none z-20">
                      <button 
                        onClick={handlePrevious}
                        disabled={lessonQueue.findIndex(l => l.id === currentLesson.id) === 0}
                        className="pointer-events-auto p-3 bg-black/40 hover:bg-black/80 text-white rounded-full disabled:opacity-0 transition-all backdrop-blur-md"
                      >
                         <ChevronLeft size={24} />
                      </button>

                      <button 
                        onClick={handleNext}
                        className="pointer-events-auto p-3 bg-black/40 hover:bg-black/80 text-white rounded-full transition-all backdrop-blur-md"
                      >
                         <ChevronRight size={24} />
                      </button>
                   </div>

                   {/* REFRESH BUTTON */}
                   <div className="absolute top-14 right-4 z-20">
                      <button 
                        onClick={handleRefreshImage}
                        title="Regenerate Image"
                        className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 p-2 rounded-lg backdrop-blur-md border border-slate-700 transition-all hover:text-white"
                      >
                         <RotateCw size={16} />
                      </button>
                   </div>
                 </div>

                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shrink-0">
                   <div className="flex justify-between items-start mb-2">
                     <div>
                        <h2 className="text-3xl font-bold text-white mb-1">
                          {currentLesson.target.length > 3 ? "Sign:" : "Sign Letter"} "{currentLesson.target}"
                        </h2>
                        <div className="flex gap-2">
                          <span className="text-xs bg-violet-900 text-violet-200 px-2 py-0.5 rounded uppercase tracking-wider">{currentLesson.difficulty}</span>
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">
                             Queue: {lessonQueue.findIndex(l => l.id === currentLesson.id) + 1} / {lessonQueue.length}
                          </span>
                        </div>
                     </div>
                   </div>
                   <p className="text-slate-400 leading-relaxed text-sm">
                     {currentLesson.description}
                   </p>
                 </div>
              </div>
            </div>
          )}

          {/* PRACTICE TAB */}
          {activeTab === 'practice' && (
            <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
              <div className="mb-6 space-y-4">
                <div className="flex flex-col gap-2">
                   <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                     <Sparkles className="text-pink-500" />
                     ASL Phrase Generator
                   </h2>
                   <p className="text-slate-400">Type any sentence to generate a custom step-by-step sign language infographic.</p>
                </div>
                
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={practiceInput}
                    onChange={e => setPracticeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePracticeGenerate()}
                    placeholder="Type a sentence (e.g., 'Nice to meet you')"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-lg focus:ring-2 focus:ring-pink-500 outline-none placeholder:text-slate-600"
                  />
                  <button 
                    onClick={handlePracticeGenerate}
                    disabled={isPracticeGenerating || !practiceInput.trim()}
                    className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-900/40"
                  >
                    {isPracticeGenerating ? (
                      <span className="animate-spin text-xl">⟳</span>
                    ) : (
                      <Send size={20} />
                    )}
                    Generate
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl min-h-[400px] group">
                 <GenerativeCanvas 
                   imageUrl={practiceImage} 
                   isGenerating={isPracticeGenerating}
                   promptText={practiceInput || "Waiting for input..."}
                 />
                 {!practiceImage && !isPracticeGenerating && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-700 font-mono text-sm">Create your custom learning material</p>
                   </div>
                 )}
                 
                 {/* "Practice in Classroom" Button Overlay */}
                 {practiceImage && !isPracticeGenerating && (
                    <div className="absolute bottom-6 right-6 z-20">
                      <button 
                        onClick={handlePracticeInClassroom}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-violet-900/50 hover:scale-105 transition-all"
                      >
                         <School size={20} />
                         Practice in Classroom
                      </button>
                    </div>
                 )}
              </div>
            </div>
          )}

        </main>

        {activeTab === 'classroom' && (
          <TeacherFeedback 
            appState={appState} 
            feedback={feedback}
            onNext={handleNext}
            onRetry={handleRetry}
          />
        )}

      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, expanded = true, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`
      flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors
      ${active ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
    `}
  >
    {icon}
    {expanded && <span className="font-medium text-sm">{label}</span>}
  </div>
);

export default App;
