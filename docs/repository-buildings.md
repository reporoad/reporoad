# Repository world

The world has four selectable neighbourhoods. Each repository appears once per
neighbourhood circuit (up to 100 repositories / 1,600 metres). There are no purchases or sponsorship requirements for organic discovery.
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

Styles: `woodland`, `brick`, `stone`, `greenhouse`, `townhouse`. Roofs: `gable`, `flat`. Colours must be
six-digit hex values. The limit is 8 KiB. Unknown fields, code, asset URLs,
malformed files and executable content are rejected. Names and stars cannot be overridden.

The default-branch file is authoritative: contributors can propose a PR, but
only a merged/default-branch change affects the building. No repository write
permission is requested by this service. No files are committed on owners' behalf.

The category service reads the public raw file at `HEAD`, the default branch.
No token is sent to the raw-content host. Responses are streamed with an 8 KiB bound.
Without a file, a case-insensitive hash of `owner/repo` selects a stable style,
colour and roof. Changing rank/category does not change the default appearance.
Removing the file restores the default. Invalid or unavailable files retain the
last known style and expose that status in the guide.

## Synchronisation and limitations

Top-star and weekly lists refresh on a visit after six hours. Style checks run
in batches of 20, four concurrently, behind a shared five-minute lease. Each
file becomes eligible for a recheck after six hours. An initial 100-file sweep
needs five visited batches, not one huge request. Without visits, no background
job runs. The browser checks the shared cache every five minutes. There is no
guarantee that separately selected categories show the same buildings: viewers
of the same cached neighbourhood use the same route and clock.

The checked-in fallback contains actual public GitHub metadata fetched on
2026-09-05, not fabricated example stars. If live sync is unavailable, the site
labels that fallback. Initial configuration status is unavailable until checked.
Public unauthenticated GitHub rate limits apply. Configuration checks aren't
webhooks and aren't immediate; no scheduler or background monitoring is implied.

## Categories and discovery

- **Top stars, all time:** GitHub repository search, public non-forks with more
  than 10,000 stars, descending total stars, 100 results. That threshold is below
  the current 100th result. Incomplete/short rankings are rejected and the previous
  complete list retained. Stars are current totals, not a historical peak.
- **Trending this week:** the public GitHub weekly Trending HTML page, preserving
  its actual order and reported weekly gains. The verified initial snapshot has
  21 entries, not 100. No padding with all-time/newly-created repos. The parser is
  bounded and tested; a layout change retains the previous list with a warning.
  This is not an official Trending API, nor our own exhaustive weekly-growth ranking.
- **Community, random 100:** requires `GITHUB_READ_TOKEN` as a server-side Sites
  secret for GitHub code search. No token has been provisioned yet. Code search
  looks for `version filename:chilldrive.json path:.github`, then checks exact path,
  public repository metadata and valid raw config. It rotates through up to ten
  indexed result pages across days. At most 12 candidates are checked per batch;
  a persisted cursor advances even past invalid files. A bounded discovered pool
  contains only files verified in the last 24 hours. A deterministic daily hash
  selects up to 100, identically for all viewers, independent of star count.
  This is a sample of discovered/indexed projects, not a uniform sample of every
  matching repository on GitHub. Small pools show fewer than 100. Indexing delays
  and rate limits apply. A file alone cannot currently enroll a project without
  the discovery credential being connected.
- **Sponsored:** separate, explicitly paid category, empty today. No checkout,
  fabricated sponsorships, or billing claims. Placement administration and payment
  activation are not implemented; adding a building file cannot grant a paid slot.

All categories reuse the existing `repository_world_cache` table with separate
`category-v1:*` rows. No new schema migration was added. The previous hosted
migration conflict is still unresolved; migrations have not been rewritten.

To enable discovery, configure a public-data GitHub read token as the hosted
`GITHUB_READ_TOKEN` secret (never in frontend code or version control). For local
Wrangler development, use an ignored `.dev.vars` file. Owners need not authorize
repository writes or connect their own account merely to have a default building.

Source documentation:

- https://docs.github.com/en/rest/repos/repos#get-a-repository
- https://docs.github.com/en/rest/repos/contents#get-repository-content
- https://docs.github.com/en/rest/search/search
- https://github.com/trending?since=weekly
# Help wanted and sponsorship markers

Owners can add `"support": { "helpWanted": true, "sponsor": true }` to the existing building configuration. Both flags are optional and default off. Set either to false or remove it to opt out on the next successful refresh. Removing the whole configuration restores the default building with no support markers. The existing last-known-style policy still applies during temporary fetch failures or invalid configuration.

Help wanted displays a two-post timber noticeboard (design A), linking to the repository's open issues labelled `help wanted`. The separate pink voxel heart links to `https://github.com/sponsors/OWNER`; owners should enable it only if they have an active GitHub Sponsors page. This indicates a project seeking support, not a paid RepoRoad placement. These links are also available in Explore for keyboard and touch access. No arbitrary URLs, HTML, or executable code are accepted in the file.
