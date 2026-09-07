#!/usr/bin/env bash
set -euo pipefail
# Pinned upstream binary. Verify bytes before extracting or executing.
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  echo 'This installer supports Linux x86_64. Install BetterLeaks v1.8.1 from its official releases for your platform.' >&2
  exit 1
fi
task_dir=$(mktemp -d)
trap 'rm -rf -- "$task_dir"' EXIT
curl --fail --silent --show-error --location --retry 2 \
  https://github.com/betterleaks/betterleaks/releases/download/v1.8.1/betterleaks_1.8.1_linux_x64.tar.gz \
  -o "$task_dir/release.tar.gz"
printf '%s  %s\n' efa407244e1ea8e35f582b8a42becdeac08bdead04f68eb752adda722d583c2a "$task_dir/release.tar.gz" | sha256sum --check --status
mkdir -p .tools/betterleaks
tar -xzf "$task_dir/release.tar.gz" -C .tools/betterleaks betterleaks
.tools/betterleaks/betterleaks version
