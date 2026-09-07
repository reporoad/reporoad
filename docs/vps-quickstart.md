# Ubuntu VPS quick start

This runs the broadcaster, not a second copy of the website or database. It loads
the published RepoRoad scene and R2 music. Wait until the hosted catalog is available
before starting. A desktop login is unnecessary: the runner creates its own Xvfb
display and private audio server.

## 1. Check the server

Use a non-root user. These instructions target Ubuntu 24.04, x86_64, with an NVIDIA
GPU supporting Vulkan graphics and NVENC. A CPU-only VPS is not the tested setup.
A compute GPU is not automatically suitable; some have no video encoder.

```sh
uname -m
cat /etc/os-release
nvidia-smi
```

Install the provider-recommended full NVIDIA graphics driver if necessary. Do not
copy the desktop's driver version blindly. Chrome must detect the real GPU, not
SwiftShader/llvmpipe. Keep Chrome's security sandbox enabled.

## 2. Install prerequisites

```sh
sudo apt-get update
sudo apt-get install -y git curl ffmpeg xvfb xauth pulseaudio pulseaudio-utils fonts-dejavu-core vulkan-tools nano
```

Install Node.js 22.13+ (or a newer supported LTS). For a new server, NodeSource's
Node 22 package setup is one option; review the downloaded script before running
it with sudo:

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/reporoad-nodesource-setup.sh
less /tmp/reporoad-nodesource-setup.sh
sudo bash /tmp/reporoad-nodesource-setup.sh
sudo apt-get install -y nodejs
node --version
```

Install Google Chrome's stable amd64 Debian package from Google's official
download, using `sudo apt-get install ./NAME-OF-DOWNLOADED.deb`. Then check:

```sh
google-chrome --version
ffmpeg -hide_banner -encoders | grep h264_nvenc
vulkaninfo --summary
```

An encoder appearing in FFmpeg's list does not prove the hardware/driver can use
it. The recording test below is required.

## 3. Clone and record a test

```sh
git clone https://github.com/reporoad/reporoad.git "$HOME/reporoad"
cd "$HOME/reporoad"
REPOROAD_URL='https://reporoad.suppers.chatgpt.site/?broadcast=1' node scripts/broadcast/run.mjs record
```

The broadcaster uses Node built-ins, so `npm ci`, a local web server, D1 migrations
and a music upload token are NOT needed for this hosted-source setup.

The command should report the actual NVIDIA renderer and create a 60-second MP4
under `outputs/broadcast/`. Copy that MP4 to your PC and inspect the picture and
audio before streaming. Reports and logs are beside it. Do not hide a software
renderer warning with `BROADCAST_ALLOW_SOFTWARE=1` for production.

## 4. Store the streaming destination

```sh
umask 077
mkdir -p "$HOME/.config/reporoad"
nano "$HOME/.config/reporoad/rtmps-url"
chmod 600 "$HOME/.config/reporoad/rtmps-url"
```

Paste the complete Restream RTMPS server URL plus stream key on one line. Do not
put the key in your shell command, Git or chat. Stop any PC broadcaster using the
same destination before starting the VPS broadcaster.

```sh
cd "$HOME/reporoad"
REPOROAD_URL='https://reporoad.suppers.chatgpt.site/?broadcast=1' \
BROADCAST_STREAM_URL_FILE="$HOME/.config/reporoad/rtmps-url" \
node scripts/broadcast/run.mjs stream
```

The supervisor retries capture failures automatically. Ctrl+C stops it and retries.
Use systemd below to survive SSH logout and start at boot.

## 5. Run unattended

```sh
mkdir -p "$HOME/.config/systemd/user"
cp scripts/broadcast/reporoad-broadcast.service "$HOME/.config/systemd/user/"
command -v node
nano "$HOME/.config/systemd/user/reporoad-broadcast.service"
```

Ensure `ExecStart` uses the absolute path printed by `command -v node`; the default
is `/usr/bin/node`. `WorkingDirectory=%h/reporoad` matches the clone location.

```sh
nano "$HOME/.config/reporoad/broadcast.env"
```

Add these settings, replacing YOUR_USER with the actual Linux account name. Use
an absolute path: systemd environment files do not expand `$HOME` or `~`.

```ini
REPOROAD_URL=https://reporoad.suppers.chatgpt.site/?broadcast=1
BROADCAST_STREAM_URL_FILE=/home/YOUR_USER/.config/reporoad/rtmps-url
BROADCAST_VIDEO_KBPS=6000
```

```sh
chmod 600 "$HOME/.config/reporoad/broadcast.env"
sudo loginctl enable-linger "$(id -un)"
systemctl --user daemon-reload
systemctl --user enable --now reporoad-broadcast
journalctl --user -u reporoad-broadcast -f
```

Stop the foreground stream before enabling the service. Stop the service with
`systemctl --user stop reporoad-broadcast`. To update scripts, stop the service,
run `git pull --ff-only` in the checkout, and start the service again.

Allow outbound HTTPS and the destination RTMP(S) port; do not expose Chrome debug
ports, Xvfb, PulseAudio or a local development server. At 6 Mbps, video alone is
about 1.94 TB per 30 days, plus audio/protocol overhead. Check bandwidth allowance,
set log retention, and perform an extended soak test before relying on 24/7 uptime.

References: [NodeSource Ubuntu instructions](https://github.com/nodesource/distributions/blob/master/DEV_README.md),
[Google Chrome](https://www.google.com/chrome/),
[Chrome GPU driver guidance](https://developer.chrome.com/blog/supercharge-web-ai-testing).
