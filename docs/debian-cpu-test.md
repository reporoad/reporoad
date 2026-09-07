# Debian 13: CPU-only experiment

CPU-only rendering is possible through Chrome's SwiftShader, with FFmpeg libx264
encoding. It is **not a proven smooth configuration**: our local test of the full
scene at 960×540 measured approximately 0–1 browser FPS. Encoded 15 FPS output can
consist mostly of duplicate frames. A VPS may perform differently, but do not
assume this will be usable for live driving.

Run the broadcaster as a normal non-root user. Install these packages using an
account with sudo privileges:

```sh
sudo apt-get update
sudo apt-get install -y git curl ca-certificates ffmpeg xvfb xauth pulseaudio pulseaudio-utils fonts-dejavu-core
```

Use Node 22+; the runner requires the built-in WebSocket client. If you already
use nvm, run `nvm install 22` and `nvm use 22`. Otherwise install nvm per-user
from its official project (review the installer first):

```sh
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh -o /tmp/reporoad-nvm-install.sh
less /tmp/reporoad-nvm-install.sh
bash /tmp/reporoad-nvm-install.sh
source "$HOME/.nvm/nvm.sh"
nvm install 22
nvm use 22
node --version
```

Install the stable amd64 Google Chrome Debian package from
[Google](https://www.google.com/chrome/) using `sudo apt-get install ./PACKAGE.deb`.
Check `google-chrome --version` and `ffmpeg -hide_banner -encoders | grep libx264`.

Clone the repository if needed, or run `git pull --ff-only` in your existing
checkout. No `npm ci` is needed just to run the broadcaster.

```sh
git clone https://github.com/reporoad/reporoad.git "$HOME/reporoad"
cd "$HOME/reporoad"
REPOROAD_URL='https://reporoad.suppers.chatgpt.site/?broadcast=1' \
BROADCAST_ANGLE=swiftshader \
BROADCAST_ALLOW_SOFTWARE=1 \
BROADCAST_ENCODER=libx264 \
BROADCAST_WIDTH=960 BROADCAST_HEIGHT=540 \
BROADCAST_FPS=15 BROADCAST_VIDEO_KBPS=2000 \
BROADCAST_SECONDS=60 \
node scripts/broadcast/run.mjs record
```

This keeps the full scene and changes only rendering backend/capture settings;
it does not reintroduce reduced-quality website versions. SwiftShader opt-in
weakens graphics-process security guarantees: use only your trusted RepoRoad
source on a dedicated account. The Chrome sandbox remains enabled.

Inspect the resulting MP4 in `outputs/broadcast/` for actual motion and audio.
Share the renderer and capture lines, plus `nproc` and `free -h`; do not share
stream secrets. If it cannot maintain useful motion, stop rather than publishing
a stuttering broadcast. Options are a GPU host or a prerecorded video loop (which
would lose real-time visual interaction).

If the recording is acceptable, use exactly the same settings with `stream`
instead of `record` and add `BROADCAST_STREAM_URL_FILE=/absolute/private/path`.
For systemd, put these CPU settings in its environment file and set ExecStart to
the absolute `node` path from `command -v node` (nvm is not loaded by systemd).

References: [Chromium SwiftShader](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md),
[nvm installation](https://github.com/nvm-sh/nvm#installing-and-updating).
