import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { 
  locateYtPlaylist, 
  searchYtMusic, 
  getOrDownloadAudioFile, 
  saveYtCookies, 
  hasYtCookies, 
  clearYtCookies 
} from './src/server/ytService';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Ensure yt-dlp binary is executable
try {
  const ytBin = path.resolve(process.cwd(), 'bin', 'yt-dlp');
  if (fs.existsSync(ytBin)) {
    fs.chmodSync(ytBin, 0o755);
  }
} catch (e) {
  console.warn('Could not set permissions on yt-dlp:', e);
}

// Universal CORS & UTF-8 encoding middleware for mobile WebView and web clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Disposition');
  // Enforce UTF-8 character encoding
  res.charset = 'utf-8';
  res.header('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Enforce UTF-8 on all JSON API responses
app.use((_req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson.call(this, body);
  };
  next();
});

app.use(express.json({ limit: '10mb' }));

// In-memory + file sync cache for Cloud Playlist Synchronization
const syncStore = new Map<string, { playlists: any[]; updatedAt: number; name?: string }>();
const SYNC_CACHE_FILE = path.resolve(process.cwd(), '.cloud_sync_cache.json');

// Load cache if exists
try {
  if (fs.existsSync(SYNC_CACHE_FILE)) {
    const raw = fs.readFileSync(SYNC_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      syncStore.set(k, v as any);
    }
  }
} catch (e) {
  console.warn('Could not read sync cache:', e);
}

const persistCache = () => {
  try {
    const obj: Record<string, any> = {};
    for (const [k, v] of syncStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SYNC_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save sync cache:', e);
  }
};

// API: Save / Sync playlists to Cloud
app.post('/api/cloud-sync/save', (req: Request, res: Response) => {
  try {
    const { syncCode, playlists, name } = req.body;
    if (!playlists || !Array.isArray(playlists)) {
      return res.status(400).json({ error: 'Playlists array is required' });
    }

    // Generate or use existing 6-character alphanumeric code
    const code = (syncCode && typeof syncCode === 'string' && syncCode.trim().length >= 4)
      ? syncCode.trim().toUpperCase()
      : Math.random().toString(36).substring(2, 8).toUpperCase();

    const data = {
      playlists,
      updatedAt: Date.now(),
      name: name || `Colección (${new Date().toLocaleDateString()})`
    };

    syncStore.set(code, data);
    persistCache();

    return res.json({ success: true, syncCode: code, updatedAt: data.updatedAt, count: playlists.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al guardar en la nube' });
  }
});

// API: Fetch playlists from Cloud by syncCode
app.get('/api/cloud-sync/:code', (req: Request, res: Response) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const found = syncStore.get(code);
    if (!found) {
      return res.status(404).json({ error: 'Código de sincronización no encontrado' });
    }
    return res.json({ success: true, syncCode: code, ...found });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al recuperar' });
  }
});

// API: YouTube / YouTube Music URL resolver
app.post('/api/yt-metadata', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL requerida' });
    }

    // Extract video ID from youtube.com / music.youtube.com / youtu.be
    let videoId = '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|music\.youtube\.com\/watch\?v=)([\w-]{11})/);
    if (match && match[1]) {
      videoId = match[1];
    }

    let title = 'Canción de YouTube Music';
    let author_name = 'Artista desconocido';
    let thumbnail_url = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

    if (videoId) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const resp = await fetch(oembedUrl);
        if (resp.ok) {
          const info = await resp.json() as any;
          title = info.title || title;
          author_name = info.author_name || author_name;
          thumbnail_url = info.thumbnail_url || thumbnail_url;
        }
      } catch (e) {
        console.warn('oEmbed fetch error:', e);
      }
    }

    return res.json({
      success: true,
      videoId,
      title,
      author: author_name,
      thumbnail: thumbnail_url,
      originalUrl: url
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al procesar enlace' });
  }
});

