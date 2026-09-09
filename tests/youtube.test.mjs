import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { youtubeEmbedUrls, usesRenderedWorld, YOUTUBE_VIDEO_ID, YOUTUBE_CHANNEL_ID, youtubeRuntimeConfig, youtubeConfigResponse, liveVideoResolver, findLiveVideo } from '../lib/youtube.ts';

const livePage = videoId => new Response(`<html><head><link rel="canonical" href="https://www.youtube.com/watch?v=${videoId}"><title>x</title></head></html>`);

test('runtime configuration changes both destinations without rebuilding', async () => {
  assert.equal(youtubeRuntimeConfig().videoId, YOUTUBE_VIDEO_ID);
  assert.equal(youtubeRuntimeConfig().channelId, YOUTUBE_CHANNEL_ID);
  const response = await youtubeConfigResponse(' abcdefghijk ');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const config = await response.json();
  const urls = youtubeEmbedUrls('reporoad.suppers.chatgpt.site', config);
  assert.equal(new URL(urls.chat).searchParams.get('v'), 'abcdefghijk');
  assert.equal((await (await youtubeConfigResponse('ABCDEFGHIJK')).json()).videoId, 'ABCDEFGHIJK');
  for (const invalid of ['https://youtube.com/live/abcdefghijk', 'rtmps://secret/key', '<script>']) {
    const bad = await youtubeConfigResponse(invalid);
    assert.equal(bad.status, 503);
    assert.equal(bad.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await bad.text(), /secret|<script>|rtmps:/);
  }
  for (const invalid of ['UC-short', 'abcdefghijklmnopqrstuvwx', '<script>']) {
    assert.equal((await youtubeConfigResponse(undefined, invalid)).status, 503);
  }
});
test('the player follows the channel so a restarted broadcast needs no change', () => {
  const { player } = youtubeEmbedUrls('reporoad.suppers.chatgpt.site', { videoId: YOUTUBE_VIDEO_ID, channelId: YOUTUBE_CHANNEL_ID });
  const url = new URL(player);
  assert.equal(url.pathname, '/embed/live_stream');
  assert.equal(url.searchParams.get('channel'), YOUTUBE_CHANNEL_ID);
  assert.equal(url.searchParams.get('mute'), '1');
  assert.doesNotMatch(player, new RegExp(YOUTUBE_VIDEO_ID));
});
test('chat and the watch link still address one concrete broadcast', () => {
  for (const host of ['localhost', '127.0.0.1', 'reporoad.suppers.chatgpt.site']) {
    const urls = youtubeEmbedUrls(host), chat = new URL(urls.chat);
    assert.equal(chat.searchParams.get('v'), YOUTUBE_VIDEO_ID);
    assert.equal(chat.searchParams.get('embed_domain'), host);
    assert.equal(urls.watch, `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`);
  }
  assert.throws(() => youtubeEmbedUrls('localhost/?bad=1'));
  assert.throws(() => youtubeEmbedUrls('localhost', { videoId: '../other', channelId: YOUTUBE_CHANNEL_ID }));
  assert.throws(() => youtubeEmbedUrls('localhost', { videoId: YOUTUBE_VIDEO_ID, channelId: 'UC../other' }));
});
test('the live broadcast is discovered without an API key', async () => {
  let asked;
  const videoId = await findLiveVideo(YOUTUBE_CHANNEL_ID, async (url, init) => {
    asked = { url, init };
    return livePage('veEzKWcJlY8');
  });
  assert.equal(videoId, 'veEzKWcJlY8');
  assert.match(asked.url, new RegExp(`youtube\\.com/channel/${YOUTUBE_CHANNEL_ID}/live$`));
  assert.equal(asked.init.redirect, 'follow');
  assert.doesNotMatch(asked.url, /key=|googleapis/, 'still went through the Data API');
  await assert.rejects(findLiveVideo('UC../evil', async () => livePage('veEzKWcJlY8')));
});
test('the live broadcast is discovered once per interval, not once per viewer', async () => {
  let calls = 0, clock = 0;
  const resolve = liveVideoResolver(async () => { calls++; return livePage('veEzKWcJlY8'); }, 300000, () => clock);
  assert.equal(await resolve(YOUTUBE_CHANNEL_ID), 'veEzKWcJlY8');
  clock = 299000;
  assert.equal(await resolve(YOUTUBE_CHANNEL_ID), 'veEzKWcJlY8');
  assert.equal(calls, 1, 'looked the broadcast up again inside the cache window');
  clock = 301000;
  await resolve(YOUTUBE_CHANNEL_ID);
  assert.equal(calls, 2, 'never refreshed after the cache expired');
});
test('a failing lookup is not retried on every single viewer poll', async () => {
  let calls = 0, clock = 0;
  const resolve = liveVideoResolver(async () => { calls++; return new Response('', { status: 500 }); }, 300000, () => clock);
  await assert.rejects(resolve(YOUTUBE_CHANNEL_ID));
  clock = 30000;
  await assert.rejects(resolve(YOUTUBE_CHANNEL_ID));
  assert.equal(calls, 1, 'hammered YouTube while the lookup was failing');
  clock = 61000;
  await assert.rejects(resolve(YOUTUBE_CHANNEL_ID));
  assert.equal(calls, 2, 'never retried after the shorter failure window');
});
test('a discovered broadcast reaches chat; a failed lookup keeps the last known one', async () => {
  const found = await youtubeConfigResponse('abcdefghijk', YOUTUBE_CHANNEL_ID, async () => 'veEzKWcJlY8');
  assert.equal((await found.json()).videoId, 'veEzKWcJlY8');
  const failed = await youtubeConfigResponse('abcdefghijk', YOUTUBE_CHANNEL_ID, async () => { throw Error('quota'); });
  assert.equal(failed.status, 200, 'a lookup failure took the whole configuration down');
  const config = await failed.json();
  assert.equal(config.videoId, 'abcdefghijk');
  assert.equal(config.channelId, YOUTUBE_CHANNEL_ID);
  assert.doesNotMatch(JSON.stringify(config), /key|quota/);
  assert.equal((await (await youtubeConfigResponse('abcdefghijk', YOUTUBE_CHANNEL_ID)).json()).videoId, 'abcdefghijk', 'needed a resolver to answer at all');
});
test('discovery rejects anything that is not a live video id', async () => {
  const pages = [
    '<html><head><title>Quiet Circuit</title></head></html>',
    '<link rel="canonical" href="https://www.youtube.com/channel/UCV6R_O0gxuj2tNcQWq7yJ3g">',
    '<link rel="canonical" href="https://www.youtube.com/watch?v=../../evil">',
    '<link rel="canonical" href="https://evil.example/watch?v=abcdefghijk">',
  ];
  for (const page of pages) {
    await assert.rejects(liveVideoResolver(async () => new Response(page))(YOUTUBE_CHANNEL_ID), undefined, page.slice(0, 40));
  }
  await assert.rejects(liveVideoResolver(async () => new Response('', { status: 403 }))(YOUTUBE_CHANNEL_ID));
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
