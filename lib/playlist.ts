export const PLAYLIST = [
  {
    name: 'Morning Light in Fiordland',
    collection: 'New Zealand',
    src: '/music/morning-light-in-fiordland.mp3',
  },
  {
    name: 'Bamboo and Rain',
    collection: 'Japan',
    src: '/music/bamboo-and-rain.mp3',
  },
  {
    name: 'Golden Shore Lullaby',
    collection: 'Japan',
    src: '/music/golden-shore-lullaby.mp3',
  },
  {
    name: 'Stargazing by Lake Tekapo',
    collection: 'New Zealand',
    src: '/music/stargazing-by-lake-tekapo.mp3',
  },
  {
    name: 'Midnight Train Loop',
    collection: 'Japan',
    src: '/music/midnight-train-loop.mp3',
  },
];

export const CROSSFADE_SECONDS = 5;
export const TRACK_DURATIONS = [199.992, 158.28, 139.032, 187.704, 122.928];
export const PLAYLIST_EPOCH = Date.UTC(2026, 0, 1);

// Each track begins five seconds before its predecessor finishes.
export function playlistMix(seconds: number) {
  const spans = TRACK_DURATIONS.map(d => d - CROSSFADE_SECONDS);
  const total = spans.reduce((a, b) => a + b, 0);
  let offset = ((seconds % total) + total) % total;
  let index = 0;
  while (index < spans.length - 1 && offset >= spans[index]) offset -= spans[index++];
  const previous = (index + PLAYLIST.length - 1) % PLAYLIST.length;
  const t = Math.min(1, offset / CROSSFADE_SECONDS);
  const gain = t * t * (3 - 2 * t);
  return {
    index,
    tracks: [
      { index, offset, gain },
      ...(offset < CROSSFADE_SECONDS
        ? [{ index: previous, offset: spans[previous] + offset, gain: 1 - gain }]
        : []),
    ],
  };
}

export class PlaylistPlayer {
  private decks: HTMLAudioElement[];
  private indices = [0, -1];
  private pending = new Set<HTMLAudioElement>();
  private playing = false;
  private disposed = false;
  private volume = 0.3;
  private seconds = CROSSFADE_SECONDS;
  private anchor = performance.now();
  private timer: ReturnType<typeof setInterval> | undefined;
  private index = 0;
  private corrections = 0;
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private spectrum = new Uint8Array(1024);
  private sources: MediaElementAudioSourceNode[] = [];
  private onTrack: (index: number) => void;
  private onState: (playing: boolean) => void;
  private onError: () => void;

  constructor(
    onTrack: (index: number) => void,
    onState: (playing: boolean) => void,
    onError: () => void,
    audio?: HTMLAudioElement,
    secondAudio?: HTMLAudioElement,
  ) {
    this.onTrack = onTrack;
    this.onState = onState;
    this.onError = onError;
    this.decks = [audio ?? new Audio(), secondAudio ?? new Audio()];
    this.decks.forEach(a => {
      a.preload = 'none';
      a.volume = 0;
      a.onerror = () => {
        if (this.playing && !this.disposed) {
          this.pause();
          this.onError();
        }
      };
    });
    this.decks[0].src = PLAYLIST[0].src;
    this.decks[0].volume = this.volume;
  }

  private position() {
    return this.seconds + (this.playing ? (performance.now() - this.anchor) / 1000 : 0);
  }

  /** Read-only diagnostics; never changes playback or exposes stream credentials. */
  diagnostics() {
    const active = this.decks.filter((_, slot) =>
      playlistMix(this.position()).tracks.some(t => t.index === this.indices[slot]));
    return {
      context: this.context?.state ?? 'not created',
      corrections: this.corrections,
      decks: active.map(audio => {
        let ahead = 0;
        for (let i = 0; i < (audio.buffered?.length ?? 0); i++) {
          if (audio.buffered.start(i) <= audio.currentTime && audio.buffered.end(i) >= audio.currentTime)
            ahead = audio.buffered.end(i) - audio.currentTime;
        }
        return { paused: audio.paused, seeking: audio.seeking, ready: audio.readyState,
          ahead: Math.round(ahead), error: audio.error?.code ?? null };
      }),
    };
  }

  sync(now: number) {
    if (this.disposed) return;
    this.seconds = (now - PLAYLIST_EPOCH) / 1000;
    this.anchor = performance.now();
    if (this.playing) void this.update().catch(() => this.fail());
  }

  private fail() {
    if (!this.playing || this.disposed) return;
    this.pause();
    this.onError();
  }