// API: Locate all saved tracks from a YouTube Music playlist or channel
app.post('/api/yt/locate-playlist', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL o ID de lista de YouTube Music requerida' });
    }

    const playlist = await locateYtPlaylist(url);
    return res.json({ success: true, ...playlist });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al localizar lista de YouTube Music' });
  }
});

// API: Search songs on YouTube Music
app.post('/api/yt/search', async (req: Request, res: Response) => {
  try {
    const { query, limit } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Término de búsqueda requerido' });
    }

    const results = await searchYtMusic(query, limit || 12);
    return res.json({ success: true, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error en la búsqueda' });
  }
});

// API: Download / stream audio file for offline listening
app.all(['/api/yt/download-audio', '/api/yt/download-audio/:videoId'], async (req: Request, res: Response) => {
  try {
    const videoId = (req.params.videoId || req.query.videoId || req.body?.videoId) as string;
    const title = (req.query.title || req.body?.title) as string | undefined;
    const artist = (req.query.artist || req.body?.artist) as string | undefined;
    const duration = req.query.duration ? parseInt(req.query.duration as string, 10) : req.body?.duration;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId requerido' });
    }

    const { filePath, filename } = await getOrDownloadAudioFile(videoId, title, artist, duration);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo de audio no disponible' });
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    // Support HTTP Range requests for instant seeking in AudioEngine
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
      });
      fileStream.pipe(res);
      return;
    }

    // Full audio response with attachment header
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('Audio download endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Error al procesar audio' });
  }
});

