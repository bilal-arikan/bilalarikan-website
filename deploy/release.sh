#!/usr/bin/env bash
set -euo pipefail

release="${1:?A release timestamp is required}"
expected_count="${2:?An expected project count is required}"
[[ "$release" =~ ^[0-9]{8}-[0-9]{6}$ ]] || { echo 'Invalid release name.' >&2; exit 1; }
[[ "$expected_count" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid project count.' >&2; exit 1; }
root=/var/www/bilalarikan
destination="$root/releases/$release"
archive="/home/hermes/bilalarikan-incoming/$release.tar.gz"
mkdir -p "$root/releases"
exec 9>"$root/deploy.lock"
flock -n 9 || { echo 'Another release is active.' >&2; exit 1; }
mkdir "$destination"
tar -xzf "$archive" -C "$destination" --no-same-owner
test -s "$destination/index.html"
test -s "$destination/api.json"
test -s "$destination/assets/masonry.js"
test -s "$destination/404.html"
python3 - "$destination/api.json" "$expected_count" <<'PY'
import json
import sys
with open(sys.argv[1]) as stream:
    data = json.load(stream)
assert data['schema_version'] == 1
assert len(data['projects']) == int(sys.argv[2]), 'Unexpected project count'
PY
chmod -R a+rX "$destination"
previous=$(readlink "$root/current" || true)
if [[ -n "$previous" ]]; then
    ln -sfn "$previous" "$root/previous.next"
    mv -Tf "$root/previous.next" "$root/previous"
fi
ln -sfn "$destination" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
printf 'Current release: %s\nPrevious release: %s\n' "$destination" "$previous"
