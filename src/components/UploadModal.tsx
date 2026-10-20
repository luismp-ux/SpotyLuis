import React, { useState, useEffect } from 'react';
import { Track } from '../types/music';
import { parseAudioFile } from '../utils/metadataExtractor';
import { 
  FolderPlus, 
  FileAudio, 
  X, 
  FolderTree, 
  Disc, 
  CheckCircle2, 
  Loader2, 
  Sparkles 
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTracks: (tracks: Track[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAddTracks,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [addedCount, setAddedCount] = useState<number | null>(null);

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

  if (!isOpen) return null;

  const handleProcessFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setAddedCount(null);

    const files = Array.from(fileList);
    const audioFiles: File[] = [];
    const lrcMap = new Map<string, string>();

    // Separate audio files and .lrc files
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext === 'lrc' || ext === 'txt') {
        const text = await f.text();
        const base = f.name.replace(/\.[^/.]+$/, '').toLowerCase();
        lrcMap.set(base, text);
      } else if (
        ext === 'flac' ||
        ext === 'alac' ||
        ext === 'm4a' ||
        ext === 'wav' ||
        ext === 'mp3' ||
        ext === 'aac' ||
        ext === 'ogg'
      ) {
        audioFiles.push(f);
      }
    }

    if (audioFiles.length === 0) {
      setIsProcessing(false);
      setProgressText('No se encontraron archivos de audio compatibles (FLAC, ALAC, WAV, MP3, etc.).');
      return;
    }

    const parsedTracks: Track[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      setProgressText(`Procesando metadatos e indexando: ${file.name} (${i + 1}/${audioFiles.length})...`);
      try {
        const track = await parseAudioFile(file, lrcMap);
        parsedTracks.push(track);
      } catch (err) {
        console.warn('Error al procesar archivo:', file.name, err);
      }
    }

    onAddTracks(parsedTracks);
    setIsProcessing(false);
    setAddedCount(parsedTracks.length);
    setProgressText('');

    setTimeout(() => {
      onClose();
      setAddedCount(null);
    }, 1500);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header with prominent X button */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Importar Música Local
              </h2>
              <p className="text-[11px] text-zinc-400">
                Soporte de alta fidelidad: FLAC 24-bit, ALAC, WAV, MP3 y letras .LRC
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with responsive scroll */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {isProcessing ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-xs font-semibold text-white">
                Procesando archivos y etiquetas ID3 / Vorbis
              </div>
              <p className="text-[11px] text-zinc-400 font-mono max-w-sm truncate">
                {progressText}
              </p>
            </div>
          ) : addedCount !== null ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <div className="text-sm font-bold text-white">
                ¡{addedCount} pistas indexadas exitosamente!
              </div>
              <p className="text-xs text-zinc-400">
                Organizadas automáticamente en álbumes, géneros y carpetas.
              </p>
            </div>
          ) : (
            <>
              {/* Option 1: Entire Directory Upload */}
              <label className="p-4 sm:p-5 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/30 hover:bg-zinc-900/50 rounded-xl cursor-pointer transition-all flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <FolderTree className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Importar Carpeta Completa con Subcarpetas
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Conserva la jerarquía de tu disco (Artista / Álbum / Canción) automáticamente.
                  </p>
                </div>
                {/* Directory input */}
                <input
                  type="file"
                  /* @ts-ignore */
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={(e) => handleProcessFiles(e.target.files)}
                />
              </label>

              {/* Option 2: Individual Audio Files */}
              <label className="p-4 sm:p-5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50 rounded-xl cursor-pointer transition-all flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0 group-hover:scale-105 transition-transform">
                  <FileAudio className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">
                    Seleccionar Archivos de Audio Sueltos
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Selecciona uno o varios archivos FLAC, ALAC, WAV, MP3 o letras .LRC.
                  </p>
                </div>
                {/* File input */}
                <input
                  type="file"
                  accept="audio/*,.flac,.alac,.wav,.mp3,.m4a,.aac,.ogg,.lrc"
                  multiple
                  className="hidden"
                  onChange={(e) => handleProcessFiles(e.target.files)}
                />
              </label>

              {/* Formats Supported */}
              <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-900 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Formatos Lossless:
                </span>
                <span className="font-mono text-zinc-300">
                  FLAC (24-bit/96kHz) · ALAC · WAV · MP3 320k
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