// API: Search and retrieve lyrics for a song (LRCLIB + YouTube Subtitles + Lyrics.ovh)
app.get('/api/lyrics', async (req: Request, res: Response) => {
  try {
    let title = ((req.query.title as string) || '').trim();
    let artist = ((req.query.artist as string) || '').trim();
    const videoId = ((req.query.videoId as string) || '').trim();

    if (!title && !videoId) {
      return res.status(400).json({ error: 'Título o videoId requerido' });
    }

    // Clean YouTube artifacts
    title = title
      .replace(/\s*[\(\[]\s*(?:official\s+)?(?:music\s+)?(?:video|audio|lyric\s+video|visualizer|remastered|hd|4k|videoclip|letra|con\s+letra)[\)\]]/gi, '')
      .replace(/\s*[\(\[]\s*(?:feat\.|ft\.)[^)\]]+[\)\]]/gi, '')
      .replace(/["'“”]/g, '')
      .trim();

    artist = artist
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*(?:VEVO|Official|Music)$/i, '')
      .trim();

    // 1. Try LRCLIB exact get
    try {
      const lrclibUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
      const lrcRes = await fetch(lrclibUrl, {
        headers: { 'User-Agent': 'SpotyLuis/1.3.0' },
      });
      if (lrcRes.ok) {
        const data = await lrcRes.json() as any;
        if (data.syncedLyrics) {
          return res.json({
            success: true,
            source: 'LRCLIB (Sincronizada)',
            syncedText: data.syncedLyrics,
            plainText: data.plainLyrics || data.syncedLyrics,
          });
        }
        if (data.plainLyrics) {
          return res.json({
            success: true,
            source: 'LRCLIB (Texto)',
            plainText: data.plainLyrics,
          });
        }
      }
    } catch (e) {
      // continue to next source
    }

    // 2. Try LRCLIB search endpoint
    try {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'SpotyLuis/1.3.0' },
      });
      if (searchRes.ok) {
        const items = await searchRes.json() as any[];
        if (Array.isArray(items) && items.length > 0) {
          const matchSynced = items.find((it) => it.syncedLyrics && it.syncedLyrics.trim().length > 10);
          if (matchSynced) {
            return res.json({
              success: true,
              source: 'LRCLIB (Búsqueda Sincronizada)',
              syncedText: matchSynced.syncedLyrics,
              plainText: matchSynced.plainLyrics || matchSynced.syncedLyrics,
            });
          }
          const matchPlain = items.find((it) => it.plainLyrics && it.plainLyrics.trim().length > 10);
          if (matchPlain) {
            return res.json({
              success: true,
              source: 'LRCLIB (Búsqueda)',
              plainText: matchPlain.plainLyrics,
            });
          }
        }
      }
    } catch (e) {
      // continue
    }

    // 3. Try lyrics.ovh
    try {
      const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const ovhRes = await fetch(ovhUrl);
      if (ovhRes.ok) {
        const ovhData = await ovhRes.json() as any;
        if (ovhData.lyrics && ovhData.lyrics.trim().length > 10) {
          return res.json({
            success: true,
            source: 'Lyrics.ovh',
            plainText: ovhData.lyrics,
          });
        }
      }
    } catch (e) {
      // continue
    }

    // 4. Try lyrics.ovh inverted (title as artist / artist as title in case swapped in YouTube)
    try {
      const ovhInvertUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(title)}/${encodeURIComponent(artist)}`;
      const ovhInvRes = await fetch(ovhInvertUrl);
      if (ovhInvRes.ok) {
        const ovhData = await ovhInvRes.json() as any;
        if (ovhData.lyrics && ovhData.lyrics.trim().length > 10) {
          return res.json({
            success: true,
            source: 'Lyrics.ovh (Invertido)',
            plainText: ovhData.lyrics,
          });
        }
      }
    } catch (e) {
      // continue
    }

    return res.status(404).json({ error: 'Letra no encontrada en fuentes públicas' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al buscar letra' });
  }
});

// API: Save / Check YouTube cookies for accessing private liked tracks
app.post('/api/yt/cookies', (req: Request, res: Response) => {
  try {
    const { cookies } = req.body;
    if (!cookies || typeof cookies !== 'string') {
      return res.status(400).json({ error: 'Contenido de cookies requerido' });
    }
    saveYtCookies(cookies);
    return res.json({ success: true, message: 'Cookies guardadas correctamente' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/yt/cookies-status', (_req: Request, res: Response) => {
  return res.json({ hasCookies: hasYtCookies() });
});

app.delete('/api/yt/cookies', (_req: Request, res: Response) => {
  clearYtCookies();
  return res.json({ success: true, message: 'Cookies eliminadas' });
});

// API: Deliver built dist assets to include inside Android Studio project assets
app.get('/api/dist-assets', (_req: Request, res: Response) => {
  try {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      return res.status(404).json({ error: 'dist not built' });
    }

    const files: Record<string, string> = {};
    const readDir = (dir: string, base: string = '') => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relPath = base ? `${base}/${item.name}` : item.name;
        if (item.isDirectory()) {
          readDir(fullPath, relPath);
        } else {
          // Read as utf-8 or base64
          files[relPath] = fs.readFileSync(fullPath, 'utf-8');
        }
      }
    };

    readDir(distPath);
    return res.json({ success: true, files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Direct APK download endpoints with robust CORS, Content-Disposition, and multiple aliases
const serveApk = (filename: string, res: Response, req: Request) => {
  const apkPath = path.resolve(process.cwd(), 'public', filename);
  const distApkPath = path.resolve(process.cwd(), 'dist', filename);
  const targetPath = fs.existsSync(apkPath) ? apkPath : fs.existsSync(distApkPath) ? distApkPath : null;

  if (targetPath) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const stat = fs.statSync(targetPath);
    res.setHeader('Content-Length', stat.size);
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    return res.sendFile(targetPath);
  }
  return res.status(404).send(`APK ${filename} no encontrado. Por favor compile de nuevo.`);
};

app.all(['/AuraHiFi.apk', '/SpotyLuis.apk', '/api/download-apk', '/download/AuraHiFi.apk', '/AuraHiFi-Clean.apk', '/api/download-apk-clean', '/download/AuraHiFi-Clean.apk'], (req: Request, res: Response) => {
  return serveApk('AuraHiFi.apk', res, req);
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aura Hi-Fi server running at http://localhost:${PORT}`);
  });
}

startServer();
