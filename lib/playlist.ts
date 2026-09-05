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
// No viewer-facing track selection and no song changes driven by timers.
export class PlaylistPlayer {
  private audio: HTMLAudioElement;
  private index = 0;
  private disposed = false;
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
    this.audio.onplaying = null;
    this.audio.onpause = null;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
