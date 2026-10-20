import { LyricLine } from '../types/music';
import { parseLRC } from './lrcParser';
import { apiUrl } from './apiUrl';

export interface LyricsResult {
  synced: LyricLine[];
  plainText: string;
  source: string;
  isSynced: boolean;
}

/**
 * Clean up title and artist for maximum search accuracy in lyric databases.
 * Strips YouTube-specific noise like "Video Oficial", "Remix", "Audio", "(Letra)", etc.
 */
export function cleanSongInfo(rawTitle: string, rawArtist: string): { title: string; artist: string } {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();

  // If title has "Artist - Song" or "Song - Artist" format
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (!artist || artist.includes('YouTube') || artist.includes('Desconocido') || artist.toLowerCase() === 'various artists') {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    } else if (artist.toLowerCase() === parts[0].toLowerCase().trim()) {
      title = parts.slice(1).join(' - ').trim();
    }
  }

  // Remove common YouTube video artifacts, brackets, and parentheticals
  title = title
    .replace(/\s*[\(\[]\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyric\s+video|visualizer|remastered|hd|4k|clip\s+officiel|videoclip|letra|video\s+con\s+letra|con\s+letra|sub\s+español|en\s+vivo|live)[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*(?:feat\.|ft\.|con\s+|with\s+)[^)\]]+[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*(?:prod\.|produced\s+by)[^)\]]+[\)\]]/gi, '')
    .replace(/["'“”]/g, '')
    .trim();

  artist = artist
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*(?:VEVO|Official|Music)$/i, '')
    .replace(/\s*[\(\[]\s*(?:feat\.|ft\.)[^)\]]+[\)\]]/gi, '')
    .trim();

  return { title, artist };
}

/**
 * Distribute plain lyrics lines across track duration for synchronized karaoke-style scrolling
 */
export function convertPlainToSynced(plainText: string, duration: number = 210): LyricLine[] {
  const lines = plainText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('[Intro') && !l.startsWith('[Outro'));

  if (lines.length === 0) return [];

  const startTime = 3.5;
  const availableDuration = Math.max(20, duration - 8);
  const timePerLine = availableDuration / lines.length;

  return lines.map((text, idx) => ({
    time: Math.round((startTime + idx * timePerLine) * 100) / 100,
    text,
  }));
}

/**
 * Multi-tier reliable lyrics retrieval:
 * Tier 1: LRCLIB (official synced LRC database)
 * Tier 2: LRCLIB search query fallback
 * Tier 3: Lyrics.ovh (free worldwide open lyrics catalog)
 * Tier 4: Backend /api/lyrics multi-source scraper & proxy
 */
