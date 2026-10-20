import React, { useEffect, useRef, useState } from 'react';
import { audioEngine, EQ_FREQUENCIES, EQ_PRESETS } from '../audio/AudioEngine';
import { Sliders, X, RotateCcw, Activity, Sparkles, Volume2 } from 'lucide-react';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [bands, setBands] = useState(audioEngine.bands);
  const [currentPreset, setCurrentPreset] = useState(audioEngine.currentPreset);
  const [bassBoost, setBassBoost] = useState(audioEngine.bassBoostAmount);
  const [virtualizer, setVirtualizer] = useState(audioEngine.virtualizerAmount);
  const [preamp, setPreamp] = useState(audioEngine.preampAmount);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!isOpen) return;

    setBands([...audioEngine.bands]);
    setCurrentPreset(audioEngine.currentPreset);
    setBassBoost(audioEngine.bassBoostAmount);
    setVirtualizer(audioEngine.virtualizerAmount);
    setPreamp(audioEngine.preampAmount);

    // Start visualizer canvas loop
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      audioEngine.getVisualizerData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (height - 6);

        // Gradient for frequency bars
        const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
        grad.addColorStop(0, '#059669');
        grad.addColorStop(0.7, '#10b981');
        grad.addColorStop(1, '#34d399');

        ctx.fillStyle = grad;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

        // Peak cap dot
        if (barHeight > 4) {
          ctx.fillStyle = '#a7f3d0';
          ctx.fillRect(x, height - barHeight - 2, barWidth - 2, 2);
        }

        x += barWidth + 1;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBandChange = (index: number, val: number) => {
    audioEngine.setBandGain(index, val);
    setBands([...audioEngine.bands]);
    setCurrentPreset('Personalizado');
  };

  const handleApplyPreset = (presetName: string) => {
    audioEngine.applyPreset(presetName);
    setBands([...audioEngine.bands]);
    setCurrentPreset(presetName);
    setBassBoost(audioEngine.bassBoostAmount);
    setVirtualizer(audioEngine.virtualizerAmount);
  };

  const handleBassBoost = (val: number) => {
    setBassBoost(val);
    audioEngine.setBassBoost(val);
  };

  const handleVirtualizer = (val: number) => {
    setVirtualizer(val);
    audioEngine.setVirtualizer(val);
  };

  const handlePreamp = (val: number) => {
    setPreamp(val);
    audioEngine.setPreamp(val);
  };

  const handleReset = () => {
    handleApplyPreset('Plano');
    handlePreamp(0);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header with prominent X button */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Ecualizador Paramétrico 10-Bandas
              </h2>
              <p className="text-[11px] text-zinc-400">
                Calibración de audio en tiempo real y modelado de respuesta acústica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors flex items-center gap-1.5"
              title="Restablecer a valores planos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              title="Cerrar ecualizador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time Spectrum Visualizer Strip */}
        <div className="px-5 sm:px-6 pt-3 pb-2 bg-zinc-900/30 border-b border-zinc-900 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-1.5">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Activity className="w-3.5 h-3.5" />
              Espectro de Frecuencia en Vivo
            </span>
            <span>20 Hz — 20 kHz</span>
          </div>
          <canvas
            ref={canvasRef}
            width={700}
            height={50}
            className="w-full h-12 bg-zinc-950/80 rounded-lg border border-zinc-900/80 shadow-inner"
          />
        </div>

        {/* Content body with responsive scroll */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Preset Buttons */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Perfiles Acústicos
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(EQ_PRESETS).map((preset) => {
                const isActive = currentPreset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-850'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 10-Band Sliders Grid (Scrollable horizontally on mobile) */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-3">
              <span>+12 dB</span>
              <span className="text-zinc-400 font-medium hidden sm:inline">0 dB (Línea Base Plana)</span>
              <span>-12 dB</span>
            </div>

            <div className="overflow-x-auto pb-2 -mx-1 px-1">
              <div className="grid grid-cols-10 gap-2 items-center justify-items-center min-w-[500px] md:min-w-0">
                {bands.map((b, idx) => (
                  <div key={b.freq} className="flex flex-col items-center gap-2 h-48 sm:h-52">
                    {/* dB readout */}
                    <span className="text-[10px] font-mono tabular-nums text-zinc-300 h-4">
                      {b.gain > 0 ? `+${b.gain.toFixed(1)}` : b.gain.toFixed(1)}
                    </span>

                    {/* Vertical Slider Container */}
                    <div className="flex-1 flex items-center justify-center relative w-6">
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={b.gain}
                        onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                        className="vertical-slider appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Frequency label */}
                    <span className="text-[11px] font-mono text-zinc-400 font-medium">
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Enhancement Controls (Bass Boost, Virtualizer, Preamp) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Bass Boost */}
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Refuerzo Sub-Graves
                </span>
                <span className="font-mono tabular-nums text-emerald-400 text-xs">
                  {bassBoost}/10
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={bassBoost}
                onChange={(e) => handleBassBoost(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 ${bassBoost * 10}%, #27272a ${bassBoost * 10}%)`,
                }}
              />
              <p className="text-[10px] text-zinc-500">
                Aumenta el impacto acústico de frecuencias bajas (80Hz)
              </p>
            </div>

            {/* Virtualizer (Spatial Soundstage) */}
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Virtualizador 3D
                </span>
                <span className="font-mono tabular-nums text-cyan-400 text-xs">
                  {virtualizer}/10
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={virtualizer}
                onChange={(e) => handleVirtualizer(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #06b6d4 ${virtualizer * 10}%, #27272a ${virtualizer * 10}%)`,
                }}
              />
              <p className="text-[10px] text-zinc-500">
                Amplitud espacial holográfica para mayor inmersión
              </p>
            </div>

            {/* Preamp */}
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  Preamplificador
                </span>
                <span className="font-mono tabular-nums text-amber-400 text-xs">
                  {preamp > 0 ? `+${preamp.toFixed(1)}` : preamp.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min={-6}
                max={6}
                step={0.5}
                value={preamp}
                onChange={(e) => handlePreamp(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f59e0b ${((preamp + 6) / 12) * 100}%, #27272a ${((preamp + 6) / 12) * 100}%)`,
                }}
              />
              <p className="text-[10px] text-zinc-500">
                Ganancia de entrada previa al filtrado de ecualización
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
