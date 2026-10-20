import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { Track } from '../types/music';
import { Activity, X, Waves, BarChart3, Disc, Gamepad2, Sparkles } from 'lucide-react';
import { SpectrumRunnerGame } from './SpectrumRunnerGame';

interface VisualizerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  initialMode?: 'bars' | 'wave' | 'game';
}

export const VisualizerOverlay: React.FC<VisualizerOverlayProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  initialMode = 'bars',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [mode, setMode] = useState<'bars' | 'wave' | 'game'>(initialMode);

  // Sync initialMode when opening
  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Canvas visualizer loop for 'bars' and 'wave' modes
  useEffect(() => {
    if (!isOpen || mode === 'game') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = 128;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = 'rgba(9, 9, 11, 0.25)';
      ctx.fillRect(0, 0, width, height);

      if (mode === 'bars') {
        audioEngine.getVisualizerData(freqData);
        const barWidth = (width / bufferLength) * 2.2;
        let x = (width - bufferLength * barWidth * 0.5) / 2;

        for (let i = 0; i < bufferLength / 2; i++) {
          const val = freqData[i];
          const barHeight = (val / 255) * (height * 0.6);

          const grad = ctx.createLinearGradient(0, height / 2 + barHeight, 0, height / 2 - barHeight);
          grad.addColorStop(0, '#059669');
          grad.addColorStop(0.5, '#10b981');
          grad.addColorStop(1, '#38bdf8');

          ctx.fillStyle = grad;
          ctx.fillRect(x, height / 2 - barHeight / 2, barWidth - 3, barHeight);

          x += barWidth;
        }
      } else {
        // Waveform oscilloscope mode
        audioEngine.getTimeDomainData(timeData);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#34d399';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Render Interactive Dino Minigame when game mode is active
  if (mode === 'game') {
    return (
      <SpectrumRunnerGame
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onClose={onClose}
        onSwitchToVisualizer={() => setMode('bars')}
      />
    );
  }

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col select-none overflow-hidden animate-fadeIn"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Top Overlay Bar */}
      <div className="relative z-10 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Espectrograma Acústico en Vivo
            </h2>
            <div className="text-[11px] sm:text-xs text-zinc-400 font-mono">
              Procesamiento FFT 32-bit Float · Web Audio
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setMode('game')}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950"
              title="Transformar espectro en minijuego de dinosaurio"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Minijuego Dino</span>
            </button>

            <button
              onClick={() => setMode('bars')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                mode === 'bars'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Barras</span>
            </button>
            <button
              onClick={() => setMode('wave')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                mode === 'wave'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Onda</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            title="Cerrar visualizador"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Floating Minigame Launch Banner */}
      <div className="relative z-10 mx-auto mt-6 bg-gradient-to-r from-emerald-500/20 via-zinc-900/90 to-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-xl max-w-md w-[90%]">
        <div className="text-2xl animate-bounce">🦕</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>¡Juega con el Espectro de la Canción!</span>
            <Sparkles className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-[11px] text-zinc-300">
            Salta obstáculos al compás de los bajos como el dinosaurio de Google
          </div>
        </div>
        <button
          onClick={() => setMode('game')}
          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          Jugar
        </button>
      </div>

      {/* Center Track Meta Card */}
      {currentTrack && (
        <div className="relative z-10 mt-auto mb-20 sm:mb-16 mx-auto bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl flex items-center gap-4 shadow-2xl max-w-sm sm:max-w-md w-[90%]">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white"
                style={{ background: currentTrack.coverGradient }}
              >
                <Disc className={`w-6 h-6 ${isPlaying ? 'animate-spin-slow' : ''}`} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">{currentTrack.title}</div>
            <div className="text-xs text-zinc-400 truncate">{currentTrack.artist}</div>
            <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
              {currentTrack.format} · {currentTrack.bitrate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
