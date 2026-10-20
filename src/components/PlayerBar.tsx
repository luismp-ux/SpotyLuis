import React, { useState } from 'react';
import { Track } from '../types/music';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX, 
  Volume1,
  Heart, 
  Sliders, 
  Mic2, 
  Activity,
  Disc,
  ChevronUp,
  ChevronDown,
  X,
  Maximize2,
  Trash2
} from 'lucide-react';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isFavorite: boolean;
  showLyrics: boolean;
  showEqualizer: boolean;
  showVisualizer: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleFavorite: () => void;
  onDeleteCurrentTrack?: (trackId: string) => void;
  onToggleLyrics: () => void;
  onToggleEqualizer: () => void;
  onToggleVisualizer: () => void;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isFavorite,
  showLyrics,
  showEqualizer,
  showVisualizer,
  onPlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleFavorite,
  onDeleteCurrentTrack,
  onToggleLyrics,
  onToggleEqualizer,
  onToggleVisualizer,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const displayTime = isSeeking ? seekVal : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MOBILE MINI PLAYER (Rendered only on < md screens)         */}
      {/* ============================================================ */}
      <div className="md:hidden bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-md select-none shrink-0 relative z-30">
        {/* Thin top progress line */}
        <div className="w-full h-1 bg-zinc-800 relative">
          <div 
            className="h-full bg-emerald-400 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="h-16 px-3 flex items-center justify-between gap-3">
          {/* Track Info (tappable to expand mobile player) */}
          <div 
            onClick={() => setIsMobileExpanded(true)}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer py-1"
          >
            <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-md">
              {currentTrack?.coverUrl ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : ''}`}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white"
                  style={{ background: currentTrack?.coverGradient || '#18181b' }}
                >
                  <Disc className={`w-5 h-5 opacity-80 ${isPlaying ? 'animate-spin-slow' : ''}`} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span className="truncate">{currentTrack ? currentTrack.title : 'Sin reproducción'}</span>
                {isPlaying && (
                  <div className="flex items-end gap-0.5 h-3 shrink-0" title="Reproduciendo">
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-1"></span>
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-2"></span>
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-3"></span>
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-4"></span>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                <span>{currentTrack ? currentTrack.artist : 'Selecciona una canción'}</span>
                {currentTrack?.isOfflineAvailable && (
                  <span className="text-[9px] font-mono font-semibold text-emerald-400">
                    · OFFLINE
                  </span>
                )}
                {currentTrack?.isHiRes && (
                  <span className="text-[9px] font-mono font-semibold text-emerald-400">
                    · HI-RES
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {currentTrack && (
              <button
                onClick={onToggleFavorite}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-pink-400 active:scale-95 transition-all"
                title="Favorito"
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite ? 'fill-pink-500 text-pink-500' : ''}`}
                />
              </button>
            )}

            <button
              onClick={onPlayPause}
              disabled={!currentTrack}
              title={isPlaying ? 'Pausa' : 'Reproducir'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-950 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current text-zinc-950" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5 text-zinc-950" />
                )}
              </div>
            </button>

            <button
              onClick={onNext}
              disabled={!currentTrack}
              title="Siguiente"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-transform"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FULL MOBILE EXPANDED PLAYER MODAL (Opens on mobile click) */}
      {/* ============================================================ */}
      {isMobileExpanded && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col md:hidden select-none animate-fadeIn overflow-hidden">
          {/* Ambient background glow with smooth breathing animation */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none blur-3xl scale-125 animate-ambient-glow"
            style={{ background: currentTrack?.coverGradient || '#064e3b' }}
          />

          {/* Top Bar with prominent Close 'X' */}
          <div className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-zinc-800/60">
            <button
              onClick={() => setIsMobileExpanded(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 rounded-full transition-colors"
              title="Minimizar reproductor"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="text-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Reproduciendo Ahora
              </span>
              <div className="text-xs font-bold text-emerald-400">
                {currentTrack?.format || 'AUDIO'} {currentTrack?.isHiRes ? '· LOSSLESS 24-BIT' : ''}
              </div>
            </div>

            <button
              onClick={() => setIsMobileExpanded(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 rounded-full transition-colors"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Center Content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 py-6 overflow-y-auto">
            {/* Large Album Artwork with soft float/pulse */}
            <div className={`w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 my-auto shrink-0 transition-transform duration-500 ${isPlaying ? 'scale-100 shadow-emerald-500/10' : 'scale-95 opacity-90'}`}>
              {currentTrack?.coverUrl ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white"
                  style={{ background: currentTrack?.coverGradient || '#18181b' }}
                >
                  <Disc className={`w-20 h-20 opacity-80 ${isPlaying ? 'animate-spin-slow' : ''}`} />
                </div>
              )}
            </div>

            {/* Track Info & Actions (Favorite & Delete) */}
            <div className="w-full max-w-sm mt-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white truncate">
                    {currentTrack?.title || 'Sin canción seleccionada'}
                  </h2>
                  {isPlaying && (
                    <div className="flex items-end gap-0.5 h-4 shrink-0" title="Reproduciendo">
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-1"></span>
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-2"></span>
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-3"></span>
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-4"></span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-zinc-400 truncate">
                  {currentTrack?.artist} — {currentTrack?.album}
                </p>
                <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  {currentTrack?.bitrate}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {currentTrack && (
                  <button
                    onClick={onToggleFavorite}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-pink-400 active:scale-95 transition-all"
                    title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                  >
                    <Heart
                      className={`w-6 h-6 ${isFavorite ? 'fill-pink-500 text-pink-500' : ''}`}
                    />
                  </button>
                )}

                {currentTrack && onDeleteCurrentTrack && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar "${currentTrack.title}" de tu biblioteca?`)) {
                        onDeleteCurrentTrack(currentTrack.id);
                        setIsMobileExpanded(false);
                      }
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-red-400 active:scale-90 transition-all rounded-full hover:bg-zinc-800"
                    title="Eliminar canción de la biblioteca"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrubber & Timestamps */}
            <div className="w-full max-w-sm mt-5 space-y-2">
              <div className="relative py-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={displayTime}
                  onMouseDown={() => setIsSeeking(true)}
                  onTouchStart={() => setIsSeeking(true)}
                  onChange={(e) => setSeekVal(parseFloat(e.target.value))}
                  onMouseUp={(e) => {
                    setIsSeeking(false);
                    onSeek(parseFloat((e.target as HTMLInputElement).value));
                  }}
                  onTouchEnd={(e) => {
                    setIsSeeking(false);
                    onSeek(parseFloat((e.target as HTMLInputElement).value));
                  }}
                  className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #10b981 ${progressPercent}%, #27272a ${progressPercent}%)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-zinc-400">
                <span>{formatDuration(displayTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Controls (Shuffle, Prev, Big Play, Next, Repeat) */}
            <div className="w-full max-w-sm flex items-center justify-between mt-4">
              <button
                onClick={onToggleShuffle}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded transition-colors ${
                  isShuffle ? 'text-emerald-400' : 'text-zinc-400'
                }`}
                title="Aleatorio"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={onPrevious}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white active:scale-95 transition-transform"
                title="Anterior"
              >
                <SkipBack className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={onPlayPause}
                disabled={!currentTrack}
                className="w-16 h-16 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                title={isPlaying ? 'Pausa' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={onNext}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white active:scale-95 transition-transform"
                title="Siguiente"
              >
                <SkipForward className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={onToggleRepeat}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded transition-colors ${
                  repeatMode !== 'off' ? 'text-emerald-400' : 'text-zinc-400'
                }`}
                title="Repetir"
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {/* Quick Feature Row: Letras, Ecualizador, Visualizador */}
            <div className="w-full max-w-sm grid grid-cols-3 gap-2 mt-6">
              <button
                onClick={() => {
                  setIsMobileExpanded(false);
                  onToggleLyrics();
                }}
                className={`py-3 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors ${
                  showLyrics
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Mic2 className="w-5 h-5 text-emerald-400" />
                <span>Letras</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileExpanded(false);
                  onToggleEqualizer();
                }}
                className={`py-3 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors ${
                  showEqualizer
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Sliders className="w-5 h-5 text-emerald-400" />
                <span>Ecualizador</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileExpanded(false);
                  onToggleVisualizer();
                }}
                className={`py-3 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors relative ${
                  showVisualizer
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
                title="Espectro y Minijuego interactivo"
              >
                <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black rounded-full shadow-md tracking-wider">
                  🎮 DINO
                </span>
                <Activity className="w-5 h-5 text-emerald-400" />
                <span>Espectro</span>
              </button>
            </div>

            {/* Volume slider */}
            <div className="w-full max-w-sm flex items-center gap-3 mt-4 px-2">
              <button
                onClick={onToggleMute}
                className="text-zinc-400 hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 ${(isMuted ? 0 : volume) * 100}%, #27272a ${(isMuted ? 0 : volume) * 100}%)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DESKTOP PLAYER BAR (Rendered on >= md screens)             */}
      {/* ============================================================ */}
      <footer className="hidden md:flex h-20 bg-zinc-950 border-t border-zinc-800/80 px-6 items-center justify-between gap-6 select-none z-30 shrink-0">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
          {currentTrack ? (
            <>
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md group">
                {currentTrack.coverUrl ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform ${
                      isPlaying ? 'scale-105' : ''
                    }`}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white"
                    style={{ background: currentTrack.coverGradient }}
                  >
                    <Disc className={`w-6 h-6 opacity-80 ${isPlaying ? 'animate-spin-slow' : ''}`} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
                    {currentTrack.title}
                  </span>
                  {currentTrack.source === 'yt_music' && (
                    <span className="text-[10px] text-red-400 font-mono tracking-tight shrink-0 font-bold">
                      YT MUSIC
                    </span>
                  )}
                  {currentTrack.isOfflineAvailable && (
                    <span className="text-[10px] text-emerald-400 font-mono tracking-tight shrink-0 font-bold">
                      · OFFLINE
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-zinc-400 truncate">
                  {currentTrack.artist}
                </div>

                {/* Zero-Pill Unboxed Hi-Res Metadata */}
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono tabular-nums mt-0.5">
                  <span className={currentTrack.isHiRes ? 'text-emerald-400 font-semibold' : ''}>
                    {currentTrack.format}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{currentTrack.bitrate}</span>
                </div>
              </div>

              <button
                onClick={onToggleFavorite}
                title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                className="p-1.5 text-zinc-400 hover:text-pink-400 rounded-full transition-colors ml-1"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorite ? 'fill-pink-500 text-pink-500' : ''
                  }`}
                />
              </button>
            </>
          ) : (
            <div className="text-xs text-zinc-500 italic">
              Selecciona una pista para reproducir
            </div>
          )}
        </div>

        {/* Center: Playback Controls & Scrubber */}
        <div className="flex-1 max-w-2xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleShuffle}
              title={isShuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
              className={`p-1.5 rounded transition-colors ${
                isShuffle ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={onPrevious}
              title="Anterior"
              className="p-1.5 text-zinc-300 hover:text-white hover:scale-105 transition-all"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={onPlayPause}
              disabled={!currentTrack}
              title={isPlaying ? 'Pausa' : 'Reproducir'}
              className="w-9 h-9 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:hover:scale-100"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              title="Siguiente"
              className="p-1.5 text-zinc-300 hover:text-white hover:scale-105 transition-all"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={onToggleRepeat}
              title={`Modo repetición: ${repeatMode}`}
              className={`p-1.5 rounded transition-colors ${
                repeatMode !== 'off' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Scrubber & Time Readout */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[11px] font-mono tabular-nums text-zinc-400 w-10 text-right">
              {formatDuration(displayTime)}
            </span>

            <div className="relative flex-1 group py-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={displayTime}
                onMouseDown={() => setIsSeeking(true)}
                onTouchStart={() => setIsSeeking(true)}
                onChange={(e) => setSeekVal(parseFloat(e.target.value))}
                onMouseUp={(e) => {
                  setIsSeeking(false);
                  onSeek(parseFloat((e.target as HTMLInputElement).value));
                }}
                onTouchEnd={(e) => {
                  setIsSeeking(false);
                  onSeek(parseFloat((e.target as HTMLInputElement).value));
                }}
                className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #10b981 ${progressPercent}%, #27272a ${progressPercent}%)`,
                }}
              />
            </div>

            <span className="text-[11px] font-mono tabular-nums text-zinc-500 w-10 text-left">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right: Sound & Display Utilities */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          {/* Synced Lyrics Toggle */}
          <button
            onClick={onToggleLyrics}
            title="Letras sincronizadas"
            className={`p-2 rounded-lg transition-colors ${
              showLyrics
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Equalizer Toggle */}
          <button
            onClick={onToggleEqualizer}
            title="Ecualizador de audio"
            className={`p-2 rounded-lg transition-colors ${
              showEqualizer
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Visualizer & Minigame Toggle */}
          <button
            onClick={onToggleVisualizer}
            title="Espectro acústico y Minijuego Dino"
            className={`p-2 rounded-lg transition-colors relative ${
              showVisualizer
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Volume controls */}
          <div className="flex items-center gap-2 group w-28">
            <button
              onClick={onToggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer focus:outline-none"
              style={{
                background: `linear-gradient(to right, #ffffff ${
                  (isMuted ? 0 : volume) * 100
                }%, #27272a ${(isMuted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>
      </footer>
    </>
  );
};
