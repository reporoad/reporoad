# Chilldrive

An interactive prototype of a shared scenic drive with roadside shops. Built with React, Three.js / React Three Fiber, and the Sites Vinext starter.

## Run

Requires Node 22.13+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by the server. For a clean driving scene, use `/?broadcast=1` or the expand button. Escape exits the clean view. Start music with the play button before switching into clean view; browser autoplay rules apply.

## Included

- A continuous 3D road loop with pixel-textured roads, stepped grass-and-dirt hills, block-built roofs, cubic tree canopies, a square sun/moon and block clouds. The full plot footprint passes behind the car before recycling beyond the fog. Includes 24 plots, Studio pause/resume and changing daylight.
- Six clearly marked example businesses and 18 plots available for local demo claims.
- Five plot templates, sign text, safe shop links, five colours, greenery and local PNG/JPEG/WebP logo import (5 MB limit, resized to 256px).
- Live draft preview, explicit save-to-Studio, restoration of the last saved design and switching between claimed plots.
- Browser-local saved plots with validation of restored records. Storage failures are reported; claims are not real purchases or secure ownership.
- Five complete songs copied/converted from the supplied lofi collection, played in sequence on repeat. Play/pause and volume only; no song voting, skipping or selection. Playback advances when a track ends; Live mode also corrects position against the shared clock. Audio never autoplays. See `public/music/SOURCES.md` for provenance.
- Optional imperative WebMCP tool for reading local plots. Registration is feature-detected. No supported browser/WebMCP validation context was available during implementation, so these tools have not been browser-verified.
- A cosy first-person voxel cabin, slowly moving sun/moon, a 40-minute day/night cycle, birds, grazing animals, rain with moving wipers, snow and seasonal terrain/foliage. Each season lasts four in-world days (160 minutes).
- Live mode uses a server-calibrated clock for the road, environment and playlist. Studio controls are local-only; editing or focusing a plot never moves the shared drive.
- Durable D1 chat, refreshed every three seconds, with the latest 50 messages, platform-authenticated authors, server-side validation and one message per user per three seconds. The site remains private until sharing is configured. This chat is separate from YouTube chat.
- Reduced-motion preference pauses the initial Studio drive; Live follows the shared clock. WebGL failures show an explanation while leaving the rest of the interface usable.

## Validation

```sh
npx tsc --noEmit
npm run lint
node --experimental-strip-types --test tests/*.test.mjs
npm run build
```

The domain tests cover claim restrictions, persistence recovery, publication validation, unsafe shop URLs, automatic playlist progression, audio error recovery, synchronized world time and two-lap road-recycling regression checks. The cosy scene has been iteratively compared against the selected concept using actual browser renders, including daytime, rain, snowy night and mobile framing. Static shop geometry is batched and the rear-view mirror updates twice per second. Software-rendered browser motion checks are not a hardware performance guarantee; an extended OBS/GPU soak test remains to be run on the target streaming machine. The real-time scene follows the concept's composition and palette, but is not a pixel-identical reproduction of the generated artwork.

The application lint check excludes the untouched generated `components/ui` catalogue and its `use-mobile` hook, which contain starter lint findings. New application code is checked. Compatible React, Vinext and Vite security updates were applied. npm still reports advisories in transitive development/build tooling (`undici` under Miniflare/dotenvx and `esbuild` under Vite/Wrangler); no application feature uses these packages at runtime. Review the toolchain advisories before broader deployment.

## Before real sales or a live audience

This is not a production commerce or streaming backend. Chat is shared and persistent, and the live timeline is synchronized across viewers (with small network/render timing differences). The live road currently uses the same fixed example plots for everyone. Land designs remain browser-local in Studio, not published to the shared road; clearing browser data loses them. Draft edits are held in memory until Save; switching plots discards unsaved edits. The live view is a synchronized 3D simulation, not an embedded YouTube video.

Chat needs moderation/reporting, retention policy and operational limits before a public audience. Production identity headers are supplied by Sites; never expose a deployment that allows clients to forge them. Migration files in `drizzle/` are packaged and applied by Sites. For local chat testing, build first and apply the migration with `npx wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_famous_shinobi_shaw.sql`; use the built worker via `npm start`. Local development does not automatically provide signed-in identity.

Next implementation stages:

1. Managed accounts, durable plot records and image storage (recommended: Supabase). Server-enforced ownership and draft/approved versions.
2. Stripe Checkout, transactional plot reservations, verified idempotent webhooks, expiry, refunds and a clear price/occupancy model. Never grant ownership from a checkout redirect alone.
3. Admin review for logos, messages and destinations; publication queue and emergency hide/rollback controls. Only approved records enter the broadcast.
4. A persistent YouTube chat worker for future non-music interactions. Music follows an operator-curated playlist; viewers cannot select songs. The dashboard already uses a shared epoch and server-calibrated clock.
5. A dedicated OBS/rendering machine, restart supervisor, cached approved world, audio fallback and stream monitoring. Static website hosting does not operate the continuous broadcast.
6. Confirm music rights for the actual format, YouTube paid-promotion disclosures, and acceptable advertiser rules. The local-file playlist does not verify the original songs’ streaming rights.

For OBS, a separately opened browser source has separate local storage. The current prototype does not synchronise editor state across those contexts; shared backend state is required before that workflow is ready.
