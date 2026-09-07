# RepoRoad broadcaster — Linux / Ubuntu

This is a separate Node.js 22+ process, not part of the Cloudflare Worker. It opens
the **full-quality** site in Chrome on a private Xvfb screen, routes Chrome audio
to a private PulseAudio null sink, and uses FFmpeg to capture that screen and sink.
The default action records an MP4 locally. No stream is sent without explicit
`stream` mode and a configured destination file. Existing user Chrome sessions,
desktop screens, microphone and system audio are not used.

## Ubuntu prerequisites

Install Node.js 22 or newer and Google Chrome stable from their official sources.
Install the capture dependencies with your normal package management:

```sh
sudo apt-get update
sudo apt-get install ffmpeg xvfb xauth pulseaudio pulseaudio-utils fonts-dejavu-core
```

Install the correct NVIDIA graphics driver for the machine. Do not blindly copy
a driver version from another machine. Confirm `nvidia-smi` works and FFmpeg lists
`h264_nvenc`. A compute-only driver or an Xvfb display alone does not guarantee
GPU-accelerated Chrome. The runner reports the actual Chrome GL renderer and
rejects known software renderers by default. It keeps Chrome's sandbox enabled
and must run as a non-root user.

On an existing Ubuntu desktop using PipeWire, do not replace its audio service.
Instead run `node scripts/broadcast/bootstrap-audio.mjs`. This downloads the distro
PulseAudio packages and extracts them into ignored `.tools/pulseaudio/` without
installing system services. The runner detects that private copy automatically.
The host must still supply its shared-library dependencies. On this PC those
dependencies were already available; no system audio configuration was changed.

Only Node built-ins are used by the runner: no npm install or Playwright is needed
to broadcast an already hosted site. Copy `scripts/broadcast/` to your server.
Use the repo's usual dependency setup only if hosting the app locally as well.

## Full music library

`node scripts/music/import.mjs SOURCE_FOLDER` copies every MP3 (including named
variants) byte-for-byte to ignored `media/music/library/`, preserving subfolders,
and builds `media/music/catalog.json` with measured durations. It does not copy
WAVs, videos or artwork, and never overwrites a differing destination file.
The current import contains 792 MP3s, about 5.05 GB and 58.7 hours of audio.

The development server serves the catalogue and MP3 byte ranges directly from
that directory. For the Ubuntu broadcaster, copy `media/music/` too and run:

```sh
REPOROAD_UPSTREAM=https://reporoad.suppers.chatgpt.site node scripts/music/server.mjs
REPOROAD_URL='http://127.0.0.1:3100/?broadcast=1' node scripts/broadcast/run.mjs record
```

This loopback-only proxy serves the local music and forwards the site to the
configured upstream. The upstream must include the new catalogue/shuffle player
code (not yet published during local development). With a locally running app,
leave REPOROAD_UPSTREAM at its default http://localhost:3000.
For unattended use, supervise the music proxy separately with systemd and start
it before the broadcaster. Do not expose this development proxy directly to the
Internet. Serve music via HTTPS/object storage for ordinary public website users.

The catalogue is deliberately outside `public/`, Git and the Sites build archive.
A website without `/music/catalog.json` reports a missing-library setup error.
No MP3 files are included in the current source tree; provision the music separately.
Providing all 792 tracks to public website visitors requires a separate storage
deployment; local import alone does not publish 5 GB of music.

Shuffle is deterministic from the shared clock and a fixed epoch. Each complete
cycle contains every track once, with a new shuffled order for the next cycle and
no immediate repeat at the boundary. All clients using the same catalogue agree
on the same position. Reloading/redeploying unchanged code/catalogue cannot
restart it. Changing the catalogue changes the schedule; preserve the catalogue
for seamless deployments. Original five-second crossfades are retained.

## First proof: local file

Start RepoRoad using its usual development server, then:

```sh
node scripts/broadcast/run.mjs record
```

Default: localhost:3000, full-quality broadcast, 1280×720, 30 FPS, H.264 NVENC,
AAC stereo, 60 seconds. Output is a uniquely named MP4 under `outputs/broadcast/`.
The adjacent `.logs/` directory contains Chrome, PulseAudio, Xvfb, FFmpeg logs and
`report.json`. Existing output files are never overwritten.

For a hosted source or a longer proof:

```sh
REPOROAD_URL='http://127.0.0.1:3100/?broadcast=1' \
BROADCAST_SECONDS=180 BROADCAST_OUTPUT=/tmp/reporoad-proof.mp4 \
node scripts/broadcast/run.mjs record
```

