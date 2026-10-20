import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { Track } from '../types/music';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Zap
} from 'lucide-react';

interface SpectrumRunnerGameProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onClose?: () => void;
  onSwitchToVisualizer?: () => void;
}

interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: 'spike' | 'tower' | 'bird';
  yOffset?: number; // for flying birds/notes
  passed: boolean;
}

interface NoteCollectible {
  x: number;
  y: number;
  size: number;
  collected: boolean;
  pulse: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const SpectrumRunnerGame: React.FC<SpectrumRunnerGameProps> = ({
  currentTrack,
  isPlaying,
  onClose,
  onSwitchToVisualizer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // High score from storage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('spotyluis_dino_highscore');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Game state refs (mutated during RAF loop for 60fps physics)
  const gameStateRef = useRef({
    score: 0,
    speed: 6.5,
    gravity: 0.72,
    jumpVelocity: -13.5,
    // Dino state
    dinoY: 0,
    dinoVy: 0,
    isJumping: false,
    isDucking: false,
    dinoWidth: 44,
    dinoHeight: 46,
    legFrame: 0,
    legTimer: 0,
    // Obstacles & Items
    obstacles: [] as Obstacle[],
    notes: [] as NoteCollectible[],
    particles: [] as Particle[],
    lastObstacleDist: 0,
    // Beat analysis
    bassEnergy: 0,
    beatMultiplier: 1,
    multiplierTimer: 0,
  });

  // Synthesize retro 8-bit sound effects via Web Audio
  const playRetroSound = useCallback((type: 'jump' | 'collect' | 'crash' | 'beat') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        osc.frequency.setValueAtTime(1174, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.28);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === 'beat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  // Jump action
  const handleJump = useCallback(() => {
    const s = gameStateRef.current;
    if (gameOver) {
      restartGame();
      return;
    }
    if (!gameStarted) {
      setGameStarted(true);
    }
    if (!s.isJumping) {
      s.dinoVy = s.jumpVelocity;
      s.isJumping = true;
      playRetroSound('jump');

      // Spawn small jump dust particles
      const canvas = canvasRef.current;
      if (canvas) {
        const groundY = canvas.height * 0.72;
        for (let i = 0; i < 6; i++) {
          s.particles.push({
            x: 90 + Math.random() * 20,
            y: groundY,
            vx: -Math.random() * 3 - 1,
            vy: -Math.random() * 2,
            life: 1,
            maxLife: 15 + Math.random() * 10,
            color: '#10b981',
            size: 3 + Math.random() * 2,
          });
        }
      }
    }
  }, [gameOver, gameStarted, playRetroSound]);

  // Duck action
  const handleDuck = useCallback((ducking: boolean) => {
    gameStateRef.current.isDucking = ducking;
  }, []);

  // Restart game
  const restartGame = useCallback(() => {
    const s = gameStateRef.current;
    s.score = 0;
    s.speed = 6.5;
    s.dinoY = 0;
    s.dinoVy = 0;
    s.isJumping = false;
    s.isDucking = false;
    s.obstacles = [];
    s.notes = [];
    s.particles = [];
    s.lastObstacleDist = 0;
    s.beatMultiplier = 1;
    setScore(0);
    setGameOver(false);
    setIsNewRecord(false);
    setMultiplier(1);
    setGameStarted(true);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleJump();
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleDuck(true);
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        handleDuck(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleJump, handleDuck, onClose]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const freqData = new Uint8Array(64);
    let lastFrameTime = performance.now();

    const drawDino = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      isDucking: boolean,
      isJumping: boolean,
      legFrame: number,
      isDead: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);

      const mainColor = isDead ? '#ef4444' : '#10b981';
      const eyeColor = isDead ? '#ffffff' : '#09090b';
      const spineColor = '#34d399';

      if (isDucking && !isJumping) {
        // Ducking Dino: Low profile
        // Body
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.roundRect(-24, -22, 52, 22, 6);
        ctx.fill();

        // Head extended forward
        ctx.beginPath();
        ctx.roundRect(18, -20, 24, 18, 5);
        ctx.fill();

        // Eye
        ctx.fillStyle = eyeColor;
        ctx.fillRect(32, -16, 4, 4);

        // Spines
        ctx.fillStyle = spineColor;
        ctx.fillRect(-20, -25, 4, 4);
        ctx.fillRect(-12, -25, 4, 4);

        // Legs running fast
        ctx.fillStyle = mainColor;
        if (legFrame === 0) {
          ctx.fillRect(-10, 0, 4, 8);
          ctx.fillRect(12, 0, 4, 4);
        } else {
          ctx.fillRect(-10, 0, 4, 4);
          ctx.fillRect(12, 0, 4, 8);
        }
      } else {
        // Normal / Jumping Dino
        // Body
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.roundRect(-18, -44, 34, 38, 8);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-18, -26);
        ctx.lineTo(-28, -20);
        ctx.lineTo(-18, -14);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.roundRect(4, -54, 28, 26, 6);
        ctx.fill();

        // Eye
        ctx.fillStyle = eyeColor;
        if (isDead) {
          // X eye
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(18, -48);
          ctx.lineTo(24, -42);
          ctx.moveTo(24, -48);
          ctx.lineTo(18, -42);
          ctx.stroke();
        } else {
          ctx.fillRect(20, -48, 5, 5);
        }

        // Snout & teeth
        ctx.fillStyle = mainColor;
        ctx.fillRect(24, -36, 10, 8);

        // Arms
        ctx.fillRect(12, -26, 8, 4);
        ctx.fillRect(16, -22, 4, 6);

        // Spines along the back (musical equalizer spikes)
        ctx.fillStyle = spineColor;
        ctx.fillRect(-12, -48, 4, 5);
        ctx.fillRect(-16, -40, 4, 5);
        ctx.fillRect(-18, -32, 4, 5);

        // Legs
        ctx.fillStyle = mainColor;
        if (isJumping) {
          // Legs tucked up in jump
          ctx.fillRect(-10, -6, 5, 8);
          ctx.fillRect(4, -6, 5, 8);
        } else {
          // Running legs animation
          if (legFrame === 0) {
            ctx.fillRect(-10, -6, 5, 14);
            ctx.fillRect(4, -6, 5, 7);
          } else {
            ctx.fillRect(-10, -6, 5, 7);
            ctx.fillRect(4, -6, 5, 14);
          }
        }
      }

      ctx.restore();
    };

    const render = (time: number) => {
      const dt = Math.min(32, time - lastFrameTime);
      lastFrameTime = time;

      const width = canvas.width;
      const height = canvas.height;
      const groundY = height * 0.72;

      // 1. Fetch real-time audio FFT data
      audioEngine.getVisualizerData(freqData);

      // Analyze bass energy (bands 1-6)
      let bassSum = 0;
      for (let i = 1; i < 7; i++) {
        bassSum += freqData[i];
      }
      const avgBass = bassSum / 6;
      const isBeatDrop = avgBass > 180;

      const s = gameStateRef.current;
      s.bassEnergy = avgBass;

      // 2. Clear & Draw Dynamic Background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient beat flash
      if (isBeatDrop && isPlaying) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw starry / frequency grid backdrop
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridStep = 48;
      for (let gx = 0; gx < width; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, groundY);
        ctx.stroke();
      }

      // 3. Draw Audio Spectrum Ground
      // Draw undulating waveform & equalizer towers that form the living ground
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, groundY, width, height - groundY);

      // Spectrum Wave surface
      ctx.lineWidth = 3;
      ctx.strokeStyle = isBeatDrop ? '#34d399' : '#10b981';
      ctx.beginPath();
      ctx.moveTo(0, groundY);

      const numBars = 48;
      const barW = width / numBars;
      for (let i = 0; i <= numBars; i++) {
        const val = freqData[i % freqData.length] || 0;
        const waveH = (val / 255) * (isPlaying ? 28 : 6);
        const bx = i * barW;
        const by = groundY - (Math.sin((bx + time * 0.2) * 0.02) * 4) - waveH;
        ctx.lineTo(bx, by);
      }
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Equalizer bars along the ground
      for (let i = 0; i < numBars; i += 2) {
        const val = freqData[i % freqData.length] || 0;
        const barH = (val / 255) * (isPlaying ? 36 : 8);
        const bx = i * barW;

        const grad = ctx.createLinearGradient(0, groundY - barH, 0, groundY);
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0.1)');

        ctx.fillStyle = grad;
        ctx.fillRect(bx + 4, groundY - barH, barW - 6, barH);
      }

