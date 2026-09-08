import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYLIST, PlaylistPlayer, playlistMix, TRACK_DURATIONS, loadMusicLibrary } from '../lib/playlist.ts';
import { shuffledOrder } from '../lib/music-schedule.ts';
const EPOCH = Date.UTC(2026, 0, 1);
assert.equal(PLAYLIST.length, 0);
assert.equal(playlistMix(0).index, -1);
await assert.rejects(loadMusicLibrary(async () => new Response('', { status: 404 })), /missing/);
await loadMusicLibrary(async () => Response.json({ tracks: [199.992,158.28,139.032,187.704,122.928].map((duration,i) => ({ name: `Test track ${i}`, collection: 'Test', src: `/music/library/test-${i}.mp3`, duration })) }));
function fakeAudio() {
  const audio = { src: '', preload: '', volume: 1, paused: true, error: null,
    seeking: false, readyState: 4, plays: 0, loads: 0, seeks: 0,
    async play() { this.plays++; this.paused = false; },
    pause() { this.paused = true; }, load() { this.loads++; },
    removeAttribute(key) { this[key] = ''; },
  };
  let time = 0;
  Object.defineProperty(audio, 'currentTime', {
    get: () => time,
    set(value) { time = value; audio.seeks++; },
    enumerable: true, configurable: true,
  });
  return audio;
}
// Present a deck as drifted with a clean seek count. Never syncs: an extra sync
// would itself correct the deck and start a fresh cooldown.
function drifted(audio, time) {
  audio.currentTime = time;
  audio.seeks = 0;
}
test('every track boundary overlaps, including playlist wrap', () => {
  let boundary = 0;
  const order=shuffledOrder(PLAYLIST.length,0), previousOrder=shuffledOrder(PLAYLIST.length,-1);
  for (let i = 0; i < PLAYLIST.length; i++) {
    for (const offset of [0.001, 0.1, 2.5, 4.99]) {
      const mix = playlistMix(boundary + offset);
      assert.equal(mix.index, order[i]);
      assert.equal(mix.tracks.length, 2);
      assert.ok(Math.abs(mix.tracks.reduce((n, t) => n + t.gain, 0) - 1) < 1e-9);
      assert.equal(mix.tracks[1].index, i ? order[i-1] : previousOrder.at(-1));
    }
    assert.equal(playlistMix(boundary + 5.001).tracks.length, 1);
    boundary += TRACK_DURATIONS[order[i]] - 5;
  }
  assert.equal(playlistMix(boundary + 2).index, shuffledOrder(PLAYLIST.length,1)[0]);
});
test('overlap plays both decks; volume, pause and disposal affect both', async () => {
  const a = fakeAudio(), b = fakeAudio();
  const player = new PlaylistPlayer(() => {}, () => {}, () => assert.fail(), a, b);
  try {
    assert.equal(a.plays + b.plays, 0);
    player.sync(Date.UTC(2026, 0, 1) + (TRACK_DURATIONS[0] - 2.5) * 1000);
    await player.play();
    assert.ok(!a.paused && !b.paused);
    assert.deepEqual(new Set([a.src, b.src]), new Set([PLAYLIST[0].src, PLAYLIST[shuffledOrder(PLAYLIST.length,0)[1]].src]));
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
    assert.equal(b.src, PLAYLIST[playlistMix(5).next].src);
    assert.equal(b.preload, 'auto');
  } finally { player.dispose(); }
});

test('a starving deck is left to refill instead of being re-seeked', async () => {
  for (const stalled of [{ seeking: true, readyState: 4 }, { seeking: false, readyState: 2 }]) {
    const a = fakeAudio(), b = fakeAudio();
    const player = new PlaylistPlayer(() => {}, () => {}, () => assert.fail(), a, b);
    try {
      player.sync(EPOCH + 30000);
      await player.play();
      assert.equal(a.paused, false);
      drifted(a, 0);
      Object.assign(a, stalled);
      player.sync(EPOCH + 50000);
      assert.equal(a.seeks, 0, `re-seeked while ${JSON.stringify(stalled)}`);
    } finally { player.dispose(); }
  }
});
test('a corrected deck is given time to land before another correction', async () => {
  const a = fakeAudio(), b = fakeAudio();
  const player = new PlaylistPlayer(() => {}, () => {}, () => assert.fail(), a, b);
  try {
    player.sync(EPOCH + 30000);
    await player.play();
    drifted(a, 0);
    player.sync(EPOCH + 50000);
    assert.equal(a.seeks, 1, 'ignored drift far beyond the tolerance');
    drifted(a, 0);
    player.sync(EPOCH + 51000);
    assert.equal(a.seeks, 0, 'corrected twice inside the cooldown');
    drifted(a, 0);
    player.sync(EPOCH + 70000);
    assert.equal(a.seeks, 1, 'never corrected again after the cooldown');
  } finally { player.dispose(); }
});
test('ordinary network jitter is tolerated without seeking', async () => {
  const a = fakeAudio(), b = fakeAudio();
  const player = new PlaylistPlayer(() => {}, () => {}, () => assert.fail(), a, b);
  try {
    player.sync(EPOCH + 30000);
    await player.play();
    drifted(a, 47);
    player.sync(EPOCH + 50000);
    assert.equal(a.seeks, 0, 'seeked for drift smaller than one WAN round trip');
  } finally { player.dispose(); }
});
test('a freshly loaded deck is positioned immediately even before it buffers', async () => {
  const a = fakeAudio(), b = fakeAudio();
  const player = new PlaylistPlayer(() => {}, () => {}, () => assert.fail(), a, b);
  try {
    a.readyState = 0;
    player.sync(EPOCH + 30000);
    await player.play();
    assert.ok(a.seeks > 0, 'started a fresh track from the wrong offset');
    assert.ok(Math.abs(a.currentTime - 30) < 1);
  } finally { player.dispose(); }
});
