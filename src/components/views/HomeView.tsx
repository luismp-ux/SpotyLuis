import React from 'react';
import { Album, Playlist, Track } from '../../types/music';
import { 
  Play, 
  Pause, 
  Disc, 
  Sparkles, 
  Clock, 
  Heart, 
  Plus, 
  Folder, 
  Mic2,
  Layers,
  ChevronRight,
  Trash2
} from 'lucide-react';

interface HomeViewProps {
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onOpenLyrics: (track: Track) => void;
  onSelectAlbum: (album: Album) => void;
  onSelectGenre: (genre: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onOpenUpload: () => void;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  albums,
  playlists,
  currentTrack,
  isPlaying,
  favorites,
  onPlayTrack,
  onToggleFavorite,
  onDeleteTrack,
  onOpenLyrics,
  onSelectAlbum,
  onSelectGenre,
  onSelectPlaylist,
  onOpenUpload,
}) => {
  const featuredTrack = tracks[0];
  const hiResCount = tracks.filter((t) => t.isHiRes).length;

  // Distinct genres
  const genres = Array.from(new Set(tracks.map((t) => t.genre))).filter(Boolean);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-8 space-y-6 sm:space-y-8 select-none">
      {/* Hero Showcase Banner */}
      {featuredTrack && (
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none blur-2xl"
            style={{ background: featuredTrack.coverGradient }}
          />

          <div className="relative z-10 space-y-3 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>REPRODUCCIÓN HI-RES LOSSLESS</span>
              <span aria-hidden="true">·</span>
              <span>24-BIT / 96KHZ</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {featuredTrack.title}
            </h1>

            <p className="text-sm text-zinc-300">
              {featuredTrack.artist} — {featuredTrack.album}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => onPlayTrack(featuredTrack)}
                className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {currentTrack?.id === featuredTrack.id && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Reproducir ahora</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenLyrics(featuredTrack)}
                className="px-4 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-white font-medium text-xs rounded-full border border-zinc-700/80 transition-all flex items-center gap-1.5"
              >
                <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ver Letras</span>
              </button>
            </div>
          </div>

          <div className="relative z-10 w-44 h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 group">
            {featuredTrack.coverUrl ? (
              <img
                src={featuredTrack.coverUrl}
                alt={featuredTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white"
                style={{ background: featuredTrack.coverGradient }}
              >
                <Disc className="w-16 h-16 opacity-80" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Play Grid (Spotify Style 3x2) */}
      <div>
        <h2 className="text-sm font-bold text-white tracking-tight mb-3">
          Acceso Rápido
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tracks.slice(0, 6).map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group relative flex items-center gap-3 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-900 hover:border-zinc-800 rounded-lg p-2 cursor-pointer transition-all shadow-sm"
              >
                <div className="w-12 h-12 rounded overflow-hidden shrink-0 shadow">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white"
                      style={{ background: track.coverGradient }}
                    >
                      <Disc className="w-6 h-6 opacity-70" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <div className="text-xs font-bold text-white truncate">
                    {track.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {track.artist}
                  </div>
                </div>

                {/* Hover Play Button */}
                <div
                  className={`absolute right-3 w-8 h-8 rounded-full bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg transition-all ${
                    isThisPlaying
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                  }`}
                >
                  {isThisPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Álbumes en tu Biblioteca */}
      {albums.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Álbumes en tu Colección
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {albums.length} álbumes
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.slice(0, 5).map((album) => (
              <div
                key={album.id}
                onClick={() => onSelectAlbum(album)}
                className="group p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-900/80 hover:border-zinc-800 transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden mb-3 shadow-md">
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
                      <Disc className="w-12 h-12 opacity-80" />
                    </div>
                  )}

                  {album.isHiRes && (
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                      HI-RES
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-white truncate mb-0.5">
                  {album.title}
                </div>
                <div className="text-[11px] text-zinc-400 truncate mb-1">
                  {album.artist}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-auto flex items-center gap-1">
                  <span>{album.trackCount} pistas</span>
                  <span aria-hidden="true">·</span>
                  <span>{album.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explorar por Género Musical */}
      {genres.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Explorar por Géneros Musicales
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {genres.length} géneros
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => onSelectGenre(genre)}
                className="p-3.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-900 hover:border-zinc-700 transition-all text-left flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                    {genre}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {tracks.filter((t) => t.genre === genre).length} pistas
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Track Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Todas las Pistas en Local
            </h2>
            <p className="text-[11px] text-zinc-400">
              Biblioteca local con resolución de formato FLAC, ALAC, WAV y MP3
            </p>
          </div>

          <button
            onClick={onOpenUpload}
            className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Archivos</span>
          </button>
        </div>

        {/* High-density track table */}
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 px-4 py-2.5 border-b border-zinc-900 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5 md:col-span-4">Título</div>
            <div className="col-span-3 hidden md:block">Álbum</div>
            <div className="col-span-4 md:col-span-3">Formato / Tasa</div>
            <div className="col-span-2 md:col-span-1 text-right flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-zinc-900/60">
            {tracks.map((track, idx) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              const isFav = favorites.includes(track.id);

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
                  {/* # / Play Icon / Equalizer Animation */}
                  <div className="col-span-1 text-center font-mono text-[11px] text-zinc-500 group-hover:text-white flex items-center justify-center">
                    {isThisPlaying ? (
                      <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5" title="Reproduciendo">
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-1"></span>
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-2"></span>
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-3"></span>
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-4"></span>
                      </div>
                    ) : (
                      <>
                        <span className="group-hover:hidden">{idx + 1}</span>
                        <Play className="w-3 h-3 fill-current hidden group-hover:inline ml-0.5 text-white" />
                      </>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="col-span-5 md:col-span-4 flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded overflow-hidden shrink-0 shadow">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white"
                          style={{ background: track.coverGradient }}
                        >
                          <Disc className="w-4 h-4 opacity-70" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                        <span className="truncate">{track.title}</span>
                        {track.isOfflineAvailable && (
                          <span className="inline-flex items-center text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 rounded shrink-0">
                            OFFLINE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="col-span-3 hidden md:block text-zinc-400 truncate text-[11px]">
                    {track.album}
                  </div>

                  {/* Format & Bitrate (Zero-Pill Unboxed) */}
                  <div className="col-span-4 md:col-span-3 text-[11px] font-mono text-zinc-400 truncate flex items-center gap-1.5">
                    <span className={track.isHiRes ? 'text-emerald-400 font-semibold' : ''}>
                      {track.format}
                    </span>
                    <span aria-hidden="true" className="text-zinc-600">·</span>
                    <span className="truncate">{track.bitrate}</span>
                  </div>

                  {/* Duration & Quick Actions (Favorite & Delete) */}
                  <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1.5 text-right font-mono tabular-nums text-zinc-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-pink-400 transition-all hover:scale-110 active:scale-95"
                      title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFav ? 'fill-pink-500 text-pink-500 opacity-100' : ''
                        }`}
                      />
                    </button>
                    {onDeleteTrack && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar "${track.title}" de la biblioteca?`)) {
                            onDeleteTrack(track.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-400 transition-all hover:scale-110 active:scale-95"
                        title="Eliminar canción"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
