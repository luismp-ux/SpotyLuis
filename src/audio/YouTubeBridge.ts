/**
 * YouTube Audio Bridge for SpotyLuis
 * Provides high-fidelity, real audio streaming directly from YouTube
 * without backend reliance, bot detection errors, or cookie blocks.
 */

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export type YTStateCallback = (isPlaying: boolean) => void;
export type YTTimeCallback = (currentTime: number, duration: number) => void;
export type YTEndCallback = () => void;

export class YouTubeBridge {
  private static instance: YouTubeBridge | null = null;
  private player: any = null;
  private isApiReady = false;
  private currentVideoId: string | null = null;
  private isPlaying = false;
  private pollInterval: any = null;
  private volume = 0.85;

  private stateListeners: YTStateCallback[] = [];
  private timeListeners: YTTimeCallback[] = [];
  private endListeners: YTEndCallback[] = [];

  private containerId = 'spotyluis-yt-player-container';
  private playerElementId = 'spotyluis-yt-player-iframe';

  private constructor() {
    this.initYouTubeApi();
  }

  public static getInstance(): YouTubeBridge {
    if (!YouTubeBridge.instance) {
      YouTubeBridge.instance = new YouTubeBridge();
    }
    return YouTubeBridge.instance;
  }

  private initYouTubeApi() {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      this.createPlayer();
      return;
    }

    // Ensure hidden container exists
    this.ensureContainer();

    // Listen for API ready
    const existingCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      this.isApiReady = true;
      this.createPlayer();
    };

    // Inject iframe API script if not present
    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);
    }
  }

  private ensureContainer(): HTMLElement {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      // Position offscreen with 1x1 dimension so mobile browsers treat it as active media
      container.style.position = 'fixed';
      container.style.bottom = '-100px';
      container.style.right = '-100px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-9999';
      document.body.appendChild(container);
    }

    let playerDiv = document.getElementById(this.playerElementId);
    if (!playerDiv) {
      playerDiv = document.createElement('div');
      playerDiv.id = this.playerElementId;
      container.appendChild(playerDiv);
    }

    return container;
  }

  private createPlayer() {
    if (!this.isApiReady || this.player || typeof window === 'undefined') return;
    this.ensureContainer();

    try {
      this.player = new window.YT.Player(this.playerElementId, {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(Math.round(this.volume * 100));
            if (this.currentVideoId) {
              this.loadAndPlay(this.currentVideoId);
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            if (event.data === 1) {
              this.isPlaying = true;
              this.startPolling();
              this.notifyState(true);
            } else if (event.data === 2) {
              this.isPlaying = false;
              this.stopPolling();
              this.notifyState(false);
            } else if (event.data === 0) {
              this.isPlaying = false;
              this.stopPolling();
              this.notifyState(false);
              this.notifyEnded();
            }
          },
          onError: (event: any) => {
            console.warn('YouTube playback error code:', event.data);
            this.isPlaying = false;
            this.stopPolling();
            this.notifyState(false);
          },
        },
      });
    } catch (err) {
      console.warn('Error creating YT.Player:', err);
    }
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        try {
          const current = this.player.getCurrentTime() || 0;
          const duration = this.player.getDuration() || 0;
          this.notifyTime(current, duration);
        } catch {
          // ignore
        }
      }
    }, 250);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public play(videoId: string, startSeconds: number = 0) {
    this.currentVideoId = videoId;

    if (!this.player || typeof this.player.loadVideoById !== 'function') {
      if (!this.isApiReady) {
        this.initYouTubeApi();
      }
      return;
    }

    this.loadAndPlay(videoId, startSeconds);
  }

  private loadAndPlay(videoId: string, startSeconds: number = 0) {
    try {
      this.player.loadVideoById({
        videoId,
        startSeconds,
      });
      this.player.setVolume(Math.round(this.volume * 100));
      this.player.playVideo();
      this.isPlaying = true;
      this.startPolling();
      this.notifyState(true);
    } catch (err) {
      console.warn('Error executing loadAndPlay:', err);
    }
  }

  public pause() {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
        this.isPlaying = false;
        this.stopPolling();
        this.notifyState(false);
      } catch (err) {
        console.warn('YT pause error:', err);
      }
    }
  }

  public resume() {
    if (this.player && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo();
        this.isPlaying = true;
        this.startPolling();
        this.notifyState(true);
      } catch (err) {
        console.warn('YT resume error:', err);
      }
    }
  }

  public seek(seconds: number) {
    if (this.player && typeof this.player.seekTo === 'function') {
      try {
        this.player.seekTo(seconds, true);
        const dur = this.player.getDuration() || 0;
        this.notifyTime(seconds, dur);
      } catch (err) {
        console.warn('YT seek error:', err);
      }
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(Math.round(this.volume * 100));
      } catch {
        // ignore
      }
    }
  }

  public stop() {
    this.stopPolling();
    this.currentVideoId = null;
    this.isPlaying = false;
    if (this.player && typeof this.player.stopVideo === 'function') {
      try {
        this.player.stopVideo();
      } catch {
        // ignore
      }
    }
    this.notifyState(false);
  }

  public onStateChange(cb: YTStateCallback): () => void {
    this.stateListeners.push(cb);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== cb);
    };
  }

  public onTimeUpdate(cb: YTTimeCallback): () => void {
    this.timeListeners.push(cb);
    return () => {
      this.timeListeners = this.timeListeners.filter((l) => l !== cb);
    };
  }

  public onEnded(cb: YTEndCallback): () => void {
    this.endListeners.push(cb);
    return () => {
      this.endListeners = this.endListeners.filter((l) => l !== cb);
    };
  }

  private notifyState(playing: boolean) {
    this.stateListeners.forEach((l) => l(playing));
  }

  private notifyTime(current: number, duration: number) {
    this.timeListeners.forEach((l) => l(current, duration));
  }

  private notifyEnded() {
    this.endListeners.forEach((l) => l());
  }
}

export const youtubeBridge = YouTubeBridge.getInstance();
