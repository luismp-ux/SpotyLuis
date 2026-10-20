import React, { useState } from 'react';
import { Album, Track } from '../../types/music';
import { 
  Disc, 
  Play, 
  Pause, 
  Clock, 
  ArrowLeft, 
  Sparkles, 
  Music,
  Heart
} from 'lucide-react';

interface AlbumsViewProps {
  albums: Album[];
  currentTrack: Track | null;
  isPlaying: boolean;
  selectedAlbum: Album | null;
  favorites: string[];
  onSelectAlbum: (album: Album | null) => void;
  onPlayTrack: (track: Track) => void;
  onPlayTracks: (tracks: Track[]) => void;
  onToggleFavorite: (trackId: string) => void;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  albums,
  currentTrack,
  isPlaying,
  selectedAlbum,
  favorites,
  onSelectAlbum,
  onPlayTrack,
  onPlayTracks,
  onToggleFavorite,
}) => {
  // If an album is selected, show Album Detail View
  if (selectedAlbum) {
    const isThisAlbumPlaying =
      isPlaying &&
      currentTrack &&
      selectedAlbum.tracks.some((t) => t.id === currentTrack.id);

    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-8 space-y-5 sm:space-y-6 select-none">
        {/* Back button */}
        <button
          onClick={() => onSelectAlbum(null)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Álbumes</span>
        </button>

        {/* Album Header Banner */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-zinc-900">
          <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/10 group">
            {selectedAlbum.coverUrl ? (
              <img
                src={selectedAlbum.coverUrl}
                alt={selectedAlbum.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white"
                style={{ background: selectedAlbum.coverGradient }}
              >
                <Disc className="w-20 h-20 opacity-80" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center md:text-left">
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-mono font-semibold">
              Álbum {selectedAlbum.isHiRes && '· HI-RES LOSSLESS'}
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              {selectedAlbum.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-zinc-300">
              <span className="font-semibold text-white">{selectedAlbum.artist}</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span>{selectedAlbum.year || 2026}</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span>{selectedAlbum.tracks.length} canciones</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span>{selectedAlbum.genre}</span>
            </div>

            <div className="pt-3">
              <button
                onClick={() => onPlayTracks(selectedAlbum.tracks)}
                className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto md:mx-0"
              >
                {isThisAlbumPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pausar Álbum</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Reproducir Álbum</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tracklist Table */}
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 border-b border-zinc-900 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6 md:col-span-7">Título</div>
            <div className="col-span-3 hidden md:block">Formato</div>
            <div className="col-span-2 text-right flex items-center justify-end">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="divide-y divide-zinc-900/60">
            {selectedAlbum.tracks.map((track, idx) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              const isFav = favorites.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className={`grid grid-cols-12 px-4 py-3 items-center text-xs transition-colors cursor-pointer group ${
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

                  <div className="col-span-6 md:col-span-7 min-w-0 pr-2">
                    <div className="font-semibold truncate text-white group-hover:text-emerald-300 transition-colors">
                      {track.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {track.artist}
                    </div>
                  </div>

                  <div className="col-span-3 hidden md:block text-[11px] font-mono text-zinc-400 truncate">
                    <span className={track.isHiRes ? 'text-emerald-400 font-semibold' : ''}>
                      {track.format}
                    </span>
                    <span className="text-zinc-600 mx-1">·</span>
                    <span>{track.bitrate}</span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 text-right font-mono tabular-nums text-zinc-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-pink-400 transition-opacity"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFav ? 'fill-pink-500 text-pink-500 opacity-100' : ''
                        }`}
                      />
                    </button>
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // All Albums Grid View
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-8 space-y-5 sm:space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Disc className="w-5 h-5 text-emerald-400" />
            <span>Colección de Álbumes</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Organizados por carátula, año de lanzamiento y fidelidad de audio
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-400">{albums.length} álbumes</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {albums.map((album) => {
          return (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album)}
              className="group p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-900 hover:border-zinc-700/80 transition-all cursor-pointer flex flex-col shadow-sm"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white"
                    style={{ background: album.coverGradient }}
                  >
                    <Disc className="w-14 h-14 opacity-80" />
                  </div>
                )}

                {album.isHiRes && (
                  <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                    HI-RES
                  </div>
                )}

                {/* Floating Play Button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTracks(album.tracks);
                  }}
                  title="Reproducir álbum"
                  className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-zinc-950 flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>

              <div className="text-xs font-bold text-white truncate mb-0.5">
                {album.title}
              </div>
              <div className="text-[11px] text-zinc-400 truncate mb-1">
                {album.artist}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-auto flex items-center gap-1">
                <span>{album.trackCount} temas</span>
                <span aria-hidden="true">·</span>
                <span>{album.genre}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
