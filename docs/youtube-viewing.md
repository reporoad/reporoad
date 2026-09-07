# YouTube viewing and chat

The normal website embeds the user-supplied unlisted broadcast `WuLbv_j9CGE`. The Chat tab embeds that video's YouTube live chat, not the app's separate D1 chat room. The existing chat table/API is preserved without deletion but is not used by this interface.

- `/`: YouTube player and shared YouTube chat, plus Explore, Add and the chicken button. The local music player and driving scene are not mounted. The video starts muted if autoplay is permitted; use YouTube's native sound controls.
- `/?broadcast=1`: the original full-quality Three.js/audio source and chicken overlay. This never embeds YouTube, avoiding recursive capture.
- `/?preview=1`: the local 3D world and drive settings for development/design review.

Both iframes are built from the single public video ID in `lib/youtube.ts`. `embed_domain` uses the actual website hostname. The player sends its referrer with `strict-origin-when-cross-origin` rather than stripping it, as YouTube requires client identification. Desktop chat sign-in depends on YouTube cookies/browser settings; a link opens the same video on YouTube. Mobile visitors use that link because YouTube does not support mobile-web chat embeds.

An unlisted video is not a secret: visitors can see and share its link. Embedding must be enabled on YouTube. An ended event may show its replay, and chat may be unavailable. The site does not pretend to know whether this fixed broadcast is currently live. The website presence count excludes YouTube viewers. Chicken state is current server state; its appearance in video is delayed by the broadcast pipeline.

This is NOT automatic active-video discovery. A new YouTube event may have a new ID. Update the single configured ID until owner-authorized YouTube API access and the channel ID are provided. Do not use the stream key as a public URL. No OAuth credentials or ingest credentials have been added here.

Local integration only; not yet published. The research fetch could not retrieve the supplied watch page, so playback availability must be checked in the user's browser.
