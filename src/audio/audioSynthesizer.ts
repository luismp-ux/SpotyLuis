import { Track } from '../types/music';
import { parseLRC } from '../utils/lrcParser';

// Procedural high quality lossless WAV generator using Web Audio OfflineAudioContext
async function createAudioTrackBlob(
  style: 'synthwave' | 'piano' | 'jazz' | 'ambient',
  durationSec: number = 28
): Promise<string> {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);

  // Master bus
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);
  // Fade in & out
  masterGain.gain.setValueAtTime(0.01, 0);
  masterGain.gain.exponentialRampToValueAtTime(0.85, 1.0);
  masterGain.gain.setValueAtTime(0.85, durationSec - 1.5);
  masterGain.gain.exponentialRampToValueAtTime(0.001, durationSec);
  masterGain.connect(offlineCtx.destination);

  if (style === 'synthwave') {
    // Synthwave bass & chords
    const bpm = 110;
    const beatSec = 60 / bpm;
    const bassNotes = [110, 110, 98, 98, 87.3, 87.3, 98, 123.47]; // A, G, F, B
    
    // Bass sequence
    for (let i = 0; i < Math.floor(durationSec / (beatSec * 0.5)); i++) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      osc.type = 'sawtooth';
      const note = bassNotes[Math.floor(i / 4) % bassNotes.length];
      osc.frequency.setValueAtTime(note / 2, i * (beatSec * 0.5));

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, i * (beatSec * 0.5));
      filter.Q.setValueAtTime(3, i * (beatSec * 0.5));

      gain.gain.setValueAtTime(0.4, i * (beatSec * 0.5));
      gain.gain.exponentialRampToValueAtTime(0.001, (i + 1) * (beatSec * 0.5) - 0.02);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(i * (beatSec * 0.5));
      osc.stop((i + 1) * (beatSec * 0.5));
    }

    // Melodic Arp
    const arpNotes = [220, 261.63, 329.63, 440, 523.25, 440, 329.63, 261.63];
    for (let i = 0; i < Math.floor(durationSec / (beatSec * 0.25)); i++) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(arpNotes[i % arpNotes.length], i * (beatSec * 0.25));

      gain.gain.setValueAtTime(0.25, i * (beatSec * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.001, (i + 1) * (beatSec * 0.25) - 0.01);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(i * (beatSec * 0.25));
      osc.stop((i + 1) * (beatSec * 0.25));
    }

    // Drum kick every beat
    for (let i = 0; i < Math.floor(durationSec / beatSec); i++) {
      const kickOsc = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kickOsc.frequency.setValueAtTime(120, i * beatSec);
      kickOsc.frequency.exponentialRampToValueAtTime(35, i * beatSec + 0.15);
      kickGain.gain.setValueAtTime(0.6, i * beatSec);
      kickGain.gain.exponentialRampToValueAtTime(0.001, i * beatSec + 0.2);

      kickOsc.connect(kickGain);
      kickGain.connect(masterGain);
      kickOsc.start(i * beatSec);
      kickOsc.stop(i * beatSec + 0.25);
    }
  } else if (style === 'piano') {
    // Acoustic Piano Arpeggio & Harmonies
    const chords = [
      [261.63, 329.63, 392.00, 523.25], // C major
      [220.00, 261.63, 329.63, 440.00], // A minor
      [174.61, 220.00, 261.63, 349.23], // F major
      [196.00, 246.94, 293.66, 392.00]  // G major
    ];
    const chordDuration = 4.0;
    const numChords = Math.floor(durationSec / chordDuration);

    for (let c = 0; c < numChords; c++) {
      const chord = chords[c % chords.length];
      const startTime = c * chordDuration;

      chord.forEach((freq, idx) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.3);

        const noteStart = startTime + idx * 0.3;
        gain.gain.setValueAtTime(0.3, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 3.0);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(noteStart);
        osc.stop(noteStart + 3.1);
      });
    }
  } else if (style === 'jazz') {
    // Jazz Walking Bass & Rhodes Chords
    const bpm = 120;
    const beatSec = 60 / bpm;
    const walkingBass = [65.41, 73.42, 82.41, 87.31, 98.00, 87.31, 82.41, 73.42];

    for (let i = 0; i < Math.floor(durationSec / beatSec); i++) {
      const bass = offlineCtx.createOscillator();
      const bassGain = offlineCtx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(walkingBass[i % walkingBass.length], i * beatSec);

      bassGain.gain.setValueAtTime(0.5, i * beatSec);
      bassGain.gain.exponentialRampToValueAtTime(0.01, (i + 1) * beatSec - 0.05);

      bass.connect(bassGain);
      bassGain.connect(masterGain);
      bass.start(i * beatSec);
      bass.stop((i + 1) * beatSec);
    }

    // Warm chords
    const jazzChords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
      [164.81, 207.65, 246.94, 293.66]  // Em7
    ];
    for (let i = 0; i < Math.floor(durationSec / (beatSec * 4)); i++) {
      const chord = jazzChords[i % jazzChords.length];
      const start = i * beatSec * 4 + beatSec * 0.5;
      chord.forEach((freq) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + beatSec * 3);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + beatSec * 3.1);
      });
    }
  } else {
    // Ambient / Lo-Fi
    const droneFreqs = [110, 164.81, 220, 329.63];
    droneFreqs.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, 0);

      // Subtle LFO modulation
      const lfo = offlineCtx.createOscillator();
      const lfoGain = offlineCtx.createGain();
      lfo.frequency.setValueAtTime(0.15 + idx * 0.05, 0);
      lfoGain.gain.setValueAtTime(1.5, 0);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(0);

      gain.gain.setValueAtTime(0.15, 0);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(0);
      osc.stop(durationSec);
    });
  }

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWavBlobUrl(renderedBuffer);
}

