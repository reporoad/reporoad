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

// One audio element: stream the current file, advance only on `ended`, then loop.
// No viewer-facing track selection. Live mode periodically corrects clock drift.
export class PlaylistPlayer {
  private audio: HTMLAudioElement;
  private index = 0;
  private disposed = false;
  sync(now: number) {
    const durations = [199.992, 158.28, 139.032, 187.704, 122.928];
    const total = durations.reduce((a, b) => a + b, 0);
    let offset =
      ((((now - Date.UTC(2026, 0, 1)) / 1000) % total) + total) % total;
    let index = 0;
    while (offset >= durations[index] && index < durations.length - 1) {
      offset -= durations[index];
      index++;
    }
    const wasPlaying = !this.audio.paused;
    if (index !== this.index) {
      this.index = index;
      this.audio.src = PLAYLIST[index].src;
      this.onTrack(index);
    }
    if (Math.abs(this.audio.currentTime - offset) > 2) {
      try {
        this.audio.currentTime = offset;
      } catch {
        this.audio.onloadedmetadata = () => {
          this.audio.currentTime = offset;
          this.audio.onloadedmetadata = null;
        };
      }
    }
    if (wasPlaying) void this.play().catch(() => this.onError());
  }
  private onTrack: (index: number) => void;
  private onState: (playing: boolean) => void;
  private onError: () => void;
  constructor(
    onTrack: (index: number) => void,
    onState: (playing: boolean) => void,
    onError: () => void,
    audio?: HTMLAudioElement,
  ) {
    this.onTrack = onTrack;
    this.onState = onState;
    this.onError = onError;
    this.audio = audio ?? new Audio();
    this.audio.preload = 'none';
    this.audio.volume = 0.3;
    this.audio.src = PLAYLIST[0].src;
    this.audio.onplaying = () => {
      if (!this.disposed) this.onState(true);
    };
    this.audio.onpause = () => {
      if (!this.disposed) this.onState(false);
    };
    this.audio.onerror = () => {
      if (!this.disposed) {
        this.onState(false);
        this.onError();
      }
    };
    this.audio.onended = () => {
      if (this.disposed) return;
      this.index = (this.index + 1) % PLAYLIST.length;
      this.audio.src = PLAYLIST[this.index].src;
      this.onTrack(this.index);
      void this.play().catch(() => {
        if (!this.disposed) {
          this.onState(false);
          this.onError();
        }
      });
    };
  }
  async play() {
    if (this.disposed) return;
    // Calling load after a network/decode error allows the play button to retry.
    if (this.audio.error) this.audio.load();
    await this.audio.play();
  }
  pause() {
    this.audio.pause();
  }
  setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
  dispose() {
    this.disposed = true;
    this.audio.onended = null;
    this.audio.onloadedmetadata = null;
    this.audio.onplaying = null;
    this.audio.onpause = null;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
