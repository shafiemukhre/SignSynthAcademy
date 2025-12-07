import React from 'react';
import { Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

interface GenerativeCanvasProps {
  imageUrl: string | null;
  isGenerating: boolean;
  promptText: string;
}

export const GenerativeCanvas: React.FC<GenerativeCanvasProps> = ({ imageUrl, isGenerating, promptText }) => {
  return (
    <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 group">
      
      {/* Header Label */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-slate-900/90 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-pink-400" />
          <span className="text-xs font-bold tracking-widest text-pink-400 uppercase">Nano Banana Pro</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex items-center justify-center relative">
        
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center space-y-4 px-8 text-center">
            {/* Simulation of diffusion process visually */}
            <div className="relative w-32 h-32">
               <div className="absolute inset-0 border-4 border-pink-500/20 rounded-full animate-ping"></div>
               <div className="absolute inset-0 border-4 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
            <div className="space-y-1">
              <p className="text-pink-300 font-mono text-sm animate-pulse">Running Diffusion Model...</p>
              <p className="text-slate-500 text-xs truncate max-w-[200px]">"{promptText}"</p>
            </div>
          </div>
        ) : imageUrl ? (
          <>
            <img 
              src={imageUrl} 
              alt="AI Generated Reference" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Generative UI Detail Overlay */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                 <span className="text-[10px] text-slate-300 font-mono">SEED: {Math.floor(Math.random() * 999999)}</span>
               </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-slate-600">
            <ImageIcon size={48} className="mb-2 opacity-50" />
            <p className="text-sm font-mono">Waiting for input stream...</p>
          </div>
        )}
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
      </div>
    </div>
  );
};