// Convert AudioBuffer to WAV Blob URL
function audioBufferToWavBlobUrl(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numFrames = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channel samples
  let offset = 44;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = Math.max(-1, Math.min(1, channelData[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function createAudioTrackRawBlob(
  style: 'synthwave' | 'piano' | 'jazz' | 'ambient' = 'synthwave',
  durationSec: number = 28
): Promise<Blob> {
  const url = await createAudioTrackBlob(style, durationSec);
  const res = await fetch(url);
  return res.blob();
}

// Built-in Demo Library with high-fidelity Lossless FLAC & ALAC simulation & Synced Lyrics
export async function getBundledDemoTracks(): Promise<Track[]> {
  const [synthAudio, pianoAudio, jazzAudio, ambientAudio] = await Promise.all([
    createAudioTrackBlob('synthwave', 28),
    createAudioTrackBlob('piano', 26),
    createAudioTrackBlob('jazz', 27),
    createAudioTrackBlob('ambient', 29)
  ]);

  const lrcSynthwave = `[00:00.00] ♫ (Sintetizadores análogos 96kHz resonando en la noche)
[00:03.20] Luces de neón cruzando el horizonte de la ciudad
[00:07.10] Frecuencias puras corriendo por el ecualizador
[00:11.30] El bajo profundo despierta cada detalle sonoro
[00:15.50] Siente la claridad de audio sin compresión
[00:19.40] Hi-Res Lossless viajando a través de tus sentidos
[00:23.20] La noche apenas comienza con Aura Hi-Fi
[00:26.50] ♫ (Solo de sintetizador espacial finalizando)`;

  const lrcPiano = `[00:00.00] ♫ (Armónicos de piano acústico de alta definición)
[00:04.00] El eco del silencio acaricia las teclas de madera
[00:08.50] Cada nota suspendida con calidez natural
[00:13.20] Notas que vibran en 24 bits de pura fidelidad
[00:18.00] Un instante de calma en medio de la tormenta
[00:22.50] Melodía que fluye y se desvanece en paz`;

  const lrcJazz = `[00:00.00] ♫ (Contrabajo acústico y piano Rhodes vintage)
[00:03.50] Lluvia fina golpeando el cristal del club de jazz
[00:07.80] El contrabajo marcando el ritmo del corazón
[00:12.10] Un acorde menor que susurra historias del ayer
[00:16.80] Matices dorados que solo el formato Lossless puede captar
[00:21.40] Déjate llevar por el calor de la noche bohemia`;

  const lrcAmbient = `[00:00.00] ♫ (Texturas espaciales etéreas y sub-graves envolventes)
[00:05.00] Gravedad cero en los confines de la galaxia
[00:10.50] Ondas sonoras expandiéndose por el vacío estelar
[00:16.20] Cada frecuencia calibrada en perfecto equilibrio
[00:22.00] Respiración cuántica, armonía infinita`;

  return [
    {
      id: 'demo-1',
      title: 'Midnight Horizon',
      artist: 'Kavinsky Wave',
      album: 'Neon Cyberpunk 1984',
      year: 2026,
      genre: 'Synthwave',
      duration: 28,
      format: 'FLAC',
      bitrate: 'Hi-Res 24-bit / 96 kHz',
      isHiRes: true,
      coverGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
      audioUrl: synthAudio,
      fileSize: 9845000,
      filePath: 'Música/Electrónica/Kavinsky Wave/01 - Midnight Horizon.flac',
      folder: 'Electrónica',
      syncedLyrics: parseLRC(lrcSynthwave),
      source: 'demo',
      addedAt: Date.now() - 3600000 * 24 * 3
    },
    {
      id: 'demo-2',
      title: 'Echoes of Silence',
      artist: 'Aura Ensemble',
      album: 'Acoustic Sanctuary',
      year: 2025,
      genre: 'Clásica',
      duration: 26,
      format: 'ALAC',
      bitrate: 'ALAC Apple Lossless 24-bit / 48 kHz',
      isHiRes: true,
      coverGradient: 'linear-gradient(135deg, #0d9488 0%, #0284c7 50%, #1e3a8a 100%)',
      audioUrl: pianoAudio,
      fileSize: 8430000,
      filePath: 'Música/Clásica/Aura Ensemble/02 - Echoes of Silence.m4a',
      folder: 'Clásica',
      syncedLyrics: parseLRC(lrcPiano),
      source: 'demo',
      addedAt: Date.now() - 3600000 * 24 * 2
    },
    {
      id: 'demo-3',
      title: 'Velvet Blue Rain',
      artist: 'Miles Quartet',
      album: 'Midnight Session Vol. 2',
      year: 2024,
      genre: 'Jazz',
      duration: 27,
      format: 'FLAC',
      bitrate: 'Hi-Res Lossless 24-bit / 96 kHz',
      isHiRes: true,
      coverGradient: 'linear-gradient(135deg, #b45309 0%, #78350f 50%, #292524 100%)',
      audioUrl: jazzAudio,
      fileSize: 9120000,
      filePath: 'Música/Jazz/Miles Quartet/01 - Velvet Blue Rain.flac',
      folder: 'Jazz',
      syncedLyrics: parseLRC(lrcJazz),
      source: 'demo',
      addedAt: Date.now() - 3600000 * 24 * 1
    },
    {
      id: 'demo-4',
      title: 'Quantum Cascade',
      artist: 'Solaris Drift',
      album: 'Orbital Echoes',
      year: 2026,
      genre: 'Ambient',
      duration: 29,
      format: 'WAV',
      bitrate: 'PCM Uncompressed 24-bit / 44.1 kHz',
      isHiRes: true,
      coverGradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #064e3b 100%)',
      audioUrl: ambientAudio,
      fileSize: 10240000,
      filePath: 'Música/Ambient/Solaris Drift/04 - Quantum Cascade.wav',
      folder: 'Ambient',
      syncedLyrics: parseLRC(lrcAmbient),
      source: 'demo',
      addedAt: Date.now() - 3600000 * 12
    }
  ];
}
