import React, { useState, useEffect } from 'react';
import { Playlist, Track } from '../types/music';
import { 
  pushPlaylistsToCloud, 
  pullPlaylistsFromCloud, 
  loadSyncCode, 
  exportBackupJSON 
} from '../utils/storage';
import { 
  Cloud, 
  X, 
  Copy, 
  Check, 
  ArrowDownToLine, 
  ArrowUpToLine, 
  RefreshCw, 
  Laptop, 
  Smartphone,
  ShieldCheck,
  FileCode
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  tracks: Track[];
  onPlaylistsUpdated: (newPlaylists: Playlist[]) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  playlists,
  tracks,
  onPlaylistsUpdated,
}) => {
  const [currentCode, setCurrentCode] = useState<string>(loadSyncCode() || 'HIFI-9842');
  const [inputCode, setInputCode] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const res = await pushPlaylistsToCloud(playlists, currentCode);
      setCurrentCode(res.syncCode);
      setLastSyncTime(new Date(res.updatedAt).toLocaleTimeString());
      setStatusMsg({
        type: 'success',
        text: `¡Sincronizado con éxito! ${playlists.length} listas guardadas bajo el código ${res.syncCode}.`,
      });
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: e.message || 'Error al conectar con la nube.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!inputCode.trim()) {
      setStatusMsg({ type: 'error', text: 'Por favor introduce un código de 6 caracteres.' });
      return;
    }
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const pulled = await pullPlaylistsFromCloud(inputCode.trim());
      onPlaylistsUpdated(pulled);
      setCurrentCode(inputCode.trim().toUpperCase());
      setStatusMsg({
        type: 'success',
        text: `¡Listas descargadas con éxito! Se sincronizaron ${pulled.length} listas de reproducción.`,
      });
      setInputCode('');
    } catch (e: any) {
      setStatusMsg({
        type: 'error',
        text: e.message || 'No se encontró la clave en la nube.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.playlists && Array.isArray(parsed.playlists)) {
          onPlaylistsUpdated(parsed.playlists);
          setStatusMsg({
            type: 'success',
            text: `Archivo de respaldo importado: ${parsed.playlists.length} listas restauradas.`,
          });
        } else {
          setStatusMsg({ type: 'error', text: 'Formato de respaldo JSON no válido.' });
        }
      } catch {
        setStatusMsg({ type: 'error', text: 'Error al leer el archivo JSON.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header with prominent X button */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Sincronización en la Nube Multi-Dispositivo
              </h2>
              <p className="text-[11px] text-zinc-400">
                Lleva tus listas de reproducción entre tu PC, móvil y cualquier navegador
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with responsive scroll */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Status Alert */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Device Sync Key */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Tu Código de Sincronización en la Nube
              </span>
              {lastSyncTime && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  Última sinc: {lastSyncTime}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-lg font-mono text-base font-bold tracking-widest text-emerald-400 text-center select-all">
                {currentCode}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>

                <button
                  onClick={handlePushToCloud}
                  disabled={isSyncing}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ArrowUpToLine className="w-4 h-4" />
                  <span>{isSyncing ? 'Subiendo...' : 'Subir a la Nube'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Guarda tus listas actuales (<strong className="text-white">{playlists.length} listas</strong>) en la nube. Introduce este código en tu otro dispositivo o móvil para sincronizarlas al instante.
            </p>
          </div>

          {/* Sync from another device */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-900 space-y-3">
            <span className="text-xs font-semibold text-zinc-300">
              Vincular y Descargar desde Otro Dispositivo
            </span>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Introduce código (ej: HIFI-9842)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="flex-1 bg-zinc-950 border border-zinc-800 px-3.5 py-2 rounded-lg font-mono text-xs uppercase text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />

              <button
                onClick={handlePullFromCloud}
                disabled={isSyncing}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                <span>{isSyncing ? 'Descargando...' : 'Descargar Listas'}</span>
              </button>
            </div>
          </div>

          {/* Offline JSON Backup / Export */}
          <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-900 space-y-2">
            <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-zinc-400" />
              <span>Respaldo Físico JSON (Offline)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => exportBackupJSON(playlists, tracks)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 text-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                <span>Descargar Backup JSON</span>
              </button>

              <label className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                <ArrowUpToLine className="w-3.5 h-3.5 text-cyan-400" />
                <span>Restaurar Backup JSON</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJson}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
