# Repository world

The pilot street displays 24 selected public GitHub repositories. Each appears
once per 384-metre circuit. There are no purchases or sponsorship requirements.
This is a synchronised browser scene, not an operating YouTube broadcast.

## Building height

`floors = Math.max(1, Math.floor(stars / 10000))`

0–19,999 stars produces one floor; 20,000 produces two; 249,082 produces 24.
Stars are a popularity metric, not a quality or contribution score. Tall buildings
extend above the car's field of view; their ground-level signs remain readable.

## Maintainer customisation

Commit `.github/chilldrive.json` to the repository's default branch:

```json
{
  "version": 1,
  "style": "woodland",
  "color": "#8c704a",
  "roof": "gable"
}
```

Styles: `woodland`, `brick`, `stone`. Roofs: `gable`, `flat`. Colours must be
six-digit hex values. The limit is 8 KiB. Unknown fields, code, asset URLs,
symlinks and malformed files are rejected. Names and stars cannot be overridden.

The default-branch file is authoritative: contributors can propose a PR, but
only a merged/default-branch change affects the building. No repository write
permission is requested by this service. No files are committed on owners' behalf.

The site reads GitHub's Contents API without a ref, which uses the default branch.
Removing the file restores the default. Invalid or unavailable files retain the
last known style and expose that status in the guide.

## Synchronisation and limitations

The shared D1 cache is refreshed on a site request, at most once per six hours.
An atomic lease prevents concurrent viewers from repeating the same batch.
GitHub metadata is fetched four repositories at a time, with timeouts. Failed
metadata requests retain the old record and its individual timestamp. The UI
shows the oldest data timestamp, not a false claim that all records are fresh.

The checked-in fallback contains actual public GitHub metadata fetched on
2026-09-05, not fabricated example stars. If live sync is unavailable, the site
labels that fallback. Initial configuration status is unavailable until checked.
Public unauthenticated GitHub rate limits apply. Configuration checks aren't
webhooks and aren't immediate; no scheduler or background monitoring is implied.

The pilot is an explicit directory, not a crawl of all GitHub. Adding arbitrary
repositories and handling repository transfers are future work. New repositories
must be added to the curated seed and cache version deliberately.

Source documentation:
- https://docs.github.com/en/rest/repos/repos#get-a-repository
- https://docs.github.com/en/rest/repos/contents#get-repository-content