      // 4. Update Game Logic (if started & not game over)
      if (gameStarted && !gameOver) {
        // Increase score
        s.score += Math.round(1 * s.beatMultiplier);
        setScore(s.score);

        if (s.score > highScore) {
          setHighScore(s.score);
          setIsNewRecord(true);
          try {
            localStorage.setItem('spotyluis_dino_highscore', String(s.score));
          } catch {}
        }

        // Increase speed gradually up to max
        if (s.speed < 13.5) {
          s.speed += 0.0015;
        }

        // Dino Physics
        s.dinoY += s.dinoVy;
        s.dinoVy += s.gravity;

        if (s.dinoY >= 0) {
          s.dinoY = 0;
          s.dinoVy = 0;
          s.isJumping = false;
        }

        // Running legs timer
        s.legTimer += dt;
        if (s.legTimer > 85) {
          s.legFrame = s.legFrame === 0 ? 1 : 0;
          s.legTimer = 0;
        }

        // Spawn obstacles
        s.lastObstacleDist += s.speed;
        const minGap = 260 + Math.random() * 220;
        if (s.lastObstacleDist > minGap) {
          s.lastObstacleDist = 0;
          const typeRand = Math.random();
          let obsType: 'spike' | 'tower' | 'bird' = 'spike';
          let obsW = 28;
          let obsH = 40;
          let yOff = 0;

          if (typeRand < 0.45) {
            // Spectrum Audio Spike (sharp)
            obsType = 'spike';
            obsW = 26 + Math.random() * 12;
            obsH = 36 + Math.random() * 24;
          } else if (typeRand < 0.75) {
            // Equalizer Tower
            obsType = 'tower';
            obsW = 32 + Math.random() * 10;
            obsH = 44 + Math.random() * 28;
          } else {
            // Flying musical drone / bird (must duck or jump over)
            obsType = 'bird';
            obsW = 34;
            obsH = 22;
            yOff = Math.random() > 0.5 ? 42 : 18; // high or low flying
          }

          s.obstacles.push({
            x: width + 20,
            width: obsW,
            height: obsH,
            type: obsType,
            yOffset: yOff,
            passed: false,
          });

          // Chance to spawn a floating music note collectible
          if (Math.random() < 0.45) {
            s.notes.push({
              x: width + 140,
              y: groundY - 60 - Math.random() * 50,
              size: 14,
              collected: false,
              pulse: 0,
            });
          }
        }

        // Beat multiplier timer
        if (isBeatDrop && s.beatMultiplier === 1) {
          s.beatMultiplier = 2;
          s.multiplierTimer = 180; // ~3 seconds of x2
          playRetroSound('beat');
          setMultiplier(2);
        }
        if (s.multiplierTimer > 0) {
          s.multiplierTimer--;
          if (s.multiplierTimer <= 0) {
            s.beatMultiplier = 1;
            setMultiplier(1);
          }
        }
      }

