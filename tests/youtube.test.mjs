import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { youtubeEmbedUrls, usesRenderedWorld, YOUTUBE_VIDEO_ID, youtubeRuntimeConfig, youtubeConfigResponse } from '../lib/youtube.ts';
test('runtime configuration changes both destinations without rebuilding', async () => {
  assert.equal(youtubeRuntimeConfig().videoId, YOUTUBE_VIDEO_ID);
  const response = youtubeConfigResponse(' abcdefghijk ');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { videoId } = await response.json();
  const urls = youtubeEmbedUrls('reporoad.suppers.chatgpt.site', videoId);
  assert.equal(new URL(urls.player).pathname, '/embed/abcdefghijk');
  assert.equal(new URL(urls.chat).searchParams.get('v'), 'abcdefghijk');
  assert.equal((await youtubeConfigResponse('ABCDEFGHIJK').json()).videoId, 'ABCDEFGHIJK');
  for (const invalid of ['https://youtube.com/live/abcdefghijk', 'rtmps://secret/key', '<script>']) {
    const bad = youtubeConfigResponse(invalid);
    assert.equal(bad.status, 503);
    assert.equal(bad.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await bad.text(), /secret|<script>|rtmps:/);
  }
});
test('player and chat use the supplied unlisted video; chat domain follows the website', () => {
  assert.equal(YOUTUBE_VIDEO_ID, 'WuLbv_j9CGE');
  for (const host of ['localhost', '127.0.0.1', 'reporoad.suppers.chatgpt.site']) {
    const urls = youtubeEmbedUrls(host), player = new URL(urls.player), chat = new URL(urls.chat);
    assert.equal(player.pathname, `/embed/${YOUTUBE_VIDEO_ID}`);
    assert.equal(player.searchParams.get('mute'), '1');
    assert.equal(chat.searchParams.get('v'), YOUTUBE_VIDEO_ID);
    assert.equal(chat.searchParams.get('embed_domain'), host);
  }
  assert.throws(() => youtubeEmbedUrls('localhost/?bad=1'));
  assert.throws(() => youtubeEmbedUrls('localhost', '../other'));
});
test('normal viewers do not render the broadcast source; source and local previews still do', () => {
  assert.equal(usesRenderedWorld('', false), false);
  assert.equal(usesRenderedWorld('?quality=minimal', false), false);
  assert.equal(usesRenderedWorld('?broadcast=1', true), true);
  assert.equal(usesRenderedWorld('?broadcast=1', false), false); // Exit source view
  assert.equal(usesRenderedWorld('?preview=1', false), true);
  assert.equal(usesRenderedWorld('?supportPreview=1', false), true);
  const source = readFileSync(new URL('../components/chilldrive.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(!renderWorld\) return;[\s\S]*await loadMusicLibrary\(\)/);
  assert.match(source, /renderWorld \? scene : <YouTubeStream/);
  assert.doesNotMatch(source, /<LiveChat/);
});
