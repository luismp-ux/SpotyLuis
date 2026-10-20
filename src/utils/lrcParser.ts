import { LyricLine } from '../types/music';

/**
 * Parses standard LRC text into sorted LyricLine array
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line contains one or multiple timestamp tags
    let match: RegExpExecArray | null;
    const timestamps: number[] = [];
    
    // Find all timestamps in this line
    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3] || '0';
      const millis = millisStr.length === 2 ? parseInt(millisStr, 10) * 10 : parseInt(millisStr, 10);
      const totalSeconds = minutes * 60 + seconds + millis / 1000;
      timestamps.push(totalSeconds);
    }

    // Extract text after removing all [mm:ss.xx] tags
    const text = trimmed.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();

    // If valid text (or empty line representing a musical pause)
    for (const time of timestamps) {
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Converts array of LyricLine back to standard .lrc format
 */
export function formatToLRC(lyrics: LyricLine[]): string {
  return lyrics
    .map((line) => {
      const minutes = Math.floor(line.time / 60);
      const seconds = Math.floor(line.time % 60);
      const hundredths = Math.floor((line.time % 1) * 100);
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');
      const hStr = String(hundredths).padStart(2, '0');
      return `[${mStr}:${sStr}.${hStr}] ${line.text}`;
    })
    .join('\n');
}

/**
 * Finds index of current active lyric line given playback time in seconds
 */
export function findActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (!lyrics || lyrics.length === 0) return -1;
  
  let low = 0;
  let high = lyrics.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lyrics[mid].time <= currentTime + 0.15) { // Small lookahead for smooth sing-along
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return found;
}
