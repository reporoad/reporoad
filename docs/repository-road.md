# One shared repository road

Explore lists the repositories on the same road; sorting and pagination only change the list, not the driving route. The retired category caches are left untouched. A new `road-yaml-v1` cache key uses the existing table, so no destructive migration is needed.

Local development uses 20 clearly labelled sample GitHub repositories. This does not imply these repositories have opted in. Production starts empty and admits only repositories whose public default branch contains a valid root `.reporoad.yml`.

The Add editor works without a repository URL. It can load a public repository's settings or a local YAML file, show a live one-floor building preview, and download a new file. Commit that file at the repository root on the default branch. Stars still determine the actual building height. Blank sign text uses the repository name.

Supported settings: `version: 1`, `style` (woodland, stone, cafe, brick, greenhouse, townhouse), six-digit hex `color`, `roof` (gable/flat), optional `signText` (48 characters), `garden` (boolean), and `support.sponsor` / `support.helpWanted` (booleans). Unknown settings, duplicate keys, aliases, invalid values and files over 8 KB are rejected. No scripts or external asset URLs are executed.

## Direct registration

After committing the file, submit `owner/repo` or its HTTPS GitHub URL in Explore or Add. `POST /api/repositories/submit` fetches public repository metadata and the root file directly, validates the settings, and upserts a lowercase identity into D1's `road_registrations`. No search indexing is involved. Anyone may submit an opted-in public repository; the committed file, not the submitter, controls the building. Tokens stay server-side and are never sent to the public raw-content host.

Submissions require same-origin JSON, a bounded request body, and a trusted edge visitor address (a development-only fallback is used locally). A persistent atomic cooldown allows one attempt per visitor every 30 seconds, including invalid-file attempts. Expired hashed visitor limits are cleaned in bounded batches. The directory is capped at 1,000 registrations; duplicate submissions update the same entry. This is a bounded initial service, not a substitute for edge-level abuse protection at high traffic.

On directory requests, at most eight due registrations are rechecked concurrently, with per-repository database leases and an hourly cadence. A confirmed missing/invalid file clears the building; transient failures retain the previous verified record for up to 24 hours. Names remain registered for later retries. Re-submit to refresh immediately after committing a change. There is no background cron requirement.

The explicitly requested initial identities are RepoRoad, Impresspress, Wafer, Gizza and WAGMI. Bootstrap inserts only their names outside migrations, never fabricated buildings. Missing/unmerged files do not appear. Local development merges verified registrations with labelled samples. `0005_road_registrations.sql` is additive; no site reset is required.

## Additional discovery

Owner-approved exception: Impresspress is pinned first in the road and Explore, using the exact configuration commit `023042768f723023262247f592470a4ffc08d323` from its unmerged PR #98. The UI labels it “Pinned · PR preview”. Only this server-side allowlisted repository gets the exception; public callers cannot supply arbitrary revisions or placement. Remove the override in `lib/road-registration.ts` after its default-branch configuration is ready.

The server-side `GITHUB_READ_TOKEN` is recommended for metadata rate limits and required for optional code search. The existing search cache remains an additional discovery source, not the registration authority. It scans the first 1,000 indexed results with bounded refresh work; direct registrations are merged afterward and cannot be erased by an empty search result. The UI explains discovery failures without blocking direct submissions.

Old `.github/chilldrive.json` files no longer enroll a repository. Open their contents as YAML-compatible JSON if needed, then export and commit `.reporoad.yml`. The editor never commits or uploads to GitHub on the user's behalf.
