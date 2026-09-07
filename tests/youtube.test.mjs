import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { youtubeEmbedUrls, usesRenderedWorld, YOUTUBE_VIDEO_ID } from '../lib/youtube.ts';
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
