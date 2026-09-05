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

- A continuous 3D road loop with textured asphalt, rolling terrain, detailed buildings, clustered foliage, atmospheric sky and softer shadows. The full plot footprint passes behind the car before recycling beyond the fog. Includes 24 plots, pause/resume and golden/blue-hour lighting.
- Six clearly marked example businesses and 18 plots available for local demo claims.
- Five plot templates, sign text, safe shop links, five colours, greenery and local PNG/JPEG/WebP logo import (5 MB limit, resized to 256px).
- Live draft preview, explicit save-to-road, restoration of the last saved design and switching between claimed plots.
- Browser-local saved plots with validation of restored records. Storage failures are reported; claims are not real purchases or secure ownership.
- Five complete songs copied/converted from the supplied lofi collection, played in sequence on repeat. Play/pause and volume only; no song voting, skipping or selection. Playback advances when a track ends, never on a timer. Audio never autoplays. See `public/music/SOURCES.md` for provenance.
- Optional imperative WebMCP tool for reading local plots. Registration is feature-detected. No supported browser/WebMCP validation context was available during implementation, so these tools have not been browser-verified.
- Reduced-motion preference pauses the initial drive. WebGL failures show an explanation while leaving the rest of the interface usable.

## Validation

```sh
npx tsc --noEmit
npm run lint
node --experimental-strip-types --test tests/*.test.mjs
npm run build
```

The domain tests cover claim restrictions, persistence recovery, publication validation, unsafe shop URLs automatic playlist progression, audio error recovery and two-lap road-recycling regression checks. Visual/browser interaction and an extended OBS soak test remain to be run on the target streaming machine.

The application lint check excludes the untouched generated `components/ui` catalogue and its `use-mobile` hook, which contain starter lint findings. New application code is checked. Compatible React, Vinext and Vite security updates were applied. npm still reports advisories in transitive development/build tooling (`undici` under Miniflare/dotenvx and `esbuild` under Vite/Wrangler); no application feature uses these packages at runtime. Review the toolchain advisories before broader deployment.

## Before real sales or a live audience

This is a local-state product prototype, not a production commerce or streaming backend. Clearing browser data loses local designs. Separate browsers and devices do not share plots or playback position. Draft edits are held in memory until Save; switching plots discards unsaved edits.

Next implementation stages:

1. Managed accounts, durable plot records and image storage (recommended: Supabase). Server-enforced ownership and draft/approved versions.
2. Stripe Checkout, transactional plot reservations, verified idempotent webhooks, expiry, refunds and a clear price/occupancy model. Never grant ownership from a checkout redirect alone.
3. Admin review for logos, messages and destinations; publication queue and emergency hide/rollback controls. Only approved records enter the broadcast.
4. A persistent YouTube chat worker for future non-music interactions. Music follows an operator-curated playlist; viewers cannot select songs. Store the authoritative music/world timeline centrally.
5. A dedicated OBS/rendering machine, restart supervisor, cached approved world, audio fallback and stream monitoring. Static website hosting does not operate the continuous broadcast.
6. Confirm music rights for the actual format, YouTube paid-promotion disclosures, and acceptable advertiser rules. The local-file playlist does not verify the original songs’ streaming rights.

For OBS, a separately opened browser source has separate local storage. The current prototype does not synchronise editor state across those contexts; shared backend state is required before that workflow is ready.
