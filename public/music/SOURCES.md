# Historical prototype music sources

Copied from the user-supplied `/home/joris/Projects/suppers-ai/lofi-songs/10_hour_versions` collection. Original files are unchanged. Full songs, no excerpts.

| Site file | Source relative to the collection | Conversion |
| --- | --- | --- |
| morning-light-in-fiordland.mp3 | 009_new-zealand/Morning Light in Fiordland.wav | MP3, 160 kbps |
| bamboo-and-rain.mp3 | 015_japan/Bamboo and Rain.mp3 | Unchanged copy |
| golden-shore-lullaby.mp3 | 015_japan/Golden Shore Lullaby.mp3 | Unchanged copy |
| stargazing-by-lake-tekapo.mp3 | 009_new-zealand/Stargazing by Lake Tekapo.wav | MP3, 160 kbps |
| midnight-train-loop.mp3 | 015_japan/Midnight Train Loop.mp3 | Unchanged copy |

These five files have been removed from the current source tree. They remain
recoverable in earlier Git history; their original source files were not modified.
No audio files are shipped with the current version. The full local MP3 collection is imported
unchanged into `media/music/library/` with a measured catalogue, outside the deployment
bundle; see `docs/broadcaster.md`. The player uses a shared deterministic shuffle
with two decks overlapping for five-second crossfades. This source record does not
assert or change the original music's licensing.
