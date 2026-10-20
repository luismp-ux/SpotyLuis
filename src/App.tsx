import React, { useEffect, useMemo, useState } from 'react';
import { ActiveView, Album, LyricLine, Playlist, Track } from './types/music';
import { audioEngine } from './audio/AudioEngine';
import { getBundledDemoTracks } from './audio/audioSynthesizer';
import { 
  loadFavorites, 
  loadSavedPlaylists, 
  loadSavedTracks, 
  saveFavorites, 
  savePlaylistsToStorage, 
  saveTracksToStorage 
} from './utils/storage';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { HomeView } from './components/views/HomeView';
import { FoldersView } from './components/views/FoldersView';
import { AlbumsView } from './components/views/AlbumsView';
import { GenresView } from './components/views/GenresView';
import { PlaylistsView } from './components/views/PlaylistsView';
import { OfflineView } from './components/views/OfflineView';
import { EqualizerModal } from './components/EqualizerModal';
import { SyncedLyricsView } from './components/SyncedLyricsView';
import { VisualizerOverlay } from './components/VisualizerOverlay';
import { CloudSyncModal } from './components/CloudSyncModal';
import { YtMusicImportModal } from './components/YtMusicImportModal';
import { UploadModal } from './components/UploadModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AndroidExportModal } from './components/AndroidExportModal';
import { BottomNavBar } from './components/BottomNavBar';
import { getAllOfflineTrackIds } from './utils/offlineAudioStore';
import { searchAndFetchLyrics } from './utils/lyricsService';

