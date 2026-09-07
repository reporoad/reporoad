# Hosted music in R2

Sites provisions the logical `MUSIC` R2 binding declared in `.openai/hosting.json`.
MP3 bytes and `catalog.json` live there, not in Git or the deployment archive.
There is no schema change and no database reset.

## Upload (administrator only)

Set a long randomly generated `MUSIC_UPLOAD_TOKEN` as a **secret** in Sites, and
deploy to apply it. Keep the matching value in a private file outside Git with
mode 600. Possession of this narrowly scoped secret grants music-upload access;
ordinary signed-in visitors cannot upload. Do not share it or put it in a URL.

```sh
MUSIC_UPLOAD_TOKEN_FILE=/absolute/path/to/private/music-upload-token node scripts/music/upload.mjs
```

The default destination is `https://reporoad.suppers.chatgpt.site`. Override
`REPOROAD_UPLOAD_URL` only for a site you control. HTTPS is required except on
loopback. Redirects are rejected so credentials are not forwarded elsewhere.

The uploader reads ignored `media/music/` (override `REPOROAD_MUSIC_ROOT`), sends
two files at a time, checks SHA-256 and length to skip identical uploads, and
retries transient failures. `MUSIC_UPLOAD_CONCURRENCY` can set 1–8 simultaneous
uploads when the uploader's connection permits. Existing MP3s with different checksums are not
overwritten. Rename/reimport a changed song. The catalog is uploaded last, so a
failed initial upload does not advertise an incomplete library. Rerun to resume.
The endpoint accepts MP3s up to 50 MB and catalogs up to 2 MB. R2 verifies upload
checksums. Only the small catalog is buffered in Worker memory.

Keep the credential securely for future updates, or remove the hosted secret and
redeploy to disable uploads. This API has no delete operation.

## Playback and local fallback

`/music/catalog.json` and `/music/library/...mp3` are public read routes. They
support HEAD, byte ranges, ETags and MP3 caching; the catalog is revalidated.
Publicly playable music can also be downloaded: only upload audio you have rights
to share. Sites plan/usage limits still apply.

The broadcaster can load `https://reporoad.suppers.chatgpt.site/?broadcast=1`
without a local music copy once the site and catalog are deployed. The existing
shuffle and crossfade player is unchanged.

For network resilience, retain a matching copy of `media/music/` on the broadcaster
and use the loopback music proxy described in `broadcaster.md`. That serves local
music while forwarding the page to Sites. It is an explicitly provisioned local
cache, not an automatic download cache; keep its catalog in sync with R2.

Site deletion is not a backup strategy. Preserve the original music separately.
