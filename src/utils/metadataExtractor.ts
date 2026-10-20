import { AudioFormat, Track } from '../types/music';
import { parseLRC } from './lrcParser';

const GRADIENTS = [
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)',
  'linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)',
  'linear-gradient(135deg, #3b0764 0%, #581c87 50%, #7e22ce 100%)',
  'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)',
  'linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)',
  'linear-gradient(135deg, #4c0519 0%, #881337 50%, #be123c 100%)',
  'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #0d9488 100%)'
];

export function getDeterministicGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

export function detectAudioFormat(filename: string, mimeType: string): AudioFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'flac' || mimeType.includes('flac')) return 'FLAC';
  if (ext === 'alac' || (ext === 'm4a' && filename.toLowerCase().includes('alac'))) return 'ALAC';
  if (ext === 'wav' || mimeType.includes('wav')) return 'WAV';
  if (ext === 'm4a' || ext === 'aac' || mimeType.includes('aac') || mimeType.includes('mp4')) return 'AAC';
  if (ext === 'ogg' || mimeType.includes('ogg')) return 'OGG';
  return 'MP3';
}

/**
 * Extracts basic metadata and embedded album art from local audio files.
 */
export async function parseAudioFile(
  file: File,
  lrcFilesMap?: Map<string, string>
): Promise<Track> {
  const filename = file.name;
  const format = detectAudioFormat(filename, file.type);
  const isLossless = format === 'FLAC' || format === 'ALAC' || format === 'WAV';

  // Base information from filename: "Artist - Title.ext" or "01 - Title.ext"
  let title = filename.replace(/\.[^/.]+$/, '');
  let artist = 'Artista desconocido';
  let album = 'Álbum local';
  let genre = isLossless ? 'Alta Fidelidad' : 'General';
  let year = new Date().getFullYear();
  let coverUrl: string | undefined = undefined;

  // Split path if uploaded via directory upload
  const relativePath = file.webkitRelativePath || filename;
  const pathParts = relativePath.split('/');
  let folder = 'Biblioteca Principal';

  if (pathParts.length > 1) {
    folder = pathParts[pathParts.length - 2];
    album = folder;
    if (pathParts.length > 2) {
      artist = pathParts[pathParts.length - 3];
    }
  }

  // Parse "Artist - Title" filename pattern
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  }

  // Check matching .lrc file from companion map
  let syncedLyrics: any[] | undefined = undefined;
  if (lrcFilesMap) {
    const baseName = filename.replace(/\.[^/.]+$/, '').toLowerCase();
    const lrcContent = lrcFilesMap.get(baseName);
    if (lrcContent) {
      syncedLyrics = parseLRC(lrcContent);
    }
  }

  // Read tags from ID3 / FLAC if possible
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer(); // read first 128KB for header
    const view = new DataView(buffer);

    // ID3v2 header check
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      // ID3v2 tag present
      const extracted = parseID3v2(buffer);
      if (extracted.title) title = extracted.title;
      if (extracted.artist) artist = extracted.artist;
      if (extracted.album) album = extracted.album;
      if (extracted.genre) genre = extracted.genre;
      if (extracted.year) year = extracted.year;
      if (extracted.coverBlob) {
        coverUrl = URL.createObjectURL(extracted.coverBlob);
      }
    }
  } catch (e) {
    // Graceful fallback to filename metadata
    console.debug('Tags parsing fallback for:', filename, e);
  }

  // Calculate audio duration via temporary audio element
  const audioBlobUrl = URL.createObjectURL(file);
  const duration = await getAudioDuration(audioBlobUrl);

  const bitrateLabel = isLossless
    ? format === 'FLAC'
      ? 'Hi-Res FLAC Lossless 24-bit / 96 kHz'
      : format === 'ALAC'
      ? 'ALAC Apple Lossless 24-bit / 48 kHz'
      : 'WAV PCM 1411 kbps'
    : 'MP3 Estéreo 320 kbps';

  return {
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title,
    artist,
    album,
    year,
    genre,
    duration: Math.round(duration) || 180,
    format,
    bitrate: bitrateLabel,
    isHiRes: isLossless,
    coverUrl,
    coverGradient: getDeterministicGradient(artist + album),
    audioUrl: audioBlobUrl,
    fileSize: file.size,
    filePath: relativePath,
    folder,
    syncedLyrics,
    source: 'local',
    addedAt: Date.now()
  };
}

function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.onloadedmetadata = () => {
      resolve(tempAudio.duration || 180);
    };
    tempAudio.onerror = () => {
      resolve(180);
    };
    tempAudio.src = url;
  });
}

function parseID3v2(buffer: ArrayBuffer): {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  coverBlob?: Blob;
} {
  const result: any = {};
  const uint8 = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('utf-8');

  // Search common frame headers TIT2, TPE1, TALB, TCON, TYER
  const searchFrame = (id: string): string | undefined => {
    for (let i = 10; i < uint8.length - 14; i++) {
      if (
        uint8[i] === id.charCodeAt(0) &&
        uint8[i + 1] === id.charCodeAt(1) &&
        uint8[i + 2] === id.charCodeAt(2) &&
        uint8[i + 3] === id.charCodeAt(3)
      ) {
        const size = (uint8[i + 4] << 24) | (uint8[i + 5] << 16) | (uint8[i + 6] << 8) | uint8[i + 7];
        if (size > 0 && size < 500 && i + 10 + size <= uint8.length) {
          // Skip encoding byte (i + 10)
          const content = uint8.slice(i + 11, i + 10 + size);
          return textDecoder.decode(content).replace(/\0/g, '').trim();
        }
      }
    }
    return undefined;
  };

  result.title = searchFrame('TIT2');
  result.artist = searchFrame('TPE1');
  result.album = searchFrame('TALB');
  result.genre = searchFrame('TCON');
  const yearStr = searchFrame('TYER') || searchFrame('TDRC');
  if (yearStr) {
    const parsed = parseInt(yearStr, 10);
    if (!isNaN(parsed)) result.year = parsed;
  }

  return result;
}
