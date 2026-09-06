import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYLIST, PlaylistPlayer, playlistMix, TRACK_DURATIONS } from '../lib/playlist.ts';
function fakeAudio() {
  return { src: '', preload: '', volume: 1, paused: true, currentTime: 0, error: null,
    plays: 0, loads: 0,
    async play() { this.plays++; this.paused = false; },
    pause() { this.paused = true; }, load() { this.loads++; },
    removeAttribute(key) { this[key] = ''; },
  };
}
test('every track boundary overlaps, including playlist wrap', () => {
  let boundary = 0;
  for (let i = 0; i < PLAYLIST.length; i++) {
    for (const offset of [0.001, 0.1, 2.5, 4.99]) {
      const mix = playlistMix(boundary + offset);
      assert.equal(mix.index, i);
      assert.equal(mix.tracks.length, 2);
      assert.ok(Math.abs(mix.tracks.reduce((n, t) => n + t.gain, 0) - 1) < 1e-9);
      assert.equal(mix.tracks[1].index, (i + PLAYLIST.length - 1) % PLAYLIST.length);
    }
    assert.equal(playlistMix(boundary + 5.001).tracks.length, 1);
    boundary += TRACK_DURATIONS[i] - 5;
  }
  assert.equal(playlistMix(boundary + 2).index, 0);
});
test('overlap plays both decks; volume, pause and disposal affect both', async () => {
  const a = fakeAudio(), b = fakeAudio();
  const player = new PlaylistPlayer(() => {}, () => {}, () => assert.fail(), a, b);
  try {
    assert.equal(a.plays + b.plays, 0);
    player.sync(Date.UTC(2026, 0, 1) + (TRACK_DURATIONS[0] - 2.5) * 1000);
    await player.play();
    assert.ok(!a.paused && !b.paused);
    assert.deepEqual(new Set([a.src, b.src]), new Set([PLAYLIST[0].src, PLAYLIST[1].src]));
    assert.ok(Math.abs(a.volume - 0.15) < 0.01);
    assert.ok(Math.abs(b.volume - 0.15) < 0.01);
    player.setVolume(0.8);
    assert.ok(Math.abs(a.volume + b.volume - 0.8) < 1e-9);
    player.pause();
    assert.ok(a.paused && b.paused);
  } finally { player.dispose(); }
  assert.equal(a.src, ''); assert.equal(b.src, '');
});
test('single track preloads next deck without playing it', async () => {
  const a = fakeAudio(), b = fakeAudio();
  const player = new PlaylistPlayer(() => {}, () => {}, () => {}, a, b);
  try {
    await player.play();
    assert.equal(a.paused, false);
    assert.equal(b.paused, true);
    assert.equal(b.src, PLAYLIST[1].src);
    assert.equal(b.preload, 'auto');
  } finally { player.dispose(); }
});
