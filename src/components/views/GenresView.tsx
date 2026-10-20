import React from 'react';
import { Track } from '../../types/music';
import { 
  Layers, 
  Play, 
  Pause, 
  ArrowLeft, 
  Clock, 
  Disc, 
  Heart,
  Sparkles
} from 'lucide-react';

interface GenresViewProps {
  tracks: Track[];
  selectedGenre: string | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: string[];
  onSelectGenre: (genre: string | null) => void;
  onPlayTrack: (track: Track) => void;
  onPlayTracks: (tracks: Track[]) => void;
  onToggleFavorite: (trackId: string) => void;
}

const GENRE_GRADIENTS: Record<string, string> = {
  Synthwave: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
  Clásica: 'linear-gradient(135deg, #0284c7 0%, #1e3a8a 100%)',
  Jazz: 'linear-gradient(135deg, #b45309 0%, #451a03 100%)',
  Ambient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
  Rock: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
  Pop: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  Electrónica: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  Acústico: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
  'YT Music': 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
};

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const GenresView: React.FC<GenresViewProps> = ({
  tracks,
  selectedGenre,
  currentTrack,
  isPlaying,
  favorites,
  onSelectGenre,
  onPlayTrack,
  onPlayTracks,
  onToggleFavorite,
}) => {
  // Aggregate genres
  const genreStats = React.useMemo(() => {
    const map = new Map<string, Track[]>();
    tracks.forEach((t) => {
      const g = t.genre || 'Otros';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(t);
    });
    return map;
  }, [tracks]);

  if (selectedGenre) {
    const genreTracks = genreStats.get(selectedGenre) || [];
    const isThisGenrePlaying =
      isPlaying && currentTrack && genreTracks.some((t) => t.id === currentTrack.id);

    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-8 space-y-5 sm:space-y-6 select-none">
        <button
          onClick={() => onSelectGenre(null)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Géneros</span>
        </button>

        {/* Genre Banner */}
        <div
          className="p-8 rounded-2xl relative overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6"
          style={{
            background:
              GENRE_GRADIENTS[selectedGenre] ||
              'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
          }}
        >
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/80">
              Género Musical
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              {selectedGenre}
            </h1>
            <p className="text-xs text-white/80 font-medium">
              {genreTracks.length} canciones · {genreTracks.filter((t) => t.isHiRes).length} pistas Hi-Res Lossless
            </p>
          </div>

          <button
            onClick={() => onPlayTracks(genreTracks)}
            className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            {isThisGenrePlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Reproducir Todo</span>
              </>
            )}
          </button>
        </div>

        {/* Track Table */}
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
            {genreTracks.map((track, idx) => {
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
                          <Disc className="w-4 h-4 opacity-70" />
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

  // All Genres Grid
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 md:pb-8 space-y-5 sm:space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Explorador por Géneros Musicales</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Filtra y agrupa tus canciones por estilo y ambientación acústica
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-400">{genreStats.size} géneros</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from(genreStats.entries()).map(([genreName, gTracks]) => {
          const bg =
            GENRE_GRADIENTS[genreName] ||
            'linear-gradient(135deg, #18181b 0%, #27272a 100%)';

          return (
            <div
              key={genreName}
              onClick={() => onSelectGenre(genreName)}
              className="group relative h-36 rounded-2xl p-5 overflow-hidden shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] flex flex-col justify-between"
              style={{ background: bg }}
            >
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-white tracking-tight drop-shadow-sm">
                  {genreName}
                </h3>
                <span className="text-xs text-white/80 font-mono">
                  {gTracks.length} temas
                </span>
              </div>

              {/* Decorative background vinyl icon */}
              <Disc className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