      // 5. Draw & Update Obstacles
      const dinoBox = {
        x: 80,
        y: groundY + s.dinoY - (s.isDucking ? 22 : 46),
        w: s.isDucking ? 48 : 34,
        h: s.isDucking ? 22 : 46,
      };

      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const obs = s.obstacles[i];
        if (gameStarted && !gameOver) {
          obs.x -= s.speed;
        }

        let obsY = groundY - obs.height;
        if (obs.type === 'bird' && obs.yOffset) {
          obsY = groundY - obs.yOffset - obs.height;
        }

        // Draw obstacle
        ctx.save();
        if (obs.type === 'spike') {
          // Sharp audio spike
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(obs.x, groundY);
          ctx.lineTo(obs.x + obs.width / 2, obsY);
          ctx.lineTo(obs.x + obs.width, groundY);
          ctx.closePath();
          ctx.fill();

          // Neon highlight
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (obs.type === 'tower') {
          // Digital synth column with glowing EQ notches
          const grad = ctx.createLinearGradient(0, obsY, 0, groundY);
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(1, '#d97706');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(obs.x, obsY, obs.width, obs.height, 4);
          ctx.fill();

          // Digital horizontal notches
          ctx.fillStyle = '#09090b';
          for (let ny = obsY + 6; ny < groundY - 4; ny += 8) {
            ctx.fillRect(obs.x + 3, ny, obs.width - 6, 2);
          }
        } else if (obs.type === 'bird') {
          // Flying rhythm drone / bat
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.roundRect(obs.x, obsY, obs.width, obs.height, 6);
          ctx.fill();

          // Flapping wings
          const wingOffset = Math.sin(time * 0.02) * 6;
          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(obs.x + 4, obsY - 4 + wingOffset, obs.width - 8, 4);
          ctx.fillStyle = '#09090b';
          ctx.fillRect(obs.x + 4, obsY + 6, 4, 4); // eye
        }
        ctx.restore();

        // Collision Check (AABB with small padding)
        const pad = 6;
        const obsBox = {
          x: obs.x + pad,
          y: obsY + pad,
          w: obs.width - pad * 2,
          h: obs.height - pad * 2,
        };

        if (
          gameStarted &&
          !gameOver &&
          dinoBox.x < obsBox.x + obsBox.w &&
          dinoBox.x + dinoBox.w > obsBox.x &&
          dinoBox.y < obsBox.y + obsBox.h &&
          dinoBox.y + dinoBox.h > obsBox.y
        ) {
          // CRASH!
          setGameOver(true);
          playRetroSound('crash');

          // Spawn explosion particles
          for (let p = 0; p < 24; p++) {
            s.particles.push({
              x: dinoBox.x + dinoBox.w / 2,
              y: dinoBox.y + dinoBox.h / 2,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12 - 3,
              life: 1,
              maxLife: 25 + Math.random() * 20,
              color: p % 2 === 0 ? '#ef4444' : '#10b981',
              size: 4 + Math.random() * 4,
            });
          }
        }

        // Clean up passed obstacles
        if (obs.x < -obs.width - 50) {
          s.obstacles.splice(i, 1);
        }
      }

