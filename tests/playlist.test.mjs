import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYLIST, PlaylistPlayer } from '../lib/playlist.ts';

function fakeAudio() {
  return {
    src: '',
    preload: '',
    volume: 1,
    error: null,
    plays: 0,
    pauses: 0,
    loads: 0,
    async play() {
      this.plays++;
      this.onplaying?.();
    },
    pause() {
      this.pauses++;
      this.onpause?.();
    },
    load() {
      this.loads++;
    },
    removeAttribute(key) {
      this[key] = '';
    },
  };
}
test('the playlist waits for play and advances only when the full song ends', async () => {
  const audio = fakeAudio(),
    changes = [],
    states = [];
  const player = new PlaylistPlayer(
    (i) => changes.push(i),
    (s) => states.push(s),
    () => assert.fail('unexpected error'),
    audio,
  );
  assert.equal(audio.plays, 0);
  assert.equal(audio.preload, 'none');
  await player.play();
  assert.equal(audio.src, PLAYLIST[0].src);
  player.pause();
  await player.play();
  assert.equal(audio.src, PLAYLIST[0].src);
  for (let i = 1; i <= PLAYLIST.length; i++) {
    audio.onended();
    await Promise.resolve();
    assert.equal(audio.src, PLAYLIST[i % PLAYLIST.length].src);
  }
  assert.deepEqual(changes, [1, 2, 3, 4, 0]);
  assert.equal(states.at(-1), true);
  player.dispose();
  assert.equal(audio.onended, null);
  assert.equal(audio.src, '');
});
test('volume bounds, load errors and retry are handled without skipping songs', async () => {
  const audio = fakeAudio();
  let errors = 0;
  const player = new PlaylistPlayer(
    () => {},
    () => {},
    () => errors++,
    audio,
  );
  player.setVolume(3);
  assert.equal(audio.volume, 1);
  player.setVolume(-1);
  assert.equal(audio.volume, 0);
  audio.error = { code: 2 };
  audio.onerror();
  assert.equal(errors, 1);
  await player.play();
  assert.equal(audio.loads, 1);
  assert.equal(audio.src, PLAYLIST[0].src);
  player.dispose();
});
