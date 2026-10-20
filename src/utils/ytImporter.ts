import { AudioFormat, Track } from '../types/music';
import { getDeterministicGradient } from './metadataExtractor';
import { saveAudioToOffline, isTrackOffline } from './offlineAudioStore';
import { apiUrl } from './apiUrl';

export interface YtParsedTrack {
  id?: string;
  title: string;
  artist: string;
  album?: string;
  url?: string;
  videoId?: string;
  thumbnail?: string;
  duration?: number;
}

export interface YtLocatedPlaylist {
  title: string;
  uploader?: string;
  trackCount: number;
  tracks: YtParsedTrack[];
}

/**
 * Parses direct YouTube or YouTube Music link
 */
export async function resolveYtUrl(url: string): Promise<Track> {
  const cleanUrl = url.trim();
  const videoId = extractVideoId(cleanUrl) || 'unknown';

  let title = 'Canción de YouTube';
  let artist = 'YouTube Music';
  let thumbnail = videoId !== 'unknown' ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

  // 1. Try public client-side oEmbed (Zero server dependency, 100% CORS friendly on mobile)
  if (videoId !== 'unknown') {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const info = await oembedRes.json();
        title = info.title || title;
        artist = info.author_name || artist;
        thumbnail = info.thumbnail_url || thumbnail;
      }
    } catch (e) {
      console.warn('Direct oembed failed, attempting server API:', e);
    }
  }

  // 2. Try server API if available
  try {
    const res = await fetch(apiUrl('/api/yt-metadata'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl })
    });
    if (res.ok) {
      const data = await res.json();
      title = data.title || title;
      artist = data.author || artist;
      thumbnail = data.thumbnail || thumbnail;
    }
  } catch (err) {
    console.warn('Server metadata fetch failed, using oembed/default info:', err);
  }

  // Clean artist - title
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').replace(/\(Official (?:Music )?Video\)/i, '').replace(/\[Official Audio\]/i, '').trim();
  }
  artist = artist.replace(/ - Topic$/i, '').trim();

  return {
    id: `yt-${videoId}-${Date.now()}`,
    title,
    artist,
    album: 'YouTube Music Stream',
    year: new Date().getFullYear(),
    genre: 'YT Music',
    duration: 210,
    format: 'YOUTUBE' as AudioFormat,
    bitrate: 'AAC 256 kbps (Web Stream)',
    isHiRes: false,
    coverUrl: thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    coverGradient: getDeterministicGradient(title + artist),
    audioUrl: apiUrl(`/api/yt/download-audio/${videoId}?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`),
    filePath: `YouTube Music/${artist}/${title}`,
    folder: 'YouTube Music',
    source: 'yt_music',
    ytVideoId: videoId,
    addedAt: Date.now()
  };
}

/**
 * Locate all saved tracks from a YouTube Music Playlist URL or ID (or single song link)
 */