  private async update() {
    if (this.disposed) return;
    const mix = playlistMix(this.position());
    if (mix.index !== this.index) {
      this.index = mix.index;
      this.onTrack(this.index);
    }
    const desired = mix.tracks.map(t => t.index);
    const starts: Promise<void>[] = [];
    for (const track of mix.tracks) {
      let slot = this.indices.indexOf(track.index);
      if (slot < 0) {
        slot = this.indices.findIndex(i => !desired.includes(i));
        this.indices[slot] = track.index;
        this.decks[slot].src = PLAYLIST[track.index].src;
      }
      const audio = this.decks[slot];
      audio.preload = 'auto';
      audio.volume = this.volume * track.gain;
      if (!Number.isFinite(audio.currentTime) || Math.abs(audio.currentTime - track.offset) > 2) {
        try { audio.currentTime = track.offset; this.corrections++; } catch { /* Retry on the next tick after metadata. */ }
      }
      if (this.playing && audio.paused && !this.pending.has(audio)) {
        if (audio.error) audio.load();
        this.pending.add(audio);
        starts.push(audio.play().then(() => {
          if (!this.playing || this.disposed) audio.pause();
        }).finally(() => this.pending.delete(audio)));
      }
    }
    this.decks.forEach((audio, slot) => {
      if (desired.includes(this.indices[slot])) return;
      audio.pause();
      audio.volume = 0;
      // Preload the upcoming song while the other deck plays.
      const next = (mix.index + 1) % PLAYLIST.length;
      if (this.indices[slot] !== next) {
        this.indices[slot] = next;
        audio.src = PLAYLIST[next].src;
        audio.preload = 'auto';
        audio.load();
      }
    });
    await Promise.all(starts);
  }

  async play() {
    if (this.disposed || this.playing) return;
    // One analyser mixes both decks, including their existing crossfade gains.
    // Construct once: a media element may only have one source node.
    if (typeof AudioContext !== 'undefined') {
      if (!this.context) {
        this.context = new AudioContext();
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = .78;
        this.sources = this.decks.map(audio => {
          const source = this.context!.createMediaElementSource(audio);
          source.connect(this.analyser!);
          return source;
        });
        this.analyser.connect(this.context.destination);
      }
      const isRunning = () => this.context?.state === 'running';
      if (!isRunning()) {
        // Do not await a potentially never-resolving autoplay-blocked resume.
        void this.context.resume().catch(() => {});
        if (!isRunning()) {
          await Promise.race([this.context.resume(), new Promise<void>(resolve => setTimeout(resolve, 250))]);
          if (!isRunning()) throw new Error('Tap to enable the shared soundtrack.');
        }
      }
    }
    if (this.disposed || this.playing) return;
    this.anchor = performance.now();
    this.playing = true;
    try {
      await this.update();
      if (!this.playing || this.disposed) return;
      this.onState(true);
      this.timer = setInterval(() => void this.update().catch(() => this.fail()), 50);
    } catch (error) {
      this.pause();
      throw error;
    }
  }

  pause() {
    this.seconds = this.position();
    this.playing = false;
    clearInterval(this.timer);
    this.timer = undefined;
    this.decks.forEach(a => a.pause());
    if (!this.disposed) this.onState(false);
  }

  setVolume(volume: number) {
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
    const mix = playlistMix(this.position());
    this.decks.forEach((a, slot) => {
      a.volume = this.volume * (mix.tracks.find(t => t.index === this.indices[slot])?.gain ?? 0);
    });
  }

  readSpectrum(bands: Float32Array) {
    bands.fill(0);
    if (!this.playing || !this.analyser || this.context?.state !== 'running') return;
    this.analyser.getByteFrequencyData(this.spectrum);
    const hzPerBin = this.context.sampleRate / this.analyser.fftSize;
    for (let i = 0; i < bands.length; i++) {
      const start = Math.max(1, Math.floor(45 * (16000 / 45) ** (i / bands.length) / hzPerBin));
      const end = Math.min(this.spectrum.length, Math.max(start + 1, Math.ceil(45 * (16000 / 45) ** ((i + 1) / bands.length) / hzPerBin)));
      let sum = 0;
      for (let bin = start; bin < end; bin++) sum += this.spectrum[bin] / 255;
      bands[i] = end > start ? sum / (end - start) : 0;
    }
  }

  dispose() {
    this.disposed = true;
    this.pause();
    this.decks.forEach(a => {
      a.onerror = null;
      a.removeAttribute('src');
      a.load();
    });
    this.sources.forEach(source => source.disconnect());
    this.analyser?.disconnect();
    void this.context?.close().catch(() => {});
  }
}
