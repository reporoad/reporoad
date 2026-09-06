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
const EPOCH = Date.UTC(2026, 0, 1);

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

  sync(now: number) {
    if (this.disposed) return;
    this.seconds = (now - EPOCH) / 1000;
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
        try { audio.currentTime = track.offset; } catch { /* Retry on the next tick after metadata. */ }
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

  dispose() {
    this.disposed = true;
    this.pause();
    this.decks.forEach(a => {
      a.onerror = null;
      a.removeAttribute('src');
      a.load();
    });
  }
}
