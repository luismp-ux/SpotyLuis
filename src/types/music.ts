export type AudioFormat = 'FLAC' | 'ALAC' | 'WAV' | 'MP3' | 'AAC' | 'OGG' | 'YOUTUBE';

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number | string;
  genre: string;
  duration: number; // in seconds
  format: AudioFormat;
  bitrate: string; // e.g. "Hi-Res 24-bit / 96 kHz", "Lossless 16-bit / 44.1 kHz", "320 kbps"
  isHiRes: boolean;
  coverUrl?: string;
  coverGradient: string; // CSS gradient string for resilient visual identity
  audioUrl: string; // Blob URL, Synth URL, or YouTube stream
  fileSize?: number; // bytes
  filePath?: string; // e.g. "Rock/Pink Floyd/The Dark Side/01. Speak to Me.flac"
  folder?: string; // direct parent directory name
  syncedLyrics?: LyricLine[];
  plainLyrics?: string;
  source: 'local' | 'demo' | 'yt_music';
  ytVideoId?: string;
  addedAt: number;
  isOfflineAvailable?: boolean;
  downloadStatus?: 'idle' | 'downloading' | 'completed' | 'error';
  downloadProgress?: number;
  offlineSize?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  coverGradient: string;
  createdAt: number;
  updatedAt: number;
  isYtImported?: boolean;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number | string;
  genre: string;
  coverUrl?: string;
  coverGradient: string;
  trackCount: number;
  duration: number;
  isHiRes: boolean;
  format: AudioFormat;
  tracks: Track[];
}

export interface FolderNode {
  name: string;
  path: string;
  subFolders: FolderNode[];
  tracks: Track[];
}

export interface EqualizerBand {
  freq: number;
  label: string;
  gain: number; // -12dB to +12dB
}

export interface EQPreset {
  name: string;
  gains: number[]; // 10 bands
  bassBoost: number; // 0 to 10
  virtualizer: number; // 0 to 10
}

export type ActiveView = 
  | 'home'
  | 'explorer'
  | 'albums'
  | 'album_detail'
  | 'artists'
  | 'artist_detail'
  | 'genres'
  | 'genre_detail'
  | 'playlists'
  | 'playlist_detail'
  | 'yt_importer'
  | 'offline'
  | 'equalizer';
