import React from 'react';
import { Playlist, Track } from '../../types/music';
import { 
  Music, 
  Play, 
  Pause, 
  Clock, 
  Trash2, 
  Plus, 
  Cloud, 
  Sparkles,
  Heart,
  Youtube
} from 'lucide-react';

interface PlaylistsViewProps {
  playlists: Playlist[];
  activePlaylistId: string | null;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onPlayTrack: (track: Track) => void;
  onPlayTracks: (tracks: Track[]) => void;
  onToggleFavorite: (trackId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  openCloudModal: () => void;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  activePlaylistId,
  tracks,
  currentTrack,
  isPlaying,
  favorites,
  onSelectPlaylist,
  onCreatePlaylist,
  onPlayTrack,
  onPlayTracks,
  onToggleFavorite,
  onRemoveTrackFromPlaylist,
  onDeletePlaylist,
  openCloudModal,
}) => {
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || playlists[0];

  // Resolve tracks inside active playlist
  const playlistTracks = React.useMemo(() => {
    if (!activePlaylist) return [];
    if (activePlaylist.id === 'pl-favorites') {
      return tracks.filter((t) => favorites.includes(t.id));
    }
    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    return activePlaylist.trackIds
      .map((id) => trackMap.get(id))
      .filter((t): t is Track => t !== undefined);
  }, [activePlaylist, tracks, favorites]);

  const totalDuration = playlistTracks.reduce((acc, t) => acc + t.duration, 0);
  const isThisPlaying =
    isPlaying && currentTrack && playlistTracks.some((t) => t.id === currentTrack.id);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-8 space-y-5 sm:space-y-6 select-none">
      {/* Horizontal playlist selector strip (particularly useful on mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 shrink-0">
        <button
          onClick={onCreatePlaylist}
          className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Nueva Lista</span>
        </button>

        {playlists.map((pl) => {
          const isSelected = activePlaylist?.id === pl.id;
          return (
            <button
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                isSelected
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-900 hover:bg-zinc-850'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ background: pl.coverGradient }}
              />
              <span>{pl.name}</span>
            </button>
          );
        })}
      </div>

      {activePlaylist ? (
        <>
          {/* Playlist Header */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 sm:gap-6 bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 sm:p-6 rounded-2xl border border-zinc-900">
            <div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl shrink-0 border border-white/10 flex items-center justify-center text-white text-3xl font-bold"
              style={{ background: activePlaylist.coverGradient }}
            >
              {activePlaylist.id === 'pl-favorites' ? (
                <Heart className="w-14 h-14 sm:w-16 sm:h-16 fill-white text-white drop-shadow-md" />
              ) : activePlaylist.isYtImported ? (
                <Youtube className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-md" />
              ) : (
                activePlaylist.name.slice(0, 1).toUpperCase()
              )}
            </div>

            <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                Lista de Reproducción
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight truncate">
                {activePlaylist.name}
              </h1>

              {activePlaylist.description && (
                <p className="text-xs text-zinc-400 max-w-lg line-clamp-2">
                  {activePlaylist.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-zinc-400 pt-1">
                <span className="text-zinc-200 font-medium">{playlistTracks.length} canciones</span>
                <span aria-hidden="true">·</span>
                <span>{Math.round(totalDuration / 60)} min</span>
                <span aria-hidden="true">·</span>
                <span>{playlistTracks.filter((t) => t.isHiRes).length} pistas Hi-Res</span>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3">
                <button
                  onClick={() => onPlayTracks(playlistTracks)}
                  disabled={playlistTracks.length === 0}
                  className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  {isThisPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>Reproducir</span>
                    </>
                  )}
                </button>

                <button
                  onClick={openCloudModal}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sincronizar en la Nube</span>
                </button>

                {activePlaylist.id !== 'pl-favorites' && (
                  <button
                    onClick={() => onDeletePlaylist(activePlaylist.id)}
                    title="Eliminar lista"
                    className="p-2.5 text-zinc-500 hover:text-red-400 rounded-full hover:bg-zinc-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tracks Table */}
          {playlistTracks.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl space-y-3">
              <Music className="w-10 h-10 text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-white">
                Esta lista de reproducción está vacía
              </div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Explora tu biblioteca o importa canciones desde YouTube Music para añadirlas aquí.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2.5 border-b border-zinc-900 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5 md:col-span-5">Título</div>
                <div className="col-span-3 hidden md:block">Álbum</div>
                <div className="col-span-4 md:col-span-2">Formato</div>
                <div className="col-span-2 md:col-span-1 text-right flex items-center justify-end">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="divide-y divide-zinc-900/60">
                {playlistTracks.map((track, idx) => {
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

                      <div className="col-span-5 md:col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
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
                              <Music className="w-4 h-4 opacity-70" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate text-white group-hover:text-emerald-300 transition-colors">
                            {track.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {track.artist}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-3 hidden md:block text-zinc-400 truncate text-[11px]">
                        {track.album}
                      </div>

                      <div className="col-span-4 md:col-span-2 text-[11px] font-mono text-zinc-400 truncate">
                        <span className={track.isHiRes ? 'text-emerald-400 font-semibold' : ''}>
                          {track.format}
                        </span>
                      </div>

                      <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-2 text-right font-mono tabular-nums text-zinc-400">
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

                        {activePlaylist.id !== 'pl-favorites' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveTrackFromPlaylist(activePlaylist.id, track.id);
                            }}
                            title="Quitar de la lista"
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
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
          )}
        </>
      ) : (
        <div className="py-20 text-center space-y-3">
          <Music className="w-12 h-12 text-zinc-600 mx-auto" />
          <h2 className="text-base font-bold text-white">No hay listas creadas</h2>
          <button
            onClick={onCreatePlaylist}
            className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl"
          >
            Crear tu primera lista
          </button>
        </div>
      )}
    </div>
  );
};
