# Local verification — 7 September 2026

## Repository UI

- Removed Passing now and the neighbourhood/category selector.
- Verified Explore pagination, owner avatars, and truncated long names in the browser.
- Verified editor style selection, sign text, Garden toggle, download action, reset, rejected non-GitHub URL, and draft preservation across tabs.
- YAML round-trip tests cover every style and editable setting, malformed values, duplicate keys, aliases and size limits.
- TypeScript checks and production build pass. The existing migration checks verify fresh installation, every upgrade prefix, retries and preservation of existing data. No new schema migration or data deletion is needed.

## Music

Copied 792 MP3 files from 40 subdirectories of the requested source into `media/music/library`, preserving bytes and filenames. The catalog totals approximately 58.7 hours and 5.05 GB. The library is outside the site bundle and Git. The five prototype fallback files were subsequently removed from the current source tree. Provision the library separately on each broadcaster; the local dev server serves all 792.

Shared shuffle is deterministic from a fixed clock epoch, so reloads and redeploys do not restart at track one. Each cycle visits every track once and the 792-track schedule avoids repeats at cycle boundaries. Five-second crossfade scheduling is covered by tests.

## Broadcaster

Ubuntu 24.04 desktop, NVIDIA RTX 4070 Ti. The isolated Chrome session used ANGLE Vulkan with the actual NVIDIA GPU, an authenticated Xvfb display and private PulseAudio null sink. No desktop session, microphone or personal browser profile was captured.

- `/tmp/reporoad-rtmp-proof.mp4`: actual loopback RTMP transmission received by FFmpeg, 150 seconds, 4,500 frames, 1280×720 H.264 at 30 fps with AAC audio. A development reload interrupted audio during this earlier run.
- `/tmp/reporoad-final-proof.mp4`: uninterrupted 90-second local capture after code edits, 2,700 encoded frames, 1280×720 at 30 fps, AAC stereo 48 kHz. All 18 browser heartbeat samples measured about 60 requestAnimationFrame callbacks/s; no browser exceptions or new media waiting/seeking events during capture. Heartbeat counts are not a guarantee of distinct rendered scene frames.
- Visually inspected an extracted final frame. Audio analysis found a seven-second quiet interval, also present in the original `026_poland/Morning Mist in the Foothills_1.mp3` around 172–179 seconds. Source files were left unchanged. This was not a captured crossfade test.

## Recovery and source-publication checks

- All 101 automated tests pass, including encoder/browser/audio stall detection, retry backoff, worker startup timeout and cancellation. TypeScript and the production build pass.
- Applied all five D1 migrations to an isolated temporary local database; the user's database was not reset.
- Captured a new 12-second MP4 after the supervisor split: 360 H.264 frames with AAC audio, browser heartbeat about 60 FPS.
- Deliberately closed a loopback RTMP receiver after eight seconds. The encoder exited, the supervisor waited five seconds, started a fresh isolated capture session, and resumed sending to a replacement receiver. Captured two healthy heartbeat intervals after recovery; Ctrl+C stopped retries.
- BetterLeaks scanned the staged source and existing Git history with redaction and no live credential validation; no findings.

Logs and machine-readable reports are adjacent to each recording. These are local proofs, not evidence of delivery to Restream/YouTube or 24/7 uptime. A server GPU, credentials, resource monitoring and longer soak test are still needed before unattended production streaming. Automatic restart recovers the capture process; it does not diagnose every upstream connection failure or guarantee that YouTube keeps the same event open.
