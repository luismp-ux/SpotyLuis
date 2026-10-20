import { EqualizerBand, EQPreset, Track } from '../types/music';
import { youtubeBridge } from './YouTubeBridge';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, EQPreset> = {
  Plano: {
    name: 'Plano',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassBoost: 0,
    virtualizer: 0,
  },
  Rock: {
    name: 'Rock',
    gains: [4.5, 3.5, 1.5, -0.8, -1.2, 1.0, 2.8, 3.5, 4.0, 4.2],
    bassBoost: 3,
    virtualizer: 2,
  },
  Pop: {
    name: 'Pop',
    gains: [-1.0, 1.5, 3.0, 3.8, 3.2, 1.0, -0.5, 1.5, 2.5, 3.0],
    bassBoost: 2,
    virtualizer: 1,
  },
  Jazz: {
    name: 'Jazz',
    gains: [3.0, 2.5, 1.2, 1.5, -0.8, -0.8, 1.0, 2.0, 3.2, 3.8],
    bassBoost: 1,
    virtualizer: 3,
  },
  Electrónica: {
    name: 'Electrónica',
    gains: [5.2, 4.5, 2.0, 0.0, -1.8, 1.5, 2.5, 4.0, 4.8, 5.0],
    bassBoost: 5,
    virtualizer: 4,
  },
  Clásica: {
    name: 'Clásica',
    gains: [4.0, 3.0, 2.2, 1.5, -0.8, -0.8, 0.0, 2.0, 3.5, 4.0],
    bassBoost: 1,
    virtualizer: 4,
  },
  'Refuerzo de Graves': {
    name: 'Refuerzo de Graves',
    gains: [6.5, 5.5, 4.0, 2.5, 1.0, 0, 0, 0, 0, 0],
    bassBoost: 6,
    virtualizer: 1,
  },
  Acústico: {
    name: 'Acústico',
    gains: [3.5, 3.0, 1.8, 1.2, 1.5, 1.8, 2.5, 3.2, 3.0, 2.5],
    bassBoost: 2,
    virtualizer: 3,
  },
  Vocal: {
    name: 'Vocal',
    gains: [-2.0, -1.5, -0.5, 2.5, 4.2, 4.0, 3.0, 1.5, 0.5, 0],
    bassBoost: 0,
    virtualizer: 2,
  },
};

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostFilter: BiquadFilterNode | null = null;
  private preampGain: GainNode | null = null;
  private stereoDelay: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isInitialized = false;

  // Active state
  public isPlaying = false;
  public currentTime = 0;
  public duration = 0;
  public volume = 0.85;
  public isMuted = false;
  public currentTrack: Track | null = null;
  public activeMode: 'html5' | 'youtube' = 'html5';

  // Audio parameters
  public bands: EqualizerBand[] = [];
  public currentPreset = 'Plano';
  public bassBoostAmount = 0; // 0 to 10
  public virtualizerAmount = 0; // 0 to 10
  public preampAmount = 0; // -6dB to +6dB

  // Listeners
  private timeListeners: ((time: number, duration: number) => void)[] = [];
  private stateListeners: ((isPlaying: boolean) => void)[] = [];
  private trackEndListeners: (() => void)[] = [];

  private constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    // Initialize default bands
    this.bands = EQ_FREQUENCIES.map((freq) => ({
      freq,
      label: freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`,
      gain: 0,
    }));

    this.setupAudioListeners();

    // Hook YouTube Bridge listeners for online streaming tracks
    youtubeBridge.onTimeUpdate((curr, dur) => {
      if (this.activeMode === 'youtube') {
        this.currentTime = curr;
        if (dur > 0) this.duration = dur;
        this.notifyTime();
      }
    });

    youtubeBridge.onStateChange((playing) => {
      if (this.activeMode === 'youtube') {
        this.isPlaying = playing;
        this.notifyState();
      }
    });

    youtubeBridge.onEnded(() => {
      if (this.activeMode === 'youtube') {
        this.isPlaying = false;
        this.notifyState();
        this.notifyTrackEnd();
      }
    });
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private initAudioNodes() {
    if (this.isInitialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Media Element Source
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Preamp gain
      this.preampGain = this.audioCtx.createGain();
      this.preampGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // Bass Boost filter (Low Shelf @ 80Hz)
      this.bassBoostFilter = this.audioCtx.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.setValueAtTime(80, this.audioCtx.currentTime);
      this.bassBoostFilter.gain.setValueAtTime(0, this.audioCtx.currentTime);

      // 10-band Graphic EQ
      this.eqFilters = EQ_FREQUENCIES.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.setValueAtTime(1.4, this.audioCtx!.currentTime);
        }
        filter.frequency.setValueAtTime(freq, this.audioCtx!.currentTime);
        filter.gain.setValueAtTime(0, this.audioCtx!.currentTime);
        return filter;
      });

      // Spatial Virtualizer (Subtle stereophonic Haas delay)
      this.stereoDelay = this.audioCtx.createDelay(0.05);
      this.stereoDelay.delayTime.setValueAtTime(0.015, this.audioCtx.currentTime);
      this.delayGain = this.audioCtx.createGain();
      this.delayGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

      // Analyser for Spectrum Visualizer
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect node chain:
      // Source -> Preamp -> BassBoost -> EQ Filters (0..9) -> Analyser -> Destination
      let lastNode: AudioNode = this.sourceNode;

      lastNode.connect(this.preampGain);
      lastNode = this.preampGain;

      lastNode.connect(this.bassBoostFilter);
      lastNode = this.bassBoostFilter;

      for (const filter of this.eqFilters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      // Connect to analyser and master destination
      lastNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      // Connect virtualizer parallel path
      lastNode.connect(this.stereoDelay);
      this.stereoDelay.connect(this.delayGain);
      this.delayGain.connect(this.audioCtx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  private setupAudioListeners() {
    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || 0;
      this.notifyTime();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyState();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyState();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notifyState();
      this.notifyTrackEnd();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration || 0;
      this.notifyTime();
    });
  }

  public async playTrack(track: Track): Promise<void> {
    this.currentTrack = track;

    // 1. Check if offline audio blob exists in IndexedDB for zero-internet playback
    let offlineBlob: Blob | null = null;
    try {
      const { getOfflineAudio } = await import('../utils/offlineAudioStore');
      offlineBlob = await getOfflineAudio(track.id);
    } catch (e) {
      console.warn('Could not load offline audio blob:', e);
    }

    // 2. Identify if this track can stream via YouTube Bridge
    let ytVid = track.ytVideoId;
    if (!ytVid && track.audioUrl) {
      const match = track.audioUrl.match(/(?:download-audio\/|watch\?v=|youtu\.be\/)([\w-]{11})/);
      if (match) ytVid = match[1];
    }
    if (!ytVid && track.id.startsWith('yt-')) {
      const match = track.id.match(/^yt-([\w-]{11})/);
      if (match) ytVid = match[1];
    }

    // If no offline blob and it's a YouTube track: stream directly via official YouTube player
    if (!offlineBlob && (ytVid || track.format === 'YOUTUBE')) {
      this.activeMode = 'youtube';
      try {
        this.audio.pause();
        this.audio.src = '';
      } catch {
        // ignore
      }

      if (ytVid) {
        youtubeBridge.setVolume(this.isMuted ? 0 : this.volume);
        youtubeBridge.play(ytVid);
        this.isPlaying = true;
        this.duration = track.duration || 210;
        this.notifyState();
      }
      this.updateMediaSession(track);
      return;
    }

    // 3. Otherwise play via Web Audio + HTML5 Audio (offline blob or local audio)
    this.activeMode = 'html5';
    youtubeBridge.stop();

    this.initAudioNodes();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    let activeSrc = track.audioUrl;
    if (offlineBlob) {
      activeSrc = URL.createObjectURL(offlineBlob);
    }

    if (activeSrc && this.audio.src !== activeSrc) {
      this.audio.src = activeSrc;
      this.audio.load();
    }

    try {
      if (activeSrc) {
        await this.audio.play();
        this.isPlaying = true;
        this.notifyState();
      }
      this.updateMediaSession(track);
    } catch (err) {
      console.error('HTML5 audio playback error:', err);
      // Fallback to YouTube Bridge if streamable
      if (ytVid) {
        console.log('Falling back to YouTube streaming bridge for:', track.title);
        this.activeMode = 'youtube';
        youtubeBridge.setVolume(this.isMuted ? 0 : this.volume);
        youtubeBridge.play(ytVid);
        this.isPlaying = true;
        this.notifyState();
      } else {
        this.isPlaying = false;
        this.notifyState();
      }
    }
  }

  private updateMediaSession(track: Track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'SpotyLuis',
        artwork: [
          {
            src: track.coverUrl || '/icon.svg',
            sizes: '512x512',
            type: track.coverUrl?.endsWith('.png') ? 'image/png' : 'image/svg+xml',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.audio.dispatchEvent(new CustomEvent('mediaSessionPrev'));
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.audio.dispatchEvent(new CustomEvent('mediaSessionNext'));
      });
    }
  }

  public pause(): void {
    if (this.activeMode === 'youtube') {
      youtubeBridge.pause();
    } else {
      this.audio.pause();
    }
    this.isPlaying = false;
    this.notifyState();
  }

  public async resume(): Promise<void> {
    if (this.activeMode === 'youtube') {
      youtubeBridge.resume();
      this.isPlaying = true;
      this.notifyState();
      return;
    }

    this.initAudioNodes();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    if (this.audio.src) {
      await this.audio.play();
      this.isPlaying = true;
      this.notifyState();
    }
  }

  public seek(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    if (this.activeMode === 'youtube') {
      youtubeBridge.seek(seconds);
      this.currentTime = seconds;
      this.notifyTime();
      return;
    }
    if (this.audio.duration) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
      this.currentTime = this.audio.currentTime;
      this.notifyTime();
    }
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    const effective = this.isMuted ? 0 : this.volume;
    this.audio.volume = effective;
    youtubeBridge.setVolume(effective);
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    const effective = this.isMuted ? 0 : this.volume;
    this.audio.volume = effective;
    youtubeBridge.setVolume(effective);
  }

  // Equalizer Controls
  public setBandGain(index: number, gainDb: number): void {
    if (index >= 0 && index < this.bands.length) {
      this.bands[index].gain = gainDb;
      if (this.eqFilters[index] && this.audioCtx) {
        this.eqFilters[index].gain.setTargetAtTime(gainDb, this.audioCtx.currentTime, 0.05);
      }
      this.currentPreset = 'Personalizado';
    }
  }

  public applyPreset(presetName: string): void {
    const preset = EQ_PRESETS[presetName];
    if (!preset) return;

    this.currentPreset = presetName;
    preset.gains.forEach((gain, i) => {
      if (this.bands[i]) {
        this.bands[i].gain = gain;
        if (this.eqFilters[i] && this.audioCtx) {
          this.eqFilters[i].gain.setTargetAtTime(gain, this.audioCtx.currentTime, 0.05);
        }
      }
    });

    this.setBassBoost(preset.bassBoost);
    this.setVirtualizer(preset.virtualizer);
  }

  public setBassBoost(amount: number): void {
    this.bassBoostAmount = Math.max(0, Math.min(10, amount));
    const gainDb = (this.bassBoostAmount / 10) * 9; // up to +9dB at 80Hz
    if (this.bassBoostFilter && this.audioCtx) {
      this.bassBoostFilter.gain.setTargetAtTime(gainDb, this.audioCtx.currentTime, 0.05);
    }
  }

  public setVirtualizer(amount: number): void {
    this.virtualizerAmount = Math.max(0, Math.min(10, amount));
    const delayGainValue = (this.virtualizerAmount / 10) * 0.45;
    if (this.delayGain && this.audioCtx) {
      this.delayGain.gain.setTargetAtTime(delayGainValue, this.audioCtx.currentTime, 0.05);
    }
  }

  public setPreamp(gainDb: number): void {
    this.preampAmount = Math.max(-6, Math.min(6, gainDb));
    // convert dB to linear multiplier: 10^(dB/20)
    const linearGain = Math.pow(10, this.preampAmount / 20);
    if (this.preampGain && this.audioCtx) {
      this.preampGain.gain.setTargetAtTime(linearGain, this.audioCtx.currentTime, 0.05);
    }
  }

  // Visualizer Analyser data access
  public getVisualizerData(frequencyArray: Uint8Array): void {
    if (this.activeMode === 'youtube' && this.isPlaying) {
      // Dynamic rhythmic visualizer responding to playback
      const now = performance.now() / 150;
      for (let i = 0; i < frequencyArray.length; i++) {
        const freqRatio = i / frequencyArray.length;
        const wave1 = Math.sin(now * 1.6 + i * 0.25);
        const wave2 = Math.cos(now * 2.4 - i * 0.35);
        const beat = (Math.sin(now * 0.9) > 0.2 ? 1.35 : 0.85);
        const base = Math.max(0, 175 - freqRatio * 110);
        const val = Math.min(255, Math.max(12, (base + wave1 * 38 + wave2 * 28) * beat));
        frequencyArray[i] = Math.round(val);
      }
      return;
    }

    if (this.analyser) {
      this.analyser.getByteFrequencyData(frequencyArray as any);
    } else {
      frequencyArray.fill(0);
    }
  }

  public getTimeDomainData(timeArray: Uint8Array): void {
    if (this.activeMode === 'youtube' && this.isPlaying) {
      const now = performance.now() / 100;
      for (let i = 0; i < timeArray.length; i++) {
        const wave = Math.sin(now + i * 0.15) * 45;
        timeArray[i] = Math.round(128 + wave);
      }
      return;
    }

    if (this.analyser) {
      this.analyser.getByteTimeDomainData(timeArray as any);
    } else {
      timeArray.fill(128);
    }
  }

  // Event Subscription
  public onTimeUpdate(cb: (time: number, duration: number) => void): () => void {
    this.timeListeners.push(cb);
    return () => {
      this.timeListeners = this.timeListeners.filter((l) => l !== cb);
    };
  }

  public onStateChange(cb: (isPlaying: boolean) => void): () => void {
    this.stateListeners.push(cb);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== cb);
    };
  }

  public onTrackEnd(cb: () => void): () => void {
    this.trackEndListeners.push(cb);
    return () => {
      this.trackEndListeners = this.trackEndListeners.filter((l) => l !== cb);
    };
  }

  private silentCarrier: HTMLAudioElement | null = null;

  private startSilentCarrier() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.silentCarrier) {
        this.silentCarrier = new Audio();
        // 1-second silent WAV base64 loop to maintain active audio session on lock screen
        this.silentCarrier.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        this.silentCarrier.loop = true;
        this.silentCarrier.volume = 0.01;
      }
      this.silentCarrier.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  private stopSilentCarrier() {
    try {
      if (this.silentCarrier) {
        this.silentCarrier.pause();
      }
    } catch {
      // ignore
    }
  }

  private notifyTime() {
    this.timeListeners.forEach((l) => l(this.currentTime, this.duration));
  }

  private notifyState() {
    // 1. Maintain background audio session when phone screen locks or app is minimized
    if (this.isPlaying) {
      this.startSilentCarrier();
    } else {
      this.stopSilentCarrier();
    }

    // 2. Signal Android Native WakeLock for lock screen CPU retention
    try {
      if (typeof window !== 'undefined' && (window as any).SpotyLuisNative?.setPlayingState) {
        (window as any).SpotyLuisNative.setPlayingState(this.isPlaying);
      }
    } catch (e) {
      // ignore
    }

    // 3. Update Web MediaSession playbackState
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }

    this.stateListeners.forEach((l) => l(this.isPlaying));
  }

  private notifyTrackEnd() {
    this.trackEndListeners.forEach((l) => l());
  }
}

export const audioEngine = AudioEngine.getInstance();
