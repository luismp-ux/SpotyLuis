import React, { useState, useEffect } from 'react';
import { Playlist } from '../types/music';
import { ListPlus, X, Check } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (playlist: Playlist) => void;
}

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
  'linear-gradient(135deg, #6366f1 0%, #312e81 100%)',
  'linear-gradient(135deg, #ec4899 0%, #831843 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #78350f 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #083344 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)',
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(PRESET_GRADIENTS[0]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      description: description.trim(),
      trackIds: [],
      coverGradient: selectedGradient,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreate(newPlaylist);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header with prominent X button */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ListPlus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Crear Lista de Reproducción
            </h2>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Nombre de la lista
            </label>
            <input
              type="text"
              required
              placeholder="Mi Colección Hi-Fi..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Descripción (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Notas o ambiente de esta lista..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Estilo Visual de Portada
            </label>
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {PRESET_GRADIENTS.map((grad) => (
                <button
                  type="button"
                  key={grad}
                  onClick={() => setSelectedGradient(grad)}
                  className={`w-9 h-9 rounded-lg transition-all shrink-0 ${
                    selectedGradient === grad
                      ? 'scale-110 ring-2 ring-emerald-400 shadow-md'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ background: grad }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Crear Lista</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
