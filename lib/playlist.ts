import { createMusicSchedule, FADE_SECONDS } from './music-schedule.ts';

type MusicTrack = { name: string; collection: string; src: string };
export let PLAYLIST: MusicTrack[] = [];
export const CROSSFADE_SECONDS = FADE_SECONDS;
export let TRACK_DURATIONS: number[] = [];
export const PLAYLIST_EPOCH = Date.UTC(2026, 0, 1);
// Correcting drift costs a fresh range request. Over the network that is close to
// a second during which the deck does not advance, so a tolerance below it made
// every correction create the drift that triggered the next one.
const SYNC_TOLERANCE_SECONDS = 5;
const SYNC_COOLDOWN_SECONDS = 8;
let schedule: ReturnType<typeof createMusicSchedule> | undefined;

// Loaded from the broadcaster machine, never bundled or committed with source.
export async function loadMusicLibrary(request: typeof fetch = fetch) {
  const response = await request('/music/catalog.json', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Music library missing. Import your MP3s on the broadcaster machine.');
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== 'object') throw Error('Invalid music catalogue');
  const data = raw as { tracks?: unknown };
  if (!Array.isArray(data.tracks) || !data.tracks.length || data.tracks.length > 10000) throw Error('Invalid music catalogue');
  const tracks = data.tracks as (MusicTrack & {duration: number})[];
  if (tracks.some(t => !t || typeof t.name !== 'string' || typeof t.collection !== 'string' || typeof t.src !== 'string' || !t.src.startsWith('/music/library/') || !Number.isFinite(t.duration) || t.duration <= 10)) throw Error('Invalid music track');
  const durations = tracks.map(t => t.duration);
  const nextSchedule = createMusicSchedule(durations);
  PLAYLIST = tracks.map(({name,collection,src}) => ({name,collection,src}));
  TRACK_DURATIONS = durations;
  schedule = nextSchedule;
}

export function playlistMix(seconds: number) {
  return schedule ? schedule(seconds) : { index: -1, next: -1, tracks: [] };
}
export class PlaylistPlayer {
  private decks: HTMLAudioElement[];
  private indices = [0, -1];
  private pending = new Set<HTMLAudioElement>();
  private corrected = new WeakMap<HTMLAudioElement, number>();
  private playing = false;
  private disposed = false;
  private volume = 0.3;
  private seconds = CROSSFADE_SECONDS;
  private anchor = performance.now();
  private timer: ReturnType<typeof setInterval> | undefined;
  private index = -1;
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
    if (!PLAYLIST.length) throw Error('Load a music library before starting playback.');
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

  // A deck that is already seeking or refilling owns its range request; a second
  // seek restarts it and loses the buffer, which is how one slow fetch used to
  // escalate into a permanent stall. Only decks that are not playing yet are
  // positioned unconditionally, so a new track still starts at the right offset.
  private align(audio: HTMLAudioElement, offset: number, position: number) {
    if (!audio.paused && (audio.seeking || audio.readyState < 3)) return;
    const settled = this.corrected.get(audio);
    if (settled !== undefined && position < settled) return;
    const time = audio.currentTime;
    if (Number.isFinite(time) && Math.abs(time - offset) <= SYNC_TOLERANCE_SECONDS) return;
    try {
      audio.currentTime = offset;
      this.corrected.set(audio, position + SYNC_COOLDOWN_SECONDS);
    } catch { /* Retry after the cooldown once metadata arrives. */ }
  }

  private async update() {
    if (this.disposed) return;
    const position = this.position();
    const mix = playlistMix(position);
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
      this.align(audio, track.offset, position);
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
      const next = mix.next;
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