      // 6. Draw & Update Notes Collectibles
      for (let i = s.notes.length - 1; i >= 0; i--) {
        const note = s.notes[i];
        if (gameStarted && !gameOver) {
          note.x -= s.speed;
        }

        // Floating bounce
        const noteY = note.y + Math.sin(time * 0.005 + note.x * 0.05) * 6;

        ctx.save();
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('🎵', note.x, noteY);
        ctx.restore();

        // Collect check
        if (
          gameStarted &&
          !gameOver &&
          Math.abs(dinoBox.x + dinoBox.w / 2 - note.x) < 28 &&
          Math.abs(dinoBox.y + dinoBox.h / 2 - noteY) < 28
        ) {
          s.score += 50 * s.beatMultiplier;
          setScore(s.score);
          playRetroSound('collect');
          s.notes.splice(i, 1);

          // Golden burst particles
          for (let p = 0; p < 12; p++) {
            s.particles.push({
              x: note.x,
              y: noteY,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 1,
              maxLife: 20,
              color: '#fbbf24',
              size: 3 + Math.random() * 3,
            });
          }
        } else if (note.x < -50) {
          s.notes.splice(i, 1);
        }
      }

      // 7. Draw & Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // slight gravity
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;

        if (p.life >= p.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // 8. Draw Dino
      const dinoScreenX = 80;
      const dinoScreenY = groundY + s.dinoY;
      drawDino(
        ctx,
        dinoScreenX,
        dinoScreenY,
        s.isDucking,
        s.isJumping,
        s.legFrame,
        gameOver
      );

      // Loop
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, highScore, isPlaying, playRetroSound]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col select-none overflow-hidden touch-none"
      onClick={handleJump}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* Top Header / HUD Bar */}
      <div 
        className="relative z-10 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
            🦕
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Dino Ritmo · Minijuego Acústico
              </h2>
              {multiplier > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  RITMO x{multiplier}!
                </span>
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-400 font-mono">
              Salta al ritmo del espectro de audio · Toca o pulsa ESPACIO
            </div>
          </div>
        </div>

        {/* Score & Controls */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-3.5 py-1.5 rounded-xl">
            <div className="text-right font-mono">
              <div className="text-[10px] uppercase text-zinc-400 tracking-wider">Puntuación</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 leading-tight">
                {score.toString().padStart(5, '0')}
              </div>
            </div>
            <div className="w-[1px] h-6 bg-zinc-800" />
            <div className="text-right font-mono">
              <div className="text-[10px] uppercase text-zinc-400 tracking-wider flex items-center gap-1 justify-end">
                <Trophy className="w-2.5 h-2.5 text-amber-400" />
                Récord
              </div>
              <div className="text-base sm:text-lg font-bold text-zinc-200 leading-tight">
                {highScore.toString().padStart(5, '0')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              title={soundEnabled ? 'Silenciar efectos retro' : 'Activar efectos retro'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {onSwitchToVisualizer && (
              <button
                onClick={onSwitchToVisualizer}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors hidden sm:block"
              >
                Espectrograma
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                title="Salir del minijuego"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Instructions Hint when not started */}
      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900/90 backdrop-blur-md border border-emerald-500/30 px-6 py-4 rounded-2xl text-center max-w-sm mx-4 shadow-2xl animate-bounce">
            <div className="text-3xl mb-2">🦖</div>
            <h3 className="text-base font-bold text-white mb-1">
              ¡Salta con el Ritmo Musical!
            </h3>
            <p className="text-xs text-zinc-300 mb-3">
              El suelo responde en vivo al espectro y los bajos de la canción. Salta sobre los picos y recolecta las notas musicales 🎵.
            </p>
            <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs">
              Toca la pantalla o pulsa ESPACIO para empezar
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen Overlay */}
      {gameOver && (
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl text-center max-w-sm mx-4 shadow-2xl animate-scaleUp">
            <div className="text-4xl mb-3">💥</div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
              ¡Fin de la Partida!
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Chocaste con un pico de audio
            </p>

            {isNewRecord && (
              <div className="mb-4 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2 text-amber-400 text-xs font-bold animate-pulse">
                <Sparkles className="w-4 h-4" />
                ¡NUEVO RÉCORD DE RITMO CONSEGUIDO!
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80 font-mono">
              <div>
                <div className="text-[10px] uppercase text-zinc-400">Puntuación</div>
                <div className="text-xl font-bold text-emerald-400">{score}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-zinc-400">Tu Récord</div>
                <div className="text-xl font-bold text-zinc-200">{highScore}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={restartGame}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Volver a Jugar (Espacio / Tocar)
              </button>

              {onSwitchToVisualizer && (
                <button
                  onClick={onSwitchToVisualizer}
                  className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Ver Espectrograma Normal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Track Meta & Quick Controls */}
      {currentTrack && (
        <div 
          className="relative z-10 mt-auto mb-4 sm:mb-6 mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl max-w-sm sm:max-w-md w-[92%] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: currentTrack.coverGradient }}
              >
                ♪
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{currentTrack.title}</div>
            <div className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                if (isPlaying) {
                  audioEngine.pause();
                } else {
                  audioEngine.resume();
                }
              }}
              className="p-2 text-zinc-300 hover:text-white rounded-lg transition-colors"
              title={isPlaying ? 'Pausar música' : 'Reanudar música'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
