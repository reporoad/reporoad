# YouTube viewing and chat

The normal website embeds the broadcast selected by the server runtime variable `YOUTUBE_VIDEO_ID`. Without a setting, the fallback is the original unlisted test broadcast `WuLbv_j9CGE`. The Chat tab embeds that video's YouTube live chat, not the app's separate D1 chat room. The existing chat table/API is preserved without deletion but is not used by this interface.

- `/`: YouTube player and shared YouTube chat, plus Explore, Add and the chicken button. The local music player and driving scene are not mounted. The video starts muted if autoplay is permitted; use YouTube's native sound controls.
- `/?broadcast=1`: the original full-quality Three.js/audio source and chicken overlay. This never embeds YouTube, avoiding recursive capture.
- `/?preview=1`: the local 3D world and drive settings for development/design review.

Both iframes and watch links use one shared value fetched from `/api/broadcast-config` on page load and every 30 seconds. Responses are not cached, unchanged IDs do not reload the iframe, and transient failures retain the last working ID. Invalid server values return a generic 503 without exposing the supplied value. Initial failures show a connecting message and retry. `embed_domain` uses the actual website hostname. The player sends its referrer with `strict-origin-when-cross-origin` rather than stripping it, as YouTube requires client identification. Desktop chat sign-in depends on YouTube cookies/browser settings; a link opens the same video on YouTube. Mobile visitors use that link because YouTube does not support mobile-web chat embeds.

An unlisted video is not a secret: visitors can see and share its link. Embedding must be enabled on YouTube. An ended event may show its replay, and chat may be unavailable. The site does not pretend to know whether this fixed broadcast is currently live. The website presence count excludes YouTube viewers. Chicken state is current server state; its appearance in video is delayed by the broadcast pipeline.

## Change a broadcast without a Git push

Use the 11-character ID from the viewer URL, not a Studio URL or RTMP stream key. For example, `https://youtube.com/live/WuLbv_j9CGE` gives `WuLbv_j9CGE`.

- **Local website:** copy `.dev.vars.example` to ignored `.dev.vars`, set `YOUTUBE_VIDEO_ID=YOUR_VIDEO_ID`, and restart `npm run dev` (or the web service). This uses Cloudflare runtime bindings, not a build-time `NEXT_PUBLIC_*` variable.
- **Published Sites website:** set `YOUTUBE_VIDEO_ID` in the site's environment settings and deploy the same existing saved version to apply the new environment revision. No source edit, build or Git push is needed. The public GET endpoint cannot modify this value. No custom admin page is required.
- **Broadcaster VPS:** restarting the encoder does not configure the separately hosted website. Its private RTMPS destination remains in `BROADCAST_STREAM_URL_FILE`. A restart into the same YouTube event needs no video-ID change. A new event needs its new viewer ID in the website setting.

This is NOT automatic active-video discovery or an automatic YouTube Go Live action. An offline/ended event can still display a replay or an unavailable player. Playback and chat availability must be checked in YouTube.

## Restart the broadcaster without updating code

For the supplied Ubuntu user service, edit `~/.config/reporoad/broadcast.env` (or the private RTMPS URL file), then:

```sh
systemctl --user restart reporoad-broadcast
systemctl --user status reporoad-broadcast
journalctl --user -u reporoad-broadcast -n 50 --no-pager
```

No `git pull` or `daemon-reload` is required for environment-file changes. The runner already retries encoder/browser/audio failures automatically. Containers without systemd need their own process supervisor; do not assume the user-service commands apply there. Never disable Chrome's sandbox to work around container restrictions.