It waits for a broadcast canvas and an actively playing, buffered audio element,
then warms up before capture. The report's browser FPS measures the animation
loop, not independently verified completed scene frames. Inspect the **encoded
MP4** for motion, picture, continuous music and synchronization; logs alone are
not proof of a valid stream. Test a song crossfade and a chicken crossing during
a longer run. Browser autoplay is explicitly enabled in this isolated session.

## Stream to Restream / YouTube

In Restream choose an external encoder / RTMP stream, not a browser widget.
Store its full RTMPS destination (server URL plus stream key) in a private file,
owned by the broadcaster user with mode 600. Do not put keys in Git, chat, shell
history, the source-page URL or public environment examples.

```sh
REPOROAD_URL='http://127.0.0.1:3100/?broadcast=1' \
BROADCAST_STREAM_URL_FILE=/path/to/private/rtmps-url \
node scripts/broadcast/run.mjs stream
```

The destination is redacted from normal FFmpeg logs, but it is necessarily in
FFmpeg's process arguments: use a dedicated Unix account on a trusted host.
Remote debugging binds to loopback and uses a temporary profile. Never expose
the debugging port or the PulseAudio socket publicly. Audio access is protected
by the private run directory, even though the private socket uses anonymous auth.

## Configuration

| Variable | Default / purpose |
| --- | --- |
| `REPOROAD_URL` | `http://localhost:3000/?broadcast=1` |
| `BROADCAST_WIDTH`, `BROADCAST_HEIGHT` | 1280, 720; use 1920,1080 after measuring |
| `BROADCAST_FPS` | 30 |
| `BROADCAST_VIDEO_KBPS` | 6000; lower to 3000 to test a constrained upload connection |
| `BROADCAST_STALL_SECONDS` | 20; restart if encoded output stops advancing |
| `BROADCAST_SECONDS` | 60; recordings only |
| `BROADCAST_OUTPUT` | unique MP4 path; also sets the adjacent log directory |
| `BROADCAST_DISPLAY` | 97; refuses an occupied display instead of stealing it |
| `BROADCAST_ENCODER` | `h264_nvenc`; explicit `libx264` is available |
| `BROADCAST_ANGLE` | `vulkan`; try `gl` if the installed graphics driver requires it |
| `BROADCAST_WARMUP` | 10 seconds after audio/canvas are ready |
| `BROADCAST_CHROME` | `google-chrome` executable |
| `BROADCAST_PULSE` | `pulseaudio` executable |
| `BROADCAST_PULSE_MODULES` | optional custom module directory |
| `BROADCAST_ALLOW_SOFTWARE` | `1` only for explicit software-renderer diagnostics |
| `BROADCAST_STREAM_URL_FILE` | required only for streaming |

## Unattended Ubuntu operation

First prove a recording on the target server. Then copy the example user service
`scripts/broadcast/reporoad-broadcast.service` to
`~/.config/systemd/user/`, adapting WorkingDirectory and the absolute Node path.
Its default checkout location is `~/reporoad`. Create
`~/.config/reporoad/broadcast.env` with the URL, dimensions and secret-file path
(not the secret itself). Set permissions to 600. The server does not need a
desktop login or a physical screen.

```sh
systemctl --user daemon-reload
systemctl --user enable --now reporoad-broadcast
journalctl --user -u reporoad-broadcast -f
```

Have the administrator enable lingering for that dedicated user to start at
boot without login (`loginctl enable-linger USER`). Stop with
`systemctl --user stop reporoad-broadcast`. The runner finalizes a recording on
SIGTERM, terminates only its own children, and deletes only its unique temporary
profile/display-auth/audio directory. Persistent logs/recordings are retained.

Stream mode automatically restarts the capture worker if Chrome, Xvfb, PulseAudio,
the encoder or the browser frame loop fails. Retries back off from 5 to 60 seconds;
five minutes of stable operation resets the backoff. It also monitors encoded-output
progress, advancing audio playback, and worker heartbeats. Network writes have a
15-second timeout. Ctrl+C stops the worker and pending retries. Systemd adds recovery
if the supervisor itself exits and can start it at boot. Record mode does not retry.
This does **not** yet
detect every kind of frozen scene, silent audio, or failure downstream in
Restream/YouTube. Test startup, disconnecting SSH, reboot, network interruption,
and extended playback before claiming 24/7 reliability. Set log retention and
monitor disk usage; plan outbound traffic (~2 TB/month at 6 Mbps).

References: [Chrome GPU setup](https://developer.chrome.com/blog/supercharge-web-ai-testing),
[FFmpeg capture devices](https://ffmpeg.org/ffmpeg-devices.html),
[NVIDIA FFmpeg encoding](https://docs.nvidia.com/video-technologies/video-codec-sdk/13.1/ffmpeg-with-nvidia-gpu/index.html).
