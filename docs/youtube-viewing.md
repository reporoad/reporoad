# YouTube viewing and chat

The normal website embeds whichever broadcast is currently live on the channel in the server runtime variable `YOUTUBE_CHANNEL_ID`, using YouTube's `embed/live_stream` player. A broadcaster restart that opens a new event therefore needs no website change. Live chat cannot be embedded per channel, so the Chat tab still addresses one video: its ID comes from a YouTube Data API lookup when `YOUTUBE_API_KEY` is set, and otherwise from `YOUTUBE_VIDEO_ID` (fallback `WuLbv_j9CGE`). That is YouTube live chat, not the app's separate D1 chat room. The existing chat table/API is preserved without deletion but is not used by this interface.

- `/`: YouTube player and shared YouTube chat, plus Explore, Add and the chicken button. The local music player and driving scene are not mounted. The video starts muted if autoplay is permitted; use YouTube's native sound controls.
- `/?broadcast=1`: the original full-quality Three.js/audio source and chicken overlay. This never embeds YouTube, avoiding recursive capture.
- `/?preview=1`: the local 3D world and drive settings for development/design review.

Both iframes and watch links use one shared configuration fetched from `/api/broadcast-config` on page load and every 30 seconds. The lookup behind it is cached server-side for a minute, so viewer polling cannot exhaust the Data API's daily quota, and a failed lookup keeps the configured fallback rather than taking the configuration down. Responses are not cached, unchanged IDs do not reload the iframe, and transient failures retain the last working ID. Invalid server values return a generic 503 without exposing the supplied value. Initial failures show a connecting message and retry. `embed_domain` uses the actual website hostname. The player sends its referrer with `strict-origin-when-cross-origin` rather than stripping it, as YouTube requires client identification. Desktop chat sign-in depends on YouTube cookies/browser settings; a link opens the same video on YouTube. Mobile visitors use that link because YouTube does not support mobile-web chat embeds.

An unlisted video is not a secret: visitors can see and share its link. Embedding must be enabled on YouTube. An ended event may show its replay, and chat may be unavailable. The site does not pretend to know whether this fixed broadcast is currently live. The website presence count excludes YouTube viewers. Chicken state is current server state; its appearance in video is delayed by the broadcast pipeline.

## Change a broadcast without a Git push

The player follows `YOUTUBE_CHANNEL_ID`, so a new event on the same channel needs no change at all. Set `YOUTUBE_VIDEO_ID` only to move the chat fallback: use the 11-character ID from the viewer URL, not a Studio URL or RTMP stream key. For example, `https://youtube.com/live/WuLbv_j9CGE` gives `WuLbv_j9CGE`.

- **Local website:** copy `.dev.vars.example` to ignored `.dev.vars`, set `YOUTUBE_VIDEO_ID=YOUR_VIDEO_ID`, and restart `npm run dev` (or the web service). This uses Cloudflare runtime bindings, not a build-time `NEXT_PUBLIC_*` variable.
- **Published Sites website:** set `YOUTUBE_VIDEO_ID` in the site's environment settings and deploy the same existing saved version to apply the new environment revision. No source edit, build or Git push is needed. The public GET endpoint cannot modify this value. No custom admin page is required.
- **Broadcaster VPS:** restarting the encoder does not configure the separately hosted website. Its private RTMPS destination remains in `BROADCAST_STREAM_URL_FILE`. With the channel player, neither a restart into the same event nor a new event needs a website change.

This is not an automatic YouTube Go Live action, and without `YOUTUBE_API_KEY` the chat tab does not follow a new event. An offline channel can still display a replay or an unavailable player. Playback and chat availability must be checked in YouTube.

## Restart the broadcaster without updating code

For the supplied Ubuntu user service, edit `~/.config/reporoad/broadcast.env` (or the private RTMPS URL file), then:

```sh
systemctl --user restart reporoad-broadcast
systemctl --user status reporoad-broadcast
journalctl --user -u reporoad-broadcast -n 50 --no-pager
```

No `git pull` or `daemon-reload` is required for environment-file changes. The runner already retries encoder/browser/audio failures automatically. Containers without systemd need their own process supervisor; do not assume the user-service commands apply there. Never disable Chrome's sandbox to work around container restrictions.
