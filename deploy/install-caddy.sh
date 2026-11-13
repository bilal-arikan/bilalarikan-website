#!/usr/bin/env bash
set -euo pipefail

config=/home/hermes/stack/caddy/Caddyfile
incoming=/home/hermes/bilalarikan-incoming
exec 9>/var/lock/bilalarikan-caddy.lock
flock -n 9 || { echo 'Another configuration update is active.' >&2; exit 1; }
backup="$config.before-bilalarikan-$(date +%Y%m%d-%H%M%S)"
cp -p "$config" "$backup"
install -m 644 "$incoming/origin.pem" /var/www/.bilalarikan-tls/origin.pem
openssl x509 -in /var/www/.bilalarikan-tls/origin.pem -noout -checkhost www.bilalarikan.com

# Preserve the inode because the shared Caddy container bind-mounts this file.
python3 - "$config" "$incoming/Caddyfile" <<'PY'
import pathlib
import sys
config, fragment = map(pathlib.Path, sys.argv[1:])
start, end = '# BEGIN BILALARIKAN WEBSITE', '# END BILALARIKAN WEBSITE'
source = config.read_text()
block = start + '\n' + fragment.read_text().rstrip() + '\n' + end
if start in source:
    assert source.count(start) == source.count(end) == 1
    first, last = source.index(start), source.index(end) + len(end)
    updated = source[:first] + block + source[last:]
else:
    assert end not in source
    updated = source + '\n' + block + '\n'
config.write_text(updated)
PY

if ! docker exec myhermes-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
    cat "$backup" > "$config"
    echo 'Configuration rejected; previous file restored.' >&2
    exit 1
fi
if ! docker exec myhermes-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
    cat "$backup" > "$config"
    docker exec myhermes-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
    echo 'Reload failed; previous configuration restored.' >&2
    exit 1
fi
printf 'Caddy configuration backup: %s\n' "$backup"
