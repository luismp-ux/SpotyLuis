import React, { useState, useEffect } from 'react';
import { Track } from '../types/music';
import { 
  parseYtExportFile, 
  resolveYtUrl, 
  locateYtPlaylistApi, 
  searchYtMusicApi, 
  parsedToTrack, 
  downloadTrackAudioForOffline, 
  saveYtCookiesApi, 
  checkYtCookiesStatus,
  YtParsedTrack 
} from '../utils/ytImporter';
import { searchAndFetchLyrics } from '../utils/lyricsService';
import { 
  Youtube, 
  X, 
  Link, 
  Upload, 
  Search, 
  Check, 
  Sparkles, 
  ListMusic, 
  AlertCircle,
  FileSpreadsheet,
  Music2,
  Download,
  WifiOff,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Loader2,
  Disc
} from 'lucide-react';

interface YtMusicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTracks: (tracks: Track[], playlistName?: string) => void;
}

export const YtMusicImportModal: React.FC<YtMusicImportModalProps> = ({
  isOpen,
  onClose,
  onImportTracks,
}) => {
  const [activeTab, setActiveTab] = useState<'playlist' | 'search' | 'url' | 'file' | 'cookies'>('playlist');
  
  // Playlist tab state (Locate saved songs)
  const [playlistInput, setPlaylistInput] = useState('');
  const [isLocatingPlaylist, setIsLocatingPlaylist] = useState(false);
  const [locatedPlaylistTitle, setLocatedPlaylistTitle] = useState('');
  const [locatedTracks, setLocatedTracks] = useState<YtParsedTrack[]>([]);
  const [selectedPlaylistIndices, setSelectedPlaylistIndices] = useState<Set<number>>(new Set());
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YtParsedTrack[]>([]);
  const [selectedSearchIndices, setSelectedSearchIndices] = useState<Set<number>>(new Set());
  const [searchError, setSearchError] = useState<string | null>(null);

  // Single URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [resolvedTrack, setResolvedTrack] = useState<Track | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // File tab state (Takeout/CSV)
  const [parsedFileTracks, setParsedFileTracks] = useState<YtParsedTrack[]>([]);
  const [selectedFileIndices, setSelectedFileIndices] = useState<Set<number>>(new Set());
  const [filePlaylistTitle, setFilePlaylistTitle] = useState('Importado de YouTube Music');
  const [fileError, setFileError] = useState<string | null>(null);

  // Cookies / Session tab
  const [cookiesInput, setCookiesInput] = useState('');
  const [hasSavedCookies, setHasSavedCookies] = useState(false);
  const [cookieStatusMsg, setCookieStatusMsg] = useState<string | null>(null);

  // Download for Offline progress state
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string;
    percent: number;
  } | null>(null);

  // Check cookies status on open
  useEffect(() => {
    if (isOpen) {
      checkYtCookiesStatus().then(setHasSavedCookies).catch(() => {});
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDownloadingOffline) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDownloadingOffline]);

  if (!isOpen) return null;

  // 1. Locate Playlist tracks
  const handleLocatePlaylist = async () => {
    if (!playlistInput.trim()) return;
    setIsLocatingPlaylist(true);
    setPlaylistError(null);
    setLocatedTracks([]);

    try {
      const result = await locateYtPlaylistApi(playlistInput.trim());
      if (result.tracks.length === 0) {
        setPlaylistError('No se encontraron canciones en el enlace proporcionado. Asegúrate de que la lista sea pública o no listada.');
        return;
      }
      setLocatedPlaylistTitle(result.title);
      setLocatedTracks(result.tracks);
      setSelectedPlaylistIndices(new Set(result.tracks.map((_, i) => i)));
    } catch (e: any) {
      setPlaylistError(e.message || 'Error al localizar canciones de YouTube Music');
    } finally {
      setIsLocatingPlaylist(false);
    }
  };

  // 2. Search YouTube Music catalog
  const handleSearchCatalog = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchYtMusicApi(searchQuery.trim(), 15);
      if (results.length === 0) {
        setSearchError('No se encontraron canciones para esta búsqueda.');
        return;
      }
      setSearchResults(results);
      setSelectedSearchIndices(new Set(results.map((_, i) => i)));
    } catch (e: any) {
      setSearchError(e.message || 'Error al buscar en YouTube Music');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Batch Download for Offline Listening
  const executeImportAndDownload = async (
    rawTracks: YtParsedTrack[],
    selectedIndices: Set<number>,
    playlistName: string,
    downloadOffline: boolean
  ) => {
    const selected = rawTracks.filter((_, i) => selectedIndices.has(i));
    if (selected.length === 0) return;

    const fullTracks: Track[] = selected.map((p) => parsedToTrack(p, playlistName));

    if (downloadOffline) {
      setIsDownloadingOffline(true);
      setDownloadProgress({
        current: 0,
        total: fullTracks.length,
        currentTitle: fullTracks[0].title,
        percent: 0,
      });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < fullTracks.length; i++) {
        const track = fullTracks[i];
        setDownloadProgress({
          current: i + 1,
          total: fullTracks.length,
          currentTitle: `${track.artist} - ${track.title}`,
          percent: Math.round(((i) / fullTracks.length) * 100),
        });

        try {
          track.downloadStatus = 'downloading';
          await downloadTrackAudioForOffline(track);
          track.isOfflineAvailable = true;
          track.downloadStatus = 'completed';
          track.downloadProgress = 100;
          successCount++;
        } catch (err: any) {
          console.warn(`Could not cache offline audio for ${track.title}:`, err);
          track.isOfflineAvailable = false;
          track.downloadStatus = 'error';
          track.downloadProgress = 0;
          errorCount++;
        }

        // Automatically fetch and attach synchronized/plain lyrics
        try {
          const lrc = await searchAndFetchLyrics(track.title, track.artist, track.duration, track.ytVideoId);
          if (lrc && lrc.synced.length > 0) {
            track.syncedLyrics = lrc.synced;
            track.plainLyrics = lrc.plainText;
          }
        } catch (lrcErr) {
          console.warn('Auto lyrics fetch error:', lrcErr);
        }
      }

      setDownloadProgress({
        current: fullTracks.length,
        total: fullTracks.length,
        currentTitle: errorCount === 0 
          ? '¡Descarga y letras automáticas completadas con éxito!' 
          : `Descargadas ${successCount}/${fullTracks.length} pistas con letras automáticas.`,
        percent: 100,
      });

      setTimeout(() => {
        setIsDownloadingOffline(false);
        setDownloadProgress(null);
        onImportTracks(fullTracks, playlistName);
        onClose();
      }, 1500);
    } else {
      // Background auto-fetch lyrics for imported tracks
      for (const track of fullTracks) {
        searchAndFetchLyrics(track.title, track.artist, track.duration, track.ytVideoId).then((lrc) => {
          if (lrc && lrc.synced.length > 0) {
            track.syncedLyrics = lrc.synced;
            track.plainLyrics = lrc.plainText;
          }
        }).catch(() => {});
      }
      onImportTracks(fullTracks, playlistName);
      onClose();
    }
  };

  // 4. File upload (Takeout / CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const tracks = parseYtExportFile(text);
        if (tracks.length === 0) {
          setFileError('No se encontraron canciones en el archivo proporcionado.');
          return;
        }
        setParsedFileTracks(tracks);
        setSelectedFileIndices(new Set(tracks.map((_, i) => i)));
        setFilePlaylistTitle(`YT Music: ${file.name.replace(/\.[^/.]+$/, '')}`);
      } catch (err: any) {
        setFileError('Error al leer el archivo de exportación.');
      }
    };
    reader.readAsText(file);
  };

  // 5. Single URL resolution
  const handleResolveUrl = async () => {
    if (!urlInput.trim()) return;
    setIsLoadingUrl(true);
    setUrlError(null);
    try {
      const track = await resolveYtUrl(urlInput.trim());
      setResolvedTrack(track);
    } catch (e: any) {
      setUrlError(e.message || 'Error al resolver el enlace');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // 6. Save YouTube Cookies
  const handleSaveCookies = async () => {
    if (!cookiesInput.trim()) return;
    try {
      const ok = await saveYtCookiesApi(cookiesInput.trim());
      if (ok) {
        setHasSavedCookies(true);
        setCookieStatusMsg('¡Sesión guardada correctamente! Ahora puedes localizar listas privadas.');
        setCookiesInput('');
      } else {
        setCookieStatusMsg('Error al guardar la sesión.');
      }
    } catch {
      setCookieStatusMsg('Error de conexión al guardar.');
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDownloadingOffline) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Conectar con YouTube Music
                </h2>
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Modo Offline Disponible
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Localiza tus canciones guardadas y descárgalas en la app para escucharlas sin internet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDownloadingOffline}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0 disabled:opacity-40"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-6 pt-3 border-b border-zinc-900 gap-3 sm:gap-6 text-xs font-semibold overflow-x-auto shrink-0 bg-zinc-950">
          <button
            onClick={() => setActiveTab('playlist')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'playlist'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Localizar Lista / Guardadas</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'search'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscar Canciones</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'url'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>Canción Individual</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'file'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Takeout / CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'cookies'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Sesión / Cookies</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: LOCATE SAVED PLAYLIST SONGS */}
          {activeTab === 'playlist' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <p className="font-semibold text-white">Escucha sin conexión (Modo Offline)</p>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Pega el enlace de tu lista de YouTube Music (o lista de Me Gusta). Al pulsar en 
                    <span className="text-emerald-400 font-semibold"> "Descargar para Offline"</span>, 
                    los archivos de audio se guardarán directamente en la memoria de tu dispositivo para reproducirlos sin gastar datos ni necesitar conexión a internet.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Enlace de tu lista de YouTube Music o ID de lista
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://music.youtube.com/playlist?list=PL... o ID de lista"
                    value={playlistInput}
                    onChange={(e) => setPlaylistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLocatePlaylist();
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    onClick={handleLocatePlaylist}
                    disabled={isLocatingPlaylist || !playlistInput.trim()}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
                  >
                    {isLocatingPlaylist ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Localizando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Localizar Canciones</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {playlistError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{playlistError}</span>
                </div>
              )}

              {/* Located Tracks List */}
              {locatedTracks.length > 0 && (
                <div className="space-y-3 pt-2 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div>
                      <h3 className="text-xs font-bold text-white">
                        {locatedPlaylistTitle}
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        {locatedTracks.length} canciones localizadas ({selectedPlaylistIndices.size} seleccionadas)
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (selectedPlaylistIndices.size === locatedTracks.length) {
                          setSelectedPlaylistIndices(new Set());
                        } else {
                          setSelectedPlaylistIndices(new Set(locatedTracks.map((_, i) => i)));
                        }
                      }}
                      className="text-xs text-emerald-400 hover:underline font-medium"
                    >
                      {selectedPlaylistIndices.size === locatedTracks.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </button>
                  </div>

                  {/* Scrollable song preview */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-900">
                    {locatedTracks.map((t, idx) => {
                      const isSelected = selectedPlaylistIndices.has(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const next = new Set(selectedPlaylistIndices);
                            if (next.has(idx)) next.delete(idx);
                            else next.add(idx);
                            setSelectedPlaylistIndices(next);
                          }}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-zinc-900/80 text-white' : 'text-zinc-400 hover:bg-zinc-900/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-zinc-700 text-emerald-500 focus:ring-0 shrink-0"
                          />
                          <img
                            src={t.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop'}
                            alt=""
                            className="w-9 h-9 rounded object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate text-white">
                              {t.title}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {t.artist}
                            </div>
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500 shrink-0">
                            {Math.floor((t.duration || 210) / 60)}:{String(Math.floor((t.duration || 210) % 60)).padStart(2, '0')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 flex flex-col sm:flex-row gap-2 border-t border-zinc-800">
                    <button
                      onClick={() => executeImportAndDownload(locatedTracks, selectedPlaylistIndices, locatedPlaylistTitle, true)}
                      disabled={selectedPlaylistIndices.size === 0 || isDownloadingOffline}
                      className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar para Offline ({selectedPlaylistIndices.size} canciones)</span>
                    </button>

                    <button
                      onClick={() => executeImportAndDownload(locatedTracks, selectedPlaylistIndices, locatedPlaylistTitle, false)}
                      disabled={selectedPlaylistIndices.size === 0 || isDownloadingOffline}
                      className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Solo Añadir a Biblioteca</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH CATALOG */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Busca cualquier canción, artista o álbum en YouTube Music
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Daft Punk, Rosalía, Coldplay, Bohemian Rhapsody..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchCatalog();
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    onClick={handleSearchCatalog}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Buscar en YT Music</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {searchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3 pt-2 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs text-zinc-400">
                      {searchResults.length} resultados ({selectedSearchIndices.size} seleccionados)
                    </span>
                    <button
                      onClick={() => {
                        if (selectedSearchIndices.size === searchResults.length) {
                          setSelectedSearchIndices(new Set());
                        } else {
                          setSelectedSearchIndices(new Set(searchResults.map((_, i) => i)));
                        }
                      }}
                      className="text-xs text-emerald-400 hover:underline font-medium"
                    >
                      {selectedSearchIndices.size === searchResults.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-900">
                    {searchResults.map((t, idx) => {
                      const isSelected = selectedSearchIndices.has(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const next = new Set(selectedSearchIndices);
                            if (next.has(idx)) next.delete(idx);
                            else next.add(idx);
                            setSelectedSearchIndices(next);
                          }}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-zinc-900/80 text-white' : 'text-zinc-400 hover:bg-zinc-900/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-zinc-700 text-emerald-500 focus:ring-0 shrink-0"
                          />
                          <img
                            src={t.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop'}
                            alt=""
                            className="w-9 h-9 rounded object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate text-white">
                              {t.title}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {t.artist}
                            </div>
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500 shrink-0">
                            {Math.floor((t.duration || 200) / 60)}:{String(Math.floor((t.duration || 200) % 60)).padStart(2, '0')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-2 border-t border-zinc-800">
                    <button
                      onClick={() => executeImportAndDownload(searchResults, selectedSearchIndices, `Búsqueda: ${searchQuery}`, true)}
                      disabled={selectedSearchIndices.size === 0 || isDownloadingOffline}
                      className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar para Offline ({selectedSearchIndices.size} canciones)</span>
                    </button>

                    <button
                      onClick={() => executeImportAndDownload(searchResults, selectedSearchIndices, `Búsqueda: ${searchQuery}`, false)}
                      disabled={selectedSearchIndices.size === 0 || isDownloadingOffline}
                      className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Solo Añadir a Biblioteca</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SINGLE URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Pega un enlace de canción o vídeo de YouTube Music
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://music.youtube.com/watch?v=... o https://youtu.be/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    onClick={handleResolveUrl}
                    disabled={isLoadingUrl || !urlInput.trim()}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                  >
                    {isLoadingUrl ? (
                      <span>Consultando...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Resolver Metadatos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {urlError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              {resolvedTrack && (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow">
                      {resolvedTrack.coverUrl ? (
                        <img
                          src={resolvedTrack.coverUrl}
                          alt={resolvedTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white"
                          style={{ background: resolvedTrack.coverGradient }}
                        >
                          <Music2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {resolvedTrack.title}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {resolvedTrack.artist}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={async () => {
                        setIsDownloadingOffline(true);
                        setUrlError(null);
                        try {
                          await downloadTrackAudioForOffline(resolvedTrack);
                          resolvedTrack.isOfflineAvailable = true;
                          resolvedTrack.downloadStatus = 'completed';
                          onImportTracks([resolvedTrack], 'YouTube Music Favoritos');
                          setResolvedTrack(null);
                          setUrlInput('');
                          onClose();
                        } catch (e: any) {
                          console.warn('Offline download failed:', e);
                          setUrlError(e.message || 'No se pudo descargar el audio original de este tema.');
                        } finally {
                          setIsDownloadingOffline(false);
                        }
                      }}
                      disabled={isDownloadingOffline}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar para Offline</span>
                    </button>

                    <button
                      onClick={() => {
                        onImportTracks([resolvedTrack], 'YouTube Music Favoritos');
                        setResolvedTrack(null);
                        setUrlInput('');
                        onClose();
                      }}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TAKEOUT / CSV */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl bg-zinc-900/30 flex flex-col items-center justify-center text-center gap-3 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 flex items-center justify-center text-emerald-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    Sube un respaldo de Google Takeout, Soundiiz o TuneMyMusic
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-md mt-1">
                    Exporta tus canciones guardadas desde takeout.google.com o sube cualquier archivo CSV o JSON.
                  </p>
                </div>

                <label className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer transition-all shadow-sm">
                  <span>Seleccionar Archivo</span>
                  <input
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {fileError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {parsedFileTracks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs text-zinc-400">
                      {parsedFileTracks.length} canciones encontradas ({selectedFileIndices.size} seleccionadas)
                    </span>
                    <button
                      onClick={() => {
                        if (selectedFileIndices.size === parsedFileTracks.length) {
                          setSelectedFileIndices(new Set());
                        } else {
                          setSelectedFileIndices(new Set(parsedFileTracks.map((_, i) => i)));
                        }
                      }}
                      className="text-xs text-emerald-400 hover:underline font-medium"
                    >
                      {selectedFileIndices.size === parsedFileTracks.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-zinc-900">
                    {parsedFileTracks.map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const next = new Set(selectedFileIndices);
                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          setSelectedFileIndices(next);
                        }}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-xs ${
                          selectedFileIndices.has(idx) ? 'bg-zinc-900/80 text-white' : 'text-zinc-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFileIndices.has(idx)}
                          onChange={() => {}}
                          className="rounded border-zinc-700 text-emerald-500"
                        />
                        <div className="flex-1 truncate">
                          <span className="font-semibold text-white">{t.title}</span>
                          <span className="text-zinc-500 ml-2">· {t.artist}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-2 border-t border-zinc-800">
                    <button
                      onClick={() => executeImportAndDownload(parsedFileTracks, selectedFileIndices, filePlaylistTitle, true)}
                      disabled={selectedFileIndices.size === 0 || isDownloadingOffline}
                      className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar para Offline ({selectedFileIndices.size} canciones)</span>
                    </button>

                    <button
                      onClick={() => executeImportAndDownload(parsedFileTracks, selectedFileIndices, filePlaylistTitle, false)}
                      disabled={selectedFileIndices.size === 0 || isDownloadingOffline}
                      className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl"
                    >
                      <span>Solo Añadir</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COOKIES / SESSION */}
          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Conexión Directa con tu Cuenta de YouTube
                    </span>
                  </div>
                  {hasSavedCookies && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Sesión Activa
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Para que la aplicación pueda acceder a tus listas <span className="text-white font-semibold">privadas</span> (como tu lista de "Canciones que me gustan" o tus listas personales no públicas), puedes sincronizar tu sesión de YouTube exportando las cookies con una extensión de navegador (ej: "Get cookies.txt LOCALLY") y pegándolas aquí.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Pega las cookies en formato Netscape o JSON
                </label>
                <textarea
                  rows={4}
                  placeholder="# Netscape HTTP Cookie File&#10;.youtube.com   TRUE   /   TRUE   ...   SID   ..."
                  value={cookiesInput}
                  onChange={(e) => setCookiesInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-xs font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {cookieStatusMsg && (
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{cookieStatusMsg}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveCookies}
                  disabled={!cookiesInput.trim()}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow"
                >
                  Guardar Sesión de YouTube
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Downloading Progress Overlay */}
        {isDownloadingOffline && downloadProgress && (
          <div className="px-5 py-4 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="font-bold text-white">
                  Descargando en almacenamiento del dispositivo ({downloadProgress.current}/{downloadProgress.total})
                </span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {downloadProgress.percent}%
              </span>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-400 truncate">
              {downloadProgress.currentTitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
