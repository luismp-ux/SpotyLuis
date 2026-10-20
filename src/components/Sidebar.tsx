import React from 'react';
import { ActiveView, Playlist } from '../types/music';
import { 
  Home, 
  FolderTree, 
  Disc, 
  Music, 
  Layers, 
  Sliders, 
  Heart, 
  Plus, 
  Radio, 
  Sparkles,
  Cloud,
  FolderOpen,
  Smartphone,
  WifiOff
} from 'lucide-react';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  openCloudModal: () => void;
  openUploadModal: () => void;
  openAndroidModal: () => void;
  totalTracks: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  openCloudModal,
  openUploadModal,
  openAndroidModal,
  totalTracks,
}) => {
  return (
    <aside className="hidden md:flex w-64 bg-zinc-950 border-r border-zinc-900/80 flex-col shrink-0 select-none overflow-hidden">
      {/* Main Nav Section */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => setActiveView('home')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeView === 'home' && !activePlaylistId
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Home className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => setActiveView('explorer')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeView === 'explorer'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <FolderTree className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Explorador de Carpetas</span>
        </button>

        <button
          onClick={() => setActiveView('albums')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeView === 'albums'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Disc className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Álbumes</span>
        </button>

        <button
          onClick={() => setActiveView('genres')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeView === 'genres'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Géneros Musicales</span>
        </button>

        <button
          onClick={() => setActiveView('equalizer')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeView === 'equalizer'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Ecualizador 10-Bandas</span>
        </button>

        <button
          onClick={() => setActiveView('offline')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            activeView === 'offline'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <span className="flex items-center gap-3">
            <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Música Offline</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            Sin Red
          </span>
        </button>
      </div>

      <div className="mx-4 my-2 h-[1px] bg-zinc-900" />

      {/* Playlists & Library Section */}
      <div className="flex-1 flex flex-col min-h-0 px-3">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5" />
            Tu Biblioteca
          </span>
          <button
            onClick={onCreatePlaylist}
            title="Nueva lista de reproducción"
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Favorite Songs shortcut */}
        <button
          onClick={() => {
            setActiveView('playlists');
            onSelectPlaylist('pl-favorites');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
            activePlaylistId === 'pl-favorites'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <div className="w-7 h-7 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
            <Heart className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="truncate flex-1">Canciones que te gustan</span>
        </button>

        {/* Playlists scroll list */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-0.5 pr-1">
          {playlists
            .filter((p) => p.id !== 'pl-favorites')
            .map((pl) => {
              const isSelected = activePlaylistId === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => {
                    setActiveView('playlists');
                    onSelectPlaylist(pl.id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left group ${
                    isSelected
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded shrink-0 shadow-inner flex items-center justify-center text-[10px] text-white/80 font-bold"
                    style={{ background: pl.coverGradient }}
                  >
                    {pl.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="truncate flex-1">
                    <div className="truncate">{pl.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {pl.trackIds.length} canciones
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Bottom Audio Engine & Cloud Sync Card */}
      <div className="p-3 bg-zinc-900/50 border-t border-zinc-900 mt-auto space-y-2">
        <button
          onClick={openAndroidModal}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Instalar en Móvil / APK</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">PWA / Android</span>
        </button>

        <button
          onClick={openCloudModal}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">Sincronización Cloud</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Activo</span>
        </button>

        <div className="px-2 py-1.5 rounded bg-zinc-950/60 border border-zinc-900 text-[11px] text-zinc-500 flex items-center justify-between">
          <span className="truncate">Motor de Audio:</span>
          <span className="font-mono text-zinc-400 text-[10px]">Hi-Res 32-bit</span>
        </div>
      </div>
    </aside>
  );
};
