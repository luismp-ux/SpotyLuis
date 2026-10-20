import React from 'react';
import { ActiveView } from '../types/music';
import { Home, FolderTree, Disc, Layers, Music, Sliders, WifiOff } from 'lucide-react';

interface BottomNavBarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  openEqualizer: () => void;
  activePlaylistId: string | null;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeView,
  setActiveView,
  openEqualizer,
  activePlaylistId,
}) => {
  return (
    <nav className="md:hidden h-16 bg-zinc-950/95 border-t border-zinc-800/80 px-1 flex items-center justify-around select-none z-30 shrink-0 backdrop-blur-lg">
      <button
        onClick={() => setActiveView('home')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 gap-1 transition-colors ${
          activeView === 'home' && !activePlaylistId ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Inicio</span>
      </button>

      <button
        onClick={() => setActiveView('offline')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 gap-1 transition-colors ${
          activeView === 'offline' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <WifiOff className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Offline</span>
      </button>

      <button
        onClick={() => setActiveView('albums')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 gap-1 transition-colors ${
          activeView === 'albums' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Disc className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Álbumes</span>
      </button>

      <button
        onClick={() => setActiveView('genres')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 gap-1 transition-colors ${
          activeView === 'genres' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Géneros</span>
      </button>

      <button
        onClick={() => setActiveView('playlists')}
        className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 gap-1 transition-colors ${
          activeView === 'playlists' || activePlaylistId ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Music className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Listas</span>
      </button>

      <button
        onClick={openEqualizer}
        className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 gap-1 text-zinc-400 hover:text-emerald-400 active:text-emerald-400 transition-colors"
      >
        <Sliders className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">EQ</span>
      </button>
    </nav>
  );
};
