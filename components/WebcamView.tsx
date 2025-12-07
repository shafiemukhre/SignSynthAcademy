
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Camera, Scan, Radio } from 'lucide-react';

export interface WebcamRef {
  getScreenshot: () => string | null;
}

interface WebcamViewProps {
  isActive: boolean;
  isAnalyzing: boolean;
  isListening?: boolean;
}

export const WebcamView = forwardRef<WebcamRef, WebcamViewProps>(({ isActive, isAnalyzing, isListening }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamError, setStreamError] = useState(false);

  useImperativeHandle(ref, () => ({
    getScreenshot: () => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
           ctx.drawImage(videoRef.current, 0, 0);
           return canvas.toDataURL('image/jpeg', 0.8);
        }
      }
      return null;
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStreamError(false);
      } catch (err) {
        console.error("Camera access denied", err);
        setStreamError(true);
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  // Simulate AI Skeleton Tracking Overlay & Audio Visualizer
  useEffect(() => {
    if (!isActive || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId: number;
    let t = 0;

    const draw = () => {
      if (!ctx || !videoRef.current) return;
      
      if (videoRef.current.readyState === 4) {
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. ANALYZING VISUALS
        if (isAnalyzing) {
          ctx.strokeStyle = '#8b5cf6'; // Violet for analysis
          ctx.lineWidth = 2;
          ctx.beginPath();
          const scanY = (Math.sin(t * 0.1) * 0.5 + 0.5) * canvas.height;
          ctx.moveTo(0, scanY);
          ctx.lineTo(canvas.width, scanY);
          ctx.stroke();
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 2. LISTENING VISUALS (Audio Waveform)
        if (isListening) {
           const barCount = 20;
           const barWidth = 6;
           const spacing = 4;
           const totalWidth = barCount * (barWidth + spacing);
           const startX = (canvas.width - totalWidth) / 2;
           
           ctx.fillStyle = '#ec4899'; // Pink
           for(let i=0; i<barCount; i++) {
             // Fake audio data using Sine wave + noise
             const noise = Math.random() * 0.5 + 0.5;
             const wave = Math.sin(t * 0.2 + i * 0.5) * 0.5 + 0.5;
             const height = 10 + wave * noise * 40;
             
             ctx.fillRect(startX + i * (barWidth + spacing), canvas.height - 40 - height, barWidth, height);
           }
           
           // Text
           ctx.font = '12px monospace';
           ctx.fillStyle = '#ec4899';
           ctx.fillText("MIC ACTIVE", startX, canvas.height - 20);
        }

        // 3. HAND BOUNDING BOX (Idle or Analyzing)
        if (!isListening || isAnalyzing) {
            const boxSize = 200;
            ctx.strokeStyle = isAnalyzing ? '#8b5cf6' : 'rgba(0, 255, 128, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            
            const floatY = Math.sin(t * 0.05) * 10;
            ctx.strokeRect(centerX - boxSize/2, centerY - boxSize/2 + floatY, boxSize, boxSize);
        }
      }

      t++;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, isAnalyzing, isListening]);

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl">
      {streamError ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <Camera size={48} className="mb-4" />
          <p>Camera access required</p>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover transform -scale-x-100" 
          />
          <canvas 
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none transform -scale-x-100"
          />
          
          {/* Overlay UI */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="bg-slate-900/80 px-3 py-1 rounded text-xs font-mono text-emerald-400 flex items-center gap-2 w-fit">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              CAM
            </div>
            
            {isListening && (
              <div className="bg-slate-900/80 px-3 py-1 rounded text-xs font-mono text-pink-400 flex items-center gap-2 w-fit">
                <Radio size={12} className="animate-pulse" />
                LISTENING
              </div>
            )}
          </div>
          
          {isAnalyzing && (
            <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center">
                <Scan size={48} className="text-violet-400 animate-spin-slow mb-2" />
                <span className="text-violet-200 font-mono tracking-widest text-sm bg-slate-900/50 px-2">ANALYZING GEOMETRY</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

WebcamView.displayName = 'WebcamView';
