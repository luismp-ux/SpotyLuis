import React, { useState, useRef, useEffect } from 'react';
import { ActiveView } from '../types/music';
import { Disc3, Sliders, Cloud, Youtube, FolderPlus, Smartphone, MoreVertical, X, WifiOff } from 'lucide-react';

interface TopNavProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  openYtModal: () => void;
  openCloudModal: () => void;
  openUploadModal: () => void;
  openAndroidModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  setActiveView,
  openYtModal,
  openCloudModal,
  openUploadModal,
  openAndroidModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between gap-4 md:gap-8 shrink-0 select-none z-20 relative">
      {/* Zone 1: Brand wordmark */}
      <div 
        onClick={() => setActiveView('home')} 
        className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
          <Disc3 className="w-4 h-4 text-emerald-400 animate-spin-slow" />
        </div>
        <span className="text-base font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
          SpotyLuis
        </span>
      </div>

      {/* Zone 2: Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold text-zinc-400 tracking-wide">
        <button
          onClick={() => setActiveView('home')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-white ${
            activeView === 'home' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
          }`}
        >
          Biblioteca
        </button>
        <button
          onClick={() => setActiveView('explorer')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-white ${
            activeView === 'explorer' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
          }`}
        >
          Carpetas
        </button>
        <button
          onClick={() => setActiveView('albums')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-white ${
            activeView === 'albums' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
          }`}
        >
          Álbumes
        </button>
        <button
          onClick={() => setActiveView('genres')}
          className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-white ${
            activeView === 'genres' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
          }`}
        >
          Géneros
        </button>
        <button
          onClick={() => setActiveView('equalizer')}
          className={`whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 transition-colors hover:text-white ${
            activeView === 'equalizer' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Ecualizador
        </button>
        <button
          onClick={() => setActiveView('offline')}
          className={`whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 transition-colors hover:text-white ${
            activeView === 'offline' ? 'text-emerald-400 border-b-2 border-emerald-400' : ''
          }`}
        >
          <WifiOff className="w-3.5 h-3.5" />
          Offline
        </button>
      </nav>

      {/* Zone 3: Desktop Actions */}
      <div className="hidden md:flex items-center gap-2.5 shrink-0">
        <button
          onClick={openAndroidModal}
          title="Instalar en Móvil / APK"
          className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar en Móvil</span>
        </button>

        <button
          onClick={openCloudModal}
          title="Sincronización en la Nube"
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Cloud className="w-4 h-4 text-emerald-400" />
          <span className="hidden lg:inline text-zinc-300">Nube</span>
        </button>

        <button
          onClick={openUploadModal}
          className="px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
          <span>Añadir Archivos</span>
        </button>

        <button
          onClick={openYtModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-sm hover:shadow-emerald-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Youtube className="w-3.5 h-3.5 text-zinc-950" />
          <span>Importar YT Music</span>
        </button>
      </div>

      {/* Mobile Top Actions (Clean, Non-wrapping) */}
      <div className="flex md:hidden items-center gap-1 shrink-0" ref={menuRef}>
        <button
          onClick={openUploadModal}
          title="Añadir Archivos"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 rounded-lg transition-colors"
        >
          <FolderPlus className="w-5 h-5 text-emerald-400" />
        </button>

        <button
          onClick={openYtModal}
          title="Importar de YT Music"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 rounded-lg transition-colors"
        >
          <Youtube className="w-5 h-5 text-red-400" />
        </button>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          title="Más opciones"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white active:bg-zinc-800 rounded-lg transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="absolute right-4 top-14 mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openAndroidModal();
              }}
              className="w-full px-4 py-3 text-left text-xs font-semibold text-emerald-300 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Instalar en Móvil / APK</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openCloudModal();
              }}
              className="w-full px-4 py-3 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Sincronización en la Nube</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openUploadModal();
              }}
              className="w-full px-4 py-3 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-zinc-400" />
              <span>Añadir Archivos Locales</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openYtModal();
              }}
              className="w-full px-4 py-3 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors border-t border-zinc-800"
            >
              <Youtube className="w-4 h-4 text-red-400" />
              <span>Importar desde YouTube Music</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
