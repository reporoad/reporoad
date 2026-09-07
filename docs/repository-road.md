# One shared repository road

Explore lists the repositories on the same road; sorting and pagination only change the list, not the driving route. The retired category caches are left untouched. A new `road-yaml-v1` cache key uses the existing table, so no destructive migration is needed.

Local development uses 20 clearly labelled sample GitHub repositories. This does not imply these repositories have opted in. Production starts empty and admits only repositories whose public default branch contains a valid root `.reporoad.yml`.

The Add editor works without a repository URL. It can load a public repository's settings or a local YAML file, show a live one-floor building preview, and download a new file. Commit that file at the repository root on the default branch. Stars still determine the actual building height. Blank sign text uses the repository name.

Supported settings: `version: 1`, `style` (woodland, stone, cafe, brick, greenhouse, townhouse), six-digit hex `color`, `roof` (gable/flat), optional `signText` (48 characters), `garden` (boolean), and `support.sponsor` / `support.helpWanted` (booleans). Unknown settings, duplicate keys, aliases, invalid values and files over 8 KB are rejected. No scripts or external asset URLs are executed.

Production discovery requires the existing server-side `GITHUB_READ_TOKEN`. It uses GitHub's code-search index, which is delayed and not exhaustive (first 1,000 indexed results). One page rotates daily; at most 12 candidates are checked per five-minute cache refresh on requests. The shared pool is bounded to 1,000 validated repositories, sorted by identity for stable road ordering, not a daily random sample. Entries expire after 24 hours without validation; removed/invalid files are excluded when checked. This is an initial bounded discovery implementation, not unlimited or immediate GitHub-wide registration. The UI discloses discovery failures.

Old `.github/chilldrive.json` files no longer enroll a repository. Open their contents as YAML-compatible JSON if needed, then export and commit `.reporoad.yml`. The editor never commits or uploads to GitHub on the user's behalf.
