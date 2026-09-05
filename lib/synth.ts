// Original procedural audio for the prototype. No third-party recordings.
import { TRACKS } from './world';

export class ScenicRadio {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private track = 0;
  private volume = 0.3;

  async play(track: number) {
    this.track = track;
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = this.volume * 0.2;
      this.gain.connect(this.context.destination);
    }
    await this.context.resume();
    if (this.timer) return;
    this.nextTime = this.context.currentTime + 0.06;
    this.timer = setInterval(() => this.schedule(), 80);
    this.schedule();
  }
  private schedule() {
    const ctx = this.context;
    if (!ctx || !this.gain) return;
    const track = TRACKS[this.track];
    // After a background-tab timer delay, resume without a backlog of notes.
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.04;
    const melody = [0, 7, 12, 16, 7, 14, 12, 7, 0, 4, 12, 19, 16, 14, 7, 4];
    while (this.nextTime < ctx.currentTime + 0.25) {
      const chord = [0, -5, -3, -7][Math.floor(this.step / 16) % 4];
      this.note(
        track.root * 2 ** ((melody[this.step % 16] + chord) / 12),
        this.nextTime,
        1.2,
        0.22,
      );
      if (this.step % 4 === 0) {
        this.note((track.root / 2) * 2 ** (chord / 12), this.nextTime, 2, 0.32);
        this.note(
          track.root * 2 ** ((chord + 4) / 12),
          this.nextTime,
          1.8,
          0.1,
        );
      }
      this.nextTime += track.beat;
      this.step++;
    }
  }
  private note(
    frequency: number,
    time: number,
    duration: number,
    level: number,
  ) {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator(),
      envelope = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + 0.03);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(this.gain!);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
  select(track: number) {
    this.track = track;
    this.step = 0;
  }
  setVolume(value: number) {
    this.volume = value;
    if (this.context && this.gain)
      this.gain.gain.setTargetAtTime(
        value * 0.2,
        this.context.currentTime,
        0.1,
      );
  }
  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.context?.suspend();
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.context?.close();
    this.context = null;
  }
}