export async function locateYtPlaylistApi(url: string): Promise<YtLocatedPlaylist> {
  const cleanUrl = url.trim();
  const videoId = extractVideoId(cleanUrl);

  // If user pasted a single track (watch?v=... or youtu.be/...) without a playlist list= parameter
  if (videoId && !cleanUrl.includes('list=')) {
    let title = 'Canción de YouTube';
    let artist = 'YouTube Music';
    let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const info = await oembedRes.json();
        title = info.title || title;
        artist = info.author_name || artist;
        thumbnail = info.thumbnail_url || thumbnail;

        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
        artist = artist.replace(/ - Topic$/i, '').trim();
      }
    } catch (e) {
      console.warn('Direct oembed failed for single video:', e);
    }

    return {
      title: `${artist} - ${title}`,
      uploader: artist,
      trackCount: 1,
      tracks: [
        {
          id: `yt-${videoId}-${Date.now()}`,
          videoId,
          title,
          artist,
          album: 'YouTube Music',
          duration: 210,
          thumbnail,
          url: cleanUrl
        }
      ]
    };
  }

  // If it's a playlist, attempt server fetch
  try {
    const res = await fetch(apiUrl('/api/yt/locate-playlist'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || 'Lista de YouTube Music',
        uploader: data.uploader || 'YouTube Music',
        trackCount: data.trackCount || 0,
        tracks: data.tracks || []
      };
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudieron localizar las canciones de la lista de YouTube Music');
  } catch (err: any) {
    // If server fetch failed (e.g. CORS or offline) but we have a videoId in the playlist URL
    if (videoId) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          const info = await oembedRes.json();
          let title = info.title || 'Canción de YouTube';
          let artist = info.author_name || 'YouTube Music';
          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }
          artist = artist.replace(/ - Topic$/i, '').trim();

          return {
            title: `${artist} - ${title}`,
            uploader: artist,
            trackCount: 1,
            tracks: [
              {
                id: `yt-${videoId}-${Date.now()}`,
                videoId,
                title,
                artist,
                album: 'YouTube Music',
                duration: 210,
                thumbnail: info.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                url: cleanUrl
              }
            ]
          };
        }
      } catch (oembedErr) {
        console.warn('Fallback oEmbed also failed:', oembedErr);
      }
    }

    throw new Error(err.message === 'Failed to fetch' 
      ? 'No se pudo conectar con el servidor. Si estás en el móvil, puedes pegar enlaces de canciones individuales directamente o usar la pestaña Buscar Canciones.'
      : (err.message || 'Error al localizar canciones')
    );
  }
}

/**
 * Search YouTube Music catalog
 */
export async function searchYtMusicApi(query: string, limit: number = 12): Promise<YtParsedTrack[]> {
  try {
    const res = await fetch(apiUrl('/api/yt/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), limit })
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn('Search API network error:', err);
    return [];
  }
}

/**
 * Convert YtParsedTrack to full Track object
 */
export function parsedToTrack(p: YtParsedTrack, playlistName?: string): Track {
  const videoId = p.videoId || extractVideoId(p.url || '') || `vid-${Date.now()}`;
  const trackId = p.id || `yt-${videoId}-${Date.now()}`;
  const albumName = p.album || playlistName || 'YouTube Music';

  return {
    id: trackId,
    title: p.title,
    artist: p.artist,
    album: albumName,
    year: new Date().getFullYear(),
    genre: 'YT Music',
    duration: p.duration || 210,
    format: 'YOUTUBE' as AudioFormat,
    bitrate: '320 kbps (Audio Hi-Fi)',
    isHiRes: false,
    coverUrl: p.thumbnail || (p.videoId ? `https://img.youtube.com/vi/${p.videoId}/hqdefault.jpg` : undefined),
    coverGradient: getDeterministicGradient(p.title + p.artist),
    audioUrl: apiUrl(`/api/yt/download-audio/${videoId}?title=${encodeURIComponent(p.title)}&artist=${encodeURIComponent(p.artist)}&duration=${p.duration || 210}`),
    filePath: `YouTube Music/${p.artist}/${p.title}.mp3`,
    folder: 'YouTube Music',
    source: 'yt_music',
    ytVideoId: videoId,
    addedAt: Date.now(),
    isOfflineAvailable: false,
    downloadStatus: 'idle',
    downloadProgress: 0
  };
}

/**
 * Download audio for offline zero-internet listening and store in IndexedDB
 */
export async function downloadTrackAudioForOffline(
  track: Track,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const videoId = track.ytVideoId || extractVideoId(track.audioUrl) || track.id;
  const downloadUrl = apiUrl(`/api/yt/download-audio/${videoId}?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&duration=${track.duration || 210}`);

  onProgress?.(15);

  let blob: Blob;
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Servidor devolvió HTTP ${res.status}`);
    }
    onProgress?.(60);
    blob = await res.blob();
    if (!blob || blob.size < 20000) {
      throw new Error('El archivo de audio recibido no es válido o está incompleto.');
    }
    onProgress?.(85);
  } catch (netErr: any) {
    console.error('Audio download failed:', netErr);
    throw new Error(netErr.message || 'No se pudo descargar el archivo de audio real de la canción.');
  }

  // Store authentic song in IndexedDB
  await saveAudioToOffline(track.id, blob, {
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration
  });

  onProgress?.(100);
  return blob;
}

/**
 * Direct file download of MP3 to user phone / computer storage
 */
export function downloadTrackMp3ToDevice(track: Track): void {
  const videoId = track.ytVideoId || extractVideoId(track.audioUrl) || track.id;
  const downloadUrl = apiUrl(`/api/yt/download-audio/${videoId}?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}&duration=${track.duration || 210}`);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${track.artist} - ${track.title}.mp3`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Save user YouTube cookies
 */
export async function saveYtCookiesApi(cookies: string): Promise<boolean> {
  const res = await fetch(apiUrl('/api/yt/cookies'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookies: cookies.trim() })
  });
  return res.ok;
}