export default function App() {
  // Library State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>(loadSavedPlaylists);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active View & Navigation
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);

  // Modals
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showYtModal, setShowYtModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);

  // Initialize Bundled Demo Tracks & Saved Local Tracks
  useEffect(() => {
    let isMounted = true;
    async function initLibrary() {
      try {
        const demoTracks = await getBundledDemoTracks();
        const savedTracks = loadSavedTracks();
        
        // Check offline audio storage in IndexedDB
        let offlineIds = new Set<string>();
        try {
          offlineIds = new Set(await getAllOfflineTrackIds());
        } catch (e) {
          console.warn('Could not read offline track IDs:', e);
        }

        // Merge without duplicate IDs and tag offline available
        const existingIds = new Set(savedTracks.map((t) => t.id));
        const merged = [...savedTracks];
        demoTracks.forEach((t) => {
          if (!existingIds.has(t.id)) {
            merged.push(t);
          }
        });

        merged.forEach((t) => {
          if (offlineIds.has(t.id)) {
            t.isOfflineAvailable = true;
            t.downloadStatus = 'completed';
          }
        });

        if (isMounted) {
          setTracks(merged);
          setPlaybackQueue(merged);
          if (merged.length > 0) {
            setCurrentTrack(merged[0]);
          }
          setIsInitializing(false);
        }
      } catch (err) {
        console.error('Error initializing audio library:', err);
        setIsInitializing(false);
      }
    }

    initLibrary();
    return () => {
      isMounted = false;
    };
  }, []);

  // Hook AudioEngine event callbacks
  useEffect(() => {
    const unsubTime = audioEngine.onTimeUpdate((time, dur) => {
      setCurrentTime(time);
      setDuration(dur);
    });

    const unsubState = audioEngine.onStateChange((playing) => {
      setIsPlaying(playing);
    });

    const unsubEnd = audioEngine.onTrackEnd(() => {
      handleNextTrack();
    });

    const onNext = () => handleNextTrack();
    const onPrev = () => handlePreviousTrack();
    audioEngine.audio.addEventListener('mediaSessionNext', onNext);
    audioEngine.audio.addEventListener('mediaSessionPrev', onPrev);

    if (typeof window !== 'undefined') {
      (window as any).__spotyluis_remote_action = (action: string) => {
        if (action === 'play_pause') handlePlayPause();
        else if (action === 'next') handleNextTrack();
        else if (action === 'prev') handlePreviousTrack();
      };
    }

    return () => {
      unsubTime();
      unsubState();
      unsubEnd();
      audioEngine.audio.removeEventListener('mediaSessionNext', onNext);
      audioEngine.audio.removeEventListener('mediaSessionPrev', onPrev);
    };
  }, [currentTrack, playbackQueue, isShuffle, repeatMode]);

  // Aggregate Albums from tracks
  const albums: Album[] = useMemo(() => {
    const map = new Map<string, Track[]>();
    tracks.forEach((t) => {
      const key = `${t.artist}___${t.album}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });

    return Array.from(map.entries()).map(([key, aTracks]) => {
      const first = aTracks[0];
      const hasHiRes = aTracks.some((t) => t.isHiRes);
      const totalDur = aTracks.reduce((acc, t) => acc + t.duration, 0);

      return {
        id: `album-${key}`,
        title: first.album || 'Álbum Desconocido',
        artist: first.artist || 'Varios Artistas',
        year: first.year || 2026,
        genre: first.genre || 'General',
        coverUrl: first.coverUrl,
        coverGradient: first.coverGradient,
        trackCount: aTracks.length,
        duration: totalDur,
        isHiRes: hasHiRes,
        format: first.format,
        tracks: aTracks,
      };
    });
  }, [tracks]);

  // Save changes to storage
  const handleSaveTracks = (updated: Track[]) => {
    setTracks(updated);
    saveTracksToStorage(updated);
  };

  const handleSavePlaylists = (updated: Playlist[]) => {
    setPlaylists(updated);
    savePlaylistsToStorage(updated);
  };

  // Playback Control Handlers
  const handlePlayTrack = async (track: Track) => {
    setCurrentTrack(track);
    await audioEngine.playTrack(track);

    // Auto-fetch lyrics if missing
    if (!track.syncedLyrics || track.syncedLyrics.length === 0) {
      searchAndFetchLyrics(track.title, track.artist, track.duration, track.ytVideoId)
        .then((res) => {
          if (res && res.synced && res.synced.length > 0) {
            handleUpdateTrackLyrics(track.id, res.synced);
          }
        })
        .catch(() => {});
    }
  };

  const handlePlayTracks = async (list: Track[]) => {
    if (list.length === 0) return;
    setPlaybackQueue(list);
    handlePlayTrack(list[0]);
  };

  const handlePlayPause = () => {
    if (!currentTrack) {
      if (tracks.length > 0) {
        handlePlayTrack(tracks[0]);
      }
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.resume();
    }
  };

  const handleNextTrack = () => {
    if (playbackQueue.length === 0) return;

    if (repeatMode === 'one' && currentTrack) {
      audioEngine.seek(0);
      audioEngine.resume();
      return;
    }

    const currentIndex = currentTrack
      ? playbackQueue.findIndex((t) => t.id === currentTrack.id)
      : -1;

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playbackQueue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= playbackQueue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          audioEngine.pause();
          return;
        }
      }
    }

    const nextTrack = playbackQueue[nextIndex];
    if (nextTrack) {
      handlePlayTrack(nextTrack);
    }
  };

  const handlePreviousTrack = () => {
    if (playbackQueue.length === 0) return;

    // If more than 3 seconds in, seek to start of current track
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }

    const currentIndex = currentTrack
      ? playbackQueue.findIndex((t) => t.id === currentTrack.id)
      : 0;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playbackQueue.length - 1;
    }

    const prevTrack = playbackQueue[prevIndex];
    if (prevTrack) {
      handlePlayTrack(prevTrack);
    }
  };

  const handleSeek = (seconds: number) => {
    audioEngine.seek(seconds);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioEngine.setVolume(vol);
    if (isMuted) setIsMuted(false);
  };

  const handleToggleMute = () => {
    audioEngine.toggleMute();
    setIsMuted(!isMuted);
  };

  const handleToggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleToggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const handleToggleFavorite = (trackId: string) => {
    let updated: string[];
    if (favorites.includes(trackId)) {
      updated = favorites.filter((id) => id !== trackId);
    } else {
      updated = [...favorites, trackId];
    }
    setFavorites(updated);
    saveFavorites(updated);
  };

  // Adding local files
  const handleAddLocalTracks = (newTracks: Track[]) => {
    const updated = [...newTracks, ...tracks];
    handleSaveTracks(updated);
    setPlaybackQueue(updated);
  };

  // Importing from YouTube Music
  const handleImportYtTracks = (newTracks: Track[], playlistName?: string) => {
    const updatedTracks = [...newTracks, ...tracks];
    handleSaveTracks(updatedTracks);

    if (playlistName) {
      const plId = `pl-yt-${Date.now()}`;
      const newPlaylist: Playlist = {
        id: plId,
        name: playlistName,
        description: `Importado de YouTube Music (${newTracks.length} canciones)`,
        trackIds: newTracks.map((t) => t.id),
        coverGradient: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isYtImported: true,
      };

      const nextPlaylists = [newPlaylist, ...playlists];
      handleSavePlaylists(nextPlaylists);
      setActivePlaylistId(plId);
      setActiveView('playlists');
    }
  };

  // Playlists management
  const handleCreatePlaylist = (playlist: Playlist) => {
    const updated = [playlist, ...playlists];
    handleSavePlaylists(updated);
    setActivePlaylistId(playlist.id);
    setActiveView('playlists');
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const updated = playlists.filter((p) => p.id !== playlistId);
    handleSavePlaylists(updated);
    if (activePlaylistId === playlistId) {
      setActivePlaylistId(null);
      setActiveView('home');
    }
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        return {
          ...p,
          trackIds: p.trackIds.filter((id) => id !== trackId),
          updatedAt: Date.now(),
        };
      }
      return p;
    });
    handleSavePlaylists(updated);
  };

  // Updating lyrics for a track
  const handleUpdateTrackLyrics = (trackId: string, lyrics: LyricLine[]) => {
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, syncedLyrics: lyrics };
      }
      return t;
    });
    handleSaveTracks(updated);
    if (currentTrack?.id === trackId) {
      setCurrentTrack({ ...currentTrack, syncedLyrics: lyrics });
    }
  };

  // Delete a track from library, playlists, favorites, and offline storage
  const handleDeleteTrack = async (trackId: string) => {
    const updated = tracks.filter((t) => t.id !== trackId);
    handleSaveTracks(updated);
    setPlaybackQueue((prev) => prev.filter((t) => t.id !== trackId));

    if (currentTrack?.id === trackId) {
      if (updated.length > 0) {
        handleNextTrack();
      } else {
        audioEngine.pause();
        setCurrentTrack(null);
      }
    }

    if (favorites.includes(trackId)) {
      const updatedFavs = favorites.filter((id) => id !== trackId);
      setFavorites(updatedFavs);
      saveFavorites(updatedFavs);
    }

    const updatedPls = playlists.map((p) => ({
      ...p,
      trackIds: p.trackIds.filter((id) => id !== trackId),
      updatedAt: Date.now(),
    }));
    handleSavePlaylists(updatedPls);

    try {
      const { deleteOfflineAudio } = await import('./utils/offlineAudioStore');
      await deleteOfflineAudio(trackId);
    } catch (e) {
      console.warn('Could not remove offline audio:', e);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Bar with 3-Zone Contract */}
      <TopNav
        activeView={activeView}
        setActiveView={(v) => {
          if (v === 'equalizer') {
            setShowEqualizer(true);
          } else {
            setActiveView(v);
            setSelectedAlbum(null);
            setSelectedGenre(null);
            setActivePlaylistId(null);
          }
        }}
        openYtModal={() => setShowYtModal(true)}
        openCloudModal={() => setShowCloudModal(true)}
        openUploadModal={() => setShowUploadModal(true)}
        openAndroidModal={() => setShowAndroidModal(true)}
      />

      {/* Main Workspace: Sidebar + Central Content View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeView={activeView}
          setActiveView={(v) => {
            if (v === 'equalizer') {
              setShowEqualizer(true);
            } else {
              setActiveView(v);
              setSelectedAlbum(null);
              setSelectedGenre(null);
              setActivePlaylistId(null);
            }
          }}
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          onSelectPlaylist={(id) => {
            setActivePlaylistId(id);
            setActiveView('playlists');
          }}
          onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
          openCloudModal={() => setShowCloudModal(true)}
          openUploadModal={() => setShowUploadModal(true)}
          openAndroidModal={() => setShowAndroidModal(true)}
          totalTracks={tracks.length}
        />

        {/* Dynamic Center Viewport */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
          {activeView === 'home' && (
            <HomeView
              tracks={tracks}
              albums={albums}
              playlists={playlists}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              favorites={favorites}
              onPlayTrack={handlePlayTrack}
              onToggleFavorite={handleToggleFavorite}
              onDeleteTrack={handleDeleteTrack}
              onOpenLyrics={(track) => {
                setCurrentTrack(track);
                setShowLyrics(true);
              }}
              onSelectAlbum={(album) => {
                setSelectedAlbum(album);
                setActiveView('albums');
              }}
              onSelectGenre={(genre) => {
                setSelectedGenre(genre);
                setActiveView('genres');
              }}
              onSelectPlaylist={(id) => {
                setActivePlaylistId(id);
                setActiveView('playlists');
              }}
              onOpenUpload={() => setShowUploadModal(true)}
            />
          )}

          {activeView === 'explorer' && (
            <FoldersView
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onPlayTracks={handlePlayTracks}
              onOpenUpload={() => setShowUploadModal(true)}
            />
          )}

          {activeView === 'albums' && (
            <AlbumsView
              albums={albums}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              selectedAlbum={selectedAlbum}
              favorites={favorites}
              onSelectAlbum={setSelectedAlbum}
              onPlayTrack={handlePlayTrack}
              onPlayTracks={handlePlayTracks}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {activeView === 'genres' && (
            <GenresView
              tracks={tracks}
              selectedGenre={selectedGenre}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              favorites={favorites}
              onSelectGenre={setSelectedGenre}
              onPlayTrack={handlePlayTrack}
              onPlayTracks={handlePlayTracks}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {activeView === 'playlists' && (
            <PlaylistsView
              playlists={playlists}
              activePlaylistId={activePlaylistId}
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              favorites={favorites}
              onSelectPlaylist={setActivePlaylistId}
              onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
              onPlayTrack={handlePlayTrack}
              onPlayTracks={handlePlayTracks}
              onToggleFavorite={handleToggleFavorite}
              onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              openCloudModal={() => setShowCloudModal(true)}
            />
          )}

          {activeView === 'offline' && (
            <OfflineView
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onPlayAll={handlePlayTracks}
              onOpenYtModal={() => setShowYtModal(true)}
              onRefreshTracks={() => {
                setTracks([...tracks]);
              }}
            />
          )}
        </main>
      </div>

      {/* Persistent Bottom Audio Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isFavorite={currentTrack ? favorites.includes(currentTrack.id) : false}
        showLyrics={showLyrics}
        showEqualizer={showEqualizer}
        showVisualizer={showVisualizer}
        onPlayPause={handlePlayPause}
        onPrevious={handlePreviousTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleFavorite={() => {
          if (currentTrack) handleToggleFavorite(currentTrack.id);
        }}
        onDeleteCurrentTrack={handleDeleteTrack}
        onToggleLyrics={() => setShowLyrics(!showLyrics)}
        onToggleEqualizer={() => setShowEqualizer(!showEqualizer)}
        onToggleVisualizer={() => setShowVisualizer(!showVisualizer)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavBar
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          setSelectedAlbum(null);
          setSelectedGenre(null);
          setActivePlaylistId(null);
        }}
        openEqualizer={() => setShowEqualizer(true)}
        activePlaylistId={activePlaylistId}
      />

      {/* Modals & Overlays */}
      <EqualizerModal
        isOpen={showEqualizer}
        onClose={() => setShowEqualizer(false)}
      />

      <SyncedLyricsView
        isOpen={showLyrics}
        onClose={() => setShowLyrics(false)}
        currentTrack={currentTrack}
        currentTime={currentTime}
        onSeek={handleSeek}
        onUpdateTrackLyrics={handleUpdateTrackLyrics}
      />

      <VisualizerOverlay
        isOpen={showVisualizer}
        onClose={() => setShowVisualizer(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
      />

      <CloudSyncModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        playlists={playlists}
        tracks={tracks}
        onPlaylistsUpdated={handleSavePlaylists}
      />

      <YtMusicImportModal
        isOpen={showYtModal}
        onClose={() => setShowYtModal(false)}
        onImportTracks={handleImportYtTracks}
      />

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onAddTracks={handleAddLocalTracks}
      />

      <CreatePlaylistModal
        isOpen={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        onCreate={handleCreatePlaylist}
      />

      <AndroidExportModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
      />
    </div>
  );
}
