/**
 * Offline Audio Storage Engine for Aura Hi-Fi Music
 * Uses IndexedDB to store binary audio Blobs directly on device storage.
 * Works completely offline in Android WebViews and Mobile Browsers without internet.
 */

const DB_NAME = 'aura_offline_music_db';
const DB_VERSION = 1;
const AUDIO_STORE = 'offline_audio_blobs';
const META_STORE = 'offline_track_meta';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está soportado en este dispositivo'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir la base de datos IndexedDB'));
  });
}

export interface OfflineTrackRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  savedAt: number;
}

export interface OfflineMetaRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  savedAt: number;
}

/**
 * Save audio blob to offline storage
 */
export async function saveAudioToOffline(
  trackId: string,
  blob: Blob,
  metadata?: { title: string; artist: string; album: string; duration: number }
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const audioStore = tx.objectStore(AUDIO_STORE);
    audioStore.put({
      id: trackId,
      blob,
      mimeType: blob.type || 'audio/mpeg',
      size: blob.size,
      savedAt: Date.now()
    } as OfflineTrackRecord);

    if (metadata) {
      const metaStore = tx.objectStore(META_STORE);
      metaStore.put({
        id: trackId,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        duration: metadata.duration,
        savedAt: Date.now()
      } as OfflineMetaRecord);
    }
  });
}

/**
 * Get offline audio blob by trackId
 */
export async function getOfflineAudio(trackId: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.get(trackId);

      req.onsuccess = () => {
        const record = req.result as OfflineTrackRecord | undefined;
        resolve(record ? record.blob : null);
      };

      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('Error reading offline audio:', e);
    return null;
  }
}

/**
 * Check if a specific track is available offline
 */
export async function isTrackOffline(trackId: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.count(trackId);

      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get all track IDs stored offline
 */
export async function getAllOfflineTrackIds(): Promise<string[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.getAllKeys();

      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete a track from offline storage
 */
export async function deleteOfflineAudio(trackId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      tx.objectStore(AUDIO_STORE).delete(trackId);
      tx.objectStore(META_STORE).delete(trackId);
    });
  } catch (e) {
    console.warn('Error deleting offline audio:', e);
  }
}

/**
 * Calculate total offline storage used
 */
export async function getOfflineStorageUsage(): Promise<{ totalBytes: number; trackCount: number }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result as OfflineTrackRecord[]) || [];
        const totalBytes = records.reduce((sum, r) => sum + (r.size || 0), 0);
        resolve({ totalBytes, trackCount: records.length });
      };

      req.onerror = () => resolve({ totalBytes: 0, trackCount: 0 });
    });
  } catch {
    return { totalBytes: 0, trackCount: 0 };
  }
}