/**
 * Check if YouTube cookies are configured
 */
export async function checkYtCookiesStatus(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/yt/cookies-status'));
    const data = await res.json();
    return !!data.hasCookies;
  } catch {
    return false;
  }
}

/**
 * Parses CSV / Text / Takeout exports from YouTube Music, TuneMyMusic or Soundiiz
 */
export function parseYtExportFile(fileContent: string): YtParsedTrack[] {
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Check if JSON
  if (fileContent.trim().startsWith('[') || fileContent.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(fileContent);
      const list = Array.isArray(parsed) ? parsed : (parsed.tracks || parsed.items || []);
      return list.map((item: any) => ({
        title: item.title || item.name || item.trackName || 'Sin título',
        artist: item.artist || item.artistName || 'Artista desconocido',
        album: item.album || item.albumName || 'YouTube Music',
        url: item.url || item.link || '',
        videoId: item.videoId || extractVideoId(item.url || ''),
        duration: item.duration || 180
      }));
    } catch {
      // Continue to CSV parsing
    }
  }

  // Check CSV header
  const header = lines[0].toLowerCase();
  const isCsv = header.includes(',') || header.includes(';');
  const delimiter = header.includes(';') ? ';' : ',';

  if (isCsv) {
    const headerCols = lines[0].split(delimiter).map((c) => c.replace(/"/g, '').trim().toLowerCase());
    const titleIdx = headerCols.findIndex((c) => c.includes('track') || c.includes('title') || c.includes('canción') || c.includes('nombre'));
    const artistIdx = headerCols.findIndex((c) => c.includes('artist') || c.includes('artista') || c.includes('channel'));
    const albumIdx = headerCols.findIndex((c) => c.includes('album') || c.includes('álbum'));
    const urlIdx = headerCols.findIndex((c) => c.includes('url') || c.includes('link') || c.includes('enlace') || c.includes('video'));

    const tracks: YtParsedTrack[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const parts = line.split(delimiter).map((p) => p.replace(/^"|"$/g, '').trim());
      const rawTitle = titleIdx !== -1 && parts[titleIdx] ? parts[titleIdx] : parts[0] || '';
      const rawArtist = artistIdx !== -1 && parts[artistIdx] ? parts[artistIdx] : parts[1] || 'YouTube Music';
      const rawAlbum = albumIdx !== -1 && parts[albumIdx] ? parts[albumIdx] : 'YouTube Music';
      const rawUrl = urlIdx !== -1 && parts[urlIdx] ? parts[urlIdx] : '';

      if (rawTitle) {
        tracks.push({
          title: rawTitle,
          artist: rawArtist,
          album: rawAlbum,
          url: rawUrl,
          videoId: extractVideoId(rawUrl)
        });
      }
    }
    return tracks;
  }

  // Plain text lines format: "Artist - Title" or "Title by Artist" or URLs
  return lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('http')) {
      const vid = extractVideoId(trimmed);
      return {
        title: `Pista importada ${vid || ''}`,
        artist: 'YouTube Music',
        url: trimmed,
        videoId: vid
      };
    }

    if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ');
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim(),
        album: 'YouTube Music'
      };
    }

    return {
      title: trimmed,
      artist: 'YouTube Music',
      album: 'YouTube Music'
    };
  });
}

export function extractVideoId(url: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|music\.youtube\.com\/watch\?v=)([\w-]{11})/);
  return match && match[1] ? match[1] : undefined;
}
