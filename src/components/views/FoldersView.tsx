import React, { useMemo, useState } from 'react';
import { Track } from '../../types/music';
import { 
  Folder, 
  FolderOpen, 
  FolderTree,
  ChevronRight, 
  Play, 
  Disc, 
  FileAudio, 
  FolderPlus, 
  ArrowLeft,
  Clock,
  Sparkles
} from 'lucide-react';

interface FoldersViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onPlayTracks: (tracks: Track[]) => void;
  onOpenUpload: () => void;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onPlayTracks,
  onOpenUpload,
}) => {
  // Current active folder path in tree
  const [currentPath, setCurrentPath] = useState<string>('');

  // Extract all folders from track.filePath or track.folder
  const computedFolderTree = useMemo(() => {
    const foldersMap = new Map<string, Track[]>();

    tracks.forEach((track) => {
      // e.g. filePath: "Música/Rock Clásico/Pink Floyd/01. Speak to Me.flac"
      const pathParts = (track.filePath || track.folder || 'Biblioteca Local').split('/');
      
      // If path has directories
      if (pathParts.length > 1) {
        // Collect all parent prefixes
        for (let i = 1; i < pathParts.length; i++) {
          const folderPrefix = pathParts.slice(0, i).join('/');
          if (!foldersMap.has(folderPrefix)) {
            foldersMap.set(folderPrefix, []);
          }
        }
        // Direct parent folder contains this track
        const directParent = pathParts.slice(0, pathParts.length - 1).join('/');
        foldersMap.get(directParent)?.push(track);
      } else {
        const rootFolder = track.folder || 'Biblioteca Local';
        if (!foldersMap.has(rootFolder)) {
          foldersMap.set(rootFolder, []);
        }
        foldersMap.get(rootFolder)?.push(track);
      }
    });

    return foldersMap;
  }, [tracks]);

  // Find subfolders under currentPath
  const currentSubfolders = useMemo(() => {
    const subfolders = new Set<string>();
    const prefix = currentPath ? `${currentPath}/` : '';

    computedFolderTree.forEach((_, key) => {
      if (currentPath === '') {
        const topLevel = key.split('/')[0];
        subfolders.add(topLevel);
      } else if (key.startsWith(prefix) && key !== currentPath) {
        const remaining = key.slice(prefix.length);
        const nextPart = remaining.split('/')[0];
        if (nextPart) {
          subfolders.add(`${prefix}${nextPart}`);
        }
      }
    });

    return Array.from(subfolders);
  }, [currentPath, computedFolderTree]);

  // Tracks in the current folder
  const currentFolderTracks = useMemo(() => {
    if (!currentPath) {
      // Show all tracks if at root
      return tracks;
    }
    // All tracks inside this folder or subfolders
    return tracks.filter((t) => {
      const p = t.filePath || t.folder || '';
      return p.startsWith(currentPath);
    });
  }, [currentPath, tracks]);

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const handleBreadcrumbClick = (index: number) => {
    const parts = breadcrumbs.slice(0, index + 1);
    setCurrentPath(parts.join('/'));
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-8 space-y-5 sm:space-y-6 select-none">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-400" />
            <span>Explorador de Carpetas de Archivos</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Navega por la jerarquía exacta de carpetas de tu disco local
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentFolderTracks.length > 0 && (
            <button
              onClick={() => onPlayTracks(currentFolderTracks)}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Reproducir Carpeta ({currentFolderTracks.length})</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            <span>Subir Carpeta</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900 overflow-x-auto">
        <button
          onClick={() => setCurrentPath('')}
          className={`hover:text-white transition-colors ${
            currentPath === '' ? 'text-emerald-400 font-bold' : ''
          }`}
        >
          Raíz
        </button>

        {breadcrumbs.map((part, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              className={`hover:text-white transition-colors whitespace-nowrap ${
                idx === breadcrumbs.length - 1 ? 'text-emerald-400 font-bold' : ''
              }`}
            >
              {part}
            </button>
          </React.Fragment>
        ))}

        {currentPath !== '' && (
          <button
            onClick={handleNavigateUp}
            className="ml-auto text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Subir Nivel</span>
          </button>
        )}
      </div>

      {/* Subfolder Cards Grid */}
      {currentSubfolders.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Subcarpetas ({currentSubfolders.length})
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {currentSubfolders.map((folderPath) => {
              const displayName = folderPath.split('/').pop() || folderPath;
              const folderTrackCount = tracks.filter((t) =>
                (t.filePath || t.folder || '').startsWith(folderPath)
              ).length;

              return (
                <div
                  key={folderPath}
                  onClick={() => setCurrentPath(folderPath)}
                  className="p-3.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-900 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Folder className="w-4 h-4 fill-emerald-400/20" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {folderTrackCount} pistas
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {folderPath}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracks in Current Folder View */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Archivos de Audio en esta Carpeta ({currentFolderTracks.length})
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            {currentFolderTracks.filter((t) => t.isHiRes).length} pistas Hi-Res
          </span>
        </div>

        {currentFolderTracks.length === 0 ? (
          <div className="py-12 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 text-xs">
            Esta carpeta no contiene archivos de audio directos.
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 border-b border-zinc-900 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5 md:col-span-5">Archivo / Título</div>
              <div className="col-span-3 hidden md:block">Ruta de Carpeta</div>
              <div className="col-span-4 md:col-span-2">Formato</div>
              <div className="col-span-2 md:col-span-1 text-right flex items-center justify-end">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="divide-y divide-zinc-900/60">
              {currentFolderTracks.map((track, idx) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track)}
                    className={`grid grid-cols-12 px-4 py-2.5 items-center text-xs transition-colors cursor-pointer group ${
                      currentTrack?.id === track.id
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    <div className="col-span-1 text-center font-mono text-[11px] text-zinc-500 group-hover:text-white">
                      {isThisPlaying ? (
                        <span className="text-emerald-400 font-bold">▶</span>
                      ) : (
                        <span className="group-hover:hidden">{idx + 1}</span>
                      )}
                      <Play className="w-3 h-3 fill-current hidden group-hover:inline ml-0.5 text-white" />
                    </div>

                    <div className="col-span-5 md:col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                      <FileAudio className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-white group-hover:text-emerald-300 transition-colors">
                          {track.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {track.artist}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 hidden md:block text-zinc-500 font-mono text-[10px] truncate">
                      {track.filePath || track.folder}
                    </div>

                    <div className="col-span-4 md:col-span-2 text-[11px] font-mono text-zinc-400 truncate">
                      <span className={track.isHiRes ? 'text-emerald-400 font-semibold' : ''}>
                        {track.format}
                      </span>
                    </div>

                    <div className="col-span-2 md:col-span-1 text-right font-mono tabular-nums text-zinc-400 text-xs">
                      {formatDuration(track.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
