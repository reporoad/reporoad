# RepoRoad

A cosy, shared drive through a voxel world of GitHub repositories. Each repository is a roadside building; every complete 10,000 stars adds a floor, with a minimum of one.

RepoRoad is a pre-release prototype built with React, Three.js / React Three Fiber, Vinext, and Cloudflare D1 through Sites. There are no payments or plot purchases.

## What it does

- One shared road, daylight/night cycles, seasons, weather, wildlife and an in-car dashboard.
- A compact repository directory with owner avatars, stars, search and pagination.
- A building editor with a real 3D preview, optional YAML import, and downloadable `.reporoad.yml` settings.
- Shared chicken queues: visitors add chickens, and the car stops for their crossing.
- YouTube video and chat on the normal website; a separate full-quality rendering source for the broadcaster.
- Shared clock-based music shuffle and five-second crossfades. Reloads do not restart the unchanged playlist.
- A Linux broadcaster using isolated Chrome, Xvfb, private audio and FFmpeg, with local recording or RTMP(S) output.

## Local development

Requires Node.js 22.13+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by the server (normally http://localhost:3000).

| URL | Purpose |
| --- | --- |
| `/` | YouTube player, YouTube chat, Explore and Add |
| `/?broadcast=1` | Raw Three.js world and music for capture; never embeds YouTube |
| `/?preview=1` | Local 3D world with drive-preview controls |
| `/?supportPreview=1` | Local support-marker demo |

Development uses 20 labelled sample GitHub repositories, not a claim that their owners have joined. Set the server runtime variable `YOUTUBE_CHANNEL_ID` and the player follows whichever broadcast is live on that channel, so a broadcaster restart needs no change; `YOUTUBE_VIDEO_ID` is the chat fallback used while the keyless live-broadcast lookup is unavailable. Neither needs a code edit or a Git push. Locally, copy `.dev.vars.example` to `.dev.vars`, edit the ID, and restart the web service. On Sites, edit its environment setting and redeploy the existing saved version to apply it (no rebuild or Git push). Viewers check the setting every 30 seconds. The fallback may be an ended test broadcast; chat follows the live event through a keyless lookup of the channel's live page. See [broadcast configuration](docs/youtube-viewing.md).

D1-backed interactions need local migrations. Apply them using the local-only configuration:

```sh
npx wrangler d1 migrations apply DB --local --persist-to .wrangler/state --config wrangler.local.jsonc
```

Never expose the development server as a production service. Production authentication headers are supplied by Sites and must not be trusted from arbitrary clients.

## Design a repository building

Use the Add tab without a URL to start from defaults. Optionally load a public repository's existing settings or a local file. Download the generated file and commit it at the **root of the public repository's default branch**:

```yaml
# .reporoad.yml
version: 1
style: woodland
color: "#778565"
roof: gable
signText: My repository
garden: true
support:
  sponsor: false
  helpWanted: true
```

Styles: `woodland` (Cabin), `stone` (Workshop), `cafe`, `brick`, `greenhouse`, and `townhouse`. Blank sign text uses the repository name. Height comes from GitHub stars, not the file.

After committing, use **Submit repository** in Explore or Add. RepoRoad verifies the public default-branch file directly and saves the registration in D1, without waiting for GitHub search indexing. Re-submit to refresh a changed file immediately (30-second submission cooldown). Registered files are also rechecked hourly as the directory is visited; missing or invalid files remove the building. Transient failures retain the last verified building for up to a day.

`GITHUB_READ_TOKEN` is recommended for API rate limits and required only for the additional code-search discovery. The branch includes five requested initial repository identities; each must pass live validation before appearing. Local development merges verified registrations with the labelled sample buildings. Apply the new additive migration before testing. See [repository discovery and limits](docs/repository-road.md).

## Music

No music files are included in the current source tree. Supply music you have permission to broadcast on the broadcaster machine. Audio files and the generated catalog are ignored by Git. Earlier Git history retains the original five prototype tracks; see [music provenance](public/music/SOURCES.md).

Import your own MP3 files:

```sh
node scripts/music/import.mjs /absolute/path/to/your/music
```

This copies MP3s without transcoding into ignored `media/music/` and generates the catalog. The development server serves it directly. The original local import had 792 tracks; a fresh clone contains none. You can alternatively copy an existing `media/music/` directory, including its catalog, to the broadcaster machine. Missing music produces an explicit setup error; it never silently falls back to the old tracks.

## Run a broadcaster

Use a non-root Linux account, Chrome, FFmpeg, Xvfb, xauth, PulseAudio and a supported GPU. On the tested Ubuntu desktop, NVIDIA hardware encoding and ANGLE Vulkan worked. An ordinary CPU-only VPS is not equivalent.

With the local website running:

```sh
node scripts/broadcast/run.mjs record
```

This records 60 seconds at 1280×720/30 fps to ignored `outputs/broadcast/`. For an RTMP(S) stream, store the complete destination URL and key on one line in a private file **outside the checkout**, then:

```sh
chmod 600 /absolute/path/to/private/rtmps-url
BROADCAST_STREAM_URL_FILE=/absolute/path/to/private/rtmps-url node scripts/broadcast/run.mjs stream
```

Do not paste real keys into Git, chat, examples or shell history. Stream mode supervises its isolated capture worker and automatically retries failures with a 5–60 second backoff. It monitors encoder output, browser heartbeats and advancing audio playback. Ctrl+C stops the worker and retries. Record mode remains a one-shot capture. The supplied systemd service adds boot/startup supervision; no service is installed automatically.

See [Ubuntu setup, audio isolation and systemd](docs/broadcaster.md). Local recording and loopback RTMP were tested, but 24/7 uptime and recovery on the target server still need a soak test.

## YouTube and chat

The website's Chat tab is YouTube's native chat for the configured broadcast, not the old D1 room. Visitors use their YouTube account to post; mobile web has a link fallback. Restream relay can connect supported destination chats, but it is not enabled by this repository. The website never starts a second music player while showing YouTube.

See [YouTube integration and limitations](docs/youtube-viewing.md).

## Secret scanning

BetterLeaks scans Git history in GitHub Actions. Its Linux x86_64 installer pins both the version and binary SHA-256. Scans redact findings and do not validate credentials against external services.

```sh
bash scripts/security/install-betterleaks.sh
npm run secrets:scan
git add <specific-files>
npm run secrets:staged
```

On other platforms, install BetterLeaks v1.8.1 from its [official releases](https://github.com/betterleaks/betterleaks/releases) and put it on PATH.

The ignore rules exclude environment files, stream-key files, private keys, local databases, dependency/build folders, large music libraries, recordings, logs and new review artifacts. Already tracked assets remain tracked. Secret scans reduce risk; they do not guarantee that no secret exists. If a real key is ever committed, revoke it before considering history cleanup.

## Validation

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.mjs scripts/broadcast/*.test.mjs scripts/music/server.test.mjs
npm run build
```

Build runs migration checks covering fresh installs, upgrades, retries and data preservation. Applied migrations in `drizzle/` are immutable; append new ones rather than deleting/recreating the site.

## Hosting and operational boundaries

- The current `.openai/hosting.json` belongs to the existing RepoRoad Sites deployment. Forks must provision their own site and bindings; do not deploy into this project ID.
- D1 stores shared interaction state. R2 stores separately uploaded music through the `MUSIC` binding; see [music storage and protected uploads](docs/music-storage.md). The GitHub push itself does not publish the website.
- No streaming secrets or GitHub discovery tokens belong in browser code.
- The legacy D1 chat API is retained but not used by the current chat tab.
- Video introduces latency: chicken state on the page can lead what viewers see in the stream.
- Review dependency advisories, moderation, rate limits, retention, stream health and music rights before opening to a large audience.

Additional details: [local verification](docs/local-verification.md).