export async function searchAndFetchLyrics(
  title: string,
  artist: string,
  duration?: number,
  videoId?: string
): Promise<LyricsResult | null> {
  const { title: cleanTitle, artist: cleanArtist } = cleanSongInfo(title, artist);
  if (!cleanTitle && !cleanArtist) return null;

  const cacheKey = `spotyluis_lyrics_${cleanArtist.toLowerCase()}_${cleanTitle.toLowerCase()}`;

  // 1. Check local persistent cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      if (Array.isArray(data.synced) && data.synced.length > 0) {
        return data;
      }
    }
  } catch {
    // ignore cache read error
  }

  // Tier 1: LRCLIB Direct /api/get
  try {
    const params = new URLSearchParams({
      artist_name: cleanArtist,
      track_name: cleanTitle,
    });
    if (duration && duration > 20) {
      params.append('duration', String(Math.round(duration)));
    }

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'SpotyLuis/1.3.0 (https://github.com/spotyluis)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics && typeof data.syncedLyrics === 'string') {
        const synced = parseLRC(data.syncedLyrics);
        if (synced.length > 0) {
          const result: LyricsResult = {
            synced,
            plainText: data.plainLyrics || data.syncedLyrics,
            source: 'LRCLIB (Sincronizada)',
            isSynced: true,
          };
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}
          return result;
        }
      }

      if (data.plainLyrics && typeof data.plainLyrics === 'string') {
        const synced = convertPlainToSynced(data.plainLyrics, duration || 210);
        const result: LyricsResult = {
          synced,
          plainText: data.plainLyrics,
          source: 'LRCLIB (Texto)',
          isSynced: false,
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch (err) {
    console.warn('[lyricsService] LRCLIB get failed:', err);
  }

  // Tier 2: LRCLIB Search endpoint /api/search
  try {
    const searchQueries = [
      `${cleanArtist} ${cleanTitle}`,
      cleanTitle,
    ];

    for (const q of searchQueries) {
      try {
        const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
          headers: {
            'User-Agent': 'SpotyLuis/1.3.0',
          },
        });
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            // Find item with syncedLyrics first
            const matchedSynced = items.find((it: any) => it.syncedLyrics && it.syncedLyrics.trim().length > 10);
            if (matchedSynced) {
              const synced = parseLRC(matchedSynced.syncedLyrics);
              if (synced.length > 0) {
                const result: LyricsResult = {
                  synced,
                  plainText: matchedSynced.plainLyrics || matchedSynced.syncedLyrics,
                  source: 'LRCLIB (Búsqueda Sincronizada)',
                  isSynced: true,
                };
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(result));
                } catch {}
                return result;
              }
            }

            const matchedPlain = items.find((it: any) => it.plainLyrics && it.plainLyrics.trim().length > 10);
            if (matchedPlain) {
              const synced = convertPlainToSynced(matchedPlain.plainLyrics, duration || 210);
              const result: LyricsResult = {
                synced,
                plainText: matchedPlain.plainLyrics,
                source: 'LRCLIB (Búsqueda)',
                isSynced: false,
              };
              try {
                localStorage.setItem(cacheKey, JSON.stringify(result));
              } catch {}
              return result;
            }
          }
        }
      } catch {
        // try next query
      }
    }
  } catch (err) {
    console.warn('[lyricsService] LRCLIB search failed:', err);
  }

  // Tier 3: Lyrics.ovh free public catalog
  try {
    const encArtist = encodeURIComponent(cleanArtist);
    const encTitle = encodeURIComponent(cleanTitle);
    const res = await fetch(`https://api.lyrics.ovh/v1/${encArtist}/${encTitle}`);
    if (res.ok) {
      const data = await res.json();
      if (data.lyrics && typeof data.lyrics === 'string' && data.lyrics.trim().length > 10) {
        const synced = convertPlainToSynced(data.lyrics, duration || 210);
        const result: LyricsResult = {
          synced,
          plainText: data.lyrics,
          source: 'Lyrics.ovh',
          isSynced: false,
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch (err) {
    console.warn('[lyricsService] Lyrics.ovh fetch failed:', err);
  }

  // Tier 4: Backend proxy route (handles CORS, fallback sources, or subtitles)
  try {
    const backendUrl = apiUrl(
      `/api/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}${videoId ? `&videoId=${videoId}` : ''}`
    );
    const res = await fetch(backendUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.syncedText && typeof data.syncedText === 'string') {
        const synced = parseLRC(data.syncedText);
        if (synced.length > 0) {
          const result: LyricsResult = {
            synced,
            plainText: data.plainText || data.syncedText,
            source: data.source || 'Servidor SpotyLuis',
            isSynced: true,
          };
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}
          return result;
        }
      }

      if (data.plainText && typeof data.plainText === 'string' && data.plainText.trim().length > 10) {
        const synced = convertPlainToSynced(data.plainText, duration || 210);
        const result: LyricsResult = {
          synced,
          plainText: data.plainText,
          source: data.source || 'Servidor SpotyLuis',
          isSynced: false,
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch (err) {
    console.warn('[lyricsService] Backend lyrics fetch failed:', err);
  }

  return null;
}
