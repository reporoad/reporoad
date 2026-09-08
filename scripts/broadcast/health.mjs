export class CaptureHealth {
  constructor(now, stallMs = 20000) {
    this.stallMs = stallMs; this.reset(now);
  }
  // After a page or browser recovery nothing before it describes the new session:
  // the frame counter restarts and the gap spent recovering is not a fault.
  reset(now) {
    this.lastProgress = now; this.outTime = -1; this.audioBadSince = null;
  }
  progress(outTime, now) {
    if (outTime > this.outTime) { this.outTime = outTime; this.lastProgress = now; }
  }
  check(current, previous, now) {
    if (now - this.lastProgress > this.stallMs) return 'Encoder output stalled; restarting the connection';
    if (current.frames === previous.frames) return 'Browser frame loop stopped';
    const progressing = current.audio.some((a,i) => !a.paused && a.ready >= 3 && (!previous.audio[i] || a.time !== previous.audio[i].time));
    if (progressing) this.audioBadSince = null; else this.audioBadSince ??= now;
    if (this.audioBadSince !== null && now - this.audioBadSince >= 30000) return 'Audio playback stopped advancing';
    return null;
  }
}
export function restartDelay(failures) { return Math.min(60, 5 * 2 ** Math.min(failures, 4)); }
