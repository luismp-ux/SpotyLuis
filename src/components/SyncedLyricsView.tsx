import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LyricLine, Track } from '../types/music';
import { findActiveLyricIndex, parseLRC } from '../utils/lrcParser';
import { searchAndFetchLyrics } from '../utils/lyricsService';
import { 
  Mic2, 
  X, 
  Upload, 
  FileText, 
  Check, 
  Music2, 
  Sparkles, 
  Loader2, 
  RefreshCw, 
  Globe, 
  Search,
  AlertCircle
} from 'lucide-react';

interface SyncedLyricsViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onUpdateTrackLyrics: (trackId: string, lyrics: LyricLine[]) => void;
}

export const SyncedLyricsView: React.FC<SyncedLyricsViewProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  onSeek,
  onUpdateTrackLyrics,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsSource, setLyricsSource] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  const lyrics = currentTrack?.syncedLyrics || [];
  const activeIndex = findActiveLyricIndex(lyrics, currentTime);

  // Automatic online lyrics lookup function
  const handleAutoFetch = useCallback(async (customQuery?: string) => {
    if (!currentTrack) return;
    setIsLoadingLyrics(true);
    setSearchError(null);

    let queryTitle = currentTrack.title;
    let queryArtist = currentTrack.artist;

    if (customQuery && customQuery.trim().length > 0) {
      if (customQuery.includes(' - ')) {
        const parts = customQuery.split(' - ');
        queryArtist = parts[0].trim();
        queryTitle = parts.slice(1).join(' - ').trim();
      } else {
        queryTitle = customQuery.trim();
      }
    }

    try {
      const result = await searchAndFetchLyrics(
        queryTitle,
        queryArtist,
        currentTrack.duration,
        currentTrack.ytVideoId
      );

      if (result && result.synced.length > 0) {
        onUpdateTrackLyrics(currentTrack.id, result.synced);
        setLyricsSource(result.source);
        setShowSearchInput(false);
      } else {
        setSearchError('No se encontró letra automática con esos términos. Intenta buscar con otro nombre o artista.');
      }
    } catch {
      setSearchError('Error de conexión al consultar fuentes públicas de letras.');
    } finally {
      setIsLoadingLyrics(false);
    }
  }, [currentTrack, onUpdateTrackLyrics]);

  // Automatically trigger lyrics fetch when viewing a song that has no lyrics
  useEffect(() => {
    if (isOpen && currentTrack && (!currentTrack.syncedLyrics || currentTrack.syncedLyrics.length === 0)) {
      handleAutoFetch();
    }
  }, [isOpen, currentTrack?.id]);

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

  // Auto-scroll to active lyric line
  useEffect(() => {
    if (!isOpen || isEditing) return;
    if (activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isOpen, isEditing]);

  if (!isOpen || !currentTrack) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseLRC(content);
        if (parsed.length > 0) {
          onUpdateTrackLyrics(currentTrack.id, parsed);
          setLyricsSource('Archivo local .LRC');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveEditedLyrics = () => {
    if (!editText.trim()) return;
    const parsed = parseLRC(editText);
    if (parsed.length > 0) {
      onUpdateTrackLyrics(currentTrack.id, parsed);
      setLyricsSource('Personalizada');
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col select-none overflow-hidden animate-fadeIn">
      {/* Dynamic blurred cover backdrop */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-3xl scale-125"
        style={{ background: currentTrack.coverGradient }}
      />

      {/* Top Header with track info and prominent controls */}
      <div className="relative z-10 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-white/10 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0">
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
                <Music2 className="w-5 h-5 opacity-70" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {currentTrack.title}
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
              {currentTrack.artist} — {currentTrack.album}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Re-fetch or search internet button */}
          <button
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5"
            title="Buscar letra en internet"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buscar en Internet</span>
          </button>

          {/* Load .LRC button */}
          <label className="hidden sm:flex px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar .LRC</span>
            <input
              type="file"
              accept=".lrc,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Edit / Paste text toggle */}
          <button
            onClick={() => {
              if (!isEditing) {
                setEditText(
                  lyrics
                    .map(
                      (l) =>
                        `[${String(Math.floor(l.time / 60)).padStart(2, '0')}:${String(
                          Math.floor(l.time % 60)
                        ).padStart(2, '0')}.${String(
                          Math.floor((l.time % 1) * 100)
                        ).padStart(2, '0')}] ${l.text}`
                    )
                    .join('\n')
                );
              }
              setIsEditing(!isEditing);
            }}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEditing ? 'Cancelar' : 'Editar LRC'}</span>
            <span className="sm:hidden">{isEditing ? 'Volver' : 'LRC'}</span>
          </button>

          {/* Prominent Close Button */}
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Cerrar letras"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Secondary Status & Custom Search Bar */}
      <div className="relative z-10 px-4 sm:px-8 py-2 bg-zinc-900/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {isLoadingLyrics ? (
            <div className="flex items-center gap-1.5 text-amber-400 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Buscando letra automáticamente en internet...</span>
            </div>
          ) : lyricsSource ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fuente: {lyricsSource}</span>
            </div>
          ) : lyrics.length > 0 ? (
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Letra sincronizada ({lyrics.length} líneas) · Toca cualquier línea para saltar a ese segundo</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-zinc-400">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Sin letra para esta canción</span>
            </div>
          )}
        </div>

        {/* Inline Manual Search Input */}
        {showSearchInput && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAutoFetch(customSearchQuery);
            }}
            className="flex items-center gap-1.5 w-full sm:w-auto"
          >
            <input
              type="text"
              value={customSearchQuery}
              onChange={(e) => setCustomSearchQuery(e.target.value)}
              placeholder="Ej: GRECAS - Bad Voy"
              className="px-3 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-full sm:w-60"
            />
            <button
              type="submit"
              disabled={isLoadingLyrics}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
            >
              {isLoadingLyrics ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              <span>Buscar</span>
            </button>
          </form>
        )}
      </div>

      {searchError && (
        <div className="relative z-10 mx-4 sm:mx-8 mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
          <span>{searchError}</span>
          <button
            onClick={() => handleAutoFetch()}
            className="text-amber-200 underline font-semibold flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar
          </button>
        </div>
      )}

      {/* Main Lyrics Area */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {isEditing ? (
          <div className="w-full max-w-2xl mx-auto my-auto p-4 sm:p-6 bg-zinc-900/90 border border-white/10 rounded-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="text-sm font-semibold text-white">
              Editor de Letras Sincronizadas (Formato LRC)
            </div>
            <p className="text-xs text-zinc-400">
              Pega líneas en formato estándar <code className="text-emerald-400 font-mono">[mm:ss.xx] Tu letra</code>
            </p>
            <textarea
              rows={10}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="[00:04.20] Primera línea de la canción...&#10;[00:08.50] Segunda línea sincronizada..."
              className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditedLyrics}
                className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Letras</span>
              </button>
            </div>
          </div>
        ) : lyrics.length > 0 ? (
          <div
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto px-6 sm:px-12 py-32 flex flex-col items-center space-y-6 sm:space-y-8 scroll-smooth text-center"
          >
            {lyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={`${line.time}-${idx}`}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 max-w-2xl px-4 py-2 rounded-xl ${
                    isActive
                      ? 'text-xl sm:text-3xl font-extrabold text-white scale-105 sm:scale-110 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                      : isPast
                      ? 'text-base sm:text-xl font-medium text-zinc-500 hover:text-zinc-300'
                      : 'text-base sm:text-xl font-medium text-zinc-600 hover:text-zinc-400'
                  }`}
                  title={`Saltar a ${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}`}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
              <Mic2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                No hay letras sincronizadas disponibles
              </h3>
              <p className="text-xs text-zinc-400 max-w-md">
                Buscamos automáticamente en internet o puedes importar un archivo .LRC o pegar el texto directamente.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleAutoFetch()}
                disabled={isLoadingLyrics}
                className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {isLoadingLyrics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span>Buscar automáticamente en internet</span>
              </button>

              <label className="px-4 py-2 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 border border-zinc-700">
                <Upload className="w-4 h-4" />
                <span>Cargar archivo .LRC</span>
                <input
                  type="file"
                  accept=".lrc,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700"
              >
                <FileText className="w-4 h-4" />
                <span>Pegar texto LRC</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
