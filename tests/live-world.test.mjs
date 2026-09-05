import test from 'node:test';
import assert from 'node:assert/strict';
import { worldAt, DAY_MS, EPOCH, messageBody } from '../lib/live-world.ts';
import { PlaylistPlayer, PLAYLIST } from '../lib/playlist.ts';

test('all viewers derive the same world from server time', () => {
  for (let t = 0; t < DAY_MS * 16; t += 17000) {
    const a = worldAt(EPOCH + t),
      b = worldAt(EPOCH + t);
    assert.deepEqual(a, b);
    assert.ok(a.distance >= 0 && a.distance < 384);
    assert.ok(a.daylight >= 0 && a.daylight <= 1);
    assert.ok(a.rain + a.snow <= 1);
    if (a.weather === 'Snow') assert.equal(a.season, 'Winter');
  }
  assert.equal(worldAt(EPOCH).hour, 6);
  assert.equal(worldAt(EPOCH + DAY_MS / 4).hour, 12);
  assert.equal(worldAt(EPOCH + (DAY_MS * 3) / 4).daylight, 0);
  assert.equal(worldAt(EPOCH + DAY_MS * 4).season, 'Summer');
  assert.equal(worldAt(EPOCH + DAY_MS * 8).season, 'Autumn');
  assert.equal(worldAt(EPOCH + DAY_MS * 12).season, 'Winter');
});

test('studio overrides do not change the shared world', () => {
  const before = worldAt(EPOCH);
  const preview = worldAt(EPOCH, {
    hour: 23,
    season: 'Winter',
    weather: 'Snow',
  });
  assert.equal(preview.hour, 23);
  assert.equal(preview.snow, 1);
  assert.equal(preview.rain, 0);
  assert.deepEqual(worldAt(EPOCH), before);
});

test('chat validates text without interpreting markup', () => {
  assert.equal(messageBody('  Hello!  '), 'Hello!');
  for (const invalid of ['', ' ', null, {}, 'x'.repeat(301), '\u0000hello'])
    assert.equal(messageBody(invalid), null);
  assert.equal(messageBody('<script>hi</script>'), '<script>hi</script>');
});

test('late joiners hear the same track position without autoplay', () => {
  const audio = {
    src: '',
    paused: true,
    currentTime: 0,
    plays: 0,
    async play() {
      this.plays++;
    },
    pause() {},
    load() {},
    removeAttribute() {},
  };
  let selected;
  const player = new PlaylistPlayer(
    (i) => {
      selected = i;
    },
    () => {},
    () => {},
    audio,
  );
  player.sync(EPOCH + 210000);
  assert.equal(selected, 1);
  assert.equal(audio.src, PLAYLIST[1].src);
  assert.ok(Math.abs(audio.currentTime - 10.008) < 0.001);
  assert.equal(audio.plays, 0);
  player.dispose();
});
