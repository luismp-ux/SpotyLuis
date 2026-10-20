import { Playlist, Track } from '../types/music';
import { apiUrl } from './apiUrl';

const TRACKS_KEY = 'aura_music_tracks';
const PLAYLISTS_KEY = 'aura_music_playlists';
const FAVORITES_KEY = 'aura_music_favorites';
const EQ_SETTINGS_KEY = 'aura_music_eq_settings';
const SYNC_CODE_KEY = 'aura_music_sync_code';

export function loadSavedTracks(): Track[] {
  try {
    const raw = localStorage.getItem(TRACKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading tracks from storage', e);
    return [];
  }
}

export function saveTracksToStorage(tracks: Track[]) {
  try {
    // Only save serializable data (avoid gigantic in-memory blob URLs)
    const serializable = tracks.map((t) => ({
      ...t,
      // Keep audioUrl if it is not a temporary blob URL or keep metadata
      audioUrl: t.source === 'demo' ? '' : t.audioUrl,
    }));
    localStorage.setItem(TRACKS_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.warn('LocalStorage limit reached for tracks metadata:', e);
  }
}

export function loadSavedPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (!raw) {
      // Default Initial Playlists
      return [
        {
          id: 'pl-favorites',
          name: 'Canciones Favoritas',
          description: 'Colección de tus temas favoritos en alta fidelidad',
          trackIds: ['demo-1', 'demo-3'],
          coverGradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000,
        },
        {
          id: 'pl-hires',
          name: 'Sesión Hi-Res Lossless 24-bit',
          description: 'Grabaciones de rango dinámico completo en FLAC y ALAC',
          trackIds: ['demo-1', 'demo-2', 'demo-3', 'demo-4'],
          coverGradient: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
          createdAt: Date.now() - 43200000,
          updatedAt: Date.now() - 43200000,
        },
      ];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function savePlaylistsToStorage(playlists: Playlist[]) {
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch (e) {
    console.error('Error saving playlists:', e);
  }
}

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : ['demo-1', 'demo-3'];
  } catch {
    return ['demo-1', 'demo-3'];
  }
}

export function saveFavorites(favs: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch (e) {
    console.error('Error saving favorites:', e);
  }
}

export function loadSyncCode(): string | null {
  return localStorage.getItem(SYNC_CODE_KEY);
}

export function saveSyncCode(code: string) {
  localStorage.setItem(SYNC_CODE_KEY, code.toUpperCase());
}

// Real Cloud Sync API calls
export async function pushPlaylistsToCloud(
  playlists: Playlist[],
  customCode?: string
): Promise<{ syncCode: string; updatedAt: number }> {
  const code = customCode || loadSyncCode() || undefined;
  const res = await fetch(apiUrl('/api/cloud-sync/save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      syncCode: code,
      playlists,
      name: `Sincronización Aura (${playlists.length} listas)`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Fallo al sincronizar con el servidor en la nube');
  }

  const data = await res.json();
  saveSyncCode(data.syncCode);
  return { syncCode: data.syncCode, updatedAt: data.updatedAt };
}

export async function pullPlaylistsFromCloud(code: string): Promise<Playlist[]> {
  const res = await fetch(apiUrl(`/api/cloud-sync/${code.trim().toUpperCase()}`));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se encontró la sincronización para este código');
  }

  const data = await res.json();
  if (data.playlists && Array.isArray(data.playlists)) {
    saveSyncCode(code);
    savePlaylistsToStorage(data.playlists);
    return data.playlists;
  }
  throw new Error('Formato de datos en la nube inválido');
}

// Backup file export & import
export function exportBackupJSON(playlists: Playlist[], tracks: Track[]) {
  const payload = {
    appName: 'Aura Hi-Fi Music',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    playlists,
    tracksMeta: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      genre: t.genre,
      duration: t.duration,
      format: t.format,
      bitrate: t.bitrate,
      filePath: t.filePath,
      folder: t.folder,
      isHiRes: t.isHiRes,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Aura_HiFi_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
