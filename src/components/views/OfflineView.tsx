import React, { useState, useEffect } from 'react';
import { Track } from '../../types/music';
import { 
  WifiOff, 
  Download, 
  Play, 
  Trash2, 
  HardDrive, 
  Sparkles, 
  CheckCircle2, 
  Music,
  ExternalLink,
  RefreshCw,
  FolderDown
} from 'lucide-react';
import { 
  getOfflineStorageUsage, 
  deleteOfflineAudio, 
  getAllOfflineTrackIds 
} from '../../utils/offlineAudioStore';
import { downloadTrackMp3ToDevice } from '../../utils/ytImporter';

interface OfflineViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onOpenYtModal: () => void;
  onRefreshTracks: () => void;
}

export const OfflineView: React.FC<OfflineViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onPlayAll,
  onOpenYtModal,
  onRefreshTracks,
}) => {
  const [storageInfo, setStorageInfo] = useState<{ totalBytes: number; trackCount: number }>({
    totalBytes: 0,
    trackCount: 0,
  });
  const [offlineTrackIds, setOfflineTrackIds] = useState<Set<string>>(new Set());
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  const refreshStorage = async () => {
    const info = await getOfflineStorageUsage();
    const ids = await getAllOfflineTrackIds();
    setStorageInfo(info);
    setOfflineTrackIds(new Set(ids));
  };

  useEffect(() => {
    refreshStorage();
  }, [tracks]);

  // Offline tracks list: either marked as offline or present in IndexedDB
  const offlineTracks = tracks.filter(
    (t) => t.isOfflineAvailable || offlineTrackIds.has(t.id)
  );

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const handleDeleteOffline = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteOfflineAudio(track.id);
    track.isOfflineAvailable = false;
    track.downloadStatus = 'idle';
    await refreshStorage();
    onRefreshTracks();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-900/30 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Reproducción Sin Conexión a Internet</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Música Guardada Offline
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Canciones descargadas directamente en la memoria interna de tu dispositivo. Puedes escucharlas en modo avión, sin datos móviles y sin señal con el ecualizador y audio de alta fidelidad.
            </p>
          </div>

          {/* Action and storage summary card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 min-w-[240px] shrink-0">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Almacenamiento Usado
              </span>
              <span className="font-mono font-bold text-white">
                {formatSize(storageInfo.totalBytes)}
              </span>
            </div>

            <div className="text-[11px] text-zinc-500">
              {offlineTracks.length} canciones disponibles sin conexión
            </div>

            <div className="pt-2 border-t border-zinc-800 flex gap-2">
              <button
                onClick={onOpenYtModal}
                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar de YT Music</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Play Controls */}
      {offlineTracks.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => onPlayAll(offlineTracks)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            <span>Reproducir Todo Offline ({offlineTracks.length})</span>
          </button>

          <span className="text-xs text-zinc-400 font-medium">
            Almacenamiento Local (IndexedDB Seguro)
          </span>
        </div>
      )}

      {/* Tracks List */}
      {offlineTracks.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center text-emerald-400 mx-auto">
            <WifiOff className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Aún no tienes canciones descargadas
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              Conecta tu YouTube Music o pega tus listas para descargar canciones y escucharlas donde quieras sin internet.
            </p>
          </div>

          <button
            onClick={onOpenYtModal}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Canciones de YouTube Music</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 divide-y divide-zinc-900">
          {offlineTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className={`flex items-center gap-3 sm:gap-4 p-3 rounded-xl cursor-pointer transition-all group ${
                  isCurrent
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'hover:bg-zinc-900/60'
                }`}
              >
                {/* Index / Play indicator */}
                <div className="w-6 text-center text-xs font-mono text-zinc-500 shrink-0">
                  {isCurrent && isPlaying ? (
                    <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5 mx-auto">
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-1"></span>
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-2"></span>
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-3"></span>
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-4"></span>
                    </div>
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Cover Art */}
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow relative">
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
                      <Music className="w-5 h-5 opacity-70" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                      {track.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Offline
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {track.artist} · {track.album}
                  </div>
                </div>

                {/* Duration */}
                <div className="text-xs font-mono text-zinc-500 shrink-0 hidden sm:block">
                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTrackMp3ToDevice(track);
                    }}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Guardar archivo .mp3 en el teléfono"
                  >
                    <FolderDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDeleteOffline(track, e)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Eliminar del almacenamiento offline"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
